import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserStore, assertRecordUnchanged, withBrowserStoreLock, METADATA_WRITE_LOCK } from './browserPersistence.js';

function lockManager() {
  const queues = new Map();
  const names = [];
  return { names, request(name, operation) {
    names.push(name);
    const result = (queues.get(name) || Promise.resolve()).then(operation);
    queues.set(name, result.catch(() => {}));
    return result;
  } };
}
function environment(initial = null) {
  const values = new Map(initial === null ? [] : [['workspace', initial]]);
  const locks = lockManager();
  let quota = false;
  let beforeWrite;
  const listeners = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) {
      if (quota) throw new Error('Quota exceeded');
      beforeWrite?.(key, value);
      values.set(key, value);
    },
  };
  const events = {
    addEventListener(type, callback) { const set = listeners.get(type) || new Set(); set.add(callback); listeners.set(type, set); },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    emit(type, data = {}) { for (const callback of listeners.get(type) || []) callback({ key: 'workspace', storageArea: storage, ...data }); },
  };
  const fresh = () => ({ applications: [], messages: [], reviews: {} });
  return {
    locks, storage, events,
    create: (key = 'workspace', options = {}) => createBrowserStore({ key, initialValue: fresh(), validate: value => Boolean(value && Array.isArray(value.applications) && Array.isArray(value.messages) && value.reviews && typeof value.reviews === 'object'), storage, eventTarget: events, visibilityTarget: null, locks, ...options }),
    replace(value, key = 'workspace') { if (value === null) values.delete(key); else values.set(key, value); },
    serialized: (key = 'workspace') => values.get(key) ?? null,
    quota(value) { quota = value; },
    beforeWrite(callback) { beforeWrite = callback; },
    listeners: type => listeners.get(type)?.size || 0,
  };
}

test('a stale tab merges a new message with an application submitted in another tab', async () => {
  const env = environment();
  const applicant = env.create();
  const leader = env.create();
  await applicant.update(current => ({ ...current, applications: ['application-one'] }));
  await leader.update(current => ({ ...current, messages: [...current.messages, 'Read the guidance'] }));
  const saved = JSON.parse(env.serialized());
  assert.deepEqual(saved.applications, ['application-one']);
  assert.deepEqual(saved.messages, ['Read the guidance']);
});

test('subscriptions follow storage changes and catch up on focus without a page reload', async () => {
  const env = environment();
  const applicant = env.create();
  const leader = env.create();
  let received;
  const unsubscribe = leader.subscribe(value => { received = value; });
  await applicant.update(current => ({ ...current, applications: ['one'] }));
  env.events.emit('storage');
  assert.deepEqual(received.applications, ['one']);
  await applicant.update(current => ({ ...current, applications: ['one', 'two'] }));
  env.events.emit('focus');
  assert.deepEqual(received.applications, ['one', 'two']);
  unsubscribe();
  assert.equal(env.listeners('storage'), 0);
  assert.equal(env.listeners('focus'), 0);
});

test('same-record stale edits fail while independent records remain mergeable', async () => {
  const env = environment();
  const first = env.create();
  const second = env.create();
  const baseline = first.read().reviews.reviewerOne || null;
  await second.update(current => ({ ...current, reviews: { ...current.reviews, reviewerOne: { comment: 'Newest saved answer', updatedAt: 'new' } } }));
  await assert.rejects(first.update(current => {
    assertRecordUnchanged(baseline, current.reviews.reviewerOne || null, 'Your review');
    return { ...current, reviews: {} };
  }), /changed in another tab/);
  await first.update(current => ({ ...current, reviews: { ...current.reviews, reviewerTwo: { comment: 'Independent assessment' } } }));
  assert.equal(JSON.parse(env.serialized()).reviews.reviewerOne.comment, 'Newest saved answer');
  assert.equal(JSON.parse(env.serialized()).reviews.reviewerTwo.comment, 'Independent assessment');
});

test('corrupt data is preserved and saving remains blocked until a valid copy is restored', async () => {
  const env = environment('{corrupt');
  const store = env.create();
  assert.match(store.getWarning(), /could not be read/);
  await assert.rejects(store.update(current => current), /could not be read/);
  assert.equal(env.serialized(), '{corrupt');
  const unsubscribe = store.subscribe(() => {});
  env.replace(JSON.stringify({ applications: ['restored'], messages: [], reviews: {} }));
  env.events.emit('storage');
  assert.equal(store.getWarning(), '');
  assert.deepEqual(store.read().applications, ['restored']);
  unsubscribe();
});

test('deleting a store never lets an already open tab silently recreate its old copy', async () => {
  const env = environment();
  const store = env.create();
  await store.update(current => ({ ...current, applications: ['saved'] }));
  env.replace(null);
  await assert.rejects(store.update(current => current), /removed in another tab/);
  assert.equal(env.serialized(), null);
  assert.deepEqual(store.getSnapshot().applications, ['saved']);
});

test('quota failures retain saved data and never acknowledge an unsaved revision', async () => {
  const env = environment();
  const store = env.create();
  await store.update(current => ({ ...current, applications: ['saved'] }));
  const before = env.serialized();
  let acknowledged = false;
  env.quota(true);
  await assert.rejects(store.update(current => ({ ...current, applications: ['unsaved'] }), { onCommitted: () => { acknowledged = true; } }), /could not be saved/);
  assert.equal(acknowledged, false);
  assert.equal(env.serialized(), before);
  assert.deepEqual(store.getSnapshot().applications, ['saved']);
  env.quota(false);
  assert.deepEqual(store.read().applications, ['saved']);
  assert.equal(store.getWarning(), '');
});

test('server-confirmed data remains visible in memory when browser storage cannot be written', async () => {
  const env = environment();
  const store = env.create();
  await store.update(current => ({ ...current, applications: ['server-confirmed'] }));
  const persisted = env.serialized();
  env.quota(true);
  store.updateMemory(current => ({ ...current, applications: ['server-confirmed', 'new-server-confirmed'] }));
  assert.equal(env.serialized(), persisted);
  assert.deepEqual(store.read().applications, ['server-confirmed', 'new-server-confirmed']);
  assert.match(store.getWarning(), /server confirmed/);
});

test('a profile save requested between a review final check and its storage write cannot erase the review', async () => {
  const env = environment();
  const applicant = env.create();
  const staff = env.create();
  await applicant.update(current => ({ ...current, profile: { name: 'Before' } }));
  let profileSave;
  let injected = false;
  // This hook occupies the exact gap that previously let a whole stale profile
  // snapshot overwrite a review. The second writer must queue, not run inline.
  env.beforeWrite(() => {
    if (injected) return;
    injected = true;
    profileSave = applicant.update(current => ({ ...current, profile: { name: 'Updated applicant' } }));
  });
  await staff.update(current => ({ ...current, reviews: { ...current.reviews, reviewerOne: { status: 'submitted' } } }));
  await profileSave;
  const saved = JSON.parse(env.serialized());
  assert.equal(saved.profile.name, 'Updated applicant');
  assert.equal(saved.reviews.reviewerOne.status, 'submitted');
});

test('all metadata store keys wait for the same global lock before reading or writing', async () => {
  const env = environment();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const held = env.locks.request('ceda-workspace:' + METADATA_WRITE_LOCK, () => gate);
  const writes = ['applicant', 'admin', 'staff'].map(key => env.create(key).update(current => ({ ...current, applications: [key] })));
  await Promise.resolve();
  for (const key of ['applicant', 'admin', 'staff']) assert.equal(env.serialized(key), null);
  assert.deepEqual([...new Set(env.locks.names)], ['ceda-workspace:metadata-write']);
  release();
  await held;
  await Promise.all(writes);
  for (const key of ['applicant', 'admin', 'staff']) assert.deepEqual(JSON.parse(env.serialized(key)).applications, [key]);
});

test('autosave revisions are acknowledged after persistence and before the next queued mutation', async () => {
  const env = environment();
  const store = env.create();
  let acknowledged = 0;
  const first = store.update(current => ({ ...current, editRevision: 1 }), { onCommitted: () => { acknowledged = 1; } });
  const second = store.update(current => {
    assert.equal(acknowledged, 1);
    assert.equal(current.editRevision, 1);
    return { ...current, editRevision: 2 };
  });
  await Promise.all([first, second]);
  assert.equal(JSON.parse(env.serialized()).editRevision, 2);
});

test('browsers without Web Locks keep existing data and fail closed for saves', async () => {
  const env = environment(JSON.stringify({ applications: ['saved'], messages: [], reviews: {} }));
  const before = env.serialized();
  const store = env.create('workspace', { locks: null });
  await assert.rejects(store.update(current => ({ ...current, applications: ['unsafe'] })), /Web Locks support/);
  assert.equal(env.serialized(), before);
  assert.deepEqual(store.getSnapshot().applications, ['saved']);
});

test('an asynchronous mutation callback is rejected without writing partial data', async () => {
  const env = environment();
  const store = env.create();
  await assert.rejects(store.update(async current => ({ ...current, applications: ['unsafe'] })), /finish synchronously/);
  assert.equal(env.serialized(), null);
});

test('a distinct staff workflow lock can await metadata writes without deadlocking', async () => {
  const env = environment();
  const first = env.create();
  const second = env.create();
  await Promise.all([
    withBrowserStoreLock('staff-workflow', () => first.update(current => ({ ...current, reviews: { ...current.reviews, one: { status: 'submitted' } } })), env.locks),
    withBrowserStoreLock('staff-workflow', () => second.update(current => ({ ...current, reviews: { ...current.reviews, two: { status: 'submitted' } } })), env.locks),
  ]);
  assert.deepEqual(Object.keys(JSON.parse(env.serialized()).reviews).sort(), ['one', 'two']);
});

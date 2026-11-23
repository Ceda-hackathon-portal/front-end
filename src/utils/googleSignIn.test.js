import test from 'node:test';
import assert from 'node:assert/strict';
import { googleAuthorizationUrl, readGoogleReturn, googleFailureMessage } from './googleSignIn.js';
import { safeReturnPath } from './portal.js';

test('Google redirects reject lookalike domains, HTTP and credentials', () => {
  assert.equal(googleAuthorizationUrl('https://accounts.google.com/o/oauth2/v2/auth?state=example'), 'https://accounts.google.com/o/oauth2/v2/auth?state=example');
  for (const url of ['http://accounts.google.com/auth', 'https://accounts.google.com.evil.example/auth',
    'https://person@accounts.google.com/auth', 'javascript:alert(1)', '//evil.example'])
    assert.throws(() => googleAuthorizationUrl(url));
});
test('Google return paths remain subject to verified-role routing', () => {
  const read = value => readGoogleReturn({ getItem: () => value });
  assert.deepEqual(read('broken'), { target: null, staff: false });
  const saved = read(JSON.stringify({ target: '/admin/support', staff: true }));
  assert.equal(safeReturnPath(saved.target, 'submitter'), '/workspace');
  assert.equal(safeReturnPath(saved.target, 'support-agent'), '/admin/support');
  assert.equal(safeReturnPath(read('{"target":"https://evil.example"}').target, 'submitter'), '/workspace');
  assert.match(googleFailureMessage('link-required'), /usual method/);
  assert.match(googleFailureMessage('cancelled'), /cancelled/);
});

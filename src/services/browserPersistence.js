export const METADATA_WRITE_LOCK = "metadata-write";

export function createBrowserStore({
  key,
  initialValue,
  validate,
  storage = globalThis.localStorage,
  eventTarget = globalThis.window,
  visibilityTarget = globalThis.document,
  locks = globalThis.navigator?.locks,
}) {
  let snapshot = initialValue;
  let warning = "";
  let lastRaw;
  let observedSavedValue = false;
  const listeners = new Set();
  const unreadable =
    "Saved workspace data could not be read. The existing copy has been kept. Restore browser storage before saving.";
  const removed =
    "Workspace data was removed in another tab. Your current view has been kept. Restore the saved copy before making changes.";

  function publish() {
    for (const listener of listeners) listener(snapshot, warning);
  }
  function fail(message) {
    warning = message;
    publish();
    throw new Error(message);
  }
  function read() {
    let raw;
    try {
      raw = storage.getItem(key);
    } catch {
      return fail(unreadable);
    }
    if (raw === null) {
      if (observedSavedValue) return fail(removed);
      lastRaw = null;
      return snapshot;
    }
    if (raw === lastRaw && !warning) return snapshot;
    let next;
    try {
      next = JSON.parse(raw);
      if (!validate(next)) throw new Error("Invalid workspace state");
    } catch {
      return fail(unreadable);
    }
    snapshot = next;
    lastRaw = raw;
    observedSavedValue = true;
    warning = "";
    publish();
    return snapshot;
  }
  function refresh() {
    try {
      read();
    } catch {
      // The saved copy remains intact and subscribers receive the actionable warning.
    }
  }
  function onStorage(event) {
    if (
      (event.key === key || event.key === null) &&
      (!event.storageArea || event.storageArea === storage)
    )
      refresh();
  }
  function onVisibility() {
    if (!visibilityTarget || visibilityTarget.visibilityState === "visible")
      refresh();
  }
  function subscribe(listener) {
    listeners.add(listener);
    if (listeners.size === 1) {
      eventTarget?.addEventListener("storage", onStorage);
      eventTarget?.addEventListener("focus", refresh);
      eventTarget?.addEventListener("pageshow", refresh);
      visibilityTarget?.addEventListener("visibilitychange", onVisibility);
    }
    refresh();
    listener(snapshot, warning);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) {
        eventTarget?.removeEventListener("storage", onStorage);
        eventTarget?.removeEventListener("focus", refresh);
        eventTarget?.removeEventListener("pageshow", refresh);
        visibilityTarget?.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }
  async function update(change, { onCommitted } = {}) {
    if (!locks?.request)
      return fail(
        "Safe shared saving is unavailable in this browser. Use a current browser with Web Locks support. Your saved data has been kept.",
      );
    return withBrowserStoreLock(
      METADATA_WRITE_LOCK,
      () => {
        const current = read();
        const expectedRaw = lastRaw;
        const next = change(current);
        if (next && typeof next.then === "function")
          throw new Error(
            "A workspace mutation must finish synchronously inside the shared save lock.",
          );
        if (!validate(next))
          throw new Error(
            "This change could not be saved because its workspace data is incomplete.",
          );
        let serialized;
        try {
          serialized = JSON.stringify(next);
        } catch {
          throw new Error("This change could not be prepared for saving.");
        }
        try {
          if (storage.getItem(key) !== expectedRaw) {
            refresh();
            throw new Error(
              "Workspace data changed in another tab. Reopen the latest record and retry.",
            );
          }
          storage.setItem(key, serialized);
        } catch (error) {
          if (
            error.message ===
            "Workspace data changed in another tab. Reopen the latest record and retry."
          )
            throw error;
          return fail(
            "Changes could not be saved on this device. Check browser storage and retry.",
          );
        }
        snapshot = next;
        lastRaw = serialized;
        observedSavedValue = true;
        warning = "";
        onCommitted?.(next);
        publish();
        return next;
      },
      locks,
    );
  }
  refresh();
  return {
    read,
    update,
    subscribe,
    getSnapshot: () => snapshot,
    getWarning: () => warning,
  };
}

export function assertRecordUnchanged(
  expected,
  current,
  label = "This record",
) {
  if (JSON.stringify(expected ?? null) !== JSON.stringify(current ?? null)) {
    throw new Error(
      label +
        " changed in another tab. Reopen the latest saved copy before continuing. Your current input has been kept.",
    );
  }
}

export async function withBrowserStoreLock(
  key,
  task,
  locks = globalThis.navigator?.locks,
) {
  if (locks?.request) return locks.request("ceda-workspace:" + key, task);
  throw new Error(
    "Safe shared saving is unavailable in this browser. Use a current browser with Web Locks support. Your saved data has been kept.",
  );
}

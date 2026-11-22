import { apiRequest } from "./apiClient.js";

const dataOf = (response) => response?.data ?? response;
const pendingSubmitKeys = new Map();
const mutationTails = new Map();
function serializeMutation(id, operation) {
  const previous = mutationTails.get(id) || Promise.resolve();
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  const tail = previous.catch(() => undefined).then(() => held);
  mutationTails.set(id, tail);
  return previous.catch(() => undefined).then(operation).finally(() => {
    release();
    if (mutationTails.get(id) === tail) mutationTails.delete(id);
  });
}
const submitKeyName = (userId, applicationId, revision) =>
  `ceda.submit.v1.${userId}.${applicationId}.${revision}`;

function submissionKey(userId, applicationId, revision) {
  const storageKey = submitKeyName(userId, applicationId, revision);
  const pending = pendingSubmitKeys.get(storageKey);
  if (pending) return { key: pending, storageKey };
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return { key: existing, storageKey };
  } catch {
    // In-memory fallback still keeps one key for retries in this page session.
  }
  const key = crypto.randomUUID();
  pendingSubmitKeys.set(storageKey, key);
  try {
    window.sessionStorage.setItem(storageKey, key);
  } catch {
    // The returned command carries this key so the caller can retain it on retry.
  }
  return { key, storageKey };
}

export const applicationsApi = {
  withMutation(applicationId, operation) {
    return serializeMutation(applicationId, operation);
  },

  async list() {
    return dataOf(await apiRequest("/applications"));
  },

  async create({ programmeId, programmeVersionId }) {
    return dataOf(await apiRequest("/applications", {
      method: "POST",
      body: { programmeId, programmeVersionId },
    }));
  },

  async read(applicationId) {
    return dataOf(await apiRequest(`/applications/${encodeURIComponent(applicationId)}`));
  },

  async save(applicationId, expectedRevision, fields, budget) {
    return dataOf(await apiRequest(`/applications/${encodeURIComponent(applicationId)}`, {
      method: "PATCH",
      body: { expectedRevision, fields, budget },
    }));
  },

  async uploadDocument(applicationId, expectedRevision, file, metadata) {
    const params = new URLSearchParams({ name: metadata.name, category: metadata.category, expectedRevision: String(expectedRevision) });
    if (metadata.expiresAt) params.set("expiresAt", metadata.expiresAt);
    return dataOf(await apiRequest(`/applications/${encodeURIComponent(applicationId)}/documents?${params}`, {
      method: "POST", body: file, rawBody: true, headers: { "Content-Type": "application/octet-stream" },
    }));
  },

  async downloadDocument(applicationId, documentId) {
    return apiRequest(`/applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(documentId)}`, { responseType: "blob" });
  },
  async submit(applicationId, expectedRevision, authenticatedUserId) {
    const command = submissionKey(authenticatedUserId, applicationId, expectedRevision);
    return dataOf(await apiRequest(`/applications/${encodeURIComponent(applicationId)}/submit`, {
      method: "POST",
      body: { expectedRevision },
      idempotencyKey: command.key,
    }));
  },

  acknowledgeSubmit(applicationId, expectedRevision, authenticatedUserId) {
    const storageKey = submitKeyName(authenticatedUserId, applicationId, expectedRevision);
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // The server accepted the command; stale local command keys are harmless.
    }
    pendingSubmitKeys.delete(storageKey);
  },

  async readSubmission(applicationId, submissionVersionId) {
    return dataOf(await apiRequest(
      `/applications/${encodeURIComponent(applicationId)}/submissions/${encodeURIComponent(submissionVersionId)}`,
    ));
  },
};

// This is the only staff read route available to the frontend. The server still
// checks session, assignment and conflict state; this client does not grant roles.
export const officerApi = {
  async readSubmission(submissionVersionId) {
    return dataOf(await apiRequest(
      `/officer/submissions/${encodeURIComponent(submissionVersionId)}`,
    ));
  },
};

import { apiRequest } from "./apiClient.js";

// Every permission is enforced by the API. This client never sends a role.
const id = encodeURIComponent;
const dataOf = (response) => response?.data ?? response;
const post = async (path, body = {}) => dataOf(await apiRequest(path, { method: "POST", body }));
const command = async (path, body, method = "POST") =>
  dataOf(await apiRequest(path, { method, body, idempotencyKey: crypto.randomUUID() }));

export const staffApi = {
  me: async () => dataOf(await apiRequest("/staff/me")),
  list: async () => dataOf(await apiRequest("/staff/applications")),
  read: async (applicationId) => dataOf(await apiRequest(`/staff/applications/${id(applicationId)}`)),
  document: (applicationId, documentId) =>
    apiRequest(`/staff/applications/${id(applicationId)}/documents/${id(documentId)}`, { responseType: "blob" }),

  assign: (applicationId, userId) => post(`/staff/applications/${id(applicationId)}/assignments`, { userId }),
  revoke: (applicationId, assignmentId, reason) =>
    post(`/staff/applications/${id(applicationId)}/assignments/${id(assignmentId)}/revoke`, { reason }),
  declare: (applicationId, hasConflict) => post(`/staff/applications/${id(applicationId)}/declaration`, { hasConflict }),
  confirm: (applicationId, disclosureId) =>
    post(`/staff/applications/${id(applicationId)}/declarations/${id(disclosureId)}/confirm`),

  eligibility: (applicationId, outcome, reason) =>
    post(`/staff/applications/${id(applicationId)}/eligibility`, { outcome, reason }),
  sendToReview: (applicationId) => post(`/staff/applications/${id(applicationId)}/send-to-review`),
  startEvaluation: (applicationId) => post(`/staff/applications/${id(applicationId)}/start-evaluation`),
  evaluate: (assignmentId, body) => command(`/assignments/${id(assignmentId)}/evaluation`, body, "PUT"),
  lockScores: (applicationId, expectedRevision) =>
    command(`/applications/${id(applicationId)}/workflow/lock-scores`, { expectedRevision }),
  openAdjudication: (applicationId, expectedRevision) =>
    command(`/applications/${id(applicationId)}/workflow/open-adjudication`, { expectedRevision }),
  decide: (applicationId, body) => command(`/applications/${id(applicationId)}/decisions`, body),
  release: (decisionId, body) => command(`/decisions/${id(decisionId)}/publish`, body),
};

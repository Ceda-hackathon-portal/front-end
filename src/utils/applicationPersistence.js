import { blankDraft } from "./applicantWorkflow.js";

function mapDocument(application, ownerId, document) {
  return {
    ...document,
    applicationId: application.id,
    backendDocumentId: document.id,
    backendOwnerId: ownerId,
    size: document.sizeBytes,
    type: document.contentType,
    verification: "Not verified",
    storage: "server",
  };
}

// The API stores budget rows without ids. The form needs one per row to edit and remove them.
export function budgetRows(items = []) {
  return items.map((item) => ({ ...item, id: item.id || crypto.randomUUID() }));
}

// Text limits mirror the API's applicant schema.
export function applicantForApi(profile) {
  const text = (value, max = 200) => String(value ?? "").slice(0, max);
  return {
    fullName: text(profile.fullName), email: text(profile.email, 254), phone: text(profile.phone, 40),
    companyName: text(profile.companyName), registrationNumber: text(profile.registrationNumber, 100),
    registered: text(profile.registered, 20), citizen: text(profile.citizen, 20),
    shareholders: (profile.shareholders || []).slice(0, 30).map((person) =>
      Object.fromEntries(Object.entries(person).map(([key, value]) =>
        [key, typeof value === "number" || typeof value === "boolean" ? value : text(value)]))),
  };
}

// The server's stage, confirmed eligibility and released outcome, in the shape the applicant pages already show.
export function applicantProgressView(progress) {
  if (!progress) return {};
  const { eligibility, outcome } = progress;
  const released = outcome
    ? { result: outcome.outcome === "APPROVED" ? "selected" : "not_selected", reason: outcome.message, releasedAt: outcome.releasedAt }
    : eligibility?.outcome === "NOT_ELIGIBLE"
      ? { result: "not_eligible", reason: eligibility.reason, releasedAt: eligibility.at }
      : null;
  if (!released) return eligibility?.outcome === "ELIGIBLE" ? { status: "Under review" } : {};
  return {
    status: released.result === "selected" ? "Approved" : "Feedback",
    outcome: { ...released, nextSteps: [], canRequestReview: false },
    feedback: [{ id: `outcome-${released.releasedAt}`, author: "CEDA", message: released.reason, createdAt: released.releasedAt }],
  };
}

export function restoreRemoteApplications(current, ownerId, records) {
  const owned = records.filter((record) => record.ownerId === ownerId);
  const remoteIds = new Set(owned.map((record) => record.id));
  const otherDrafts = current.drafts.filter((draft) =>
    draft.backendOwnerId ? draft.backendOwnerId !== ownerId : true,
  );
  const drafts = owned
    .filter((record) => record.stage === "DRAFT")
    .map((record) => ({
      ...blankDraft(record.id, record.fields.theme),
      ...record.fields,
      id: record.id,
      programmeId: record.programmeId,
      programmeVersionId: record.programmeVersionId,
      backendOwnerId: ownerId,
      backendRevision: record.revision,
      budgetItems: budgetRows(record.budget.items),
      fundingRequested: record.budget.fundingRequested,
      budgetNotApplicable: record.budget.notApplicable,
      documentIds: record.documents.map((document) => document.id),
      updatedAt: record.updatedAt || new Date().toISOString(),
    }));
  const ideas = owned
    .filter((record) => record.stage === "SUBMITTED" && record.latestSubmission)
    .map((record) => {
      const submission = record.latestSubmission;
      const documents = submission.documents.map((document) => mapDocument(record, ownerId, document));
      const snapshot = {
        ...submission.fields,
        budgetItems: submission.budget.items,
        fundingRequested: submission.budget.fundingRequested,
        budgetNotApplicable: submission.budget.notApplicable,
        documentIds: documents.map((document) => document.id),
        documents,
        submittedAt: submission.submittedAt,
      };
      return {
        ...snapshot,
        id: record.id,
        backendOwnerId: ownerId,
        backendSubmissionId: submission.id,
        backendRevision: record.revision,
        reference: submission.reference,
        status: "Submitted",
        feedback: [],
        versions: [{ number: submission.version || 1, ...snapshot }],
        events: [{ label: "Application received", at: submission.submittedAt }],
        ...applicantProgressView(record.progress),
      };
    });
  const removedOwnerDocs = new Set(
    current.documents
      .filter((document) => document.backendOwnerId === ownerId)
      .map((document) => document.id),
  );
  const remoteDocuments = owned.flatMap((record) => {
    const docs = record.stage === "SUBMITTED" && record.latestSubmission
      ? record.latestSubmission.documents
      : record.documents;
    return docs.map((document) => mapDocument(record, ownerId, document));
  });
  const documents = current.documents.filter((document) =>
    document.backendOwnerId ? document.backendOwnerId !== ownerId : !removedOwnerDocs.has(document.id),
  );
  const nextDrafts = [...otherDrafts, ...drafts];
  const activeDraftId = nextDrafts.some((draft) => draft.id === current.activeDraftId)
    ? current.activeDraftId
    : drafts[0]?.id || otherDrafts[0]?.id || null;
  return {
    ...current,
    drafts: nextDrafts,
    ideas: [...current.ideas.filter((idea) => idea.backendOwnerId !== ownerId), ...ideas],
    documents: [...documents, ...remoteDocuments],
    activeDraftId,
  };
}

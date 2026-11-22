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
      budgetItems: record.budget.items,
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

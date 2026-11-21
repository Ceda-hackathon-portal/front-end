import { createContext, useContext, useEffect, useRef, useState } from "react";
import { demoIdeas, themes } from "../data/portal";
import {
  blankDraft,
  canUpdate,
  documentCategories,
  emptyProfile,
  programme,
  submittedSnapshot,
} from "../utils/applicantWorkflow";
import {
  getDocumentFile,
  documentUploadPlan,
  prepareDocument,
  saveDocumentFiles,
} from "../services/applicantDocuments";

import { applicationReference } from "../utils/applicant";

import { useAuth } from "../hooks/useAuth";
import {
  assertStaffRole,
  recordForVersion,
  submissionWindowBlocker,
} from "../utils/staffWorkflow";
import { useAdmin } from "./AdminContext";

import {
  createBrowserStore,
  assertRecordUnchanged,
} from "../services/browserPersistence";

const PortalContext = createContext(null);
function validPortalState(value) {
  return Boolean(
    value &&
    Array.isArray(value.ideas) &&
    Array.isArray(value.drafts) &&
    Array.isArray(value.documents) &&
    Array.isArray(value.messages) &&
    value.profile &&
    Array.isArray(value.profile.shareholders) &&
    value.ideas.every(
      (idea) =>
        idea &&
        typeof idea.id === "string" &&
        Array.isArray(idea.versions) &&
        Array.isArray(idea.feedback),
    ) &&
    value.drafts.every(
      (draft) =>
        draft &&
        typeof draft.id === "string" &&
        Array.isArray(draft.documentIds) &&
        Array.isArray(draft.budgetItems),
    ),
  );
}
const revision = (value) => Number(value || 0);
function expectedRevision(own, input) {
  return own?.input === input ? own.saved : input;
}

const STORAGE_KEY = "ceda.applicant.v2";
const LEGACY_KEY = "ceda.prototype.v1";
const copy = (value) => structuredClone(value);

function normaliseIdea(idea) {
  const snapshot = {
    ...idea,
    documents: idea.documents || [],
    documentIds: idea.documentIds || [],
    applicant: idea.applicant || null,
  };
  return {
    ...snapshot,
    versions: idea.versions?.length
      ? idea.versions
      : [{ number: 1, ...snapshot }],
    revisionRequest:
      idea.revisionRequest ||
      (idea.id === "CEDA-DEMO-002"
        ? {
            id: "example-correction",
            status: "open",
            message: idea.feedback[0]?.message,
            dueAt: null,
          }
        : null),
    events: idea.events || [
      { label: "Application received", at: idea.submittedAt },
    ],
  };
}
function initialState() {
  const fallback = {
    ideas: copy(demoIdeas).map(normaliseIdea),
    drafts: [],
    activeDraftId: null,
    profile: copy(emptyProfile),
    documents: [],
    messages: [],
  };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      if (
        !Array.isArray(data.ideas) ||
        !Array.isArray(data.drafts) ||
        !Array.isArray(data.documents) ||
        !Array.isArray(data.messages) ||
        !data.profile ||
        !Array.isArray(data.profile.shareholders) ||
        !data.ideas.every(
          (idea) =>
            typeof idea.id === "string" &&
            typeof idea.status === "string" &&
            typeof idea.title === "string" &&
            Number.isFinite(Date.parse(idea.submittedAt)) &&
            Array.isArray(idea.feedback),
        ) ||
        !data.drafts.every(
          (draft) =>
            typeof draft.id === "string" &&
            Array.isArray(draft.documentIds) &&
            Array.isArray(draft.budgetItems),
        ) ||
        !data.documents.every(
          (document) =>
            typeof document.id === "string" &&
            typeof document.name === "string" &&
            typeof document.sha256 === "string",
        )
      )
        throw new Error("invalid saved state");
      return { data, warning: "" };
    }
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
    if (legacy) {
      if (
        !Array.isArray(legacy.ideas) ||
        !legacy.ideas.every(
          (idea) => typeof idea.id === "string" && Array.isArray(idea.feedback),
        ) ||
        !legacy.draft
      )
        throw new Error("invalid saved state");
      fallback.ideas = legacy.ideas.map(normaliseIdea);
      if (
        Object.values(legacy.draft).some(
          (value) => typeof value === "string" && value.trim(),
        )
      ) {
        const draft = { ...blankDraft(crypto.randomUUID()), ...legacy.draft };
        fallback.drafts = [draft];
        fallback.activeDraftId = draft.id;
      }
    }
    fallback.messages = fallback.ideas.flatMap((idea) =>
      idea.feedback.map((feedback) => ({
        id: idea.id + ":" + feedback.id,
        applicationId: idea.id,
        title: "Feedback available",
        message: feedback.message,
        createdAt: feedback.createdAt,
        readAt: null,
      })),
    );
    return { data: fallback, warning: "" };
  } catch {
    return {
      data: fallback,
      warning:
        "Saved workspace data could not be read. The existing copy has been kept. Reload or restore browser storage before saving.",
    };
  }
}
export function PortalProvider({ children }) {
  const { staffUser } = useAuth();
  const admin = useAdmin();
  const [initial] = useState(initialState);
  const [store] = useState(() =>
    createBrowserStore({
      key: STORAGE_KEY,
      initialValue: initial.data,
      validate: validPortalState,
    }),
  );
  const [data, setData] = useState(store.getSnapshot);
  const dataRef = useRef(data);
  const uploading = useRef(false);
  const ownDraftSaves = useRef(new Map());
  const ownProfileSave = useRef(null);
  const [documentsBusy, setDocumentsBusy] = useState(false);
  const [storageWarning, setStorageWarning] = useState(store.getWarning);
  useEffect(
    () =>
      store.subscribe((next, warning) => {
        dataRef.current = next;
        setData(next);
        setStorageWarning(warning);
      }),
    [store],
  );
  function readCurrentState() {
    const current = store.read();
    dataRef.current = current;
    return current;
  }
  function reloadWorkspace() {
    const latest = readCurrentState();
    ownDraftSaves.current.clear();
    ownProfileSave.current = null;
    setStorageWarning(store.getWarning());
    return {
      ...latest,
      profile: {
        ...latest.profile,
        _editRevision: revision(latest.profile._editRevision),
      },
      drafts: latest.drafts.map((item) => ({
        ...item,
        editRevision: revision(item.editRevision),
      })),
    };
  }
  async function commit(change, onCommitted) {
    try {
      return await store.update(change, { onCommitted });
    } catch (error) {
      setStorageWarning(error.message);
      throw error;
    }
  }
  function checkDraftRevision(draft, current) {
    const input = revision(draft.editRevision);
    const expected = expectedRevision(
      ownDraftSaves.current.get(draft.id),
      input,
    );
    assertRecordUnchanged(
      expected,
      revision(current.editRevision),
      "This draft",
    );
  }
  function sameProfileValues(first, second) {
    const withoutRevision = (value) =>
      Object.fromEntries(
        Object.entries(value).filter(([key]) => key !== "_editRevision"),
      );
    return (
      JSON.stringify(withoutRevision(first)) ===
      JSON.stringify(withoutRevision(second))
    );
  }
  function checkProfileRevision(profile, current) {
    if (sameProfileValues(profile, current)) return;
    const input = revision(profile._editRevision);
    assertRecordUnchanged(
      expectedRevision(ownProfileSave.current, input),
      revision(current._editRevision),
      "Your profile",
    );
  }
  async function createDraft(theme = "") {
    if (theme && !themes.some((item) => item.id === theme))
      throw new Error("Choose an available theme.");
    const draft = blankDraft(crypto.randomUUID(), theme);
    await commit((current) => ({
      ...current,
      drafts: [draft, ...current.drafts],
      activeDraftId: draft.id,
    }));
    return draft.id;
  }
  async function saveDraft(draft, profile) {
    try {
      await commit(
        (current) => {
          const previous = current.drafts.find((item) => item.id === draft.id);
          if (!previous)
            throw new Error(
              "This draft is no longer available. Return to My applications.",
            );
          checkDraftRevision(draft, previous);
          if (profile) checkProfileRevision(profile, current.profile);
          const next = {
            ...draft,
            documentIds: previous.documentIds,
            editRevision: revision(previous.editRevision) + 1,
            updatedAt: new Date().toISOString(),
          };
          return {
            ...current,
            profile:
              profile && !sameProfileValues(profile, current.profile)
                ? {
                    ...copy(profile),
                    _editRevision: revision(current.profile._editRevision) + 1,
                  }
                : current.profile,
            drafts: current.drafts.map((item) =>
              item.id === next.id ? next : item,
            ),
            activeDraftId: next.id,
          };
        },
        (result) => {
          ownDraftSaves.current.set(draft.id, {
            input: revision(draft.editRevision),
            saved: revision(
              result.drafts.find((item) => item.id === draft.id).editRevision,
            ),
          });
          if (profile)
            ownProfileSave.current = {
              input: revision(profile._editRevision),
              saved: revision(result.profile._editRevision),
            };
        },
      );
      return true;
    } catch (error) {
      setStorageWarning(error.message);
      return false;
    }
  }
  async function saveProfile(profile) {
    const result = await commit(
      (current) => {
        checkProfileRevision(profile, current.profile);
        if (sameProfileValues(profile, current.profile)) return current;
        return {
          ...current,
          profile: {
            ...copy(profile),
            _editRevision: revision(current.profile._editRevision) + 1,
          },
          profileUpdatedAt: new Date().toISOString(),
        };
      },
      (result) => {
        ownProfileSave.current = {
          input: revision(profile._editRevision),
          saved: revision(result.profile._editRevision),
        };
      },
    );
    return result.profile;
  }
  async function uploadDocuments(
    files,
    category,
    expiresAt = "",
    draftId = null,
  ) {
    if (uploading.current)
      throw new Error(
        "Another file is still being saved. Wait for it to finish and retry.",
      );
    if (!documentCategories.some((item) => item.id === category))
      throw new Error("Choose a document category.");
    if (
      expiresAt &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt) ||
        !Number.isFinite(Date.parse(expiresAt)) ||
        expiresAt < new Date().toISOString().slice(0, 10))
    )
      throw new Error("Use a current or future expiry date.");
    if (!files.length || files.length > 10)
      throw new Error("Choose between 1 and 10 files.");
    uploading.current = true;
    setDocumentsBusy(true);
    try {
      const prepared = [];
      for (const file of files)
        prepared.push(await prepareDocument(file, category, expiresAt));
      const current = readCurrentState();
      const plan = documentUploadPlan(prepared, current.documents);
      const attachedIds = plan.ids;
      const target = current.drafts.find((draft) => draft.id === draftId);
      if (draftId && !target)
        throw new Error(
          "The draft is no longer available. Reopen it and retry.",
        );
      if (target && new Set([...target.documentIds, ...attachedIds]).size > 10)
        throw new Error("Attach up to 10 files per application.");
      await saveDocumentFiles(plan.files);
      await commit((latest) => {
        const liveDraft = latest.drafts.find((draft) => draft.id === draftId);
        if (draftId && !liveDraft)
          throw new Error(
            "The draft changed while files were saving. Your files remain in the document library.",
          );
        if (
          liveDraft &&
          new Set([...liveDraft.documentIds, ...attachedIds]).size > 10
        )
          throw new Error("Attach up to 10 files per application.");
        return {
          ...latest,
          documents: [
            ...latest.documents,
            ...plan.documents.filter(
              (document) =>
                !latest.documents.some(
                  (existing) => existing.id === document.id,
                ),
            ),
          ],
          drafts: latest.drafts.map((draft) =>
            draft.id === draftId
              ? {
                  ...draft,
                  documentIds: [
                    ...new Set([...draft.documentIds, ...attachedIds]),
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : draft,
          ),
        };
      });
      return [...new Set(attachedIds)];
    } finally {
      uploading.current = false;
      setDocumentsBusy(false);
    }
  }
  async function attachDocument(draftId, documentId, remove = false) {
    await commit((current) => {
      const draft = current.drafts.find((item) => item.id === draftId);
      if (
        !draft ||
        !current.documents.some((document) => document.id === documentId)
      )
        throw new Error("The draft or document is no longer available.");
      const documentIds = remove
        ? draft.documentIds.filter((id) => id !== documentId)
        : [...new Set([...draft.documentIds, documentId])];
      if (documentIds.length > 10)
        throw new Error("Attach up to 10 files per application.");
      return {
        ...current,
        drafts: current.drafts.map((item) =>
          item.id === draftId
            ? { ...item, documentIds, updatedAt: new Date().toISOString() }
            : item,
        ),
      };
    });
  }
  async function startRevision(id) {
    let draftId;
    await commit((current) => {
      const source = current.ideas.find((idea) => idea.id === id);
      if (!source || !canUpdate(source))
        throw new Error("This application is not currently open for changes.");
      const existing = current.drafts.find(
        (draft) =>
          draft.revisionOf === id &&
          draft.baseVersion === source.versions.length,
      );
      if (existing) {
        draftId = existing.id;
        return current;
      }
      const draft = {
        ...blankDraft(crypto.randomUUID(), source.theme),
        programmeId: source.programmeId || programme.id,
        ...Object.fromEntries(
          ["title", "theme", "team", "problem", "solution", "impact"].map(
            (key) => [key, source[key]],
          ),
        ),
        documentIds: source.documentIds || [],
        budgetItems: copy(source.budgetItems || []),
        fundingRequested: source.fundingRequested || "",
        budgetNotApplicable: source.budgetNotApplicable || false,
        revisionOf: id,
        revisionKind:
          source.revisionRequest?.status === "open"
            ? "correction"
            : "amendment",
        baseVersion: source.versions.length,
        editRevision: 0,
      };
      draftId = draft.id;
      return {
        ...current,
        drafts: [draft, ...current.drafts],
        activeDraftId: draft.id,
      };
    });
    return draftId;
  }
  async function submitApplication(draft, profile, confirmed) {
    if (confirmed !== true)
      throw new Error("Confirm the declaration before submitting.");
    const before = readCurrentState();
    if (!before.drafts.some((item) => item.id === draft.id))
      throw new Error(
        "This draft has already been submitted or is no longer available.",
      );
    checkDraftRevision(
      draft,
      before.drafts.find((item) => item.id === draft.id),
    );
    checkProfileRevision(profile, before.profile);
    draft = {
      ...draft,
      documentIds: before.drafts.find((item) => item.id === draft.id)
        .documentIds,
    };
    const source = draft.revisionOf
      ? before.ideas.find((idea) => idea.id === draft.revisionOf)
      : null;
    const windowBlocker = submissionWindowBlocker(
      admin
        .readCurrentState()
        .programmes.find(
          (item) => item.id === (draft.programmeId || programme.id),
        ),
      draft,
      source,
    );
    if (windowBlocker) throw new Error(windowBlocker);
    if (draft.revisionOf && !source)
      throw new Error("The original application is unavailable.");
    if (source && draft.baseVersion !== source.versions.length)
      throw new Error(
        "A newer version exists. Reopen the application before making more changes.",
      );
    const now = new Date().toISOString();
    const { snapshot, number } = submittedSnapshot(
      draft,
      profile,
      before.documents,
      source,
      now,
    );
    for (const document of snapshot.documents) {
      const blob = await getDocumentFile(document.id);
      const hash = await crypto.subtle.digest(
        "SHA-256",
        await blob.arrayBuffer(),
      );
      const checksum = Array.from(new Uint8Array(hash), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      if (checksum !== document.sha256)
        throw new Error(
          "A saved file has changed. Replace it before submitting.",
        );
    }
    let id;
    await commit((current) => {
      if (!current.drafts.some((item) => item.id === draft.id))
        throw new Error("This draft has already been submitted.");
      const liveDraft = current.drafts.find((item) => item.id === draft.id);
      checkDraftRevision(draft, liveDraft);
      checkProfileRevision(profile, current.profile);
      assertRecordUnchanged(
        draft.documentIds,
        liveDraft.documentIds,
        "The attached documents",
      );
      const windowBlocker = submissionWindowBlocker(
        admin
          .readCurrentState()
          .programmes.find(
            (item) => item.id === (draft.programmeId || programme.id),
          ),
        draft,
        source,
      );
      if (windowBlocker) throw new Error(windowBlocker);
      const latestSource = source
        ? current.ideas.find((idea) => idea.id === source.id)
        : null;
      if (
        source &&
        (latestSource.versions.length !== draft.baseVersion ||
          !canUpdate(latestSource))
      )
        throw new Error(
          "The application changed. Reopen it before submitting.",
        );
      id = source?.id || "CEDA-LOCAL-" + crypto.randomUUID();
      const reference = source
        ? applicationReference(source)
        : "CEDA-LOCAL-" +
          now.slice(0, 10).replaceAll("-", "") +
          "-" +
          id.split("-").slice(2, 3)[0].slice(0, 6).toUpperCase();
      const label = source
        ? draft.revisionKind === "correction"
          ? "Correction submitted"
          : "Application updated"
        : "Application received";
      const idea = {
        ...source,
        ...snapshot,
        id,
        reference,
        status: "Submitted",
        submittedAt: source?.submittedAt || now,
        updatedAt: now,
        version: number,
        feedback: source?.feedback || [],
        versions: [...(source?.versions || []), { ...snapshot, number }],
        revisionRequest: source?.revisionRequest
          ? { ...source.revisionRequest, status: "responded", respondedAt: now }
          : null,
        events: [...(source?.events || []), { label, at: now }],
      };
      return {
        ...current,
        profile: {
          ...copy(profile),
          _editRevision: revision(current.profile._editRevision) + 1,
        },
        ideas: [idea, ...current.ideas.filter((item) => item.id !== id)],
        drafts: current.drafts.filter((item) => item.id !== draft.id),
        activeDraftId: null,
        messages: [
          {
            id: crypto.randomUUID(),
            applicationId: id,
            title: label,
            message: "Your record and receipt have been saved on this device.",
            createdAt: now,
            readAt: null,
          },
          ...current.messages,
        ],
      };
    });
    return id;
  }
  // Staff records and applicant-visible effects share one durable write. Private scores
  // stay in staffRecords; only correction instructions and released outcomes reach the applicant view.
  async function commitStaffWorkflow(id, recordOrChange) {
    assertStaffRole(staffUser, [
      "eligibility-officer",
      "evaluator",
      "adjudicator",
      "administrator",
    ]);
    await commit((current) => {
      const source = current.ideas.find((idea) => idea.id === id);
      if (!source) throw new Error("Application not found.");
      const application = {
        ...source,
        version: source.versions?.at(-1)?.number || source.version || 1,
      };
      const previous = recordForVersion(
        current.staffRecords?.[id],
        application,
      );
      const record =
        typeof recordOrChange === "function"
          ? recordOrChange({
              portal: current,
              admin: admin.readCurrentState(),
              previous,
            })
          : recordOrChange;
      if (record.revision !== (previous.revision || 0) + 1)
        throw new Error("This staff record changed. Reopen it before saving.");
      if (record.applicationVersion !== application.version)
        throw new Error(
          "The applicant submitted a newer version. Reopen the record.",
        );
      const changed = (key) =>
        JSON.stringify(previous[key]) !== JSON.stringify(record[key]);
      if (
        changed("screening") &&
        !["eligibility-officer", "administrator"].includes(staffUser.role)
      )
        throw new Error("Your role cannot change screening.");
      if (changed("reviews") && staffUser.role !== "evaluator")
        throw new Error("Only the assigned reviewer may save a review.");
      if (
        changed("decision") &&
        !["adjudicator", "administrator"].includes(staffUser.role)
      )
        throw new Error("Your role cannot release an outcome.");
      const now = new Date().toISOString();
      let idea = source;
      let message = null;
      if (changed("screening")) {
        const screening = record.screening;
        if (screening.result === "correction_needed") {
          idea = {
            ...idea,
            status: "Feedback",
            revisionRequest: {
              id: crypto.randomUUID(),
              status: "open",
              message: screening.reason,
              dueAt: screening.dueAt,
              createdAt: now,
            },
          };
          message = {
            title: "Correction requested",
            message: screening.reason + " Deadline: " + screening.dueAt,
          };
        } else {
          idea = {
            ...idea,
            status:
              screening.result === "eligible" ? "Under review" : idea.status,
          };
          if (idea.revisionRequest?.status === "open")
            idea.revisionRequest = {
              ...idea.revisionRequest,
              status: "closed",
              closedAt: now,
            };
        }
      }
      if (record.decision?.publishedAt && !previous.decision?.publishedAt) {
        const decision = record.decision;
        idea = {
          ...idea,
          status: decision.result === "selected" ? "Approved" : "Feedback",
          outcome: {
            result: decision.result,
            reason: decision.reason,
            nextSteps: decision.nextSteps
              ? decision.nextSteps
                  .split(/\r?\n/)
                  .map((step) => step.trim())
                  .filter(Boolean)
              : [],
            canRequestReview: decision.result !== "selected",
            releasedAt: decision.publishedAt,
          },
          feedback: [
            ...idea.feedback,
            {
              id: crypto.randomUUID(),
              author: "Decision team",
              message: decision.reason,
              createdAt: now,
            },
          ],
        };
        message = { title: "Outcome available", message: decision.reason };
      }
      if (message)
        idea = {
          ...idea,
          events: [...(idea.events || []), { label: message.title, at: now }],
        };
      return {
        ...current,
        staffRecords: { ...(current.staffRecords || {}), [id]: record },
        ideas: current.ideas.map((item) => (item.id === id ? idea : item)),
        messages: message
          ? [
              {
                id: crypto.randomUUID(),
                applicationId: id,
                ...message,
                createdAt: now,
                readAt: null,
              },
              ...current.messages,
            ]
          : current.messages,
      };
    });
  }
  async function markMessageRead(id) {
    await commit((current) => ({
      ...current,
      messages: current.messages.map((message) =>
        message.id === id
          ? { ...message, readAt: message.readAt || new Date().toISOString() }
          : message,
      ),
    }));
  }
  async function markAllMessagesRead() {
    await commit((current) => ({
      ...current,
      messages: current.messages.map((message) => ({
        ...message,
        readAt: message.readAt || new Date().toISOString(),
      })),
    }));
  }
  async function requestReview(id, grounds) {
    if (!grounds.trim() || grounds.length > 3000)
      throw new Error(
        "Explain your grounds for review in 3,000 characters or fewer.",
      );
    await commit((current) => {
      const idea = current.ideas.find((item) => item.id === id);
      if (!idea?.outcome?.canRequestReview || idea.reviewRequest)
        throw new Error(
          "A review request is not available for this application.",
        );
      return {
        ...current,
        ideas: current.ideas.map((item) =>
          item.id === id
            ? {
                ...item,
                reviewRequest: {
                  grounds: grounds.trim(),
                  createdAt: new Date().toISOString(),
                  status: "Saved on this device",
                },
              }
            : item,
        ),
      };
    });
  }
  async function respondToReviewRequest(id, input) {
    assertStaffRole(staffUser, ["administrator", "adjudicator"]);
    if (!["in_review", "resolved"].includes(input.status))
      throw new Error("Choose a review request status.");
    const response = String(input.response || "").trim();
    if (response.length > 3000 || (input.status === "resolved" && !response))
      throw new Error("Explain the resolution in 3,000 characters or fewer.");
    let request;
    await commit((current) => {
      const idea = current.ideas.find((item) => item.id === id);
      if (
        !idea?.outcome?.releasedAt ||
        !["not_selected", "not_eligible"].includes(idea.outcome.result) ||
        !idea.reviewRequest?.grounds?.trim()
      )
        throw new Error(
          "A review request is available only for a released negative outcome with submitted grounds.",
        );
      const previous = idea.reviewRequest;
      if (Object.hasOwn(input, "expectedUpdatedAt"))
        assertRecordUnchanged(
          input.expectedUpdatedAt,
          previous.updatedAt ||
            previous.respondedAt ||
            previous.createdAt ||
            null,
          "This review request",
        );
      const now = new Date().toISOString();
      request = {
        ...previous,
        status: input.status,
        response,
        updatedAt: now,
        respondedAt: now,
        respondedBy: staffUser.name,
        resolvedAt: input.status === "resolved" ? now : null,
      };
      return {
        ...current,
        ideas: current.ideas.map((item) =>
          item.id === id ? { ...item, reviewRequest: request } : item,
        ),
        messages: [
          {
            id: crypto.randomUUID(),
            applicationId: id,
            title: "Review request update",
            message: response || "Your review request is being considered.",
            createdAt: now,
            readAt: null,
          },
          ...current.messages,
        ],
      };
    });
    return request;
  }
  async function setReferralConsent(id, consent) {
    await commit((current) => ({
      ...current,
      ideas: current.ideas.map((idea) =>
        idea.id === id
          ? {
              ...idea,
              referralConsent: {
                consent,
                recordedAt: new Date().toISOString(),
              },
            }
          : idea,
      ),
    }));
  }
  const draft =
    data.drafts.find((item) => item.id === data.activeDraftId) ||
    data.drafts[0] ||
    blankDraft("unsaved");
  return (
    <PortalContext.Provider
      value={{
        ...data,
        profile: {
          ...data.profile,
          _editRevision: revision(data.profile._editRevision),
        },
        drafts: data.drafts.map((item) => ({
          ...item,
          editRevision: revision(item.editRevision),
        })),
        readCurrentState,
        reloadWorkspace,
        respondToReviewRequest,
        draft,
        storageWarning,
        documentsBusy,
        createDraft,
        saveDraft,
        saveProfile,
        uploadDocuments,
        attachDocument,
        startRevision,
        submitApplication,
        commitStaffWorkflow,
        markMessageRead,
        markAllMessagesRead,
        requestReview,
        setReferralConsent,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
}
export const usePortal = () => useContext(PortalContext);

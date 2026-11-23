import { serviceApi } from '../services/serviceApi';
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
  copyDocumentToApplication,
  documentUploadPlan,
  prepareDocument,
  saveDocumentFiles,
} from "../services/applicantDocuments";

import { applicationReference } from "../utils/applicant";
import { applicationsApi, programmesApi } from "../services/applicationApi";
import { applicantForApi, budgetRows, restoreRemoteApplications } from "../utils/applicationPersistence.js";

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

// What the API stores beside the idea: the profile, and answers to the programme's published eligibility rules.
async function apiFields(draft, profile) {
  const programmeRules = (await programmesApi.open()).find((item) =>
    draft.programmeVersionId ? item.programmeVersionId === draft.programmeVersionId : item.programmeId === draft.programmeId,
  )?.requirements || [];
  const answered = profile.citizen === "yes" || profile.citizen === "no";
  return {
    title: draft.title,
    theme: draft.theme,
    problem: draft.problem,
    solution: draft.solution,
    impact: draft.impact,
    team: draft.team,
    applicant: applicantForApi(profile),
    ...(answered && programmeRules.includes("botswana-citizen")
      ? { eligibilityEvidence: [{ requirementId: "botswana-citizen", value: profile.citizen === "yes" }] }
      : {}),
  };
}
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
  const { user, staffUser } = useAuth();
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
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [restoredFor, setRestoredFor] = useState(null);
  const applicationsRequest = useRef(0);
  const [documentsBusy, setDocumentsBusy] = useState(false);
  const [documentsProgress, setDocumentsProgress] = useState({ completed: 0, total: 0 });
  const [storageWarning, setStorageWarning] = useState(store.getWarning);
  const [accountProfile, setAccountProfile] = useState(emptyProfile);
  const [accountProfileOwnerId, setAccountProfileOwnerId] = useState(null);
  const apiApplicant = Boolean(user && !user.demo);
  async function refreshApplications() {
    if (!apiApplicant || !user?.id) return false;
    const requestId = ++applicationsRequest.current;
    setApplicationsLoading(true);
    setApplicationsError("");
    try {
      const records = await Promise.all((await applicationsApi.list()).map(async (record) =>
        record.stage === "SUBMITTED"
          ? {
              ...record,
              progress: await applicationsApi.progress(record.id).catch((error) => {
                if (error.status === 401) throw error;
                return null; // one unavailable stage must not hide the applicant's whole list
              }),
            }
          : record));
      if (requestId !== applicationsRequest.current) return false;
      const storedProfile = records.find((record) => record.fields?.applicant?.fullName)?.fields.applicant;
      if (storedProfile)
        setAccountProfile((current) => (current.fullName ? current : { ...copy(emptyProfile), ...storedProfile }));
      const change = (current) => restoreRemoteApplications(current, user.id, records);
      try {
        await commit(change);
      } catch {
        store.updateMemory(change, "Applications were restored from CEDA; browser storage is unavailable.");
      }
      setRestoredFor(user.id);
      return true;
    } catch (error) {
      if (requestId === applicationsRequest.current)
        setApplicationsError(error.message || "Applications could not be loaded from CEDA.");
      return false;
    } finally {
      if (requestId === applicationsRequest.current) setApplicationsLoading(false);
    }
  }
  useEffect(() => {
    if (!apiApplicant || !user?.id) {
      applicationsRequest.current += 1;
      setRestoredFor(null);
      setApplicationsLoading(false);
      setApplicationsError("");
      return;
    }
    void refreshApplications();
  }, [apiApplicant, user?.id]);
  const accountProfileKey = user?.id
    ? `ceda.api.profile.v1.${user.id}`
    : null;
  useEffect(() => {
    if (!apiApplicant || !accountProfileKey) {
      setAccountProfile(copy(emptyProfile));
      setAccountProfileOwnerId(null);
      return;
    }
    try {
      const stored = localStorage.getItem(accountProfileKey);
      setAccountProfile({
        ...copy(emptyProfile),
        ...(stored ? JSON.parse(stored) : {}),
      });
    } catch {
      setAccountProfile(copy(emptyProfile));
    }
    setAccountProfileOwnerId(user.id);
  }, [apiApplicant, accountProfileKey]);
  const currentAccountProfile =
    apiApplicant && accountProfileOwnerId === user.id
      ? accountProfile
      : emptyProfile;
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
  async function commitRemote(change) {
    try {
      return await commit(change);
    } catch {
      return store.updateMemory(change, "CEDA confirmed the save; this browser could not save a local copy.");
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
    if (apiApplicant) {
      let programmeId = import.meta.env.VITE_CEDA_PROGRAMME_ID;
      let programmeVersionId = import.meta.env.VITE_CEDA_PROGRAMME_VERSION_ID;
      if (!programmeId || !programmeVersionId) {
        // Newest published programme first.
        const [open] = await programmesApi.open();
        programmeId = open?.programmeId;
        programmeVersionId = open?.programmeVersionId;
      }
      if (!programmeId || !programmeVersionId)
        throw new Error("The backend has no published programme configured for local applications.");
      let application = await applicationsApi.create({ programmeId, programmeVersionId });
      // Save a theme chosen from a link straight away, so it survives a reload or another device.
      if (theme)
        application = await applicationsApi.save(application.id, application.revision, { ...application.fields, theme }, application.budget);
      const draft = {
        ...blankDraft(application.id, theme),
        programmeId: application.programmeId,
        programmeVersionId: application.programmeVersionId,
        budgetItems: budgetRows(application.budget?.items),
        fundingRequested: application.budget?.fundingRequested || "",
        budgetNotApplicable: Boolean(application.budget?.notApplicable),
        backendOwnerId: user.id,
        backendRevision: application.revision,
        ...application.fields,
      };
      await commitRemote((current) => ({
        ...current,
        drafts: [draft, ...current.drafts.filter((item) => item.id !== draft.id)],
        activeDraftId: draft.id,
      }));
      return draft.id;
    }
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
      if (apiApplicant && draft.backendOwnerId === user.id) {
        const current = readCurrentState();
        const previous = current.drafts.find((item) => item.id === draft.id);
        if (!previous || previous.backendOwnerId !== user.id)
          throw new Error("This backend draft is not available in the current account.");
        checkDraftRevision(draft, previous);
        const fields = await apiFields(
          { ...draft, programmeVersionId: previous.programmeVersionId || draft.programmeVersionId },
          profile || currentAccountProfile,
        );
        const budget = { items: draft.budgetItems.map(({ description, amount }) => ({ description, amount: String(amount) })), fundingRequested: String(draft.fundingRequested || ""), notApplicable: Boolean(draft.budgetNotApplicable) };
        const saved = await applicationsApi.withMutation(draft.id, () => {
          const live = readCurrentState().drafts.find((item) => item.id === draft.id);
          if (!live || live.backendOwnerId !== user.id) throw new Error("This backend draft is not available in the current account.");
          return applicationsApi.save(draft.id, live.backendRevision, fields, budget);
        });
        const next = {
          ...previous,
          ...draft,
          backendRevision: saved.revision,
          editRevision: revision(previous.editRevision) + 1,
          updatedAt: new Date().toISOString(),
        };
        await commitRemote((latest) => ({
          ...latest,
          drafts: latest.drafts.map((item) => item.id === draft.id ? next : item),
          activeDraftId: next.id,
        }));
        ownDraftSaves.current.set(draft.id, {
          input: revision(draft.editRevision),
          saved: revision(next.editRevision),
        });
        if (profile) await saveProfile(profile);
        return true;
      }
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
      const message = error.status === 409
        ? "Revision conflict: the server has a newer application version. Your edits remain open; reload the latest draft before retrying."
        : error.message || "The draft could not be saved. Your edits remain open.";
      setStorageWarning(message);
      return { ok: false, conflict: error.status === 409, message };
    }
  }
  async function saveProfile(profile) {
    if (apiApplicant && accountProfileKey) {
      const next = {
        ...copy(profile),
        _editRevision: revision(currentAccountProfile._editRevision) + 1,
      };
      try {
        localStorage.setItem(accountProfileKey, JSON.stringify(next));
      } catch {
        setStorageWarning("Profile details could not be saved on this device.");
        throw new Error("Profile details could not be saved on this device.");
      }
      setAccountProfile(next);
      return next;
    }
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
    setDocumentsProgress({ completed: 0, total: files.length });
    try {
      const prepared = [];
      for (const file of files)
        prepared.push(await prepareDocument(file, category, expiresAt));
      const current = readCurrentState();
      const plan = documentUploadPlan(prepared, current.documents);
      let attachedIds = plan.ids;
      let plannedDocuments = plan.documents;
      let savedFiles = plan.files;
      const target = current.drafts.find((draft) => draft.id === draftId);
      if (draftId && !target)
        throw new Error(
          "The draft is no longer available. Reopen it and retry.",
        );
      if (target && new Set([...target.documentIds, ...attachedIds]).size > 10)
        throw new Error("Attach up to 10 files per application.");
      let backendRevision = target?.backendRevision;
      if (target?.backendOwnerId === user.id) {
        const uploaded = [];
        await applicationsApi.withMutation(target.id, async () => {
          for (const item of prepared) {
            const live = readCurrentState().drafts.find((draft) => draft.id === target.id);
            if (!live || live.backendOwnerId !== user.id) throw new Error("This backend draft is not available in the current account.");
            const result = await applicationsApi.uploadDocument(target.id, live.backendRevision, item.blob, item.metadata);
            backendRevision = result.revision;
            const document = { ...item.metadata, id: result.id, backendDocumentId: result.id, applicationId: target.id, backendOwnerId: user.id, name: result.name, size: result.sizeBytes, type: result.contentType, sha256: result.sha256, uploadedAt: result.uploadedAt, storage: "server" };
            uploaded.push(document);
            await commitRemote((latest) => ({
              ...latest,
              documents: [...latest.documents.filter((existing) => existing.id !== document.id), document],
              drafts: latest.drafts.map((draft) => draft.id === target.id ? { ...draft, backendRevision, documentIds: [...new Set([...draft.documentIds, document.id])] } : draft),
            }));
            setDocumentsProgress({ completed: uploaded.length, total: files.length });
          }
        });
        plannedDocuments = uploaded;
        attachedIds = uploaded.map((item) => item.id);
        // Server documents are downloaded through the authenticated API; don't
        // make a confirmed upload depend on a second browser-storage write.
        savedFiles = [];
      }
      if (savedFiles.length) await saveDocumentFiles(savedFiles);
      if (target?.backendOwnerId !== user.id) setDocumentsProgress({ completed: files.length, total: files.length });
      await commitRemote((latest) => {
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
            ...plannedDocuments.filter(
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
                ...(backendRevision !== undefined ? { backendRevision } : {}),
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
      setDocumentsProgress({ completed: 0, total: 0 });
    }
  }
  async function attachDocument(draftId, documentId, remove = false) {
    if (apiApplicant) {
      const current = readCurrentState();
      const draft = current.drafts.find((item) => item.id === draftId && item.backendOwnerId === user.id);
      const document = current.documents.find((item) => item.id === documentId && item.backendOwnerId === user.id);
      if (!draft || !document) throw new Error("The draft or document is no longer available in this account.");
      if (remove) throw new Error("Documents already stored for this application cannot be removed from a draft.");
      return copyDocumentToApplication(document, draftId, uploadDocuments);
    }
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
    if (apiApplicant && draft.backendOwnerId === user.id) {
      await serviceApi.post('/privacy/consent', {version:'2026-11-23',accepted:true});
      const storedDraft = readCurrentState().drafts.find(
        (item) => item.id === draft.id && item.backendOwnerId === user.id,
      );
      if (!storedDraft)
        throw new Error("This backend draft is not available in the current account.");
      const fields = await apiFields(
        { ...draft, programmeVersionId: storedDraft.programmeVersionId || draft.programmeVersionId },
        profile || currentAccountProfile,
      );
      const budget = { items: draft.budgetItems.map(({ description, amount }) => ({ description, amount: String(amount) })), fundingRequested: String(draft.fundingRequested || ""), notApplicable: Boolean(draft.budgetNotApplicable) };
      let submitRevision = storedDraft.backendSubmitRevision;
      let submission = storedDraft.backendPendingSubmission;
      if (submitRevision !== undefined &&
          (JSON.stringify(fields) !== JSON.stringify(storedDraft.backendSubmitFields) ||
           JSON.stringify(budget) !== JSON.stringify(storedDraft.backendSubmitBudget))) {
        throw new Error("A submission retry is already in progress for the previously saved answers. Reload the draft before changing it.");
      }
      if (submitRevision === undefined) {
        const saved = await applicationsApi.withMutation(draft.id, () => {
          const live = readCurrentState().drafts.find((item) => item.id === draft.id && item.backendOwnerId === user.id);
          if (!live) throw new Error("This backend draft is not available in the current account.");
          return applicationsApi.save(draft.id, live.backendRevision, fields, budget);
        });
        submitRevision = saved.revision;
        await commitRemote((current) => ({
          ...current,
          drafts: current.drafts.map((item) => item.id === draft.id
            ? { ...item, ...fields, backendRevision: submitRevision,
                backendSubmitRevision: submitRevision, backendSubmitFields: fields,
                backendSubmitBudget: budget }
            : item),
        }));
      }
      if (!submission) {
        submission = await applicationsApi.withMutation(draft.id, () => applicationsApi.submit(draft.id, submitRevision, user.id));
        await commitRemote((current) => ({
          ...current,
          drafts: current.drafts.map((item) => item.id === draft.id
            ? { ...item, backendPendingSubmission: submission }
            : item),
        }));
      }
      const verified = await applicationsApi.readSubmission(draft.id, submission.id);
      const now = verified.submittedAt;
      const serverDocuments = verified.documents.map((document) => ({ ...document, applicationId: draft.id, backendDocumentId: document.id, verification: "Not verified", storage: "server" }));
      const version = {
        title: verified.fields.title,
        theme: verified.fields.theme,
        problem: verified.fields.problem,
        solution: verified.fields.solution,
        impact: verified.fields.impact,
        team: verified.fields.team,
        budgetItems: verified.budget.items,
        fundingRequested: verified.budget.fundingRequested,
        budgetNotApplicable: verified.budget.notApplicable,
        documents: serverDocuments,
        number: 1,
      };
      const idea = {
        ...version,
        id: verified.applicationId,
        documentIds: serverDocuments.map((document) => document.id),
        budgetItems: verified.budget.items,
        fundingRequested: verified.budget.fundingRequested,
        budgetNotApplicable: verified.budget.notApplicable,
        backendOwnerId: user.id,
        backendSubmissionId: verified.id,
        reference: verified.reference,
        status: "Submitted",
        submittedAt: now,
        updatedAt: now,
        version: 1,
        versions: [version],
        feedback: [],
        revisionRequest: null,
        events: [{ label: "Application received", at: now }],
      };
      await commitRemote((current) => ({
        ...current,
        ideas: [idea, ...current.ideas.filter((item) => item.id !== idea.id)],
        drafts: current.drafts.filter((item) => item.id !== draft.id),
        activeDraftId: null,
      }));
      applicationsApi.acknowledgeSubmit(draft.id, submitRevision, user.id);
      return idea.id;
    }
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
  const visibleDrafts = data.drafts.filter((item) =>
    item.backendOwnerId
      ? apiApplicant && item.backendOwnerId === user.id
      : !apiApplicant,
  );
  const visibleIdeas = data.ideas.filter((item) =>
    item.backendOwnerId
      ? apiApplicant && item.backendOwnerId === user.id
      : !apiApplicant,
  );
  const visibleDocuments = data.documents.filter((item) =>
    apiApplicant
      ? item.backendOwnerId === user.id
      : !item.backendOwnerId,
  );
  const draft =
    visibleDrafts.find((item) => item.id === data.activeDraftId) ||
    visibleDrafts[0] ||
    blankDraft("unsaved");
  return (
    <PortalContext.Provider
      value={{
        ...data,
        profile: {
          ...(apiApplicant ? currentAccountProfile : data.profile),
          _editRevision: revision((apiApplicant ? currentAccountProfile : data.profile)._editRevision),
        },
        drafts: visibleDrafts.map((item) => ({
          ...item,
          editRevision: revision(item.editRevision),
        })),
        ideas: visibleIdeas,
        documents: visibleDocuments,
        readCurrentState,
        reloadWorkspace,
        respondToReviewRequest,
        draft,
        storageWarning,
        applicationsLoading,
        // The form must not open on blanks or a stale cache: it would save them over the account's record.
        applicationsReady: !apiApplicant || restoredFor === user.id,
        applicationsError,
        refreshApplications,
        documentsBusy,
        documentsProgress,
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

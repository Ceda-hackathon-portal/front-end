import { createContext, useContext, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { usePortal } from "./PortalContext";
import { useAdmin } from "./AdminContext";
import { seedApplications } from "../data/admin";
import { applicationReference } from "../utils/applicant";
import {
  documentUploadPlan,
  prepareDocument,
  saveDocumentFiles,
} from "../services/applicantDocuments";
import {
  assertStaffRole,
  decideRecord,
  recordForVersion,
  reviewBlocker,
  reviewRecord,
  screenRecord,
  staffRoles,
  submittedReviews,
  visibleStaffRecord,
  decisionBlocker,
  scoringClosureBlocker,
  derivedAssignmentProgress,
  mayReadAssignedApplication,
} from "../utils/staffWorkflow";

const StaffWorkflowContext = createContext(null);
const STORAGE_KEY = "ceda.staff.workflow.v1";

function readSavedRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { records: {}, warning: "" };
    const data = JSON.parse(saved);
    if (
      !data ||
      typeof data.records !== "object" ||
      Array.isArray(data.records) ||
      !Object.values(data.records).every(
        (record) =>
          record &&
          Array.isArray(record.reviews) &&
          Array.isArray(record.documents) &&
          Array.isArray(record.history) &&
          Number.isInteger(record.applicationVersion),
      )
    )
      throw new Error("Invalid workflow data");
    return { records: data.records, warning: "" };
  } catch {
    return {
      records: {},
      warning:
        "Saved staff records could not be read. The existing copy has been kept. Restore browser storage before saving.",
    };
  }
}

export function StaffWorkflowProvider({ children }) {
  const { staffUser } = useAuth();
  const portal = usePortal();
  const admin = useAdmin();
  const [initial] = useState(readSavedRecords);
  const [, setSavedRecords] = useState(initial.records);
  const savedRef = useRef(initial.records);
  const uploading = useRef(false);
  const [storageWarning, setStorageWarning] = useState(initial.warning);

  const allApplications = [
    ...portal.ideas.map((idea) => {
      const latest = idea.versions?.at(-1) || idea;
      return {
        ...idea,
        ...latest,
        id: idea.id,
        reference: applicationReference(idea),
        programmeId: idea.programmeId || "p_ich_2026",
        documents: latest.documents || idea.documents || [],
        applicant: latest.applicant || idea.applicant || null,
        sample: idea.id.startsWith("CEDA-DEMO-"),
        version: latest.number || idea.version || 1,
      };
    }),
    ...seedApplications.map((application) => ({
      ...application,
      programmeId: "p_ich_2026",
      version: 1,
      sample: true,
      documents: [],
    })),
  ]
    .map((application) => ({
      ...application,
      criteria:
        admin.programmes.find(
          (programme) => programme.id === application.programmeId,
        )?.criteria || [],
    }))
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));

  function applicationById(id) {
    const application = allApplications.find((item) => item.id === id);
    if (!application)
      throw new Error(
        "Application not found. Reopen it from the applications list.",
      );
    return application;
  }
  function programmeFor(application) {
    const programme = admin.programmes.find(
      (item) => item.id === application.programmeId,
    );
    if (!programme)
      throw new Error("The application programme is unavailable.");
    return programme;
  }
  function rawRecord(application) {
    return recordForVersion(
      portal.staffRecords?.[application.id] || savedRef.current[application.id],
      application,
    );
  }
  function isAssigned(application) {
    return mayReadAssignedApplication(
      staffUser,
      application,
      rawRecord(application),
      admin.assignments[application.id] || [],
    );
  }
  function ensureRead(application) {
    assertStaffRole(staffUser, staffRoles);
    if (staffUser.role === "evaluator" && !isAssigned(application))
      throw new Error("This application is not assigned to you.");
  }
  function saveRecord(application, record) {
    const latest = rawRecord(application);
    if ((latest.revision || 0) !== (record.revision || 0))
      throw new Error("This staff record changed. Reopen it before saving.");
    record = { ...record, revision: (record.revision || 0) + 1 };
    if (portal.ideas.some((idea) => idea.id === application.id)) {
      portal.commitStaffWorkflow(application.id, record);
      return;
    }
    if (initial.warning) throw new Error(initial.warning);
    const next = { ...savedRef.current, [application.id]: record };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ records: next }));
    } catch {
      const message =
        "The staff action could not be saved. Free browser storage and retry.";
      setStorageWarning(message);
      throw new Error(message);
    }
    savedRef.current = next;
    setSavedRecords(next);
    setStorageWarning("");
  }
  function getRecord(id) {
    const application = applicationById(id);
    ensureRead(application);
    const record = rawRecord(application);
    const programme = programmeFor(application);
    const assignments = admin.assignments[id] || [];
    const reviewMessage = reviewBlocker({
      staff: staffUser,
      application,
      record,
      programme,
      assignments,
    });
    const decisionMessage = decisionBlocker({
      staff: staffUser,
      record,
      programme,
      assignments,
      result:
        record.screening?.result === "ineligible" ? "not_eligible" : "selected",
    });
    return {
      ...visibleStaffRecord(record, staffUser, programme, assignments),
      reviewBlocker: reviewMessage,
      canReview: !reviewMessage,
      decisionBlocker: decisionMessage,
    };
  }
  function screenApplication(id, input) {
    const application = applicationById(id);
    const record = screenRecord({
      staff: staffUser,
      application,
      record: rawRecord(application),
      input,
    });
    saveRecord(application, record);
  }
  function saveReview(id, input) {
    const application = applicationById(id);
    const record = reviewRecord({
      staff: staffUser,
      application,
      record: rawRecord(application),
      programme: programmeFor(application),
      assignments: admin.assignments[id] || [],
      input,
    });
    saveRecord(application, record);
  }
  function saveDecision(id, input) {
    const application = applicationById(id);
    const record = decideRecord({
      staff: staffUser,
      record: rawRecord(application),
      programme: programmeFor(application),
      assignments: admin.assignments[id] || [],
      input,
    });
    saveRecord(application, record);
  }
  async function uploadStaffDocuments(id, files) {
    assertStaffRole(staffUser, [
      "eligibility-officer",
      "evaluator",
      "adjudicator",
      "administrator",
    ]);
    const application = applicationById(id);
    ensureRead(application);
    const selected = Array.from(files || []);
    if (!selected.length) throw new Error("Choose at least one document.");
    if (uploading.current)
      throw new Error("Wait for the current upload to finish.");
    if (selected.length > 10)
      throw new Error("Attach up to 10 internal documents per application.");
    uploading.current = true;
    try {
      const prepared = [];
      for (const file of selected)
        prepared.push(await prepareDocument(file, "staff-supporting"));
      const before = rawRecord(application);
      const plan = documentUploadPlan(prepared, before.documents);
      if (before.documents.length + plan.documents.length > 10)
        throw new Error("Attach up to 10 internal documents per application.");
      await saveDocumentFiles(plan.files);
      const current = rawRecord(application);
      saveRecord(application, {
        ...current,
        documents: [...current.documents, ...plan.documents],
        history: [
          {
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            actor: staffUser.name,
            role: staffUser.role,
            action: `Attached ${plan.ids.length} internal document(s)`,
          },
          ...current.history,
        ],
      });
      return plan.ids;
    } finally {
      uploading.current = false;
    }
  }
  function closeScoring(programmeId) {
    assertStaffRole(staffUser, ["administrator"]);
    const programme = admin.programmes.find((item) => item.id === programmeId);
    const blocker = scoringClosureBlocker(
      programme,
      allApplications,
      rawRecord,
      admin.assignments,
    );
    if (blocker) throw new Error(blocker);
    admin.closeScoring(programmeId);
  }

  const workflowAssignments = derivedAssignmentProgress(
    admin.assignments,
    Object.fromEntries(
      allApplications.map((application) => [
        application.id,
        rawRecord(application),
      ]),
    ),
  );

  const applications =
    staffUser && staffRoles.includes(staffUser.role)
      ? allApplications
          .filter(
            (application) =>
              staffUser.role !== "evaluator" || isAssigned(application),
          )
          .map((application) => {
            const record = rawRecord(application);
            return {
              ...application,
              conflictedReviewerIds: (workflowAssignments[application.id] || [])
                .filter((assignment) => assignment.progress === "conflicted")
                .map((assignment) => assignment.evaluatorId),
              eligibility:
                record.screening?.result === "ineligible"
                  ? "not_eligible"
                  : record.screening?.result || "pending",
              reviewCount: submittedReviews(
                record,
                admin.assignments[application.id] || [],
              ).length,
              currentStage: record.decision?.publishedAt
                ? "decision"
                : record.screening?.result === "eligible"
                  ? "evaluation"
                  : "eligibility",
            };
          })
      : [];
  const records = Object.fromEntries(
    applications.map((application) => [
      application.id,
      getRecord(application.id),
    ]),
  );

  return (
    <StaffWorkflowContext.Provider
      value={{
        applications,
        assignments: workflowAssignments,
        records,
        programmes: admin.programmes,
        getRecord,
        screenApplication,
        saveReview,
        saveDecision,
        uploadStaffDocuments,
        closeScoring,
        storageWarning:
          storageWarning || portal.storageWarning || admin.storageWarning,
      }}
    >
      {children}
    </StaffWorkflowContext.Provider>
  );
}

export const useStaffWorkflow = () => useContext(StaffWorkflowContext);

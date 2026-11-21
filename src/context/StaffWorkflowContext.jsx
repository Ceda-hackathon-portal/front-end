import { createContext, useContext, useRef, useState, useEffect } from "react";
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
  createBrowserStore,
  assertRecordUnchanged,
  withBrowserStoreLock,
} from "../services/browserPersistence";
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
function validStaffState(value) {
  return Boolean(
    value &&
    value.records &&
    typeof value.records === "object" &&
    !Array.isArray(value.records) &&
    Object.values(value.records).every(
      (record) =>
        record &&
        Array.isArray(record.reviews) &&
        Array.isArray(record.documents) &&
        Array.isArray(record.history) &&
        Number.isInteger(record.applicationVersion),
    ),
  );
}
function applicationsFrom(portal, admin) {
  return [
    ...portal.ideas.map((idea) => {
      const latest = idea.versions?.at(-1) || idea;
      return {
        ...idea,
        ...latest,
        id: idea.id,
        reference: applicationReference(idea),
        programmeId: idea.programmeId || latest.programmeId || "p_ich_2026",
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
}
function updatedAfter(previous) {
  return new Date(
    Math.max(Date.now(), (Date.parse(previous) || 0) + 1),
  ).toISOString();
}

export function StaffWorkflowProvider({ children }) {
  const { staffUser } = useAuth();
  const staffRef = useRef(staffUser);
  staffRef.current = staffUser;
  const portal = usePortal();
  const admin = useAdmin();
  const [store] = useState(() =>
    createBrowserStore({
      key: STORAGE_KEY,
      initialValue: { records: {} },
      validate: validStaffState,
    }),
  );
  const [saved, setSaved] = useState(store.getSnapshot);
  const [storageWarning, setStorageWarning] = useState(store.getWarning);
  const uploading = useRef(false);
  useEffect(
    () =>
      store.subscribe((next, warning) => {
        setSaved(next);
        setStorageWarning(warning);
      }),
    [store],
  );
  const allApplications = applicationsFrom(portal, admin);

  function rawRecord(application, sources = { portal, staff: saved }) {
    return recordForVersion(
      sources.portal.staffRecords?.[application.id] ||
        sources.staff.records[application.id],
      application,
    );
  }
  function programmeFor(application, state = admin) {
    const programme = state.programmes.find(
      (item) => item.id === application.programmeId,
    );
    if (!programme)
      throw new Error("The application programme is unavailable.");
    return programme;
  }
  function isAssigned(
    application,
    record = rawRecord(application),
    state = admin,
  ) {
    return mayReadAssignedApplication(
      staffUser,
      application,
      record,
      state.assignments[application.id] || [],
    );
  }
  function ensureRead(application, record, state = admin) {
    assertStaffRole(staffUser, staffRoles);
    if (
      staffUser.role === "evaluator" &&
      !isAssigned(application, record, state)
    )
      throw new Error("This application is not assigned to you.");
  }
  function findApplication(id, applications = allApplications) {
    const application = applications.find((item) => item.id === id);
    if (!application)
      throw new Error(
        "Application not found. Reopen it from the applications list.",
      );
    return application;
  }
  function freshSources() {
    return {
      portal: portal.readCurrentState(),
      admin: admin.readCurrentState(),
      staff: store.read(),
    };
  }
  function currentCase(id, displayed, sources) {
    const application = findApplication(
      id,
      applicationsFrom(sources.portal, sources.admin),
    );
    assertRecordUnchanged(
      displayed.version,
      application.version,
      "This application version",
    );
    return application;
  }
  function assertCurrentActor() {
    if (
      staffRef.current?.id !== staffUser?.id ||
      staffRef.current?.role !== staffUser?.role
    )
      throw new Error(
        "Your staff session changed. Reopen the record before continuing.",
      );
  }
  // The mutation is built inside the shared metadata transaction, so assignment,
  // programme and applicant changes queued before it are included in its checks.
  async function mutateCase(id, displayed, change) {
    let savedRecord;
    let savedApplication;
    let savedSources;
    function build(sources) {
      assertCurrentActor();
      const application = currentCase(id, displayed, sources);
      const previous = rawRecord(application, sources);
      const record = change(application, previous, sources);
      savedRecord = { ...record, revision: (previous.revision || 0) + 1 };
      savedApplication = application;
      savedSources = sources;
      return savedRecord;
    }
    if (portal.readCurrentState().ideas.some((idea) => idea.id === id)) {
      await portal.commitStaffWorkflow(id, (current) =>
        build({
          portal: current.portal,
          admin: current.admin,
          staff: store.read(),
        }),
      );
    } else {
      await store.update((current) => {
        const sources = {
          portal: portal.readCurrentState(),
          admin: admin.readCurrentState(),
          staff: current,
        };
        return {
          ...current,
          records: { ...current.records, [id]: build(sources) },
        };
      });
    }
    return visibleStaffRecord(
      savedRecord,
      staffUser,
      programmeFor(savedApplication, savedSources.admin),
      savedSources.admin.assignments[id] || [],
    );
  }
  function getRecord(id) {
    const application = findApplication(id);
    const record = rawRecord(application);
    ensureRead(application, record);
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
    const displayed = findApplication(id);
    return withBrowserStoreLock("staff-workflow", () =>
      mutateCase(id, displayed, (application, previous) => {
        if (Object.hasOwn(input, "expectedScreeningAt"))
          assertRecordUnchanged(
            input.expectedScreeningAt,
            previous.screening?.at || null,
            "This screening result",
          );
        return screenRecord({
          staff: staffUser,
          application,
          record: previous,
          input,
          now: updatedAfter(previous.screening?.at),
        });
      }),
    );
  }
  function saveReview(id, input) {
    const displayed = findApplication(id);
    return withBrowserStoreLock("staff-workflow", () =>
      mutateCase(id, displayed, (application, previous, sources) => {
        const own = previous.reviews.find(
          (review) => review.reviewerId === staffUser?.id,
        );
        if (Object.hasOwn(input, "expectedReviewUpdatedAt"))
          assertRecordUnchanged(
            input.expectedReviewUpdatedAt,
            own?.updatedAt || null,
            "Your review draft",
          );
        return reviewRecord({
          staff: staffUser,
          application,
          record: previous,
          programme: programmeFor(application, sources.admin),
          assignments: sources.admin.assignments[id] || [],
          input,
          now: updatedAfter(own?.updatedAt),
        });
      }),
    );
  }
  function saveDecision(id, input) {
    const displayed = findApplication(id);
    return withBrowserStoreLock("staff-workflow", () =>
      mutateCase(id, displayed, (application, previous, sources) => {
        if (Object.hasOwn(input, "expectedDecisionAt"))
          assertRecordUnchanged(
            input.expectedDecisionAt,
            previous.decision?.at || null,
            "This decision draft",
          );
        return decideRecord({
          staff: staffUser,
          record: previous,
          programme: programmeFor(application, sources.admin),
          assignments: sources.admin.assignments[id] || [],
          input,
          now: updatedAfter(previous.decision?.at),
        });
      }),
    );
  }
  async function uploadStaffDocuments(id, files) {
    assertStaffRole(staffUser, [
      "eligibility-officer",
      "evaluator",
      "adjudicator",
      "administrator",
    ]);
    const displayed = findApplication(id);
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
      return await withBrowserStoreLock("staff-workflow", async () => {
        assertCurrentActor();
        let sources = freshSources();
        let application = currentCase(id, displayed, sources);
        let previous = rawRecord(application, sources);
        ensureRead(application, previous, sources.admin);
        const plan = documentUploadPlan(prepared, previous.documents);
        if (previous.documents.length + plan.documents.length > 10)
          throw new Error(
            "Attach up to 10 internal documents per application.",
          );
        await saveDocumentFiles(plan.files);
        assertCurrentActor();
        await mutateCase(id, displayed, (application, previous, sources) => {
          ensureRead(application, previous, sources.admin);
          const added = plan.documents.filter(
            (item) =>
              !previous.documents.some((existing) => existing.id === item.id),
          );
          if (previous.documents.length + added.length > 10)
            throw new Error(
              "Attach up to 10 internal documents per application.",
            );
          return {
            ...previous,
            documents: [...previous.documents, ...added],
            history: [
              {
                id: crypto.randomUUID(),
                at: new Date().toISOString(),
                actor: staffUser.name,
                role: staffUser.role,
                action: `Attached ${plan.ids.length} internal document(s)`,
              },
              ...previous.history,
            ],
          };
        });
        return plan.ids;
      });
    } finally {
      uploading.current = false;
    }
  }
  function closeScoring(programmeId) {
    return withBrowserStoreLock("staff-workflow", () => {
      assertCurrentActor();
      assertStaffRole(staffUser, ["administrator"]);
      return admin.closeScoring(programmeId, {
        assertCanClose(programme, currentAdmin) {
          assertCurrentActor();
          const sources = {
            portal: portal.readCurrentState(),
            admin: currentAdmin,
            staff: store.read(),
          };
          const blocker = scoringClosureBlocker(
            programme,
            applicationsFrom(sources.portal, sources.admin),
            (application) => rawRecord(application, sources),
            sources.admin.assignments,
          );
          if (blocker) throw new Error(blocker);
        },
      });
    });
  }
  function respondToReviewRequest(id, input) {
    return withBrowserStoreLock("staff-workflow", () => {
      assertCurrentActor();
      assertStaffRole(staffUser, ["administrator", "adjudicator"]);
      return portal.respondToReviewRequest(id, input);
    });
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
        respondToReviewRequest,
        storageWarning:
          storageWarning || portal.storageWarning || admin.storageWarning,
      }}
    >
      {children}
    </StaffWorkflowContext.Provider>
  );
}

export const useStaffWorkflow = () => useContext(StaffWorkflowContext);

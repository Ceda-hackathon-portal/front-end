import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  currentManager as defaultManager,
  otherManager,
  evaluators,
  seedApplications,
  seedAssignments,
  seedProgrammes,
  templates,
} from "../data/admin";
import {
  approvalBlocker,
  assignmentBlocker,
  assignmentEditBlocker,
  isEditable,
  validateProgramme,
} from "../utils/admin";

// Programme manager demo state, saved in this browser. Each action matches one endpoint in docs/API_CONTRACT.md,
// so wiring the API replaces the bodies of these functions, not the pages.
import {
  createBrowserStore,
  assertRecordUnchanged,
} from "../services/browserPersistence";

const AdminContext = createContext(null);
const STORAGE_KEY = "ceda.admin.v1";

function fresh() {
  return {
    programmes: structuredClone(seedProgrammes),
    assignments: structuredClone(seedAssignments),
  };
}

export function AdminProvider({ children }) {
  const { staffUser } = useAuth();
  const currentManager =
    staffUser?.id === otherManager.id ? otherManager : defaultManager;
  const entry = (action) => ({
    at: new Date().toISOString(),
    actor: currentManager.name,
    action,
  });
  const [store] = useState(() =>
    createBrowserStore({
      key: STORAGE_KEY,
      initialValue: fresh(),
      validate: (value) =>
        Boolean(
          value &&
          Array.isArray(value.programmes) &&
          value.programmes.every(
            (item) =>
              item &&
              item.id &&
              Array.isArray(item.criteria) &&
              Array.isArray(item.history),
          ) &&
          value.assignments &&
          typeof value.assignments === "object" &&
          !Array.isArray(value.assignments),
        ),
    }),
  );
  const [data, setData] = useState(store.getSnapshot);
  const [storageWarning, setStorageWarning] = useState(store.getWarning);
  useEffect(
    () =>
      store.subscribe((next, warning) => {
        setData(next);
        setStorageWarning(warning);
      }),
    [store],
  );

  function readCurrentState() {
    return store.read();
  }
  async function persist(change) {
    try {
      return await store.update(change);
    } catch (error) {
      setStorageWarning(error.message);
      throw error;
    }
  }
  async function changeProgramme(id, change, options = {}) {
    const expected = data.programmes.find((item) => item.id === id);
    let result;
    await persist((current) => {
      const programme = current.programmes.find((item) => item.id === id);
      if (!programme) throw new Error("Programme not found.");
      assertRecordUnchanged(
        Object.hasOwn(options, "expectedVersion")
          ? options.expectedVersion
          : expected?.version,
        programme.version,
        "This programme",
      );
      result = {
        ...change(programme, current),
        version: programme.version + 1,
      };
      return {
        ...current,
        programmes: current.programmes.map((item) =>
          item.id === id ? result : item,
        ),
      };
    });
    return result;
  }

  // POST /admin/programmes
  async function createProgramme({ templateId, name }) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) throw new Error("Choose a template.");
    if (!name?.trim()) throw new Error("Enter a programme name.");
    const id = "p_" + crypto.randomUUID().slice(0, 8);
    const year = new Date().getFullYear() + 1;
    const programme = {
      id,
      code:
        template.id
          .split("_")
          .map((word) => word[0])
          .join("")
          .toUpperCase() +
        "-" +
        year,
      name: name.trim(),
      templateId,
      status: "draft",
      summary: "",
      opensAt: "",
      closesAt: "",
      ...structuredClone({
        themes: template.themes,
        criteria: template.criteria,
        stages: template.stages,
      }),
      reviewersPerApplication: template.reviewersPerApplication,
      shortlistSize: template.shortlistSize,
      version: 1,
      createdBy: currentManager,
      lastEditedBy: currentManager,
      approvedBy: null,
      history: [
        entry(`Created from the ${template.name.toLowerCase()} template`),
      ],
    };
    await persist((current) => ({
      ...current,
      programmes: [programme, ...current.programmes],
    }));
    return id;
  }

  // PATCH /admin/programmes/:id (draft only)
  async function updateProgramme(id, fields, options = {}) {
    return changeProgramme(
      id,
      (programme) => {
        if (!isEditable(programme))
          throw new Error(
            "Settings are locked. Return the programme to draft to change them.",
          );
        const edited =
          programme.history[0]?.action === "Edited settings" &&
          programme.history[0]?.actor === currentManager.name;
        return {
          ...programme,
          ...fields,
          lastEditedBy: currentManager,
          history: edited
            ? programme.history
            : [entry("Edited settings"), ...programme.history],
        };
      },
      options,
    );
  }

  // POST /admin/programmes/:id/submit-for-approval
  async function submitForApproval(id, options = {}) {
    return changeProgramme(
      id,
      (programme) => {
        if (programme.status !== "draft")
          throw new Error("Only a draft can be submitted for approval.");
        if (Object.keys(validateProgramme(programme)).length)
          throw new Error("Fix the highlighted settings first.");
        return {
          ...programme,
          status: "awaiting_approval",
          history: [entry("Submitted for approval"), ...programme.history],
        };
      },
      options,
    );
  }

  // POST /admin/programmes/:id/approve
  async function approveProgramme(id, options = {}) {
    return changeProgramme(
      id,
      (programme) => {
        const blocker = approvalBlocker(programme, currentManager.id);
        if (blocker) throw new Error(blocker);
        return {
          ...programme,
          status: "open",
          approvedBy: currentManager,
          history: [
            entry("Approved and opened. Settings locked"),
            ...programme.history,
          ],
        };
      },
      options,
    );
  }

  // POST /admin/programmes/:id/return
  async function returnToDraft(id, reason, options = {}) {
    if (!reason?.trim())
      throw new Error(
        "Give a reason so the other manager knows what to change.",
      );
    return changeProgramme(
      id,
      (programme) => {
        if (programme.status !== "awaiting_approval")
          throw new Error(
            "Only a programme awaiting approval can be returned.",
          );
        return {
          ...programme,
          status: "draft",
          history: [
            entry("Returned to draft: " + reason.trim()),
            ...programme.history,
          ],
        };
      },
      options,
    );
  }

  // POST /admin/programmes/:id/close
  async function closeApplications(id, options = {}) {
    return changeProgramme(
      id,
      (programme) => {
        if (programme.status !== "open")
          throw new Error("Only an open programme can be closed.");
        return {
          ...programme,
          status: "closed",
          history: [entry("Closed to new applications"), ...programme.history],
        };
      },
      options,
    );
  }

  // PUT /admin/programmes/:id/applications/:applicationId/assignments
  async function setAssignments(
    programmeId,
    application,
    evaluatorIds,
    options = {},
  ) {
    const expected = Object.hasOwn(options, "expectedEvaluatorIds")
      ? options.expectedEvaluatorIds
      : (data.assignments[application.id] || []).map(
          (item) => item.evaluatorId,
        );
    await persist((current) => {
      const programme = current.programmes.find(
        (item) => item.id === programmeId,
      );
      if (!programme) throw new Error("Programme not found.");
      const blocker = assignmentBlocker({
        programme,
        application,
        evaluatorIds,
        evaluators,
      });
      if (blocker) throw new Error(blocker);
      const previous = current.assignments[application.id] || [];
      const editBlocker = assignmentEditBlocker(expected, previous);
      if (editBlocker) throw new Error(editBlocker);
      const dueAt = new Date(Date.now() + 14 * 86400000).toISOString();
      const nextAssignments = evaluatorIds.map(
        (evaluatorId) =>
          previous.find((item) => item.evaluatorId === evaluatorId) || {
            evaluatorId,
            progress: "not_started",
            assignedAt: new Date().toISOString(),
            dueAt,
          },
      );
      const names =
        evaluatorIds
          .map((id) => evaluators.find((item) => item.id === id).name)
          .join(", ") || "nobody";
      return {
        ...current,
        programmes: current.programmes.map((item) =>
          item.id === programmeId
            ? {
                ...item,
                history: [
                  entry(`Assigned ${names} to ${application.reference}`),
                  ...item.history,
                ],
              }
            : item,
        ),
        assignments: {
          ...current.assignments,
          [application.id]: nextAssignments,
        },
      };
    });
  }

  // Workflow checks are performed by StaffWorkflowContext before this locked transition.
  async function closeScoring(id, { assertCanClose } = {}) {
    if (staffUser?.role !== "administrator")
      throw new Error("Only the administrator can close scoring.");
    if (typeof assertCanClose !== "function")
      throw new Error(
        "Close scoring from the staff workflow so current reviews can be checked.",
      );
    let result;
    await persist((current) => {
      const programme = current.programmes.find((item) => item.id === id);
      if (!programme || programme.status !== "closed")
        throw new Error("Close applications before closing scoring.");
      assertCanClose(programme, current);
      result = {
        ...programme,
        status: "scoring_closed",
        version: programme.version + 1,
        history: [
          entry("Scoring closed after assigned reviews were checked"),
          ...programme.history,
        ],
      };
      return {
        ...current,
        programmes: current.programmes.map((item) =>
          item.id === id ? result : item,
        ),
      };
    });
    return result;
  }

  async function resetAdminDemo() {
    await persist(() => fresh());
  }

  return (
    <AdminContext.Provider
      value={{
        ...data,
        storageWarning,
        currentManager,
        readCurrentState,
        createProgramme,
        updateProgramme,
        submitForApproval,
        approveProgramme,
        returnToDraft,
        closeApplications,
        setAssignments,
        resetAdminDemo,
        closeScoring,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);

export const applicationTimelineStages = [
  ["submitted", "Submitted"],
  ["eligibility", "Eligibility"],
  ["shortlist", "Shortlist"],
  ["evaluation", "Evaluation"],
  ["decision", "Decision"],
  ["award", "Award"],
];

// Progress comes from recorded workflow facts, never from the broad "Feedback"
// badge. A correction at screening is not evidence of a completed evaluation.
export function applicationTimeline(application, staffRecord) {
  const stages = applicationTimelineStages.map(([code, label]) => {
    const recorded = application.stages?.find((stage) => stage.code === code);
    return { ...recorded, code, label, state: recorded?.state || "upcoming" };
  });
  const setStage = (code, change) =>
    Object.assign(
      stages.find((stage) => stage.code === code),
      change,
    );
  const version =
    application.versions?.at(-1)?.number || application.version || 1;
  const screening =
    staffRecord?.applicationVersion === version ? staffRecord.screening : null;
  const correction =
    application.revisionRequest?.status === "open"
      ? application.revisionRequest
      : null;
  const outcome = application.outcome;
  let currentStage = "eligibility";
  setStage("submitted", {
    state: "done",
    completedAt: application.submittedAt,
  });

  if (outcome) {
    currentStage = application.status === "Award" ? "award" : "decision";
    setStage("eligibility", { state: "done", completedAt: screening?.at });
    setStage("shortlist", {
      state:
        outcome.result === "not_eligible" ? "not_applicable" : "not_recorded",
    });
    setStage("evaluation", {
      state: outcome.result === "not_eligible" ? "not_applicable" : "done",
    });
    setStage("decision", { state: "done", completedAt: outcome.releasedAt });
    if (outcome.result !== "selected")
      setStage("award", { state: "not_applicable" });
    else if (application.status === "Award")
      setStage("award", { state: "in_progress" });
  } else if (correction) {
    // An unresolved correction always remains at its evidence check. Stale
    // historical states must not paint the future stages as completed.
    for (const code of ["shortlist", "evaluation", "decision", "award"]) {
      setStage(code, { state: "upcoming", completedAt: undefined });
    }
    setStage("eligibility", {
      state: "waiting_for_applicant",
      completedAt: undefined,
      expectedBy: correction.dueAt || undefined,
      action: { message: correction.message, dueAt: correction.dueAt },
    });
  } else if (
    screening?.result === "eligible" ||
    (!screening && application.status === "Under review")
  ) {
    currentStage = "evaluation";
    setStage("eligibility", { state: "done", completedAt: screening?.at });
    if (stages.find((stage) => stage.code === "shortlist").state === "upcoming")
      setStage("shortlist", { state: "not_recorded" });
    setStage("evaluation", { state: "in_progress" });
  } else if (
    screening ||
    application.status === "Submitted" ||
    application.revisionRequest?.status === "responded"
  ) {
    setStage("eligibility", { state: "in_progress" });
  } else if (
    application.currentStage &&
    stages.some((stage) => stage.code === application.currentStage)
  ) {
    currentStage = application.currentStage;
    setStage(currentStage, { state: "in_progress" });
  } else {
    setStage("eligibility", { state: "in_progress" });
  }
  return { currentStage, stages };
}

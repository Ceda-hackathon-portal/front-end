import { evaluators, templates } from "../data/admin.js";
import { ownershipSummary, isExpired, canUpdate } from "./applicantWorkflow.js";

export const reviewCriteria = templates.find(
  (item) => item.id === "innovation_challenge",
).criteria;
export const staffRoles = [
  "eligibility-officer",
  "evaluator",
  "adjudicator",
  "administrator",
  "management",
  "system-administrator",
];

export function assertStaffRole(staff, allowed) {
  if (!staff || !allowed.includes(staff.role))
    throw new Error("Your staff role cannot perform this action.");
}

export function automaticChecks(application, now = new Date()) {
  const profile = application.applicant;
  const ownership = ownershipSummary(profile?.shareholders || [], now);
  const documents = application.documents || [];
  return [
    {
      id: "contact",
      label: "Applicant details",
      state: profile?.fullName && profile?.email ? "pass" : "unknown",
      detail:
        profile?.fullName && profile?.email
          ? "Contact details supplied; identity remains subject to verification."
          : "Complete applicant evidence is not available in this record.",
    },
    {
      id: "registration",
      label: "Company registration",
      state:
        profile?.registered === "yes" && profile?.registrationNumber
          ? "pass"
          : profile?.registered === "no"
            ? "attention"
            : "unknown",
      detail:
        "Checks the declaration and registration number, not the official register.",
    },
    {
      id: "ownership",
      label: "Youth citizen ownership",
      state: !ownership.complete
        ? "unknown"
        : ownership.total === 100 && ownership.youthCitizen > 50
          ? "pass"
          : "attention",
      detail: !ownership.complete
        ? "Complete shareholder names, dates of birth, citizenship and percentages are needed."
        : `${ownership.youthCitizen}% declared youth citizen ownership. The supplied challenge asks for more than 50%; evidence still needs an officer.`,
    },
    {
      id: "proposal",
      label: "Technical proposal attached",
      state: documents.some((item) => item.category === "technical-proposal")
        ? "pass"
        : application.sample
          ? "unknown"
          : "attention",
      detail:
        "Attachment metadata is checked here; open the file and verify its contents separately.",
    },
    {
      id: "expiry",
      label: "Document dates",
      state: !documents.length
        ? "unknown"
        : documents.some((item) => isExpired(item, now))
          ? "attention"
          : "pass",
      detail:
        "Flags supplied expiry dates. Missing expiry dates do not prove a document is valid.",
    },
    {
      id: "security",
      label: "Document verification",
      state: "unknown",
      detail:
        "Server malware scanning, authenticity and legibility checks are not connected.",
    },
  ];
}

export function emptyStaffRecord(application) {
  return {
    revision: 0,
    applicationVersion: application.version || 1,
    screening:
      application.sample && application.eligibility === "eligible"
        ? {
            result: "eligible",
            reason:
              "Illustrative screening from the sample intake; not a verified CEDA assessment.",
            at: application.submittedAt,
            sample: true,
          }
        : null,
    reviews: [],
    decision: null,
    documents: [],
    history: [],
    previousVersions: [],
  };
}

export function recordForVersion(record, application) {
  if (!record) return emptyStaffRecord(application);
  if (record.applicationVersion === (application.version || 1)) return record;
  return {
    ...emptyStaffRecord(application),
    documents: record.documents,
    history: record.history,
    previousVersions: [
      ...(record.previousVersions || []),
      { ...record, previousVersions: undefined },
    ],
  };
}

export function reviewBlocker({
  staff,
  application,
  record,
  programme,
  assignments,
}) {
  if (staff?.role !== "evaluator")
    return "Only the assigned reviewer can score this application.";
  const assigned = assignments.find((item) => item.evaluatorId === staff.id);
  if (!assigned) return "This application has not been assigned to you.";
  if (
    evaluators
      .find((item) => item.id === staff.id)
      ?.conflicts.includes(application.id)
  )
    return "A declared conflict prevents you from reviewing this application.";
  if (record.screening?.result !== "eligible")
    return "Complete eligibility screening before reviewing.";
  if (!["open", "closed"].includes(programme.status))
    return "Scoring is closed for this programme.";
  if (record.decision?.publishedAt)
    return "This application already has a released outcome.";
  if (
    record.reviews.some(
      (item) =>
        item.reviewerId === staff.id &&
        ["submitted", "conflicted"].includes(item.status),
    )
  )
    return "Your review is already final. Ask the programme manager if it needs reopening.";
  return "";
}

export function submittedReviews(record, assignments) {
  const assigned = new Set(assignments.map((item) => item.evaluatorId));
  return record.reviews.filter(
    (item) => item.status === "submitted" && assigned.has(item.reviewerId),
  );
}

export function decisionBlocker({
  staff,
  record,
  programme,
  assignments,
  result,
}) {
  if (!["adjudicator", "administrator"].includes(staff?.role))
    return "Only the decision maker or administrator can record an outcome.";
  if (record.decision?.publishedAt)
    return "The outcome has already been released.";
  if (
    record.reviews.some(
      (item) => item.reviewerId === staff.id && item.status === "submitted",
    )
  )
    return "A reviewer cannot decide their own reviewed application.";
  if (result === "not_eligible" && record.screening?.result === "ineligible")
    return "";
  if (record.screening?.result !== "eligible")
    return "An eligibility officer must first confirm eligibility.";
  if (!["scoring_closed", "outcomes_released"].includes(programme.status))
    return "The programme manager must close scoring before a decision.";
  if (
    submittedReviews(record, assignments).length <
    programme.reviewersPerApplication
  )
    return `Complete ${programme.reviewersPerApplication} assigned reviews before a decision.`;
  if (result === "selected") {
    const criteria = programme.criteria || reviewCriteria;
    if (!criteria.length)
      return "The programme scoring criteria are unavailable. Restore them before selecting an application.";
    const completeReviews = submittedReviews(record, assignments).filter(
      (review) =>
        criteria.every((criterion) => {
          const score = review.scores?.[criterion.id];
          return Number.isInteger(score) && score >= 1 && score <= 5;
        }),
    );
    if (completeReviews.length < programme.reviewersPerApplication)
      return `Selection requires ${programme.reviewersPerApplication} assigned reviews with valid scores for every programme criterion.`;
    // The proposal compares criterion averages with the frozen programme minimums.
    // A missed minimum blocks selection; it never makes an automatic rejection.
    for (const criterion of criteria) {
      const minimum = Number(criterion.minimum);
      if (!(minimum > 0)) continue;
      const average =
        completeReviews.reduce(
          (total, review) => total + review.scores[criterion.id],
          0,
        ) / completeReviews.length;
      if (average < minimum)
        return `Selection is blocked: ${criterion.name} averages ${average.toFixed(2)} out of 5, below the programme minimum of ${minimum}. Record a reasoned non-selection or refer the scores for moderation.`;
    }
  }
  return "";
}

const event = (staff, action, now) => ({
  id: crypto.randomUUID(),
  at: now,
  actor: staff.name,
  role: staff.role,
  action,
});
const reasonText = (value, prompt) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 3000)
    throw new Error(prompt);
  return value.trim();
};

export function screenRecord({
  staff,
  application,
  record,
  input,
  now = new Date().toISOString(),
}) {
  assertStaffRole(staff, ["eligibility-officer", "administrator"]);
  if (!["eligible", "correction_needed", "ineligible"].includes(input.result))
    throw new Error("Choose a screening result.");
  if (
    record.decision?.publishedAt ||
    record.reviews.some((item) => item.status === "submitted")
  )
    throw new Error(
      "Screening is locked after a submitted review or released outcome.",
    );
  const reason = reasonText(
    input.reason,
    "Explain the screening result in 3,000 characters or fewer.",
  );
  let dueAt = null;
  if (input.result === "correction_needed") {
    if (
      !input.dueAt ||
      !Number.isFinite(Date.parse(input.dueAt)) ||
      Date.parse(input.dueAt) <= Date.parse(now)
    )
      throw new Error("Choose a future correction deadline.");
    dueAt = new Date(input.dueAt).toISOString();
  }
  return {
    ...record,
    screening: {
      result: input.result,
      reason,
      dueAt,
      at: now,
      actor: staff.name,
    },
    history: [
      event(staff, "Screening: " + input.result, now),
      ...record.history,
    ],
  };
}

export function reviewRecord({
  staff,
  application,
  record,
  programme,
  assignments,
  input,
  now = new Date().toISOString(),
}) {
  assertStaffRole(staff, ["evaluator"]);
  const blocker = reviewBlocker({
    staff,
    application,
    record,
    programme,
    assignments,
  });
  if (blocker) throw new Error(blocker);
  const criteria = application.criteria || reviewCriteria;
  if (input.submit && typeof input.conflict !== "boolean")
    throw new Error("Declare whether you have a conflict of interest.");
  const scores = {};
  const reasons = {};
  for (const criterion of criteria) {
    const reason = String(input.reasons?.[criterion.id] || "").trim();
    if (reason.length > 1000)
      throw new Error("Keep each score reason within 1,000 characters.");
    if (input.submit && !input.conflict && !reason)
      throw new Error("Explain every criterion score before submitting.");
    if (reason) reasons[criterion.id] = reason;
    const value = input.scores?.[criterion.id];
    if (value === "" || value == null) {
      if (input.submit && !input.conflict)
        throw new Error("Score every criterion before submitting.");
      continue;
    }
    const score = Number(value);
    if (!Number.isInteger(score) || score < 1 || score > 5)
      throw new Error("Scores must be whole numbers from 1 to 5.");
    scores[criterion.id] = score;
  }
  const comment = input.submit
    ? reasonText(
        input.comment,
        "Add a review comment or conflict reason in 3,000 characters or fewer.",
      )
    : String(input.comment || "").trim();
  if (comment.length > 3000)
    throw new Error("Keep review comments within 3,000 characters.");
  const status = input.submit
    ? input.conflict
      ? "conflicted"
      : "submitted"
    : "draft";
  const weightedScore =
    status === "submitted"
      ? Math.round(
          criteria.reduce(
            (total, criterion) =>
              total + (scores[criterion.id] / 5) * Number(criterion.weight),
            0,
          ) * 100,
        ) / 100
      : null;
  const review = {
    id:
      record.reviews.find((item) => item.reviewerId === staff.id)?.id ||
      crypto.randomUUID(),
    reviewerId: staff.id,
    reviewerName: staff.name,
    scores: input.conflict ? {} : scores,
    reasons: input.conflict ? {} : reasons,
    comment,
    conflict: typeof input.conflict === "boolean" ? input.conflict : null,
    status,
    weightedScore,
    updatedAt: now,
    submittedAt: input.submit ? now : null,
  };
  return {
    ...record,
    reviews: [
      ...record.reviews.filter((item) => item.reviewerId !== staff.id),
      review,
    ],
    history: [
      event(
        staff,
        status === "submitted"
          ? "Review submitted"
          : status === "conflicted"
            ? "Conflict declared"
            : "Review draft saved",
        now,
      ),
      ...record.history,
    ],
  };
}

export function decideRecord({
  staff,
  record,
  programme,
  assignments,
  input,
  now = new Date().toISOString(),
}) {
  assertStaffRole(staff, ["adjudicator", "administrator"]);
  if (!["selected", "not_selected", "not_eligible"].includes(input.result))
    throw new Error("Choose an outcome.");
  const blocker = decisionBlocker({
    staff,
    record,
    programme,
    assignments,
    result: input.result,
  });
  if (blocker) throw new Error(blocker);
  const reason = reasonText(
    input.reason,
    "Explain the outcome in 3,000 characters or fewer.",
  );
  const nextSteps = String(input.nextSteps || "").trim();
  if (nextSteps.length > 3000)
    throw new Error("Keep next steps within 3,000 characters.");
  return {
    ...record,
    decision: {
      result: input.result,
      reason,
      nextSteps,
      actor: staff.name,
      at: now,
      publishedAt: input.publish ? now : null,
    },
    history: [
      event(
        staff,
        input.publish
          ? "Outcome released to applicant"
          : "Decision draft saved",
        now,
      ),
      ...record.history,
    ],
  };
}

export function visibleStaffRecord(record, staff, programme, assignments) {
  const count = submittedReviews(record, assignments).length;
  const scoringClosed = ["scoring_closed", "outcomes_released"].includes(
    programme.status,
  );
  const canSeePanel = staff?.role === "adjudicator" && scoringClosed;
  const reviews =
    staff?.role === "evaluator"
      ? record.reviews.filter((item) => item.reviewerId === staff.id)
      : canSeePanel
        ? record.reviews
        : [];
  return {
    ...record,
    previousVersions: [],
    reviews,
    reviewCount: count,
    reviewsRequired: programme.reviewersPerApplication,
    scoringClosed,
    canDecide: !decisionBlocker({
      staff,
      record,
      programme,
      assignments,
      result:
        record.screening?.result === "ineligible" ? "not_eligible" : "selected",
    }),
  };
}

export function scoringClosureBlocker(
  programme,
  applications,
  recordFor,
  assignments,
) {
  if (!programme || programme.status !== "closed")
    return "Close applications in programme settings before closing scoring.";
  const intake = applications.filter(
    (application) => application.programmeId === programme.id,
  );
  const unresolved = intake.find(
    (application) =>
      !["eligible", "ineligible"].includes(
        recordFor(application).screening?.result,
      ),
  );
  if (unresolved)
    return `Finish screening ${unresolved.reference} before closing scoring.`;
  const incomplete = intake.find(
    (application) =>
      recordFor(application).screening?.result === "eligible" &&
      submittedReviews(
        recordFor(application),
        assignments[application.id] || [],
      ).length < programme.reviewersPerApplication,
  );
  return incomplete
    ? `Complete ${programme.reviewersPerApplication} assigned reviews for ${incomplete.reference} before closing scoring.`
    : "";
}

export function submissionWindowBlocker(
  programme,
  draft,
  source,
  now = new Date(),
) {
  if (
    draft.revisionKind === "correction" &&
    source?.revisionRequest?.status === "open" &&
    canUpdate(source, now)
  )
    return "";
  if (!programme)
    return "This programme is unavailable. Contact CEDA before submitting.";
  if (programme.status !== "open")
    return "This programme is closed to new submissions and ordinary updates. Your draft remains saved.";
  const time = new Date(now).getTime();
  if (
    (programme.opensAt && time < Date.parse(programme.opensAt)) ||
    (programme.closesAt && time > Date.parse(programme.closesAt))
  )
    return "The programme submission window is not open. Your draft remains saved.";
  return "";
}

// Assignment progress is derived from locked reviews rather than written to a
// second store, so a saved review cannot leave the manager's workload out of sync.
export function derivedAssignmentProgress(assignments, records) {
  return Object.fromEntries(
    Object.entries(assignments).map(([applicationId, rows]) => [
      applicationId,
      rows.map((assignment) => {
        const review = records[applicationId]?.reviews.find(
          (item) => item.reviewerId === assignment.evaluatorId,
        );
        const declaredConflict = evaluators
          .find((item) => item.id === assignment.evaluatorId)
          ?.conflicts.includes(applicationId);
        const progress =
          declaredConflict || review?.status === "conflicted"
            ? "conflicted"
            : review?.status === "submitted"
              ? "submitted"
              : review?.status === "draft"
                ? "in_progress"
                : "not_started";
        return { ...assignment, progress };
      }),
    ]),
  );
}

// A conflict declaration revokes access as well as scoring permission. This is a
// presentation guard; the connected API must enforce it before returning bytes.
export function mayReadAssignedApplication(
  staff,
  application,
  record,
  assignments,
) {
  if (staff?.role !== "evaluator" || !staff.id) return false;
  if (!assignments.some((assignment) => assignment.evaluatorId === staff.id))
    return false;
  if (
    evaluators
      .find((evaluator) => evaluator.id === staff.id)
      ?.conflicts.includes(application.id)
  )
    return false;
  return !record.reviews.some(
    (review) =>
      review.reviewerId === staff.id && review.status === "conflicted",
  );
}

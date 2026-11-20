import test from "node:test";
import { assignmentBlocker, isOverdue, suggestReviewers } from "./admin.js";
import assert from "node:assert/strict";
import {
  automaticChecks,
  decideRecord,
  emptyStaffRecord,
  recordForVersion,
  reviewCriteria,
  reviewRecord,
  screenRecord,
  visibleStaffRecord,
  scoringClosureBlocker,
  submissionWindowBlocker,
  derivedAssignmentProgress,
  mayReadAssignedApplication,
} from "./staffWorkflow.js";

const officer = {
  id: "officer",
  name: "Example officer",
  role: "eligibility-officer",
};
const reviewer = { id: "e_01", name: "Example reviewer", role: "evaluator" };
const secondReviewer = {
  id: "e_02",
  name: "Second reviewer",
  role: "evaluator",
};
const adjudicator = {
  id: "decision-maker",
  name: "Example decision maker",
  role: "adjudicator",
};
const administrator = {
  id: "administrator",
  name: "Example administrator",
  role: "administrator",
};
const application = {
  id: "example",
  title: "Fictional application",
  version: 1,
  criteria: reviewCriteria,
  documents: [],
  sample: false,
};
const programme = {
  id: "programme",
  status: "open",
  reviewersPerApplication: 2,
};
const assignments = [{ evaluatorId: "e_01" }, { evaluatorId: "e_02" }];
const now = "2026-11-20T10:00:00Z";
const scores = Object.fromEntries(
  reviewCriteria.map((criterion) => [criterion.id, 4]),
);
const reasons = Object.fromEntries(
  reviewCriteria.map((criterion) => [
    criterion.id,
    "The fictional proposal supports this criterion score.",
  ]),
);
const eligible = () =>
  screenRecord({
    staff: officer,
    application,
    record: emptyStaffRecord(application),
    input: {
      result: "eligible",
      reason: "Example evidence checked by officer.",
    },
    now,
  });
const review = (record = eligible(), staff = reviewer, input = {}) =>
  reviewRecord({
    staff,
    application,
    record,
    programme,
    assignments,
    input: {
      scores,
      reasons,
      comment: "Fictional assessment with supporting rationale.",
      conflict: false,
      submit: true,
      ...input,
    },
    now,
  });

test("automated screening reports missing evidence without deciding eligibility", () => {
  const checks = automaticChecks(application, now);
  assert.equal(checks.find((item) => item.id === "ownership").state, "unknown");
  assert.equal(
    checks.find((item) => item.id === "proposal").state,
    "attention",
  );
  assert.equal(checks.find((item) => item.id === "security").state, "unknown");
  assert.equal(Object.hasOwn(application, "eligibility"), false);
});

test("screening requires an authorised officer, a reason and a future correction deadline", () => {
  const record = emptyStaffRecord(application);
  assert.throws(
    () =>
      screenRecord({
        staff: reviewer,
        application,
        record,
        input: { result: "eligible", reason: "Checked" },
        now,
      }),
    /role/,
  );
  assert.throws(
    () =>
      screenRecord({
        staff: officer,
        application,
        record,
        input: { result: "eligible", reason: "  " },
        now,
      }),
    /Explain/,
  );
  assert.throws(
    () =>
      screenRecord({
        staff: officer,
        application,
        record,
        input: {
          result: "correction_needed",
          reason: "Replace the proposal.",
          dueAt: now,
        },
        now,
      }),
    /future/,
  );
  const next = screenRecord({
    staff: officer,
    application,
    record,
    input: {
      result: "correction_needed",
      reason: "Replace the proposal.",
      dueAt: "2026-11-21T10:00:00Z",
    },
    now,
  });
  assert.equal(next.screening.dueAt, "2026-11-21T10:00:00.000Z");
  assert.equal(record.screening, null);
});

test("reviewing requires an assigned reviewer and a completed eligibility check", () => {
  assert.throws(
    () =>
      reviewRecord({
        staff: reviewer,
        application,
        record: emptyStaffRecord(application),
        programme,
        assignments,
        input: {},
      }),
    /eligibility/,
  );
  assert.throws(
    () => review(eligible(), { ...reviewer, id: "unassigned" }),
    /assigned/,
  );
  assert.throws(() => review(eligible(), administrator), /role/);
});

test("drafts preserve unanswered conflict declarations; submitted reviews require complete validated scoring", () => {
  const draft = review(eligible(), reviewer, {
    scores: {},
    comment: "",
    conflict: null,
    submit: false,
  });
  assert.equal(draft.reviews[0].status, "draft");
  assert.equal(draft.reviews[0].conflict, null);
  assert.throws(
    () => review(eligible(), reviewer, { conflict: null }),
    /Declare/,
  );
  assert.throws(
    () => review(eligible(), reviewer, { scores: {} }),
    /every criterion/,
  );
  assert.throws(
    () => review(eligible(), reviewer, { scores: { ...scores, c_problem: 6 } }),
    /1 to 5/,
  );
  assert.throws(() => review(eligible(), reviewer, { comment: "" }), /comment/);
});

test("submitted reviews have correct weighted totals and cannot be overwritten or duplicated", () => {
  const record = review();
  assert.equal(record.reviews[0].weightedScore, 80);
  assert.equal(record.reviews[0].submittedAt, now);
  assert.throws(() => review(record), /already final/);
  assert.throws(
    () =>
      screenRecord({
        staff: officer,
        application,
        record,
        input: { result: "ineligible", reason: "Changed" },
        now,
      }),
    /locked/,
  );
});

test("declared conflicts are recorded without scores and never count towards review quorum", () => {
  const record = review(eligible(), reviewer, {
    scores: {},
    conflict: true,
    comment: "I know a member of this team.",
  });
  assert.equal(record.reviews[0].status, "conflicted");
  assert.deepEqual(record.reviews[0].scores, {});
  assert.equal(
    visibleStaffRecord(record, administrator, programme, assignments)
      .reviewCount,
    0,
  );
});

test("review score privacy applies to reviewers, administrators, management and decision makers", () => {
  const first = review();
  const record = review(first, secondReviewer);
  assert.equal(
    visibleStaffRecord(record, reviewer, programme, assignments).reviews.length,
    1,
  );
  assert.equal(
    visibleStaffRecord(record, administrator, programme, assignments).reviews
      .length,
    0,
  );
  assert.equal(
    visibleStaffRecord(record, { role: "management" }, programme, assignments)
      .reviews.length,
    0,
  );
  assert.equal(
    visibleStaffRecord(record, adjudicator, programme, assignments).reviews
      .length,
    0,
  );
  assert.equal(
    visibleStaffRecord(
      record,
      adjudicator,
      { ...programme, status: "scoring_closed" },
      assignments,
    ).reviews.length,
    2,
  );
});

test("decisions require closed scoring, assigned reviewer quorum and a reason", () => {
  const record = review();
  const input = {
    result: "selected",
    reason: "Supported by the assessment.",
    publish: true,
  };
  assert.throws(
    () =>
      decideRecord({
        staff: adjudicator,
        record,
        programme,
        assignments,
        input,
      }),
    /close scoring/,
  );
  const closed = { ...programme, status: "scoring_closed" };
  assert.throws(
    () =>
      decideRecord({
        staff: adjudicator,
        record,
        programme: closed,
        assignments,
        input,
      }),
    /2 assigned reviews/,
  );
  const complete = review(record, secondReviewer);
  assert.throws(
    () =>
      decideRecord({
        staff: adjudicator,
        record: complete,
        programme: closed,
        assignments,
        input: { ...input, reason: "" },
      }),
    /Explain/,
  );
  const released = decideRecord({
    staff: adjudicator,
    record: complete,
    programme: closed,
    assignments,
    input,
    now,
  });
  assert.equal(released.decision.publishedAt, now);
  assert.throws(
    () =>
      decideRecord({
        staff: adjudicator,
        record: released,
        programme: closed,
        assignments,
        input,
      }),
    /already been released/,
  );
});

test("the same reviewer cannot become a decision maker for their own review", () => {
  const record = review(review(), secondReviewer);
  assert.throws(
    () =>
      decideRecord({
        staff: { ...adjudicator, id: reviewer.id },
        record,
        programme: { ...programme, status: "scoring_closed" },
        assignments,
        input: { result: "selected", reason: "Selected", publish: true },
      }),
    /own reviewed/,
  );
});

test("an eligibility rejection can be released with an explanation without inventing scores", () => {
  const record = screenRecord({
    staff: officer,
    application,
    record: emptyStaffRecord(application),
    input: {
      result: "ineligible",
      reason: "The supplied evidence does not meet the ownership rule.",
    },
    now,
  });
  const released = decideRecord({
    staff: adjudicator,
    record,
    programme,
    assignments,
    input: {
      result: "not_eligible",
      reason: "Ownership evidence does not meet this call.",
      publish: true,
    },
    now,
  });
  assert.equal(released.decision.result, "not_eligible");
  assert.equal(released.reviews.length, 0);
});

test("new applicant versions require fresh screening and reviews while retaining the earlier staff record", () => {
  const earlier = review();
  const next = recordForVersion(earlier, { ...application, version: 2 });
  assert.equal(next.screening, null);
  assert.deepEqual(next.reviews, []);
  assert.equal(next.applicationVersion, 2);
  assert.equal(next.previousVersions[0].reviews[0].weightedScore, 80);
  assert.equal(
    visibleStaffRecord(next, administrator, programme, assignments)
      .previousVersions.length,
    0,
  );
});

test("stale conflict assignments cannot grant review access and zero scores are invalid", () => {
  assert.throws(
    () =>
      reviewRecord({
        staff: { ...reviewer, id: "e_03" },
        application: { ...application, id: "app_ich_004" },
        record: eligible(),
        programme,
        assignments: [{ evaluatorId: "e_03" }],
        input: {
          scores,
          reasons,
          comment: "Test",
          conflict: false,
          submit: true,
        },
      }),
    /conflict/,
  );
  assert.throws(
    () => review(eligible(), reviewer, { scores: { ...scores, c_problem: 0 } }),
    /1 to 5/,
  );
});

test("scoring closure requires every application to finish screening and assigned review quorum", () => {
  const intake = [
    { ...application, programmeId: programme.id, reference: "EXAMPLE" },
  ];
  const getPending = () => emptyStaffRecord(application);
  const closed = { ...programme, status: "closed" };
  assert.match(
    scoringClosureBlocker(programme, intake, getPending, {}),
    /Close applications/,
  );
  assert.match(
    scoringClosureBlocker(closed, intake, getPending, {}),
    /Finish screening/,
  );
  assert.match(
    scoringClosureBlocker(closed, intake, eligible, {}),
    /2 assigned reviews/,
  );
  const complete = review(review(), secondReviewer);
  assert.equal(
    scoringClosureBlocker(closed, intake, () => complete, {
      example: assignments,
    }),
    "",
  );
});

test("closing intake blocks submissions and ordinary updates but permits a timely requested correction", () => {
  const closed = { ...programme, status: "closed" };
  assert.match(submissionWindowBlocker(closed, {}, null, now), /closed/);
  assert.match(
    submissionWindowBlocker(
      closed,
      { revisionKind: "amendment" },
      { status: "Submitted" },
      now,
    ),
    /closed/,
  );
  const source = {
    revisionRequest: { status: "open", dueAt: "2026-11-21T10:00:00Z" },
  };
  assert.equal(
    submissionWindowBlocker(
      closed,
      { revisionKind: "correction" },
      source,
      now,
    ),
    "",
  );
  assert.match(
    submissionWindowBlocker(
      closed,
      { revisionKind: "correction" },
      source,
      "2026-11-22T10:00:00Z",
    ),
    /closed/,
  );
});

test("each submitted criterion mark needs its own reason and reasons lock with the review", () => {
  assert.throws(
    () => review(eligible(), reviewer, { reasons: {} }),
    /Explain every criterion/,
  );
  assert.throws(
    () =>
      review(eligible(), reviewer, {
        reasons: { ...reasons, c_team: "x".repeat(1001) },
      }),
    /1,000/,
  );
  const record = review();
  assert.equal(record.reviews[0].reasons.c_problem, reasons.c_problem);
  assert.throws(
    () =>
      review(record, reviewer, {
        reasons: { ...reasons, c_problem: "Changed" },
      }),
    /already final/,
  );
});

test("manager assignment progress follows actual reviews rather than illustrative seed status", () => {
  const stored = {
    example: [
      { evaluatorId: "e_01", progress: "not_started" },
      { evaluatorId: "e_02", progress: "submitted" },
    ],
  };
  const progress = derivedAssignmentProgress(stored, { example: review() });
  assert.equal(progress.example[0].progress, "submitted");
  assert.equal(progress.example[1].progress, "not_started");
  assert.equal(stored.example[0].progress, "not_started");
  const recused = review(eligible(), reviewer, {
    conflict: true,
    scores: {},
    comment: "Personal conflict.",
  });
  assert.equal(
    derivedAssignmentProgress(stored, { example: recused }).example[0].progress,
    "conflicted",
  );
});

test("recused reviewers cannot be reassigned and do not remain overdue or suggested", () => {
  const conflicted = {
    evaluatorId: "e_01",
    progress: "conflicted",
    dueAt: "2026-11-01T00:00:00Z",
  };
  const app = {
    ...application,
    eligibility: "eligible",
    conflictedReviewerIds: ["e_01"],
  };
  const evaluators = [
    { id: "e_01", name: "One", conflicts: [] },
    { id: "e_02", name: "Two", conflicts: [] },
    { id: "e_03", name: "Three", conflicts: [] },
  ];
  assert.match(
    assignmentBlocker({
      programme,
      application: app,
      evaluatorIds: ["e_01"],
      evaluators,
    }),
    /conflict/,
  );
  assert.equal(isOverdue(conflicted, Date.parse(now)), false);
  assert.deepEqual(
    suggestReviewers({
      programme,
      application: app,
      evaluators,
      assignments: { example: [conflicted] },
    }),
    ["e_02", "e_03"],
  );
});

test("known and self-declared conflicts immediately revoke assigned application read access", () => {
  assert.equal(
    mayReadAssignedApplication(reviewer, application, eligible(), assignments),
    true,
  );
  assert.equal(
    mayReadAssignedApplication(
      { ...reviewer, id: "unassigned" },
      application,
      eligible(),
      assignments,
    ),
    false,
  );
  assert.equal(
    mayReadAssignedApplication(
      { ...reviewer, id: "e_03" },
      { ...application, id: "app_ich_004" },
      eligible(),
      [{ evaluatorId: "e_03" }],
    ),
    false,
  );
  const recused = review(eligible(), reviewer, {
    conflict: true,
    scores: {},
    comment: "I know a member of the team.",
  });
  assert.equal(
    mayReadAssignedApplication(reviewer, application, recused, assignments),
    false,
  );
  assert.equal(
    mayReadAssignedApplication(
      secondReviewer,
      application,
      recused,
      assignments,
    ),
    true,
  );
});

test("selection enforces programme criterion averages without making an automatic rejection", () => {
  const lowScores = Object.fromEntries(
    reviewCriteria.map((criterion) => [criterion.id, 1]),
  );
  const record = review(
    review(eligible(), reviewer, { scores: lowScores }),
    secondReviewer,
    { scores: lowScores },
  );
  const closed = {
    ...programme,
    status: "scoring_closed",
    criteria: reviewCriteria,
  };
  const decide = (input) =>
    decideRecord({
      staff: adjudicator,
      record,
      programme: closed,
      assignments,
      input,
    });
  assert.throws(
    () =>
      decide({
        result: "selected",
        reason: "Select despite low marks.",
        publish: true,
      }),
    /Problem and innovation averages 1\.00.*minimum of 3/,
  );
  assert.equal(record.decision, null);
  assert.equal(
    decide({
      result: "not_selected",
      reason: "The proposal did not meet the published minimums.",
      publish: true,
    }).decision.result,
    "not_selected",
  );
});

test("minimums compare exact criterion averages and accept an average at the boundary", () => {
  const first = { ...scores, c_problem: 2 };
  const second = { ...scores, c_problem: 4 };
  const record = review(
    review(eligible(), reviewer, { scores: first }),
    secondReviewer,
    { scores: second },
  );
  const selected = decideRecord({
    staff: adjudicator,
    record,
    programme: {
      ...programme,
      status: "scoring_closed",
      criteria: reviewCriteria,
    },
    assignments,
    input: {
      result: "selected",
      reason: "All published criterion averages meet their minimums.",
      publish: true,
    },
  });
  assert.equal(selected.decision.result, "selected");
});

test("unassigned and draft marks cannot raise a below-minimum average", () => {
  const lowScores = { ...scores, c_problem: 2 };
  const record = review(
    review(eligible(), reviewer, { scores: lowScores }),
    secondReviewer,
    { scores: lowScores },
  );
  record.reviews.push({
    ...record.reviews[0],
    reviewerId: "unassigned",
    scores: { ...scores, c_problem: 5 },
  });
  record.reviews.push({
    ...record.reviews[0],
    reviewerId: "draft-only",
    status: "draft",
    scores: { ...scores, c_problem: 5 },
  });
  assert.throws(
    () =>
      decideRecord({
        staff: adjudicator,
        record,
        programme: {
          ...programme,
          status: "scoring_closed",
          criteria: reviewCriteria,
        },
        assignments: [...assignments, { evaluatorId: "draft-only" }],
        input: { result: "selected", reason: "Select", publish: true },
      }),
    /averages 2\.00/,
  );
});

test("selection does not count missing or invalid scores toward the review quorum", () => {
  const original = review(review(), secondReviewer);
  const closed = {
    ...programme,
    status: "scoring_closed",
    criteria: reviewCriteria,
  };
  for (const value of [undefined, "4", 0, 6, NaN]) {
    const record = structuredClone(original);
    record.reviews[1].scores.c_problem = value;
    assert.throws(
      () =>
        decideRecord({
          staff: adjudicator,
          record,
          programme: closed,
          assignments,
          input: { result: "selected", reason: "Select", publish: true },
        }),
      /valid scores for every programme criterion/,
    );
  }
});

test("zero minimum permits a low score and the configured programme rubric controls selection", () => {
  const lowScores = { ...scores, c_team: 1 };
  const record = review(
    review(eligible(), reviewer, { scores: lowScores }),
    secondReviewer,
    { scores: lowScores },
  );
  const closed = {
    ...programme,
    status: "scoring_closed",
    criteria: reviewCriteria,
  };
  const input = {
    result: "selected",
    reason: "All configured minimums met.",
    publish: true,
  };
  assert.equal(
    decideRecord({
      staff: adjudicator,
      record,
      programme: closed,
      assignments,
      input,
    }).decision.result,
    "selected",
  );
  const raised = {
    ...closed,
    criteria: reviewCriteria.map((criterion) =>
      criterion.id === "c_team" ? { ...criterion, minimum: 2 } : criterion,
    ),
  };
  assert.throws(
    () =>
      decideRecord({
        staff: adjudicator,
        record,
        programme: raised,
        assignments,
        input,
      }),
    /Team averages 1\.00.*minimum of 2/,
  );
});

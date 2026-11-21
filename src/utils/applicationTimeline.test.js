import test from "node:test";
import assert from "node:assert/strict";
import { applicationTimeline } from "./applicationTimeline.js";
import { displayDateTime } from "./portal.js";

const submitted = {
  submittedAt: "2026-11-20T22:30:00Z",
  status: "Submitted",
  versions: [{ number: 1 }],
};
const stage = (timeline, code) =>
  timeline.stages.find((item) => item.code === code);

test("new submissions wait at eligibility without inventing completed future stages", () => {
  const timeline = applicationTimeline(submitted);
  assert.equal(timeline.currentStage, "eligibility");
  assert.equal(stage(timeline, "submitted").state, "done");
  assert.equal(stage(timeline, "eligibility").state, "in_progress");
  assert.equal(stage(timeline, "evaluation").state, "upcoming");
});

test("screening corrections override the Feedback badge and stale completed milestones", () => {
  const timeline = applicationTimeline({
    ...submitted,
    status: "Feedback",
    stages: [{ code: "evaluation", state: "done" }],
    revisionRequest: {
      status: "open",
      message: "Replace the unreadable proposal.",
      dueAt: "2026-11-21T23:15:00Z",
    },
  });
  assert.equal(timeline.currentStage, "eligibility");
  assert.equal(stage(timeline, "eligibility").state, "waiting_for_applicant");
  assert.equal(stage(timeline, "evaluation").state, "upcoming");
  assert.equal(stage(timeline, "shortlist").state, "upcoming");
  assert.equal(
    stage(timeline, "eligibility").action.message,
    "Replace the unreadable proposal.",
  );
});

test("resubmission ignores screening from an earlier application version", () => {
  const timeline = applicationTimeline(
    {
      ...submitted,
      versions: [{ number: 1 }, { number: 2 }],
      revisionRequest: { status: "responded" },
    },
    {
      applicationVersion: 1,
      screening: { result: "eligible", at: "2026-11-19T10:00:00Z" },
    },
  );
  assert.equal(timeline.currentStage, "eligibility");
  assert.equal(stage(timeline, "eligibility").state, "in_progress");
  assert.equal(stage(timeline, "evaluation").state, "upcoming");
});

test("eligible evidence advances to evaluation but does not invent a separate shortlist", () => {
  const timeline = applicationTimeline(
    { ...submitted, status: "Under review" },
    {
      applicationVersion: 1,
      screening: { result: "eligible", at: "2026-11-21T07:00:00Z" },
    },
  );
  assert.equal(timeline.currentStage, "evaluation");
  assert.equal(
    stage(timeline, "eligibility").completedAt,
    "2026-11-21T07:00:00Z",
  );
  assert.equal(stage(timeline, "shortlist").state, "not_recorded");
});

test("released negative outcomes finish at decision and cannot appear as an ongoing evaluation", () => {
  const timeline = applicationTimeline({
    ...submitted,
    status: "Feedback",
    outcome: { result: "not_selected", releasedAt: "2026-11-21T22:05:00Z" },
  });
  assert.equal(timeline.currentStage, "decision");
  assert.equal(stage(timeline, "decision").state, "done");
  assert.equal(stage(timeline, "evaluation").state, "done");
  assert.equal(stage(timeline, "award").state, "not_applicable");
});

test("an ineligible outcome does not claim that shortlisting or evaluation happened", () => {
  const timeline = applicationTimeline({
    ...submitted,
    status: "Feedback",
    outcome: { result: "not_eligible", releasedAt: "2026-11-21T09:00:00Z" },
  });
  assert.equal(timeline.currentStage, "decision");
  assert.equal(stage(timeline, "shortlist").state, "not_applicable");
  assert.equal(stage(timeline, "evaluation").state, "not_applicable");
});

test("timeline receipt, correction deadline and outcome dates display the Botswana day and time", () => {
  const timeline = applicationTimeline({
    ...submitted,
    revisionRequest: { status: "open", dueAt: "2026-11-21T23:15:00Z" },
  });
  assert.match(
    displayDateTime(stage(timeline, "submitted").completedAt),
    /21 Nov 2026.*00:30.*CAT/,
  );
  assert.match(
    displayDateTime(stage(timeline, "eligibility").expectedBy),
    /22 Nov 2026.*01:15.*CAT/,
  );
  const outcome = applicationTimeline({
    ...submitted,
    outcome: { result: "not_selected", releasedAt: "2026-11-21T22:05:00Z" },
  });
  assert.match(
    displayDateTime(stage(outcome, "decision").completedAt),
    /22 Nov 2026.*00:05.*CAT/,
  );
});

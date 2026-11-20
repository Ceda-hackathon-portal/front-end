import test from "node:test";
import assert from "node:assert/strict";
import {
  ageOn,
  dateInBotswana,
  blankDraft,
  budgetTotal,
  canUpdate,
  eligibilityResults,
  firstUnfinishedSection,
  ownershipSummary,
  sectionErrors,
  submittedSnapshot,
  validateBudget,
  validateDocuments,
  validateProfile,
  workflowProgress,
} from "./applicantWorkflow.js";
import {
  documentError,
  documentUploadPlan,
  MAX_DOCUMENT_BYTES,
} from "../services/applicantDocuments.js";
import { safeReturnPath } from "./portal.js";

const now = "2026-11-20T12:00:00Z";
const profile = {
  fullName: "Fictional Applicant",
  email: "qa@example.com",
  phone: "71 234 567",
  citizen: "yes",
  companyName: "Fictional Enterprise",
  registered: "yes",
  registrationNumber: "QA-123",
  shareholders: [
    {
      id: "person-1",
      name: "Fictional Applicant",
      dateOfBirth: "1998-11-20",
      percent: "100",
      citizen: "yes",
    },
  ],
};
const file = {
  id: "document-1",
  category: "technical-proposal",
  name: "proposal.pdf",
  size: 100,
  expiresAt: "",
  sha256: "test-checksum",
};
const complete = {
  ...blankDraft("draft-1"),
  title: "Fictional water-sharing service",
  theme: "sustainable",
  team: "QA team",
  problem: "Equipment is hard to find.",
  solution: "A searchable directory.",
  impact: "More equipment is shared.",
  budgetNotApplicable: true,
  documentIds: [file.id],
};

test("age and ownership use citizenship, birthday boundaries and complete shareholder records", () => {
  assert.equal(ageOn("2008-11-21", now), 17);
  assert.equal(ageOn("2008-11-20", now), 18);
  assert.equal(ageOn("1990-11-20", now), 36);
  assert.equal(ageOn("2026-02-30", now), null);
  assert.equal(ageOn("2030-01-01", now), null);
  const shareholders = [
    { ...profile.shareholders[0], percent: "50" },
    { ...profile.shareholders[0], id: "p2", citizen: "no", percent: "50" },
  ];
  assert.deepEqual(ownershipSummary(shareholders, now), {
    total: 100,
    youthCitizen: 50,
    complete: true,
  });
  assert.equal(
    eligibilityResults({
      citizen: "yes",
      registered: "yes",
      youthOwnership: "50",
    })[2].state,
    "not_met",
  );
  assert.equal(
    eligibilityResults({
      citizen: "yes",
      registered: "yes",
      youthOwnership: "50.01",
    })[2].state,
    "met",
  );
  assert.equal(
    eligibilityResults({ youthOwnership: "" })[2].state,
    "needs_evidence",
  );
});
test("profile validation explains invalid contact data and incomplete company ownership", () => {
  assert.deepEqual(validateProfile(profile), {});
  assert.deepEqual(validateProfile(profile, "business", now), {});
  assert.ok(
    validateProfile({ ...profile, phone: "123", email: "invalid" }).phone,
  );
  assert.ok(
    validateProfile(
      { ...profile, registered: "yes", registrationNumber: "" },
      "business",
      now,
    ).registrationNumber,
  );
  assert.ok(
    validateProfile(
      {
        ...profile,
        shareholders: [{ ...profile.shareholders[0], percent: "99" }],
      },
      "business",
      now,
    ).shareholders,
  );
  assert.deepEqual(
    validateProfile({ ...profile, phone: "+267 71 234 567" }),
    {},
  );
});
test("budget checks every row, decimal precision and requested funding against the total", () => {
  const draft = {
    budgetItems: [
      { description: "Equipment", amount: "200.00" },
      { description: "Delivery", amount: "50.50" },
    ],
    fundingRequested: "250.50",
  };
  assert.equal(budgetTotal(draft.budgetItems), 250.5);
  assert.deepEqual(validateBudget(draft), {});
  assert.ok(
    validateBudget({ ...draft, fundingRequested: "251" }).fundingRequested,
  );
  assert.ok(
    validateBudget({ budgetItems: [{ description: "Wrong", amount: "-1" }] })
      .budgetItems,
  );
  assert.ok(
    validateBudget({ budgetItems: [{ description: "Wrong", amount: "1.001" }] })
      .budgetItems,
  );
  assert.deepEqual(validateBudget({ budgetNotApplicable: true }), {});
});
test("required attachments reject missing files, missing proposals and expired evidence", () => {
  assert.deepEqual(validateDocuments(complete, [file], now), {});
  assert.ok(
    validateDocuments({ ...complete, documentIds: [] }, [file], now).documents,
  );
  assert.ok(validateDocuments(complete, [], now).documents);
  assert.ok(
    validateDocuments(complete, [{ ...file, expiresAt: "2026-11-19" }], now)
      .documents,
  );
});
test("workflow progress includes profile, company, budget and actual attachment references", () => {
  assert.deepEqual(workflowProgress(complete, profile, [file]), {
    completed: 5,
    total: 5,
    percent: 100,
  });
  assert.equal(firstUnfinishedSection(complete, profile, [file]), 5);
  assert.equal(
    firstUnfinishedSection({ ...complete, title: "" }, profile, [file]),
    2,
  );
  assert.equal(
    workflowProgress({ ...complete, documentIds: [] }, profile, [file]).percent,
    80,
  );
  assert.ok(
    sectionErrors("idea", { ...complete, title: " " }, profile, [file]).title,
  );
});
test("only permitted amendments or open correction requests can create a new version", () => {
  assert.equal(canUpdate({ status: "Under review" }, now), false);
  assert.equal(
    canUpdate({ status: "Submitted", closesAt: "2026-11-19T12:00:00Z" }, now),
    false,
  );
  assert.equal(
    canUpdate(
      {
        status: "Feedback",
        revisionRequest: { status: "open", dueAt: "2026-11-21T12:00:00Z" },
      },
      now,
    ),
    true,
  );
  assert.equal(
    canUpdate(
      {
        status: "Feedback",
        revisionRequest: { status: "open", dueAt: "2026-11-19T12:00:00Z" },
      },
      now,
    ),
    false,
  );
});
test("new snapshots are independent of later profile, answer and attachment edits", () => {
  const draft = structuredClone(complete);
  const person = structuredClone(profile);
  const documents = [structuredClone(file)];
  const first = submittedSnapshot(draft, person, documents, null, now);
  const existing = {
    status: "Submitted",
    versions: [first.snapshot],
    reference: "UNCHANGED",
  };
  draft.solution = "Changed solution";
  const second = submittedSnapshot(draft, person, documents, existing, now);
  person.fullName = "Changed name";
  documents[0].name = "changed.pdf";
  assert.equal(first.snapshot.solution, complete.solution);
  assert.equal(second.number, 2);
  assert.equal(second.snapshot.applicant.fullName, profile.fullName);
  assert.equal(second.snapshot.documents[0].name, "proposal.pdf");
  assert.throws(
    () =>
      submittedSnapshot(
        { ...draft, responseMessage: "" },
        person,
        documents,
        { ...existing, revisionRequest: { status: "open" } },
        now,
      ),
    /Explain/,
  );
  assert.throws(
    () =>
      submittedSnapshot(
        { ...draft, documentIds: [] },
        person,
        documents,
        null,
        now,
      ),
    /technical proposal/,
  );
});
test("uploads reject empty, oversized, active formats and misleading file signatures", () => {
  assert.match(
    documentError({ name: "proposal.pdf", size: 0, type: "application/pdf" }),
    /empty/,
  );
  assert.match(
    documentError({
      name: "proposal.pdf",
      size: MAX_DOCUMENT_BYTES + 1,
      type: "application/pdf",
    }),
    /10 MB/,
  );
  assert.match(
    documentError({ name: "script.svg", size: 100, type: "image/svg+xml" }),
    /PDF/,
  );
  assert.match(
    documentError(
      { name: "proposal.pdf", size: 100, type: "application/pdf" },
      new Uint8Array([77, 90, 0, 0]).buffer,
    ),
    /contents/,
  );
  assert.equal(
    documentError(
      { name: "proposal.pdf", size: 100, type: "application/pdf" },
      new TextEncoder().encode("%PDF-1.7").buffer,
    ),
    "",
  );
  assert.match(
    documentError({
      name: "../proposal.pdf",
      size: 100,
      type: "application/pdf",
    }),
    /filename/,
  );
});
test("sign-in returns to applicant drafts, profiles and combined filters without allowing staff or external redirects", () => {
  for (const path of [
    "/workspace/profile",
    "/workspace/new?new=1&theme=digital",
    "/workspace/new?draft=local-draft-123",
    "/workspace/applications?q=water%20sharing&status=Feedback",
    "/workspace/applications?status=Draft",
  ])
    assert.equal(safeReturnPath(path, "submitter"), path);
  for (const path of [
    "/staff",
    "//example.com",
    "/workspace/../admin",
    "/workspace/new?draft=../../admin",
    "/workspace/applications?q=a&q=b",
    "/workspace/new?new=2",
  ])
    assert.equal(safeReturnPath(path, "submitter"), "/workspace");
});

test("reattaching a known file restores bytes under the existing document ID", () => {
  const blob = new Blob(["%PDF-1.7 fictional test"]);
  const saved = { ...file, id: "original-id", expiresAt: "" };
  const incoming = { metadata: { ...saved, id: "new-id" }, blob };
  const plan = documentUploadPlan([incoming, incoming], [saved]);
  assert.equal(plan.documents.length, 0);
  assert.deepEqual(plan.ids, ["original-id"]);
  assert.ok(plan.files.length > 0);
  assert.equal(plan.files[0].id, "original-id");
  assert.equal(plan.files[0].blob, blob);
  assert.equal(saved.id, "original-id");
});
test("document expiry and youth age use the Botswana calendar day at midnight", () => {
  const lateUtc = "2026-11-20T22:30:00Z";
  assert.equal(dateInBotswana(lateUtc), "2026-11-21");
  assert.equal(ageOn("2008-11-21", lateUtc), 18);
  assert.ok(
    validateDocuments(complete, [{ ...file, expiresAt: "2026-11-20" }], lateUtc)
      .documents,
  );
});

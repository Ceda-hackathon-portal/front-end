import assert from "node:assert/strict";
import { test } from "node:test";
import { restoreRemoteApplications } from "./applicationPersistence.js";

test("restores server drafts and submissions and keeps accounts isolated", () => {
  const owner = "owner-a";
  const fields = { title: "Fictional", theme: "digital", problem: "p", solution: "s", impact: "i", team: "t" };
  const doc = { id: "doc-a", category: "technical-proposal", name: "proposal.pdf", contentType: "application/pdf", sizeBytes: 100, sha256: "a".repeat(64), uploadedAt: "2026-11-22T10:00:00Z", expiresAt: null };
  const records = [
    { id: "draft-a", ownerId: owner, programmeId: "p", programmeVersionId: "v", stage: "DRAFT", revision: 8, fields, budget: { items: [{ description: "cost", amount: "20.00" }], fundingRequested: "10.00", notApplicable: false }, documents: [doc] },
    { id: "submitted-a", ownerId: owner, programmeId: "p", programmeVersionId: "v", stage: "SUBMITTED", revision: 12, fields, budget: { items: [], fundingRequested: "", notApplicable: true }, documents: [], latestSubmission: { id: "sub-a", version: 1, reference: "CEDA-fictional", submittedAt: "2026-11-22T11:00:00Z", fields, budget: { items: [], fundingRequested: "", notApplicable: true }, documents: [doc] } },
    { id: "foreign", ownerId: "owner-b", stage: "DRAFT", revision: 1, fields, budget: { items: [], fundingRequested: "", notApplicable: true }, documents: [] },
  ];
  const current = { ideas: [], drafts: [{ id: "other", backendOwnerId: "owner-b", documentIds: [], budgetItems: [] }], documents: [], activeDraftId: null };
  const restored = restoreRemoteApplications(current, owner, records);
  assert.deepEqual(restored.drafts.map((draft) => draft.id), ["other", "draft-a"]);
  assert.equal(restored.drafts[1].backendRevision, 8);
  assert.deepEqual(restored.drafts[1].budgetItems.map(({ id, ...row }) => row), records[0].budget.items);
  assert.ok(restored.drafts[1].budgetItems.every((row) => row.id), "restored rows need ids to be edited and removed");
  assert.deepEqual(restored.drafts[1].documentIds, ["doc-a"]);
  assert.equal(restored.ideas[0].backendSubmissionId, "sub-a");
  assert.equal(restored.ideas[0].reference, "CEDA-fictional");
  assert.equal(restored.documents[0].backendOwnerId, owner);
  assert.equal(restored.ideas.some((idea) => idea.id === "foreign"), false);
});

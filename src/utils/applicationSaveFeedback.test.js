import assert from "node:assert/strict";
import { test } from "node:test";
import { saveDraftWithFeedback } from "./applicationSaveFeedback.js";

test("failed network save retains the current form and reports failure", async () => {
  const form = { id: "application-a", title: "Unsaved title", problem: "Unsaved answer" };
  const result = await saveDraftWithFeedback(form, async () => { throw new TypeError("network unavailable"); });
  assert.equal(result.ok, false);
  assert.equal(result.draft, form);
  assert.equal(result.draft.title, "Unsaved title");
  assert.match(result.message, /network unavailable/);
});

test("revision conflict is reported distinctly without replacing the form", async () => {
  const form = { id: "application-a", title: "Keep my edits" };
  const result = await saveDraftWithFeedback(form, async () => { throw Object.assign(new Error("stale"), { status: 409 }); });
  assert.equal(result.ok, false);
  assert.equal(result.conflict, true);
  assert.equal(result.draft, form);
  assert.match(result.message, /Revision conflict/);
});

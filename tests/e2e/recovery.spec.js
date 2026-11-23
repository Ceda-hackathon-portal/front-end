import { test, expect } from "@playwright/test";
import {
  action,
  field,
  prepareContext,
  staffNav,
  signInApplicant,
  signInStaff,
  fillApplication,
  submitApplication,
  openRecord,
  openRegister,
  caseSection,
  screen,
  assignReviewers,
  fillReview,
} from "./helpers.js";

test("a stale applicant draft cannot overwrite another tab and can reopen saved answers", async ({
  context,
  page,
}) => {
  await prepareContext(context);
  await signInApplicant(page);
  await fillApplication(page, "Original saved draft");
  const draftUrl = new URL(page.url()).pathname + new URL(page.url()).search;
  const other = await context.newPage();
  await signInApplicant(other, draftUrl);
  await expect(
    other.getByRole("heading", { name: "Review & submit", exact: true }),
  ).toBeVisible();

  await action(page, "Change your idea").click();
  await field(page, "Idea title").fill("New title saved by the first tab");
  await expect(
    page.getByRole("status").filter({ hasText: "Saved on this device" }),
  ).toBeVisible();
  await action(other, "Change your idea").click();
  await field(other, "The problem").fill(
    "This stale edit must not overwrite the first tab.",
  );
  await expect(
    other
      .locator(".ap-save-status")
      .filter({ hasText: /changed.*another tab|another tab.*changed/i }),
  ).toBeVisible();
  const stored = await other.evaluate(() =>
    JSON.parse(localStorage.getItem("ceda.applicant.v2")),
  );
  expect(stored.drafts[0].title).toBe("New title saved by the first tab");
  expect(stored.drafts[0].problem).toBe(
    "Fictional enterprises need shared water equipment.",
  );
  expect(stored.documents).toHaveLength(1);

  await action(other, "Reopen saved draft").click();
  await action(other, "Change your idea").click();
  await expect(field(other, "Idea title")).toHaveValue(
    "New title saved by the first tab",
  );
  await field(other, "The problem").fill(
    "A recovered edit based on the newest saved answers.",
  );
  await expect(
    other.getByRole("status").filter({ hasText: "Saved on this device" }),
  ).toBeVisible();
  const recovered = await other.evaluate(() =>
    JSON.parse(localStorage.getItem("ceda.applicant.v2")),
  );
  expect(recovered.drafts[0].problem).toBe(
    "A recovered edit based on the newest saved answers.",
  );
  expect(recovered.drafts[0].title).toBe("New title saved by the first tab");
});

test("two tabs using the same reviewer identity cannot overwrite a newer saved review", async ({
  context,
  page,
}) => {
  await prepareContext(context);
  await signInApplicant(page);
  await fillApplication(page, "Stale review protection");
  const record = await submitApplication(page);
  const leader = await context.newPage();
  await signInStaff(leader);
  await openRecord(leader, record.id);
  await screen(
    leader,
    "eligible",
    "Evidence checked for this fictional review test.",
  );
  await assignReviewers(leader, record.reference);
  const first = await context.newPage();
  const second = await context.newPage();
  await signInStaff(first, "evaluator", "e_01");
  await signInStaff(second, "evaluator", "e_01");
  await openRecord(first, record.id);
  await openRecord(second, record.id);
  await fillReview(first, "first tab");
  await fillReview(second, "stale second tab");
  await action(first, "Save review draft").click();
  await expect(
    first.getByRole("status").filter({ hasText: "Review draft saved" }),
  ).toBeVisible();
  await action(second, "Save review draft").click();
  await expect(
    second.locator(".sw-page > .st-alert").filter({ hasText: /changed|newer|reopen/i }),
  ).toBeVisible();
  const stored = await second.evaluate(() =>
    JSON.parse(localStorage.getItem("ceda.applicant.v2")),
  );
  expect(stored.staffRecords[record.id].reviews).toHaveLength(1);
  expect(stored.staffRecords[record.id].reviews[0].comment).toBe(
    "Private review by first tab",
  );

  await openRecord(second, record.id);
  await caseSection(second, "Review");
  await expect(
    second.getByRole("textbox", { name: "Review comments", exact: true }),
  ).toHaveValue("Private review by first tab");
  await second
    .getByRole("textbox", { name: "Review comments", exact: true })
    .fill("Reopened current draft, now edited safely.");
  await action(second, "Save review draft").click();
  await expect(
    second.getByRole("status").filter({ hasText: "Review draft saved" }),
  ).toBeVisible();
});

test("a newly declared reviewer conflict removes case access and updates the leader", async ({
  context,
  page,
}) => {
  await prepareContext(context);
  await signInApplicant(page);
  await fillApplication(page, "Conflict handoff");
  const record = await submitApplication(page);
  const leader = await context.newPage();
  await signInStaff(leader);
  await openRecord(leader, record.id);
  await screen(leader, "eligible", "Fictional evidence present.");
  await assignReviewers(leader, record.reference);
  const reviewer = await context.newPage();
  await signInStaff(reviewer, "evaluator", "e_01");
  await openRecord(reviewer, record.id);
  await caseSection(reviewer, "Review");
  await field(reviewer, "Conflict of interest").selectOption("yes");
  await field(reviewer, "Conflict explanation").fill(
    "This fictional applicant is linked to my company.",
  );
  await action(reviewer, "Record conflict").click();
  await expect(
    reviewer.getByRole("heading", {
      name: "Application unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    leader.getByRole("row").filter({ hasText: record.reference }),
  ).toContainText(/conflict/i);
  await expect(
    leader.getByRole("row").filter({ hasText: record.reference }),
  ).not.toContainText("Submitted");
});

test("an old assignment editor cannot replace a newer reviewer assignment", async ({
  context,
  page,
}) => {
  await prepareContext(context);
  await signInApplicant(page);
  await fillApplication(page, "Assignment conflict protection");
  const record = await submitApplication(page);
  const first = await context.newPage();
  const second = await context.newPage();
  await signInStaff(first);
  await openRecord(first, record.id);
  await screen(first, "eligible", "Required fictional evidence checked.");
  await assignReviewers(first, record.reference);
  await signInStaff(second);
  async function editAssignment(tab) {
    await staffNav(tab)
      .getByRole("link", { name: "Programmes", exact: true })
      .click();
    await tab
      .getByRole("link", {
        name: "CEDA Innovation Challenge 2026",
        exact: true,
      })
      .click();
    await tab
      .getByRole("navigation", { name: "Programme sections" })
      .getByRole("link", { name: /^Applications/ })
      .click();
    await action(tab, "Change reviewers for " + record.reference).click();
    return tab.getByRole("form", {
      name: "Reviewers for " + record.reference,
      exact: true,
    });
  }
  const editorA = await editAssignment(first);
  const editorB = await editAssignment(second);
  await editorA.locator(".st-evaluators input").nth(1).uncheck();
  await editorA.locator(".st-evaluators input").nth(2).check();
  await editorA
    .getByRole("button", { name: "Save reviewers", exact: true })
    .click();
  await expect(
    first.getByRole("status").filter({ hasText: "Reviewers saved for" }),
  ).toBeVisible();
  await editorB.locator(".st-evaluators input").nth(0).uncheck();
  await editorB.locator(".st-evaluators input").nth(3).check();
  await editorB
    .getByRole("button", { name: "Save reviewers", exact: true })
    .click();
  await expect(
    editorB
      .getByRole("alert")
      .filter({ hasText: /changed.*another tab|reopen/i }),
  ).toBeVisible();
  const assignments = await second.evaluate(
    (id) =>
      JSON.parse(localStorage.getItem("ceda.admin.v1")).assignments[id].map(
        (item) => item.evaluatorId,
      ),
    record.id,
  );
  expect(assignments.sort()).toEqual(["e_01", "e_03"]);
  await editorB.getByRole("button", { name: "Cancel", exact: true }).click();
  await action(second, "Change reviewers for " + record.reference).click();
  await expect(
    second
      .getByRole("form", {
        name: "Reviewers for " + record.reference,
        exact: true,
      })
      .locator(".st-evaluators input")
      .nth(2),
  ).toBeChecked();
});

test("applicant autosaves and staff review writes never erase each other", async ({
  context,
  page,
}) => {
  await prepareContext(context);
  await signInApplicant(page);
  await fillApplication(page, "Concurrent actor writes");
  const record = await submitApplication(page);
  const leader = await context.newPage();
  await signInStaff(leader);
  await openRecord(leader, record.id);
  await screen(
    leader,
    "eligible",
    "Fictional evidence checked for concurrent writing.",
  );
  await assignReviewers(leader, record.reference);
  const reviewer = await context.newPage();
  await signInStaff(reviewer, "evaluator", "e_01");
  await openRecord(reviewer, record.id);
  await fillReview(reviewer, "concurrent reviewer");

  await signInApplicant(page);
  await action(page, "Start a new application").click();
  await expect(field(page, "Idea title")).toBeVisible();
  for (let round = 1; round <= 3; round++) {
    const title = "Concurrent saved draft " + round;
    const comment = "Concurrent saved review " + round;
    await reviewer
      .getByRole("textbox", { name: "Review comments", exact: true })
      .fill(comment);
    await Promise.all([
      field(page, "Idea title").fill(title),
      action(reviewer, "Save review draft").click(),
    ]);
    await expect
      .poll(async () =>
        page.evaluate((id) => {
          const saved = JSON.parse(localStorage.getItem("ceda.applicant.v2"));
          return {
            title: saved.drafts[0].title,
            comment: saved.staffRecords[id].reviews[0]?.comment,
            applications: saved.ideas.length,
          };
        }, record.id),
      )
      .toEqual({ title, comment, applications: 3 });
  }
  await Promise.all([
    field(page, "Idea title").fill(
      "Draft preserved during final review submission",
    ),
    action(reviewer, "Submit review").click(),
  ]);
  await expect(
    reviewer.getByRole("status").filter({ hasText: "Review submitted" }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate((id) => {
        const saved = JSON.parse(localStorage.getItem("ceda.applicant.v2"));
        return {
          title: saved.drafts[0].title,
          status: saved.staffRecords[id].reviews[0]?.status,
        };
      }, record.id),
    )
    .toEqual({
      title: "Draft preserved during final review submission",
      status: "submitted",
    });
});

test("a failed durable submission shows an error and retries without a false or duplicate receipt", async ({
  context,
  page,
}) => {
  await prepareContext(context);
  const leader = await context.newPage();
  await signInStaff(leader);
  await openRegister(leader);
  await signInApplicant(page);
  await fillApplication(page, "Recover a failed durable submission");
  await field(page, "I have reviewed my answers and attachments and read the privacy notice for processing my application.").check();
  await page.evaluate(() => {
    window.originalE2ESetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "ceda.applicant.v2")
        throw new DOMException("Synthetic quota failure", "QuotaExceededError");
      return window.originalE2ESetItem.call(this, key, value);
    };
  });
  await action(page, "Submit application").click();
  await expect(
    page
      .locator(".ap-form-alert")
      .filter({ hasText: /could not be saved|storage/i })
      .last(),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/workspace\/new\?draft=/);
  await expect(
    leader
      .locator(".sw-application-row")
      .filter({ hasText: "Recover a failed durable submission" }),
  ).toHaveCount(0);
  const failed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ceda.applicant.v2")),
  );
  expect(failed.drafts).toHaveLength(1);
  expect(failed.ideas).toHaveLength(2);
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalE2ESetItem;
    delete window.originalE2ESetItem;
  });
  const record = await submitApplication(page);
  await expect(
    leader.locator(".sw-application-row").filter({ hasText: record.reference }),
  ).toHaveCount(1);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("ceda.applicant.v2")),
  );
  expect(saved.drafts).toHaveLength(0);
  expect(saved.ideas).toHaveLength(3);
});

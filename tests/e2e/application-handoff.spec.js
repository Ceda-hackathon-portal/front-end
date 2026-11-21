import { test, expect } from "@playwright/test";
import {
  action,
  field,
  staffNav,
  prepareContext,
  signInApplicant,
  signInStaff,
  openRegister,
  openRecord,
  caseSection,
  fillApplication,
  submitApplication,
  screen,
  assignReviewers,
  fillReview,
  managementCount,
  excludeIllustrativeIntake,
  closeScoring,
} from "./helpers.js";

for (const result of ["selected", "not_selected"]) {
  test(`live applicant → programme leader → two reviewers → ${result} → management`, async ({
    context,
    page,
  }) => {
    await prepareContext(context);
    const errors = [];
    context.on("page", (tab) =>
      tab.on("pageerror", (error) => errors.push(error.message)),
    );
    page.on("pageerror", (error) => errors.push(error.message));
    const leader = await context.newPage();
    const officer = await context.newPage();
    const management = await context.newPage();
    const reviewer1 = await context.newPage();
    const reviewer2 = await context.newPage();
    const decision = await context.newPage();
    await signInStaff(leader);
    await openRegister(leader);
    await signInStaff(officer, "eligibility-officer");
    await openRegister(officer);
    await signInStaff(management, "management");
    await signInStaff(reviewer1, "evaluator", "e_01");
    await signInStaff(reviewer2, "evaluator", "e_02");
    await openRegister(reviewer1);
    await openRegister(reviewer2);
    await signInStaff(decision, "adjudicator");
    const before = Number(
      await managementCount(management, "Applications").innerText(),
    );

    await test.step("new submission reaches already-open staff screens without reload", async () => {
      await signInApplicant(page);
      await page.bringToFront();
      await fillApplication(page, `E2E live ${result} application`);
    });
    const record = await submitApplication(page);
    await expect(
      leader
        .locator(".sw-application-row")
        .filter({ hasText: record.reference }),
    ).toBeVisible();
    await expect(
      officer
        .locator(".sw-application-row")
        .filter({ hasText: record.reference }),
    ).toBeVisible();
    await expect(managementCount(management, "Applications")).toHaveText(
      String(before + 1),
    );
    await expect(
      reviewer1
        .locator(".sw-application-row")
        .filter({ hasText: record.reference }),
    ).toHaveCount(0);
    await expect(
      reviewer2
        .locator(".sw-application-row")
        .filter({ hasText: record.reference }),
    ).toHaveCount(0);

    await openRecord(officer, record.id);
    await expect(
      officer.getByText("15 Jun 1998", { exact: true }),
    ).toBeVisible();
    await expect(officer.getByText("100%", { exact: true })).toBeVisible();
    await expect(
      officer.getByText("Funding requested: BWP 2,000.00", { exact: true }),
    ).toBeVisible();

    if (result === "not_selected") {
      await test.step("correction returns to the applicant and a new version resets screening", async () => {
        await caseSection(officer, "Screening");
        await field(officer, "Screening result").selectOption(
          "correction_needed",
        );
        await field(officer, "Screening reason").fill(
          "Please clarify how equipment availability is verified.",
        );
        const deadline = new Date(Date.now() + 2 * 86400000 + 2 * 3600000)
          .toISOString()
          .slice(0, 16);
        await officer.locator('input[type="datetime-local"]').fill(deadline);
        await action(officer, "Save screening result").click();
        await expect(action(page, "Respond and update")).toBeVisible();
        await expect(page.locator(".ap-timeline li.is-current")).toContainText(
          "Eligibility",
        );
        await expect(
          page.locator(".ap-timeline li").filter({ hasText: "Evaluation" }),
        ).not.toHaveClass(/is-done/);
        await action(page, "Respond and update").click();
        await field(page, "Response to the correction request").fill(
          "The equipment owner confirms availability before every booking.",
        );
        await field(
          page,
          "I have reviewed the answers and attachments.",
        ).check();
        await action(page, "Submit updated application").click();
        await expect(page).toHaveURL(new RegExp(record.id + "\\?submitted=1$"));
        await expect(officer.locator(".sw-case-facts")).toContainText(
          "Awaiting check",
        );
        await caseSection(officer, "Screening");
        await expect(field(officer, "Screening result")).toHaveValue("");
      });
    }

    await test.step("evidence preview and screening feed the programme assignment view", async () => {
      await caseSection(officer, "Documents");
      await action(officer, "Preview proposal.pdf").click();
      await expect(
        officer.getByText("Page 1 of 1", { exact: true }),
      ).toBeVisible();
      await expect(officer.locator(".sw-preview-dialog canvas")).toBeVisible();
      await action(officer, "Close document preview").click();
      await screen(
        officer,
        "eligible",
        "The required evidence is present for this fictional test.",
      );
      await assignReviewers(leader, record.reference);
      await expect(
        reviewer1
          .locator(".sw-application-row")
          .filter({ hasText: record.reference }),
      ).toBeVisible();
      await expect(
        reviewer2
          .locator(".sw-application-row")
          .filter({ hasText: record.reference }),
      ).toBeVisible();
    });

    await test.step("two independent reviewers can submit concurrently without losing either scorecard", async () => {
      await openRecord(reviewer1, record.id);
      await openRecord(reviewer2, record.id);
      await fillReview(reviewer1, "e_01");
      await fillReview(reviewer2, "e_02");
      await Promise.all([
        action(reviewer1, "Submit review").click(),
        action(reviewer2, "Submit review").click(),
      ]);
      await expect(
        reviewer1.getByRole("status").filter({ hasText: "Review submitted" }),
      ).toBeVisible();
      await expect(
        reviewer2.getByRole("status").filter({ hasText: "Review submitted" }),
      ).toBeVisible();
      await expect(reviewer1.locator(".sw-case-facts")).toContainText(
        "2 / 2 submitted",
      );
      await expect(reviewer2.locator(".sw-case-facts")).toContainText(
        "2 / 2 submitted",
      );
      await expect(
        reviewer1.getByText("Private review by e_02", { exact: true }),
      ).toHaveCount(0);
      await expect(
        reviewer2.getByText("Private review by e_01", { exact: true }),
      ).toHaveCount(0);
      await expect(
        reviewer1.getByRole("textbox", {
          name: "Review comments",
          exact: true,
        }),
      ).toBeDisabled();
      await expect(
        reviewer2.getByRole("textbox", {
          name: "Review comments",
          exact: true,
        }),
      ).toBeDisabled();
      await expect(
        leader.getByRole("row").filter({ hasText: record.reference }),
      ).toContainText("Submitted");
    });

    await test.step("programme closure and outcome release update all open views", async () => {
      await excludeIllustrativeIntake(leader, record.id);
      await closeScoring(leader);
      await openRecord(decision, record.id);
      await caseSection(decision, "Review");
      await expect(
        decision.getByText("Private review by e_01", { exact: true }),
      ).toBeVisible();
      await expect(
        decision.getByText("Private review by e_02", { exact: true }),
      ).toBeVisible();
      await caseSection(decision, "Decision");
      await field(decision, "Outcome").selectOption(result);
      await field(decision, "Decision reason").fill(
        `Fictional ${result} outcome after both independent reviews.`,
      );
      await field(decision, "Next steps (one per line)").fill(
        "Ask about the next support programme.",
      );
      await field(
        decision,
        "I have checked this outcome and its reason for release.",
      ).check();
      await action(decision, "Release outcome").click();
      await expect(
        decision
          .getByRole("status")
          .filter({ hasText: "Outcome released locally" }),
      ).toBeVisible();
      await expect(
        page
          .getByText(
            `Fictional ${result} outcome after both independent reviews.`,
            { exact: true },
          )
          .first(),
      ).toBeVisible();
      await expect(page.locator(".ap-timeline li.is-current")).toContainText(
        "Decision",
      );
      await expect(managementCount(management, "Outcomes released")).toHaveText(
        "1",
      );
      await expect(managementCount(management, "Selected")).toHaveText(
        result === "selected" ? "1" : "0",
      );
      await expect(
        page.getByText("Private review by e_01", { exact: true }),
      ).toHaveCount(0);
      await expect(
        management.getByText("applicant@example.test", { exact: false }),
      ).toHaveCount(0);
    });

    if (result === "not_selected") {
      await test.step("review grounds and referral consent reach decision makers and the response returns", async () => {
        await field(page, "Grounds for a review").fill(
          "Please consider the supporting evidence in the corrected version.",
        );
        await action(page, "Save review request").click();
        await field(
          page,
          "I consent to being contacted about the suggested support.",
        ).check();
        await expect(
          decision.getByText(
            "Please consider the supporting evidence in the corrected version.",
            { exact: true },
          ),
        ).toBeVisible();
        await expect(
          decision.getByText("Support contact consent: Given", { exact: true }),
        ).toBeVisible();
        await field(decision, "Follow-up status").selectOption("resolved");
        await field(decision, "Response to review request").fill(
          "We checked the corrected evidence. The recorded outcome is unchanged.",
        );
        await action(decision, "Save review-request response").click();
        await expect(
          page.getByText(
            "We checked the corrected evidence. The recorded outcome is unchanged.",
            { exact: true },
          ),
        ).toBeVisible();
        await expect(
          page.getByText("Review request: Resolved", { exact: true }),
        ).toBeVisible();
        await expect(managementCount(management, "Applications")).toHaveText(
          String(before + 1),
        );
      });
    }

    await expect(errors).toEqual([]);
  });
}

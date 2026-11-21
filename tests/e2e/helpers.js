import { expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

export const proposal = fileURLToPath(
  new URL("./fixtures/proposal.pdf", import.meta.url),
);
export const staffNav = (page) =>
  page.getByRole("navigation", { name: "Staff navigation" });
export const action = (page, name) =>
  page.getByRole("button", { name, exact: true });
export const field = (page, name) => page.getByLabel(name, { exact: true });

export async function prepareContext(context) {
  await context.route(
    /https:\/\/fonts\.(?:googleapis|gstatic)\.com\//,
    (route) => route.abort(),
  );
}

export async function signInApplicant(
  page,
  target = "/workspace/new?new=1&theme=sustainable",
) {
  await page.goto("/login?redirect=" + encodeURIComponent(target));
  await page.getByText("Demo access", { exact: true }).click();
  await action(page, "Open the applicant demo").click();
  await expect(page).toHaveURL(new RegExp(target.split("?")[0] + "(?:\\?|$)"));
}

export async function signInStaff(page, role = "administrator", identity) {
  await page.goto("/staff?redirect=%2Fadmin");
  await page.getByText("Demo access", { exact: true }).click();
  await field(page, "Staff role").selectOption(role);
  if (role === "evaluator")
    await field(page, "Reviewer identity").selectOption(identity || "e_01");
  if (role === "administrator" && identity)
    await field(page, "Administrator identity").selectOption(identity);
  await action(page, "Open").click();
  await expect(page.locator(".st-hero h1")).toBeVisible();
}

export async function openRegister(page) {
  await staffNav(page)
    .getByRole("link", { name: "Applications", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Application register" }),
  ).toBeVisible();
}

export async function openRecord(page, id) {
  await openRegister(page);
  await page
    .locator(`.sw-application-row[href="/admin/applications/${id}"]`)
    .click();
  await expect(page.locator(".sw-case-header h1")).toBeVisible();
}

export async function caseSection(page, section) {
  await page
    .getByRole("navigation", { name: "Application sections" })
    .getByRole("button", { name: new RegExp("^" + section) })
    .click();
}

export async function fillApplication(page, title) {
  await action(page, "Start a new application").click();
  await field(page, "Full name").fill("E2E Applicant");
  await field(page, "Email address").fill("applicant@example.test");
  await field(page, "Phone number").fill("71 234 567");
  await field(page, "Are you a Botswana citizen?").selectOption("yes");
  await action(page, "Continue").click();
  await field(page, "Company name").fill("E2E Water Enterprise");
  await field(page, "Is your company registered?").selectOption("yes");
  await field(page, "Company registration number").fill("E2E-100");
  await action(page, "Add shareholder").click();
  await field(page, "Shareholder 1 name").fill("E2E Applicant");
  await field(page, "Shareholder 1 date of birth").fill("1998-06-15");
  await field(page, "Shareholder 1 citizenship").selectOption("yes");
  await field(page, "Shareholder 1 ownership").fill("100");
  await action(page, "Continue").click();
  await field(page, "Idea title").fill(title);
  await field(page, "Team or organisation").fill("E2E enterprise team");
  await field(page, "The problem").fill(
    "Fictional enterprises need shared water equipment.",
  );
  await field(page, "Your solution").fill(
    "A fictional directory showing equipment and availability.",
  );
  await field(page, "The impact").fill(
    "Measure fictional equipment bookings and service coverage.",
  );
  await action(page, "Continue").click();
  await action(page, "Add budget item").click();
  await field(page, "Budget item 1").fill("Fictional water equipment");
  await field(page, "Budget amount 1").fill("2500.50");
  await field(page, "Funding requested (BWP, if applicable)").fill("2000");
  await action(page, "Continue").click();
  await field(page, "Choose documents").setInputFiles(proposal);
  await expect(action(page, "Download proposal.pdf")).toBeVisible();
  await action(page, "Continue").click();
}

export async function submitApplication(page) {
  await field(page, "I have reviewed the answers and attachments.").check();
  await action(page, "Submit application").click();
  await expect(page).toHaveURL(/\/workspace\/ideas\/CEDA-LOCAL-.*submitted=1/);
  await expect(page.locator(".ap-page-intro .ap-eyebrow")).toBeVisible();
  return {
    id: new URL(page.url()).pathname.split("/").at(-1),
    reference: await page.locator(".ap-page-intro .ap-eyebrow").innerText(),
  };
}

export async function screen(page, result, reason) {
  await caseSection(page, "Screening");
  await field(page, "Screening result").selectOption(result);
  await field(page, "Screening reason").fill(reason);
  await action(page, "Save screening result").click();
  await expect(
    page.getByRole("status").filter({ hasText: "Screening result saved" }),
  ).toBeVisible();
}

export async function assignReviewers(page, reference) {
  await staffNav(page)
    .getByRole("link", { name: "Programmes", exact: true })
    .click();
  await page
    .getByRole("link", { name: "CEDA Innovation Challenge 2026", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Programme sections" })
    .getByRole("link", { name: /^Applications/ })
    .click();
  await action(page, "Assign reviewers for " + reference).click();
  const editor = page.getByRole("form", {
    name: "Reviewers for " + reference,
    exact: true,
  });
  await editor.locator(".st-evaluators input").nth(0).check();
  await editor.locator(".st-evaluators input").nth(1).check();
  await editor
    .getByRole("button", { name: "Save reviewers", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Reviewers saved for" }),
  ).toBeVisible();
}

export async function fillReview(page, identity, score = "4") {
  await caseSection(page, "Review");
  await field(page, "Conflict of interest").selectOption("no");
  const scores = page.locator(".sw-scorecard select");
  const reasons = page.locator(".sw-scorecard textarea");
  await expect(scores).toHaveCount(5);
  await expect(reasons).toHaveCount(5);
  for (let index = 0; index < 5; index++) {
    await scores.nth(index).selectOption(score);
    await reasons
      .nth(index)
      .fill(
        `Fictional evidence for criterion ${index + 1}, reviewed by ${identity}.`,
      );
  }
  await field(page, "Review comments").fill("Private review by " + identity);
}

export function managementCount(page, label) {
  return page
    .locator(".sw-metrics > div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("dd");
}

export async function excludeIllustrativeIntake(page, keepId) {
  await openRegister(page);
  await expect(page.locator(".sw-application-row").first()).toBeVisible();
  const ids = await page
    .locator(".sw-application-row")
    .evaluateAll((rows) =>
      rows.map((row) => row.getAttribute("href").split("/").at(-1)),
    );
  expect(ids).toHaveLength(9);
  for (const id of ids.filter((id) => id !== keepId)) {
    await openRecord(page, id);
    await screen(
      page,
      "ineligible",
      "Fictional sample record excluded from this isolated test intake.",
    );
  }
}

export async function closeScoring(page) {
  await staffNav(page)
    .getByRole("link", { name: "Programmes", exact: true })
    .click();
  await page
    .getByRole("link", { name: "CEDA Innovation Challenge 2026", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await action(page, "Close applications").click();
  await expect(
    page.getByRole("status").filter({ hasText: "Closed to new applications" }),
  ).toBeVisible();
  await staffNav(page)
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  await field(page, "Programme").selectOption("p_ich_2026");
  await action(page, "Close scoring").click();
  await expect(
    page.getByRole("status").filter({ hasText: "Scoring closed" }),
  ).toBeVisible();
}

import { test, expect } from "@playwright/test";

const id = "2a01cc5b-6e79-4e9f-81fb-6e7e59580c70";
const ownerId = "393431ac-d2fa-494c-bde5-bf54a9503a60";
const submission = {
  id: "1bbfd18a-a7bb-40a3-a2a4-bcbe396a0b1a",
  reference: "CEDA-TEST-123",
  submittedAt: "2026-11-22T12:00:00.000Z",
  fields: { title: "Fictional submitted idea", theme: "digital", problem: "Problem", solution: "Solution", impact: "Impact", team: "Team" },
  budget: { items: [], fundingRequested: "", notApplicable: true },
  documents: [],
  version: 1,
};
const application = {
  id, ownerId, programmeId: "programme", programmeVersionId: "version",
  stage: "SUBMITTED", revision: 3, fields: submission.fields,
  budget: submission.budget, documents: [], latestSubmission: submission,
};

test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:3001/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/auth/session")
      return route.fulfill({ json: { data: { user: { id: ownerId, name: "Fictional Applicant", email: "applicant@example.test" } } } });
    if (path === "/api/v1/applications")
      return route.fulfill({ json: { data: [application] } });
    if (path === `/api/v1/applications/${id}`)
      return route.fulfill({ json: { data: application } });
    return route.fulfill({ status: 404, json: { error: { message: "Resource not found." } } });
  });
});

test("verified submission shows server details and redirects after five seconds", async ({ page }) => {
  await page.goto(`/workspace/ideas/${id}/submitted`);
  await expect(page.getByRole("heading", { name: "Application Submitted Successfully" })).toBeVisible();
  await expect(page.getByText(submission.reference)).toBeVisible();
  await expect(page.getByText(submission.fields.title)).toBeVisible();
  await expect(page.getByText("Redirecting to My Applications in 5 seconds...")).toBeVisible();
  await expect(page).toHaveURL(/\/workspace\/applications$/, { timeout: 8000 });
  await expect(page.getByText(submission.reference)).toBeVisible();
});

test("manual navigation and direct unconfirmed links stay safe", async ({ page }) => {
  await page.goto(`/workspace/ideas/${id}/submitted`);
  await expect(page.getByRole("heading", { name: "Application Submitted Successfully" })).toBeVisible();
  await page.getByRole("link", { name: /Back to My Applications/ }).click();
  await expect(page).toHaveURL(/\/workspace\/applications$/);
  await page.goto("/workspace/ideas/00000000-0000-4000-8000-000000000000/submitted");
  await expect(page).toHaveURL(/\/workspace\/applications$/);
});

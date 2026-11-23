import { test, expect } from "@playwright/test";

async function applicantLogin(page, google) {
  await page.route("**/api/v1/auth/session", route => route.fulfill({
    status: 401, contentType: "application/json", body: JSON.stringify({ error: { code: "UNAUTHENTICATED" } }),
  }));
  await page.route("**/api/v1/auth/providers", route => google === null
    ? route.fulfill({ status: 503, contentType: "application/json", body: "{}" })
    : route.fulfill({ contentType: "application/json", body: JSON.stringify({ data: { password: true, google, cognito: false } }) }));
  await page.goto("/login");
  return page.getByRole("button", { name: "Continue with Google", exact: true });
}

test("unavailable Google sign-in is grey and cannot start authentication", async ({ page }) => {
  let googleRequests = 0;
  page.on("request", request => {
    if (new URL(request.url()).pathname === "/api/v1/auth/google") googleRequests++;
  });
  const button = await applicantLogin(page, false);
  await expect(button).toBeDisabled();
  await expect(button.locator("svg")).toHaveCSS("filter", "grayscale(1)");
  await expect(page.getByText("Google sign-in is currently unavailable.", { exact: true })).toHaveCount(0);
  // A real pointer click on the disabled control must not send an OAuth request.
  const bounds = await button.boundingBox();
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  expect(googleRequests).toBe(0);
});

test("Google remains disabled when provider availability cannot be checked", async ({ page }) => {
  const button = await applicantLogin(page, null);
  await expect(button).toBeDisabled();
  await expect(page.getByText("Google sign-in is currently unavailable.", { exact: true })).toHaveCount(0);
});

test("configured Google sign-in remains available", async ({ page }) => {
  const button = await applicantLogin(page, true);
  await expect(button).toBeEnabled();
  await expect(page.getByText("Google sign-in is currently unavailable.", { exact: true })).toHaveCount(0);
});

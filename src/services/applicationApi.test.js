import assert from "node:assert/strict";
import { test } from "node:test";
import { applicationsApi } from "./applicationApi.js";
import { clearCsrfToken } from "./apiClient.js";

test("application list reads the authenticated backend collection", async () => {
  const originalFetch = globalThis.fetch;
  let seen;
  globalThis.fetch = async (url, options) => {
    seen = { url: String(url), options };
    return new Response(JSON.stringify({ data: [{ id: "application-a" }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    assert.deepEqual(await applicationsApi.list(), [{ id: "application-a" }]);
    assert.match(seen.url, /\/api\/v1\/applications$/);
    assert.equal(seen.options.credentials, "include");
  } finally { globalThis.fetch = originalFetch; }
});

test("draft mutation includes CSRF and preserves backend revision conflicts", async () => {
  const originalFetch = globalThis.fetch;
  clearCsrfToken();
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/auth/csrf"))
      return new Response(JSON.stringify({ data: { csrfToken: "fixture-token" } }), { status: 200, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ error: { code: "REVISION_CONFLICT", message: "The application changed." } }), { status: 409, headers: { "Content-Type": "application/json" } });
  };
  try {
    await assert.rejects(applicationsApi.save("application-a", 2, {}, { items: [], fundingRequested: "", notApplicable: true }), (error) => error.status === 409 && error.code === "REVISION_CONFLICT");
    const mutation = calls.find((call) => call.options.method === "PATCH");
    assert.equal(mutation.options.credentials, "include");
    assert.equal(mutation.options.headers.get("X-CSRF-Token"), "fixture-token");
  } finally { clearCsrfToken(); globalThis.fetch = originalFetch; }
});

test("application mutations serialize so successive calls can use current revisions", async () => {
  let revision = 0;
  const order = [];
  const first = applicationsApi.withMutation("application-a", async () => { order.push("first-start"); await new Promise((resolve) => setTimeout(resolve, 5)); revision += 1; order.push("first-end"); });
  const second = applicationsApi.withMutation("application-a", async () => { order.push(`second-${revision}`); revision += 1; });
  await Promise.all([first, second]);
  assert.deepEqual(order, ["first-start", "first-end", "second-1"]);
});

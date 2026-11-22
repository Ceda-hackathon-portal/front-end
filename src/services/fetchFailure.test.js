import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchFailure } from "./fetchFailure.js";

test("aborted requests are reported as cancellation, not API outages", () => {
  const cause = new DOMException("", "AbortError");
  const failure = fetchFailure(cause);
  assert.equal(failure.code, "REQUEST_ABORTED");
  assert.equal(failure.message, "The request was cancelled.");
  assert.equal(failure.cause, cause);
});

test("rejected fetches without an HTTP response remain API availability errors", () => {
  const cause = new TypeError("fetch failed");
  const failure = fetchFailure(cause);
  assert.equal(failure.code, "API_UNAVAILABLE");
  assert.match(failure.message, /^Cannot reach the CEDA API/);
  assert.equal(failure.cause, cause);
});

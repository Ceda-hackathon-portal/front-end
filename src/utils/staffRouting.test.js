import test from "node:test";
import assert from "node:assert/strict";
import { safeReturnPath, roleHome } from "./portal.js";

test("one staff entry returns every staff role to the shared dashboard", () => {
  for (const role of [
    "eligibility-officer",
    "evaluator",
    "adjudicator",
    "administrator",
    "management",
    "system-administrator",
  ]) {
    assert.equal(safeReturnPath("/admin", role), "/admin");
  }
  assert.equal(safeReturnPath("/admin", "submitter"), "/workspace");
});

test("staff return routes keep role boundaries and valid application deep links", () => {
  assert.equal(
    safeReturnPath("/admin/applications/CEDA-LOCAL-123", "evaluator"),
    "/admin/applications/CEDA-LOCAL-123",
  );
  assert.equal(
    safeReturnPath("/admin/screening", "eligibility-officer"),
    "/admin/screening",
  );
  assert.equal(
    safeReturnPath(
      "/admin/programmes/p_ich_2026/applications?view=unassigned",
      "administrator",
    ),
    "/admin/programmes/p_ich_2026/applications?view=unassigned",
  );
  for (const [role, path] of [
    ["evaluator", "/admin/programmes"],
    ["management", "/admin/applications"],
    ["system-administrator", "/admin/screening"],
    ["eligibility-officer", "/admin/decisions"],
  ]) {
    assert.equal(safeReturnPath(path, role), roleHome(role));
  }
});

test("staff return routes reject external, traversal and ambiguous query targets", () => {
  for (const path of [
    "//example.com",
    "https://example.com",
    "/admin/../workspace",
    "/admin/applications?view=all&view=all",
    "/admin?__proto__=x",
    "/admin#external",
    "/admin\\applications",
    "/admin?view=all?view=all",
  ]) {
    assert.equal(safeReturnPath(path, "evaluator"), "/review");
  }
});

test("consultant sessions return to support and preserve valid incoming conversation links",()=>{
 const target="/admin/support?conversation=11111111-1111-4111-8111-111111111111";
 assert.equal(roleHome("support-agent"),"/admin/support");
 assert.equal(safeReturnPath(target,"support-agent"),target);
 assert.equal(safeReturnPath("/admin/programmes","support-agent"),"/admin/support");
 assert.equal(safeReturnPath("/admin/support?conversation=bad","support-agent"),"/admin/support");
 assert.equal(safeReturnPath("/admin/activity","administrator"),"/admin/activity");
 assert.equal(safeReturnPath(target,"submitter"),"/workspace");
});

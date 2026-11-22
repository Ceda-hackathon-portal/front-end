import assert from "node:assert/strict";
import { test } from "node:test";
import { copyDocumentToApplication } from "./applicantDocuments.js";

test("reusing a stored proposal uploads its bytes to the target application", async () => {
  const document = { id: "source-doc", applicationId: "old-app", name: "proposal.pdf", category: "technical-proposal", type: "application/pdf", storage: "server", expiresAt: null };
  let called = false;
  const result = await copyDocumentToApplication(document, "new-app", async (files, category, expiry, draftId) => {
    called = true;
    assert.equal(draftId, "new-app");
    assert.equal(category, "technical-proposal");
    assert.equal(expiry, "");
    assert.equal(files[0].name, "proposal.pdf");
    assert.equal(await files[0].text(), "%PDF-1.7\nfictional proposal");
    return ["new-document-id"];
  }, async (sourceId, documentId) => {
    assert.equal(sourceId, "old-app");
    assert.equal(documentId, "source-doc");
    return new Blob(["%PDF-1.7\nfictional proposal"], { type: "application/pdf" });
  });
  assert.equal(called, true);
  assert.deepEqual(result, ["new-document-id"]);
});

test("a missing source file never appears attached", async () => {
  let uploaded = false;
  await assert.rejects(copyDocumentToApplication({ id: "missing", applicationId: "old-app", name: "proposal.pdf", category: "technical-proposal", storage: "server" }, "new-app", () => { uploaded = true; }, async () => { throw Object.assign(new Error("Stored file missing"), { status: 404 }); }), /Stored file missing/);
  assert.equal(uploaded, false);
});

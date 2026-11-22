import { useRef, useState } from "react";
import { Download, FileText, Paperclip, Plus, X } from "lucide-react";
import { usePortal } from "../../context/PortalContext";
import { documentCategories, isExpired } from "../../utils/applicantWorkflow";
import { downloadDocument, fileSize } from "../../services/applicantDocuments";

export function DocumentList({ documents, onRemove, disabled = false }) {
  const [error, setError] = useState("");
  return (
    <>
      <ul className="ap-document-list">
        {documents.map((document) => (
          <li key={document.id}>
            <FileText size={20} strokeWidth={1.5} />
            <div>
              <strong>{document.name}</strong>
              <span>
                {
                  documentCategories.find(
                    (category) => category.id === document.category,
                  )?.name
                }{" "}
                · {fileSize(document.size)}
              </span>
              <small>
                {isExpired(document)
                  ? "Expired"
                  : document.expiresAt
                    ? "Expires " + document.expiresAt
                    : document.storage === "server"
                      ? "Stored for this application"
                      : "Saved on this device"}{" "}
                · {document.verification || "Not verified"}
              </small>
            </div>
            <button
              type="button"
              className="ap-icon-control"
              aria-label={"Download " + document.name}
              onClick={async () => {
                setError("");
                try {
                  await downloadDocument(document);
                } catch (failure) {
                  setError(failure.message);
                }
              }}
            >
              <Download size={17} />
            </button>
            {onRemove && (
              <button
                type="button"
                className="ap-icon-control"
                aria-label={"Remove " + document.name + " from application"}
                disabled={disabled}
                onClick={() => onRemove(document.id)}
              >
                <X size={17} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p className="ap-form-alert" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
export default function ApplicantDocuments({
  draftId = null,
  onChanged,
  onPendingChange,
  error: validationError = "",
}) {
  const { documents, drafts, uploadDocuments, attachDocument, documentsProgress } = usePortal();
  const [category, setCategory] = useState("technical-proposal");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const draft = drafts.find((item) => item.id === draftId);
  const selected = draft
    ? documents.filter((document) => draft.documentIds.includes(document.id))
    : documents;
  const available = draft
    ? documents.filter((document) => !draft.documentIds.includes(document.id))
    : [];
  async function saveFiles(files) {
    if (!files.length || busy) return;
    setBusy(true);
    onPendingChange?.(true);
    setError("");
    setNotice("");
    try {
      await uploadDocuments(files, category, expiresAt, draftId);
      setNotice("Files saved. You can reopen and download them from this application.");
      onChanged?.();
    } catch (failure) {
      setError(failure.status === 401 ? "Your session expired. Sign in again before uploading."
        : failure.status === 409 ? "This application changed. Reopen the latest draft and retry the upload."
          : failure.message || "Upload failed. Retry with the same file.");
    } finally {
      setBusy(false);
      onPendingChange?.(false);
      if (input.current) input.current.value = "";
    }
  }
  async function attach(id, remove = false) {
    if (busy) return;
    setBusy(true);
    onPendingChange?.(true);
    setError("");
    setNotice("");
    try {
      await attachDocument(draftId, id, remove);
      setError("");
      setNotice(
        remove
          ? "Removed from this application. The reusable copy remains in your library."
          : "Document attached.",
      );
      onChanged?.();
    } catch (failure) {
      setError(failure.status === 401 ? "Your session expired. Sign in again before attaching."
        : failure.status === 409 ? "This application changed. Reopen the latest draft and retry."
          : failure.status === 404 ? "The stored file is missing. Choose the file again to upload it."
            : failure.message || "The document could not be attached. Retry.");
    } finally {
      setBusy(false);
      onPendingChange?.(false);
    }
  }
  return (
    <div
      className="ap-documents"
      id="application-documents"
      tabIndex={-1}
      aria-describedby={validationError ? "error-documents" : undefined}
    >
      <div className="ap-document-instructions">
        <Paperclip size={20} />
        <div>
          <h3>{draftId ? "Attach documents" : "Document library"}</h3>
          <p>
            PDF, DOCX, JPG or PNG. Up to 10 MB each and 10 files per
            application.
          </p>
          <p>
            Technical proposal is required for this challenge. Other evidence
            depends on the programme.
          </p>
        </div>
      </div>
      <div className="ap-upload-options">
        <label>
          Document category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {documentCategories.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Expiry date (if shown)
          <input
            type="date"
            value={expiresAt}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </label>
      </div>
      <p className="ap-muted">
        {documentCategories.find((item) => item.id === category)?.guidance}
      </p>
      <label className={"ap-file-picker" + (busy ? " is-busy" : "")}>
        <Plus size={19} />
        <span>{busy ? "Saving files…" : "Choose files"}</span>
        <input
          ref={input}
          aria-label="Choose documents"
          type="file"
          accept=".pdf,.docx,.jpg,.jpeg,.png"
          multiple
          disabled={busy}
          onChange={(event) => saveFiles(Array.from(event.target.files || []))}
        />
      </label>
      {busy && (
        <p role="status" className="ap-inline-note">
          {documentsProgress.total
            ? `Uploaded ${documentsProgress.completed} of ${documentsProgress.total} files. Keep this page open.`
            : "Checking file type and saving the file contents. Keep this page open."}
        </p>
      )}
      {error && (
        <p role="alert" className="ap-form-alert">
          {error}
        </p>
      )}
      {validationError && (
        <p className="ap-field-error" id="error-documents">
          {validationError}
        </p>
      )}
      {notice && (
        <p role="status" className="ap-inline-note">
          {notice}
        </p>
      )}
      <DocumentList
        documents={selected}
        disabled={busy}
        onRemove={draftId && !draft?.backendOwnerId ? (id) => attach(id, true) : null}
      />
      {!selected.length && (
        <p className="ap-inline-note">
          {draftId
            ? "No documents attached yet."
            : "Your saved documents will appear here."}
        </p>
      )}
      {Boolean(available.length) && (
        <details className="ap-reuse-documents">
          <summary>Reuse a saved document ({available.length})</summary>
          {available.map((document) => (
            <div key={document.id}>
              <span>
                {document.name}
                {isExpired(document) ? " · Expired" : ""}
              </span>
              <button
                type="button"
                disabled={busy || isExpired(document)}
                className="ap-text-link"
                onClick={() => attach(document.id)}
              >
                Attach
                <Plus size={14} />
              </button>
            </div>
          ))}
        </details>
      )}
      <p className="ap-document-boundary">
        Documents are stored privately for this application. They have not been
        virus scanned or verified by CEDA. Make sure all document text is readable.
      </p>
    </div>
  );
}

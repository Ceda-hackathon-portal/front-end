import { useEffect, useRef, useState } from "react";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  downloadDocument,
  getDocumentFile,
} from "../../services/applicantDocuments";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export default function StaffDocumentPreview({
  document: attachment,
  onClose,
}) {
  const dialog = useRef(null);
  const canvas = useRef(null);
  const [file, setFile] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    dialog.current?.showModal();
    const element = dialog.current;
    return () => element?.close();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let url;
    let loadingTask;
    let pdfDocument;
    setBusy(true);
    setError("");
    setPdf(null);
    setFile(null);
    setPageNumber(1);
    async function load() {
      try {
        const blob = await getDocumentFile(attachment.id);
        const bytes = await blob.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        if (cancelled) return;
        const checksum = Array.from(new Uint8Array(digest), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
        if (checksum !== attachment.sha256)
          throw new Error(
            "The saved file differs from the attached copy. Ask for the correct file again.",
          );
        if (attachment.type === "application/pdf") {
          const pdfjs = await import("pdfjs-dist");
          pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
          if (cancelled) return;
          loadingTask = pdfjs.getDocument({
            data: bytes,
            isEvalSupported: false,
          });
          pdfDocument = await loadingTask.promise;
          if (!cancelled) setPdf(pdfDocument);
        } else if (["image/png", "image/jpeg"].includes(attachment.type)) {
          url = URL.createObjectURL(blob);
          if (!cancelled) setFile(url);
        }
      } catch (failure) {
        if (!cancelled)
          setError(failure.message || "This document could not be opened.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      if (loadingTask) loadingTask.destroy().catch(() => {});
    };
  }, [attachment.id, attachment.sha256, attachment.type]);

  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let cancelled = false;
    let renderTask;
    async function render() {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled || !canvas.current) return;
        const viewport = page.getViewport({ scale: 1.3 });
        const element = canvas.current;
        element.width = viewport.width;
        element.height = viewport.height;
        renderTask = page.render({
          canvasContext: element.getContext("2d"),
          viewport,
        });
        await renderTask.promise;
      } catch (failure) {
        if (!cancelled && failure.name !== "RenderingCancelledException")
          setError(
            "This PDF page could not be rendered. You can download the original file.",
          );
      }
    }
    render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber]);

  async function download() {
    try {
      await downloadDocument(attachment);
      setDownloadError("");
    } catch (failure) {
      setDownloadError(failure.message);
    }
  }
  return (
    <dialog
      className="sw-preview-dialog"
      ref={dialog}
      aria-labelledby="staff-document-title"
      onCancel={onClose}
    >
      <header>
        <div>
          <span className="st-eyebrow">DOCUMENT PREVIEW</span>
          <h2 id="staff-document-title">{attachment.name}</h2>
        </div>
        <button
          className="st-icon-button"
          aria-label="Close document preview"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div className="sw-preview-toolbar">
        <span className="st-muted">
          Stored on this device · Not verified by CEDA
        </span>
        <button className="st-button st-button-secondary" onClick={download}>
          <Download size={16} />
          Download original
        </button>
      </div>
      {downloadError && (
        <p className="st-alert" role="alert">
          {downloadError}
        </p>
      )}
      <div className="sw-preview-body">
        {busy ? (
          <p role="status">Opening document…</p>
        ) : error ? (
          <p className="st-alert" role="alert">
            {error}
          </p>
        ) : pdf ? (
          <>
            <div className="sw-pdf-controls">
              <button
                className="st-button st-button-small st-button-secondary"
                disabled={pageNumber === 1}
                onClick={() => setPageNumber((number) => number - 1)}
                aria-label="Previous PDF page"
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                Page {pageNumber} of {pdf.numPages}
              </span>
              <button
                className="st-button st-button-small st-button-secondary"
                disabled={pageNumber === pdf.numPages}
                onClick={() => setPageNumber((number) => number + 1)}
                aria-label="Next PDF page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <canvas
              ref={canvas}
              aria-label={"Page " + pageNumber + " of " + attachment.name}
            />
          </>
        ) : file ? (
          <img src={file} alt={attachment.name} />
        ) : (
          <div className="st-empty">
            <h3>Preview is unavailable for this format</h3>
            <p className="st-muted">
              Download the original DOCX file to read it in your document
              editor.
            </p>
          </div>
        )}
      </div>
    </dialog>
  );
}

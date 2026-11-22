import { applicationsApi } from "./applicationApi.js";
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const formats = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};
export function documentError(file, bytes) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (!formats[extension]) return "Choose a PDF, DOCX, JPG or PNG file.";
  if (!file.size) return "This file is empty. Choose a complete document.";
  if (file.size > MAX_DOCUMENT_BYTES)
    return "Each file must be 10 MB or smaller.";
  if (file.name.length > 200 || /[\x00-\x1f\\/]/.test(file.name))
    return "Use a shorter filename without slashes or control characters.";
  if (
    file.type &&
    file.type !== formats[extension] &&
    file.type !== "application/octet-stream"
  )
    return "The file type and filename do not match.";
  if (!bytes) return "";
  const b = new Uint8Array(bytes);
  const starts = (signature) =>
    signature.every((byte, index) => b[index] === byte);
  const valid =
    extension === "pdf"
      ? starts([37, 80, 68, 70, 45])
      : extension === "png"
        ? starts([137, 80, 78, 71, 13, 10, 26, 10])
        : ["jpg", "jpeg"].includes(extension)
          ? starts([255, 216, 255])
          : starts([80, 75, 3, 4]);
  return valid
    ? ""
    : "This file’s contents do not match its extension. Export it again in a supported format.";
}
// Reusing metadata must still write the bytes: the browser may have evicted a saved file.
export function documentUploadPlan(prepared, existingDocuments) {
  const documents = [];
  const files = [];
  const ids = [];
  for (const item of prepared) {
    const duplicate = [...existingDocuments, ...documents].find(
      (document) =>
        document.sha256 === item.metadata.sha256 &&
        document.category === item.metadata.category &&
        document.expiresAt === item.metadata.expiresAt,
    );
    const id = duplicate?.id || item.metadata.id;
    if (!duplicate) documents.push(item.metadata);
    files.push({ id, blob: item.blob });
    ids.push(id);
  }
  return { documents, files, ids: [...new Set(ids)] };
}
async function openStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ceda.applicant.documents.v1", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Document storage is unavailable. Check browser storage permissions and retry.",
        ),
      );
    request.onblocked = () =>
      reject(new Error("Close other CEDA tabs and retry saving the file."));
  });
}
export async function saveDocumentFiles(records) {
  const db = await openStore();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction("files", "readwrite");
      for (const record of records)
        transaction.objectStore("files").put(record);
      transaction.oncomplete = resolve;
      transaction.onerror = () =>
        reject(
          new Error(
            "The file could not be saved. Free browser storage or choose a smaller file, then retry.",
          ),
        );
      transaction.onabort = () =>
        reject(
          new Error(
            "Saving was interrupted. Your file has not been attached. Retry.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
export async function getDocumentFile(id) {
  const db = await openStore();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction("files", "readonly");
      const request = transaction.objectStore("files").get(id);
      request.onsuccess = () =>
        request.result
          ? resolve(request.result.blob)
          : reject(
              new Error(
                "The saved file is no longer on this device. Attach it again.",
              ),
            );
      request.onerror = () =>
        reject(new Error("The file could not be read. Retry the download."));
    });
  } finally {
    db.close();
  }
}
export async function prepareDocument(file, category, expiresAt = "") {
  const firstError = documentError(file);
  if (firstError) throw new Error(firstError);
  const bytes = await file.arrayBuffer();
  const contentError = documentError(file, bytes);
  if (contentError) throw new Error(contentError);
  let blob = file;
  let name = file.name;
  if (
    ["image/jpeg", "image/png"].includes(file.type) &&
    file.size > 300 * 1024 &&
    typeof createImageBitmap === "function"
  ) {
    const bitmap = await createImageBitmap(file);
    try {
      if (bitmap.width * bitmap.height > 40_000_000)
        throw new Error(
          "This image is too large to process. Export a smaller photo and retry.",
        );
      if (Math.max(bitmap.width, bitmap.height) > 1800) {
        const ratio = 1800 / Math.max(bitmap.width, bitmap.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * ratio);
        canvas.height = Math.round(bitmap.height * ratio);
        canvas
          .getContext("2d")
          .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const compressed = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.85),
        );
        if (compressed && compressed.size < file.size) {
          blob = compressed;
          name = file.name.replace(/\.[^.]+$/, ".jpg");
        }
      }
    } finally {
      bitmap.close();
    }
  }
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const metadata = {
    id: crypto.randomUUID(),
    name,
    size: blob.size,
    originalSize: file.size,
    type: blob.type || formats[file.name.split(".").pop().toLowerCase()],
    category,
    expiresAt,
    uploadedAt: new Date().toISOString(),
    sha256: Array.from(new Uint8Array(hash), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join(""),
    verification: "Not verified",
    storage: "device",
  };
  return { metadata, blob };
}
export async function copyDocumentToApplication(document, draftId, upload, read = applicationsApi.downloadDocument) {
  const bytes = document.storage === "server"
    ? await read(document.applicationId, document.backendDocumentId || document.id)
    : await getDocumentFile(document.id);
  const file = new File([bytes], document.name, { type: document.type || document.contentType });
  return upload([file], document.category, document.expiresAt?.slice(0, 10) || "", draftId);
}
export async function downloadDocument(document) {
  const blob = document.storage === "server"
    ? await applicationsApi.downloadDocument(document.applicationId, document.backendDocumentId || document.id)
    : await getDocumentFile(document.id);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await blob.arrayBuffer(),
  );
  const checksum = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (document.sha256 !== checksum)
    throw new Error(
      "The saved file differs from the attached copy. Attach the correct file again.",
    );
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = document.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function fileSize(bytes) {
  return bytes < 1024 * 1024
    ? Math.max(1, Math.round(bytes / 1024)) + " KB"
    : (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

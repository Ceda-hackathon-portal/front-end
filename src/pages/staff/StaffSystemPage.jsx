import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useStaffWorkflow } from "../../context/StaffWorkflowContext";
import { fileSize } from "../../services/applicantDocuments";

export default function StaffSystemPage() {
  const { storageWarning } = useStaffWorkflow();
  const [storage, setStorage] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      if (!navigator.storage?.estimate)
        throw new Error("Storage estimates are unavailable in this browser.");
      const estimate = await navigator.storage.estimate();
      setStorage(estimate);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  const controls = [
    [
      "Staff identity",
      "Demo sessions",
      "Server authentication and role permissions are not connected.",
    ],
    [
      "Application records",
      "Local browser storage",
      storageWarning || "Local save failures are reported to the user.",
    ],
    [
      "Document contents",
      "IndexedDB on this device",
      "File type, size and checksums are checked in the frontend.",
    ],
    [
      "Malware scanning",
      "Service not connected",
      "Files must be quarantined and scanned by the document service.",
    ],
    [
      "Audit evidence",
      "Local workflow history",
      "A tamper-resistant central audit service is not connected.",
    ],
    [
      "Email & SMS",
      "Service not connected",
      "Saving a request does not send an email or SMS.",
    ],
  ];
  return (
    <div className="st-page sw-page">
      <header className="st-page-header">
        <div>
          <span className="st-eyebrow">SYSTEM ADMINISTRATION</span>
          <h1>System status</h1>
          <p>Observed browser capabilities and service connections.</p>
        </div>
        <button
          className="st-button st-button-secondary"
          disabled={busy}
          onClick={refresh}
        >
          <RefreshCw size={16} />
          {busy ? "Checking…" : "Refresh checks"}
        </button>
      </header>
      {error && (
        <p className="st-alert" role="alert">
          {error}
        </p>
      )}
      <section className="st-panel sw-system-storage">
        <div>
          <h2>Browser storage</h2>
          <p className="st-muted">Shared by this site on this device.</p>
        </div>
        <dl>
          <div>
            <dt>In use</dt>
            <dd>{storage ? fileSize(storage.usage || 0) : "Not measured"}</dd>
          </div>
          <div>
            <dt>Estimated quota</dt>
            <dd>{storage ? fileSize(storage.quota || 0) : "Not measured"}</dd>
          </div>
        </dl>
      </section>
      <section className="st-panel">
        <h2>Connection register</h2>
        <ul className="sw-service-list">
          {controls.map(([name, status, detail]) => (
            <li key={name}>
              <div>
                <strong>{name}</strong>
                <p>{detail}</p>
              </div>
              <span className="sw-status sw-status-neutral">{status}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className="st-muted">
        Technical access does not grant access to private application content.
      </p>
    </div>
  );
}

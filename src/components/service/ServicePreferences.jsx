import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { serviceApi } from "../../services/serviceApi";
import { useServiceData } from "./useServiceData";
export default function ServicePreferences() {
  const settings = useServiceData(() => serviceApi.get("/preferences"));
  const requests = useServiceData(
    () => serviceApi.get("/privacy/requests"),
    10000,
  );
  const [inApp, setInApp] = useState(true),
    [email, setEmail] = useState(false),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (settings.data) {
      setInApp(settings.data.in_app);
      setEmail(settings.data.email);
      setConsent(Boolean(settings.data.contact_consent_version));
    }
  }, [settings.data]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await serviceApi.put("/preferences", { inApp, email, consent });
      setMessage("Your account preferences have been saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    setError("");
    try {
      const result = await serviceApi.get("/privacy/export"),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(result, null, 2)], {
            type: "application/json",
          }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "ceda-account-data.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      await requests.refresh();
      setMessage("Your data copy has been prepared.");
    } catch (e) {
      setError(e.message);
    }
  }
  async function request(kind) {
    setError("");
    try {
      await serviceApi.post("/privacy/requests", { kind });
      await requests.refresh();
      setMessage("Your request has been recorded for review.");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <div className="sc-drawer-content sc-preferences">
      <h3>Updates & privacy</h3>
      <form onSubmit={save}>
        <label>
          <input
            type="checkbox"
            checked={inApp}
            onChange={(e) => setInApp(e.target.checked)}
          />
          Free in-app updates
        </label>
        <label>
          <input
            type="checkbox"
            checked={email}
            onChange={(e) => setEmail(e.target.checked)}
          />
          Email updates
        </label>
        <p className="sc-fine">
          Email delivery requires the configured service. Your application
          details are kept inside the portal.
        </p>
        <label>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          I have read the <Link to="/privacy">privacy notice</Link> and agree to
          these contact preferences.
        </label>
        <button disabled={busy} type="submit">
          {busy ? "Saving…" : "Save preferences"}
        </button>
      </form>
      <h3>Your information</h3>
      <p className="sc-fine">
        You can request a copy or deletion. Submitted records may need to be
        retained; CEDA must review a deletion request before removing them.
      </p>
      <div className="sc-button-row">
        <button onClick={exportData}>Download my data</button>
        <button onClick={() => request("DELETE")}>Request deletion</button>
      </div>
      {(requests.data || []).map((r) => (
        <p className="sc-request" key={r.id}>
          {r.kind === "EXPORT" ? "Data copy" : "Deletion"}
          <span>{r.status.toLowerCase()}</span>
        </p>
      ))}
      {(error || settings.error || requests.error) && (
        <p role="alert" className="sc-error">
          {error || settings.error || requests.error}
        </p>
      )}
      {message && (
        <p role="status" className="sc-success">
          {message}
        </p>
      )}
    </div>
  );
}

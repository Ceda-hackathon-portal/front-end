import ServicePreferences from '../components/service/ServicePreferences';
import GoogleSignInButton from '../components/shared/GoogleSignInButton';
import { useAuth } from '../hooks/useAuth';
import { useState } from "react";
import { Check, Save } from "lucide-react";
import { usePortal } from "../context/PortalContext";
import ProfileFields from "../components/applicant/ProfileFields";
import ApplicantDocuments from "../components/applicant/ApplicantDocuments";
import { validateProfile } from "../utils/applicantWorkflow";

export default function ApplicantProfilePage() {
  const { profile, saveProfile } = usePortal();
  const { user } = useAuth();
  const [form, setForm] = useState(() => structuredClone(profile));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  function change(next) {
    setForm(next);
    setSaved(false);
    setMessage("");
    setErrors({});
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = {
      ...validateProfile(form),
      ...validateProfile(form, "business"),
    };
    setErrors(nextErrors);
    setSaved(false);
    if (Object.keys(nextErrors).length) {
      document
        .getElementById("application-" + Object.keys(nextErrors)[0])
        ?.focus();
      return;
    }
    setBusy(true);
    try {
      const savedProfile = await saveProfile({
        ...form,
        contactConsentRecordedAt: new Date().toISOString(),
      });
      setForm(structuredClone(savedProfile));
      setSaved(true);
      setMessage(
        "Profile saved on this device. It will be reused in new applications.",
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ap-page ap-profile-page">
      <form className="ap-panel" onSubmit={submit} noValidate>
        <fieldset className="ap-form-fieldset" disabled={busy}>
          <div className="ap-section-title">
            <h2>Personal details</h2>
            <span className="ap-soft-label">Not verified by CEDA</span>
          </div>
          <ProfileFields profile={form} onChange={change} errors={errors} />
          <div className="ap-profile-divider">
            <h2>Company details</h2>
          </div>
          <ProfileFields
            section="business"
            profile={form}
            onChange={change}
            errors={errors}
          />
          <div className="ap-profile-divider">
            <h2>Contact and display preferences</h2>
          </div>
          <p className="ap-muted">
            Display preferences are saved on this device. Manage account alerts below.
          </p>
          {[


            ["dataLight", "Data-light mode — hide decorative photos"],
          ].map(([key, label]) => (
            <label className="ap-check-row" key={key}>
              <input
                type="checkbox"
                checked={Boolean(form.preferences?.[key])}
                onChange={(event) =>
                  change({
                    ...form,
                    preferences: {
                      ...form.preferences,
                      [key]: event.target.checked,
                    },
                  })
                }
              />
              <span>{label}</span>
            </label>
          ))}
          {message && (
            <p
              role={saved ? "status" : "alert"}
              className={saved ? "ap-inline-note" : "ap-form-alert"}
            >
              {saved && <Check size={15} />}
              {message}
            </p>
          )}
          <div className="ap-profile-actions">
            <button
              type="submit"
              className="ap-button ap-button-primary"
              disabled={busy}
            >
              <Save size={16} />
              Save profile
            </button>
            <span>Verification is completed by a CEDA officer.</span>
          </div>
        </fieldset>
      </form>
      {user && !user.demo && <section className="ap-panel"><h2>Account sign-in</h2><GoogleSignInButton link target="/workspace/profile" /><ServicePreferences /></section>}
      <section className="ap-panel">
        <ApplicantDocuments />
      </section>
    </div>
  );
}

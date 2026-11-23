import { useState } from "react";
import { authApi } from "../../services/apiClient";
import { GOOGLE_RETURN_KEY, googleAuthorizationUrl } from "../../utils/googleSignIn";
import "../../styles/auth.css";

export default function GoogleSignInButton({ target, staff = false, link = false, disabled = false, onBusy }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function begin() {
    if (busy || disabled) return;
    setBusy(true);
    onBusy?.(true);
    setError("");
    try {
      sessionStorage.setItem(GOOGLE_RETURN_KEY, JSON.stringify({ target, staff }));
      const result = await authApi.google({ link });
      window.location.assign(googleAuthorizationUrl(result.authorizationUrl));
    } catch (failure) {
      setError([404, 503].includes(failure?.status)
        ? "Google sign-in is currently unavailable. Please use another sign-in method or try again later."
        : failure?.message || "Google sign-in could not be started. Please try again.");
      setBusy(false);
      onBusy?.(false);
    }
  }
  return <div className="auth-google-option">
    <button type="button" className="auth-entry-google" onClick={begin} disabled={disabled || busy} aria-busy={busy}>
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      {busy ? "Connecting…" : link ? "Connect Google" : "Continue with Google"}
    </button>
    {error && <p className="auth-entry-notice" role="alert">{error}</p>}
  </div>;
}

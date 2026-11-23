import OptimizedImage from "../components/shared/OptimizedImage";
import { useEffect, useState } from "react";
import GoogleSignInButton from "../components/shared/GoogleSignInButton";
import { GOOGLE_RETURN_KEY, readGoogleReturn, googleFailureMessage } from "../utils/googleSignIn";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronDown, Eye, EyeOff } from "lucide-react";
import Brand from "../components/shared/Brand";
import { useAuth } from "../hooks/useAuth";
import { roles } from "../data/portal";
import { currentManager, otherManager, evaluators } from "../data/admin";
import { safeReturnPath } from "../utils/portal";
import { authApi } from "../services/apiClient";
import "../styles/auth.css";

// Two separate entry points: /login (with /register and /forgot-password) for applicants, /staff for CEDA staff.
const staffRoles = roles.filter((role) => role.id !== "submitter");

export default function AuthPage({ mode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState("administrator");
  const [reviewerId, setReviewerId] = useState("e_01");
  const [managerId, setManagerId] = useState("u_pm_demo");
  const [signingIn, setSigningIn] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [providers, setProviders] = useState(null);
  const [googleReturn] = useState(() => readGoogleReturn(sessionStorage));
  // Self-registration: "details" (name, email, password), then "code" (the 6 digits emailed to the applicant).
  const [signup, setSignup] = useState({ step: "details", verificationId: "", name: "", email: "", password: "" });
  const { startDemo, logout, staffUser, signInLocal, completeRegistration, localAuthEnabled, user, authLoading, authError, retryAuthSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const googleSuccess = params.get("signedIn") === "google";
  const googleError = params.get("error") === "google";
  const target = params.get("redirect") || ((googleSuccess || googleError) ? googleReturn.target : null);
  const suffix = target ? "?redirect=" + encodeURIComponent(target) : "";
  const staff = mode === "staff" || ((googleSuccess || googleError) && googleReturn.staff);
  const registering = mode === "register";
  const resetting = mode === "reset";
  const configuredLocalEmail = import.meta.env.VITE_LOCAL_AUTH_EMAIL || "";
  const title = staff
    ? "CEDA staff sign in"
    : resetting
      ? "Reset password"
      : registering
        ? "Create an account"
        : "Sign in";

  useEffect(() => {
    let active = true;
    authApi.providers().then(value => { if (active) setProviders(value); }).catch(() => {
      if (active) setProviders({ google: false, cognito: false });
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (googleError || (googleSuccess && !authLoading)) sessionStorage.removeItem(GOOGLE_RETURN_KEY);
  }, [googleSuccess, googleError, authLoading]);

  const localPasswordAvailable = localAuthEnabled && providers?.password !== false;
  const registrationAvailable = localPasswordAvailable && providers?.registration === true;
  const googleIdentity = staffUser || user;
  if (googleSuccess && !authLoading && googleIdentity && !googleIdentity.demo)
    return <Navigate to={safeReturnPath(target, googleIdentity.role)} replace />;

  if (!staff && user && mode === "login")
    return <Navigate to={safeReturnPath(target, "submitter")} replace />;

  if (staff && staffUser)
    return <Navigate to={safeReturnPath(target, staffUser.role)} replace />;

  async function submit(event) {
    event.preventDefault();
    if (staff && !localAuthEnabled) {
      setMessage("Staff sign in is not configured on this deployment. Use demo access below.");
      return;
    }
    if (!localAuthEnabled) {
      setMessage("Use CEDA secure sign in below. Account creation and password recovery are provided by the identity service.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setSigningIn(true);
    setMessage("");
    try {
      const account = await signInLocal(form.get("email"), form.get("password"));
      if (staff && account.role === "submitter") {
        setMessage("This account has no staff access. Applicants sign in on the applicant page.");
        return;
      }
      navigate(safeReturnPath(target, account.role), { replace: true });
    } catch (error) {
      setMessage(error?.status === 401
        ? "Email or password is incorrect. Check your details and try again."
        : error?.message || "Sign in failed. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }

  async function sendCode(details) {
    setSigningIn(true);
    setMessage("");
    try {
      const result = await authApi.register(details.name, details.email, details.password);
      setSignup({ ...details, step: "code", verificationId: result.verificationId });
      setMessage("");
    } catch (error) {
      setMessage(error?.status === 422 || error?.status === 400
        ? "Check your details: enter your full name, a valid email and a password of at least 12 characters."
        : error?.message || "We could not send the code. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }

  function submitRegistration(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    sendCode({ name: String(form.get("name") || "").trim(), email: String(form.get("email") || "").trim(), password: String(form.get("password") || "") });
  }

  async function submitCode(event) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") || "").replace(/\D/g, "");
    if (code.length !== 6) {
      setMessage("Enter the 6-digit code from the email.");
      return;
    }
    setSigningIn(true);
    setMessage("");
    try {
      const account = await completeRegistration(signup.verificationId, code);
      navigate(safeReturnPath(target, account.role), { replace: true });
    } catch (error) {
      setMessage(error?.message || "That code is wrong or has expired. Check the latest email or request a new code.");
    } finally {
      setSigningIn(false);
    }
  }

  async function beginOidcSignIn() {
    setSigningIn(true);
    setMessage("");
    try {
      const result = await authApi.login();
      const destination = new URL(result.authorizationUrl);
      if (destination.protocol !== "https:") throw new Error("Invalid sign-in destination");
      window.location.assign(destination.href);
    } catch (error) {
      setMessage([404, 503].includes(error?.status)
        ? "Backend sign in is disabled or the OIDC provider is not configured. Ask the administrator to configure the approved identity provider."
        : error?.message || "Secure sign in is unavailable. Please try again.");
      setSigningIn(false);
    }
  }

  function openDemo(role) {
    startDemo(role, reviewerId, managerId);
    navigate(safeReturnPath(target, role));
  }

  return (
    <div className="auth-entry">
      <a className="skip-link" href="#auth-content">
        Skip to form
      </a>
      <header className="auth-entry-brand">
        <Link to="/" aria-label="CEDA home">
          <Brand />
        </Link>
      </header>
      <main className="auth-entry-card" id="auth-content" tabIndex={-1}>
        <section className="auth-entry-form" aria-labelledby="auth-title">
          <div className="auth-entry-form-inner">
            <h1 id="auth-title">{title}</h1>
            {staff && (
              <p className="auth-entry-intro">
                For screening officers, reviewers, decision makers and
                administrators. Applicants sign in on the{" "}
                <Link to="/login">applicant page</Link>.
              </p>
            )}
            {googleError && <p className="auth-entry-notice" role="alert">{googleFailureMessage(params.get("reason"))}</p>}
            {googleSuccess && <p className="auth-entry-notice" role={authLoading ? "status" : "alert"}>
              {authLoading ? "Checking your Google sign-in…" : authError || "Your Google session could not be restored. Please try signing in again."}
              {!authLoading && authError && <button type="button" onClick={retryAuthSession}>Check again</button>}
            </p>}
            {localPasswordAvailable && !registering && !resetting ? <form onSubmit={submit}>
              {registering && (
                <label>
                  Full name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={100}
                  />
                </label>
              )}
              <label>
                {staff ? "Work email" : "Email address"}
                <input
                  name="email"
                  type="email"
                  autoComplete={staff ? "username" : "email"}
                  placeholder={staff ? "name@ceda.co.bw" : "you@example.com"}
                  defaultValue={!staff && localAuthEnabled ? configuredLocalEmail : undefined}
                  required
                  maxLength={254}
                />
              </label>
              {!resetting && (
                <label>
                  Password
                  <span className="auth-entry-password">
                    <input
                      name="password"
                      type={visible ? "text" : "password"}
                      autoComplete={
                        registering ? "new-password" : "current-password"
                      }
                      minLength={localAuthEnabled && !staff ? undefined : 8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVisible(!visible)}
                      aria-label={visible ? "Hide password" : "Show password"}
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
              )}
              {!staff && !registering && !resetting && (
                <Link
                  className="auth-entry-forgot"
                  to={"/forgot-password" + suffix}
                >
                  Forgot password?
                </Link>
              )}
              {message && (
                <p className="auth-entry-notice" role="status">
                  {message}
                </p>
              )}
              <button className="auth-entry-submit" type="submit" disabled={signingIn || googleBusy}>
                {staff ? "Sign in" : title}
                <ArrowRight size={17} />
              </button>
            </form> : registering && registrationAvailable && signup.step === "details" ? (
              <form onSubmit={submitRegistration}>
                <label>
                  Full name
                  <input name="name" autoComplete="name" required minLength={2} maxLength={100} defaultValue={signup.name} />
                </label>
                <label>
                  Email address
                  <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} defaultValue={signup.email} />
                </label>
                <label>
                  Password
                  <span className="auth-entry-password">
                    <input name="password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required />
                    <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
                <p className="auth-entry-intro">At least 12 characters. We will email you a 6-digit code to confirm your address.</p>
                {message && <p className="auth-entry-notice" role="status">{message}</p>}
                <button className="auth-entry-submit" type="submit" disabled={signingIn || googleBusy}>
                  {signingIn ? "Sending code…" : "Create an account"}
                  <ArrowRight size={17} />
                </button>
              </form>
            ) : registering && registrationAvailable ? (
              <form onSubmit={submitCode}>
                <p className="auth-entry-intro">
                  We sent a 6-digit code to <strong>{signup.email}</strong>. It expires in 10 minutes. Check your spam folder if it has not arrived.
                </p>
                <label>
                  Verification code
                  <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" autoFocus />
                </label>
                {message && <p className="auth-entry-notice" role="status">{message}</p>}
                <button className="auth-entry-submit" type="submit" disabled={signingIn}>
                  {signingIn ? "Checking…" : "Verify and continue"}
                  <ArrowRight size={17} />
                </button>
                <button type="button" className="auth-entry-forgot" disabled={signingIn} onClick={() => sendCode(signup)}>
                  Send a new code
                </button>
                <button type="button" className="auth-entry-forgot" disabled={signingIn}
                  onClick={() => { setSignup({ step: "details", verificationId: "", name: signup.name, email: "", password: "" }); setMessage(""); }}>
                  Use a different email
                </button>
              </form>
            ) : (
              <div>
                {(registering || resetting) && (
                  <p className="auth-entry-intro">
                    Account registration and password recovery are handled by CEDA’s secure identity service.
                  </p>
                )}
                {message && <p className="auth-entry-notice" role="status">{message}</p>}
                {providers?.cognito && <button className="auth-entry-submit" type="button" onClick={beginOidcSignIn} disabled={signingIn || googleBusy}>
                  {signingIn ? "Connecting…" : "Continue with secure sign in"}
                  <ArrowRight size={17} />
                </button>}
              </div>
            )}
            {!resetting && <GoogleSignInButton target={target} staff={staff} disabled={signingIn || authLoading} onBusy={setGoogleBusy} />}
            {staff ? (
              <p className="auth-entry-alternate">
                No staff account? Ask the platform administrator.
              </p>
            ) : (
              <Link
                className="auth-entry-alternate"
                to={
                  (registering || resetting ? "/login" : "/register") + suffix
                }
              >
                {registering || resetting
                  ? "Back to sign in"
                  : "Create an account"}
              </Link>
            )}
            <details className="auth-entry-demo">
              <summary>
                Demo access
                <ChevronDown size={14} />
              </summary>
              {staff ? (
                <div>
                  <label htmlFor="demo-role">Staff role</label>
                  <select
                    id="demo-role"
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value)}
                  >
                    {staffRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  {selectedRole === "administrator" && (
                    <label className="auth-manager-choice">
                      Administrator identity
                      <select
                        aria-label="Administrator identity"
                        value={managerId}
                        onChange={(event) => setManagerId(event.target.value)}
                      >
                        {[currentManager, otherManager].map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {selectedRole === "evaluator" && (
                    <label className="auth-reviewer-choice">
                      Reviewer identity
                      <select
                        aria-label="Reviewer identity"
                        value={reviewerId}
                        onChange={(event) => setReviewerId(event.target.value)}
                      >
                        {evaluators.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    className="auth-entry-demo-open"
                    type="button"
                    onClick={() => openDemo(selectedRole)}
                  >
                    Open
                    <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    className="auth-entry-demo-open"
                    onClick={() => openDemo("submitter")}
                  >
                    Open the applicant demo
                    <ArrowRight size={15} />
                  </button>
                  <Link to="/portal" onClick={logout}>
                    Continue as guest
                  </Link>
                </div>
              )}
            </details>
            <div className="auth-entry-footer">
              <Link to="/">
                <ArrowLeft size={14} />
                Back to CEDA
              </Link>
              <Link to="/privacy">Privacy policy</Link>
            </div>
          </div>
        </section>
        <aside
          className="auth-entry-visual"
          aria-label={staff ? "CEDA staff workspace" : "CEDA Innovation Portal"}
        >
          <OptimizedImage
            sizes="(max-width: 700px) 1px, 50vw"
            loading="lazy"
            name={
              staff
                ? "staff-overview.jpg"
                : "login.jpg"
            }
            alt=""
            fetchPriority="high"
          />
          <div>
            <span>{staff ? "Staff workspace" : "Innovation portal"}</span>
            <strong>CEDA</strong>
          </div>
        </aside>
      </main>
    </div>
  );
}

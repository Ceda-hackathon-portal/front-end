import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronDown, Eye, EyeOff } from "lucide-react";
import Brand from "../components/shared/Brand";
import { useAuth } from "../hooks/useAuth";
import { roles } from "../data/portal";
import { currentManager, otherManager, evaluators } from "../data/admin";
import { safeReturnPath } from "../utils/portal";
import "../styles/auth.css";

// Two separate entry points: /login (with /register and /forgot-password) for applicants, /staff for CEDA staff.
const staffRoles = roles.filter((role) => role.id !== "submitter");

export default function AuthPage({ mode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRole, setSelectedRole] = useState("administrator");
  const [reviewerId, setReviewerId] = useState("e_01");
  const [managerId, setManagerId] = useState("u_pm_demo");
  const { startDemo, logout, staffUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const target = params.get("redirect");
  const suffix = target ? "?redirect=" + encodeURIComponent(target) : "";
  const staff = mode === "staff";
  const registering = mode === "register";
  const resetting = mode === "reset";
  const title = staff
    ? "CEDA staff sign in"
    : resetting
      ? "Reset password"
      : registering
        ? "Create an account"
        : "Sign in";

  if (staff && staffUser)
    return <Navigate to={safeReturnPath(target, staffUser.role)} replace />;

  function submit(event) {
    event.preventDefault();
    setMessage(
      resetting
        ? "Reset email is not connected yet."
        : staff
          ? "Staff sign-in is not connected yet. Use demo access below."
          : "Account services are not connected. Use demo access below.",
    );
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
            <form onSubmit={submit}>
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
                      minLength={8}
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
              <button className="auth-entry-submit" type="submit">
                {staff ? "Sign in" : title}
                <ArrowRight size={17} />
              </button>
            </form>
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
          <img
            src={
              staff
                ? "/images/staff-overview.jpg"
                : "/images/applicant-programmes.png"
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

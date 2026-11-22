import { createContext, useEffect, useState } from "react";
import { roles } from "../data/portal";
import { currentManager, otherManager, evaluators } from "../data/admin";
import { authApi, clearCsrfToken } from "../services/apiClient";

export const AuthContext = createContext(null);

// Applicants and CEDA staff sign in separately and never share a session:
// `user` is the applicant (public site and /portal, /workspace), `staffUser` is staff (/staff and the staff workspaces).
// Both demo identities live in memory. This is a UI preview, never an authentication token.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [staffUser, setStaffUser] = useState(null);
  const [authModalTarget, setAuthModalTarget] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authAttempt, setAuthAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const handleExpiredSession = () => {
      if (!active) return;
      setUser(null);
      setAuthError("");
    };
    window.addEventListener("ceda:session-expired", handleExpiredSession);
    setAuthLoading(true);
    setAuthError("");
    authApi.session()
      .then((session) => {
        if (active && session?.user?.id) {
          // Authentication proves identity only. Applicant presentation access does
          // not confer staff permissions; the API remains the authorization boundary.
          setUser({ ...session.user, role: "submitter", demo: false });
        }
      })
      .catch((error) => {
        if (!active || error?.status === 401) return;
        setAuthError(error?.status === 404
          ? "Backend authentication is disabled or its session endpoint is not mounted."
          : error?.message || "Your session could not be checked.");
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
      window.removeEventListener("ceda:session-expired", handleExpiredSession);
    };
  }, [authAttempt]);

  function retryAuthSession() {
    setAuthAttempt((attempt) => attempt + 1);
  }

  async function logout() {
    if (user && !user.demo) await authApi.logout();
    clearCsrfToken();
    setUser(null);
    setAuthError("");
  }

  function startDemo(role, reviewerId = "e_01", managerId = "u_pm_demo") {
    const selectedRole = roles.find((item) => item.id === role);
    if (!selectedRole) return;
    const reviewer =
      role === "evaluator"
        ? evaluators.find((item) => item.id === reviewerId)
        : null;
    if (role === "evaluator" && !reviewer) return;
    const manager =
      role === "administrator"
        ? [currentManager, otherManager].find((item) => item.id === managerId)
        : null;
    if (role === "administrator" && !manager) return;
    const identity = {
      id: reviewer?.id || manager?.id || "demo_" + role,
      name: reviewer
        ? reviewer.name + " (demo)"
        : manager
          ? manager.name
          : "Demo " + selectedRole.label,
      role,
      demo: true,
    };
    if (role === "submitter") setUser(identity);
    else setStaffUser(identity);
    setAuthModalTarget(null);
  }

  function requireAuth(target) {
    if (user) return true;
    setAuthModalTarget(target);
    return false;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: Boolean(user),
        startDemo,
        logout,
        authLoading,
        authError,
        retryAuthSession,
        requireAuth,
        authModalTarget,
        closeAuthModal: () => setAuthModalTarget(null),
        staffUser,
        staffLogout: () => setStaffUser(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

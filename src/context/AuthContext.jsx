import { createContext, useEffect, useState } from "react";
import { roles } from "../data/portal";
import { currentManager, otherManager, evaluators } from "../data/admin";
import { authApi, clearCsrfToken } from "../services/apiClient";
import { staffApi } from "../services/staffApi";

export const AuthContext = createContext(null);

const localAuthEnabled = import.meta.env.DEV && import.meta.env.VITE_LOCAL_AUTH === "true";

// Applicants and CEDA staff sign in separately and never share a session:
// `user` is the applicant (public site and /portal, /workspace), `staffUser` is staff (/staff and the staff workspaces).
// Demo identities live in memory and are never an authentication token. A real session holds one kind of account:
// the API reports a staff role from programme grants, or the account is an applicant.
async function staffRoleOf() {
  try {
    return (await staffApi.me()).role;
  } catch (error) {
    if (error?.status === 403 || error?.status === 404) return null;
    throw error;
  }
}
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
      // A demo applicant has no server session, so an API 401 cannot expire it.
      setUser((current) => (current?.demo ? current : null));
      setStaffUser((current) => (current?.demo ? current : null));
      setAuthError("");
    };
    window.addEventListener("ceda:session-expired", handleExpiredSession);
    setAuthLoading(true);
    setAuthError("");
    authApi.session()
      .then(async (session) => {
        if (!session?.user?.id) return;
        const staffRole = await staffRoleOf();
        if (active && staffRole) {
          setStaffUser({ ...session.user, role: staffRole, demo: false });
        } else if (active) {
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

  async function staffLogout() {
    if (staffUser && !staffUser.demo) await authApi.logout();
    clearCsrfToken();
    setStaffUser(null);
  }

  async function signInLocal(email, password) {
    if (!localAuthEnabled) throw new Error("Local password sign in is available only in configured development mode.");
    const result = await authApi.localLogin(email, password);
    const session = result?.user ? result : await authApi.session();
    if (!session?.user?.id) throw new Error("The server did not return an authenticated session.");
    const staffRole = await staffRoleOf();
    const identity = { ...session.user, role: staffRole || "submitter", demo: false };
    if (staffRole) {
      setStaffUser(identity);
      setUser((current) => (current?.demo ? current : null));
    } else {
      setUser(identity);
      setStaffUser((current) => (current?.demo ? current : null));
    }
    setAuthError("");
    return identity;
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
        signInLocal,
        localAuthEnabled,
        logout,
        authLoading,
        authError,
        retryAuthSession,
        requireAuth,
        authModalTarget,
        closeAuthModal: () => setAuthModalTarget(null),
        staffUser,
        staffLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

import { createContext, useState } from "react";
import { roles } from "../data/portal";
import { currentManager, otherManager, evaluators } from "../data/admin";

export const AuthContext = createContext(null);

// Applicants and CEDA staff sign in separately and never share a session:
// `user` is the applicant (public site and /portal, /workspace), `staffUser` is staff (/staff and the staff workspaces).
// Both demo identities live in memory. This is a UI preview, never an authentication token.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [staffUser, setStaffUser] = useState(null);
  const [authModalTarget, setAuthModalTarget] = useState(null);

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
        logout: () => setUser(null),
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

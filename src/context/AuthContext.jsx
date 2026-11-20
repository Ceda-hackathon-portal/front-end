import { createContext, useState } from 'react'
import { roles } from '../data/portal'

export const AuthContext = createContext(null)

// Demo identity lives in memory. This is a UI preview, never an authentication token.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authModalTarget, setAuthModalTarget] = useState(null)

  function startDemo(role) {
    const selectedRole = roles.find((item) => item.id === role)
    if (!selectedRole) return
    setUser({ name: 'Demo ' + selectedRole.label, role, demo: true })
    setAuthModalTarget(null)
  }

  function requireAuth(target) {
    if (user) return true
    setAuthModalTarget(target)
    return false
  }

  return (
    <AuthContext.Provider value={{
      user, isLoggedIn: Boolean(user), startDemo,
      logout: () => setUser(null), requireAuth, authModalTarget,
      closeAuthModal: () => setAuthModalTarget(null),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

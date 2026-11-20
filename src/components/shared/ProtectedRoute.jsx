import { Link, Outlet, useLocation } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { roleHome } from '../../utils/portal'

// Presentation-only role gate. The future API must independently enforce all permissions.
export default function ProtectedRoute({ roles }) {
  const { user, requireAuth } = useAuth()
  const location = useLocation()
  if (user && roles.includes(user.role)) return <Outlet />
  return (
    <section className="container page-section access-gate">
      <span className="feature-icon"><LockKeyhole size={26} /></span>
      <span className="eyebrow">{user ? 'A different workspace' : 'Your CEDA workspace'}</span>
      <h1>{user ? 'Choose your workspace.' : 'Sign in to continue.'}</h1>
      <p>{user ? 'This page is for a different role.' : 'Open a demo workspace or continue as a guest.'}</p>
      <div className="button-row">
        {user ? <Link className="button button-primary" to={roleHome(user.role)}>My workspace</Link>
          : <button className="button button-primary" onClick={() => requireAuth(location.pathname)}>Sign in to continue</button>}
        <Link className="button button-outline" to={user ? '/login' : '/challenges'}>{user ? 'Choose a demo role' : 'Explore as a guest'}</Link>
      </div>
    </section>
  )
}

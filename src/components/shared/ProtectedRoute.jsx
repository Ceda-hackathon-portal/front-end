import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { roleHome } from '../../utils/portal'

// Presentation-only gate. The future API must independently enforce all permissions.
// Applicant routes use the applicant session; every other route uses the separate staff session.
export default function ProtectedRoute({ roles, headingAs: Heading = 'h1' }) {
  const { user, staffUser, requireAuth, authLoading, authError, retryAuthSession } = useAuth()
  const location = useLocation()
  const forApplicants = roles.includes('submitter')

  if (!forApplicants) {
    if (!staffUser) return <Navigate to={'/staff?redirect=' + encodeURIComponent(location.pathname + location.search)} replace />
    if (roles.includes(staffUser.role)) return <Outlet />
    return (
      <section className="container page-section access-gate">
        <span className="feature-icon"><LockKeyhole size={26} /></span>
        <span className="eyebrow">CEDA staff</span>
        <Heading>This area is for a different staff role.</Heading>
        <p>You are signed in as {staffUser.name.replace('Demo ', '').toLowerCase()}.</p>
        <div className="button-row"><Link className="button button-primary" to={roleHome(staffUser.role)}>Back to my workspace</Link></div>
      </section>
    )
  }

  if (user && roles.includes(user.role)) return <Outlet />
  if (authLoading) return <section className="container page-section" role="status">Checking your session…</section>
  if (authError) return (
    <section className="container page-section access-gate" role="alert">
      <span className="eyebrow">CEDA connection</span>
      <Heading>Your session could not be checked.</Heading>
      <p>{authError}</p>
      <button className="button button-primary" type="button" onClick={retryAuthSession}>Try again</button>
    </section>
  )
  return (
    <section className="container page-section access-gate">
      <span className="feature-icon"><LockKeyhole size={26} /></span>
      <span className="eyebrow">Your CEDA workspace</span>
      <Heading>Sign in to continue.</Heading>
      <p>Sign in to see your applications, or keep exploring as a guest.</p>
      <div className="button-row">
        <button className="button button-primary" onClick={() => requireAuth(location.pathname + location.search)}>Sign in to continue</button>
        <Link className="button button-outline" to="/challenges">Explore as a guest</Link>
      </div>
    </section>
  )
}

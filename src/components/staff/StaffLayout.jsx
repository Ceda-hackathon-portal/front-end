import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, CircleHelp, Layers, LogOut, RefreshCw, Repeat } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAdmin } from '../../context/AdminContext'
import '../../styles/staff.css'

const navigation = [
  { label: 'Programmes', to: '/admin', icon: Layers, end: false },
  { label: 'Guidance', to: '/how-it-works', icon: CircleHelp, end: true },
]

export default function StaffLayout() {
  const { logout } = useAuth()
  const { storageWarning, resetAdminDemo } = useAdmin()
  const navigate = useNavigate()

  return (
    <div className="st-shell">
      <a className="skip-link" href="#staff-main">Skip to content</a>
      <aside className="st-rail">
        <Link to="/admin" className="st-brand" aria-label="Programme manager home">
          <span className="st-logo"><img src="/images/ceda-logo.png" alt="CEDA" width="64" height="39" /></span>
          <span>Innovation portal<small>Programme manager</small></span>
        </Link>
        <nav aria-label="Programme manager navigation">
          {navigation.map(({ label, to, icon: Icon, end }) => (
            <NavLink key={label} to={to} end={end} className={({ isActive }) => 'st-nav-link' + (isActive ? ' is-active' : '')}>
              <Icon size={18} strokeWidth={1.7} aria-hidden="true" />{label}
            </NavLink>
          ))}
        </nav>
        <Link className="st-nav-link st-website" to="/"><ArrowLeft size={18} strokeWidth={1.7} aria-hidden="true" />CEDA website</Link>
      </aside>

      <div className="st-stage">
        <header className="st-topbar">
          <p className="st-demo-note"><strong>Demo data</strong> Saved in this browser only. Nothing is sent to CEDA.</p>
          <details className="st-account">
            <summary><span className="st-avatar" aria-hidden="true">PM</span>Programme manager<ChevronDown size={14} aria-hidden="true" /></summary>
            <div className="st-account-menu">
              <span>Demo programme manager</span>
              <Link to="/login"><Repeat size={15} aria-hidden="true" />Switch role</Link>
              <button type="button" onClick={() => { if (window.confirm('Reset the programme manager demo? Programmes and assignments go back to the sample data.')) resetAdminDemo() }}>
                <RefreshCw size={15} aria-hidden="true" />Reset demo data
              </button>
              <button type="button" onClick={() => { logout(); navigate('/') }}><LogOut size={15} aria-hidden="true" />Sign out</button>
            </div>
          </details>
        </header>
        <main className="st-main" id="staff-main" tabIndex={-1}>
          {storageWarning && <p className="st-alert" role="status">{storageWarning}</p>}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

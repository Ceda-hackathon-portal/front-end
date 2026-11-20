import { NavLink, useNavigate } from 'react-router-dom'
import { BarChart3, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePortal } from '../../context/PortalContext'
import { roleHome } from '../../utils/portal'
import { roles } from '../../data/portal'

// Shared shell for the staff pages not yet redesigned (reviews, decisions, reports, system). Uses the staff session only.
export default function WorkspaceLayout({ title, action, children }) {
  const { staffUser, staffLogout } = useAuth()
  const { storageWarning } = usePortal()
  const navigate = useNavigate()
  const home = roleHome(staffUser.role)
  const roleLabel = roles.find((role) => role.id === staffUser.role)?.label
  return (
    <div className="workspace container">
      <div className="demo-banner"><span>Demo data</span><button type="button" className="text-button" onClick={() => { staffLogout(); navigate('/staff') }}><LogOut size={14} />Sign out</button></div>
      {storageWarning && <p className="notice notice-warning" role="status">{storageWarning}</p>}
      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <div className="sidebar-heading"><span className="avatar avatar-active">{roleLabel[0]}</span><div><strong>{roleLabel}</strong><small>Demo account</small></div></div>
          <nav aria-label="Workspace navigation">
            <NavLink to={home} end><LayoutDashboard size={18} />Workspace</NavLink>
            {staffUser.role !== 'system-administrator' && <NavLink to="/reports"><BarChart3 size={18} />Reports</NavLink>}
          </nav>
        </aside>
        <div className="workspace-content">
          <header className="page-header"><div><span className="eyebrow">{roleLabel}</span><h1>{title}</h1></div>{action}</header>
          {children}
        </div>
      </div>
    </div>
  )
}

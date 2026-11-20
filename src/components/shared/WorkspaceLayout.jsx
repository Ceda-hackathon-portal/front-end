import { Link, NavLink } from 'react-router-dom'
import { BarChart3, ClipboardCheck, FilePlus2, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePortal } from '../../context/PortalContext'
import { roleHome } from '../../utils/portal'
import { roles } from '../../data/portal'
export default function WorkspaceLayout({ title, action, children }) {
  const { user } = useAuth()
  const { storageWarning } = usePortal()
  const isSubmitter = user.role === 'submitter'
  const home = roleHome(user.role)
  const roleLabel = roles.find((role) => role.id === user.role)?.label
  return (
    <div className="workspace container">
      <div className="demo-banner"><span>Demo data</span><Link to="/login">Switch role</Link></div>
      {storageWarning && <p className="notice notice-warning" role="status">{storageWarning}</p>}
      <div className="workspace-grid">
        <aside className="workspace-sidebar">
          <div className="sidebar-heading"><span className="avatar avatar-active">{roleLabel[0]}</span><div><strong>{roleLabel}</strong><small>Demo account</small></div></div>
          <nav aria-label="Workspace navigation">
            <NavLink to={home} end><LayoutDashboard size={18} />{isSubmitter ? 'Overview' : 'Workspace'}</NavLink>
            {isSubmitter && <NavLink to="/workspace/new"><FilePlus2 size={18} />New idea</NavLink>}
            {!isSubmitter && user.role !== 'system-administrator' && <NavLink to="/reports"><BarChart3 size={18} />Reports</NavLink>}
            <Link to="/how-it-works"><ClipboardCheck size={18} />Guidance</Link>
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

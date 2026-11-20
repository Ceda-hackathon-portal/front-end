import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronDown, LayoutDashboard, LogOut, Menu, Search, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { roleHome } from '../../utils/portal'
import ChatBubble from './PortalAssistant'
import '../../styles/landing-header.css'

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Services', children: [['All services', '/services'], ['Submit an idea', '/workspace/new', true], ['My applications', '/workspace/applications', true]] },
  { label: 'Programmes', to: '/challenges' },
  { label: 'Resources', children: [['Application guide', '/how-it-works'], ['Help', '/help'], ['Privacy', '/privacy']] },
]

export default function LandingHeader() {
  const { user, requireAuth, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function protectedLink(event, to, secure) {
    if (secure && !requireAuth(to)) event.preventDefault()
  }

  return (
    <>
      <header className="ap-header landing-header">
        <Link to="/" className="ap-brand" aria-label="CEDA home">
          <span className="ap-logo-plate"><img src="/images/ceda-logo.png" alt="CEDA" width="80" height="49" /></span>
          <span className="ap-brand-name">Innovation portal</span>
        </Link>
        <nav className="landing-header-links" aria-label="Main navigation">
          {navigation.map(item => item.children ? (
            <details key={item.label} className="landing-nav-group">
              <summary>{item.label}<ChevronDown size={12} /></summary>
              <div className="landing-nav-dropdown">
                {item.children.map(([label, to, secure]) => <Link key={label} to={to} onClick={event => protectedLink(event, to, secure)}>{label}</Link>)}
              </div>
            </details>
          ) : <Link className="landing-nav-link" key={item.label} to={item.to}>{item.label}</Link>)}
        </nav>
        <form className="ap-header-search" role="search" onSubmit={event => { event.preventDefault(); navigate('/search?q=' + encodeURIComponent(query.trim())) }}>
          <Search size={17} aria-hidden="true" /><input type="search" aria-label="Search CEDA" placeholder="Search CEDA" value={query} onChange={event => setQuery(event.target.value)} />
          <button type="submit" aria-label="Search services"><ArrowRight size={16} /></button>
        </form>
        <div className="ap-header-actions">
          <Link className="ap-header-icon landing-mobile-search" to="/search" aria-label="Open search"><Search size={18} /></Link>
          {user ? (
            <details className="ap-account">
              <summary><span className="ap-avatar">{user.role === 'submitter' ? 'AP' : user.name.charAt(0)}</span><span className="ap-account-name">{user.role === 'submitter' ? 'Applicant' : 'My account'}</span><ChevronDown size={14} /></summary>
              <div className="ap-account-menu">
                <Link className="landing-workspace-link" to={roleHome(user.role)}><LayoutDashboard size={15} />My workspace</Link>
                <button onClick={logout}><LogOut size={16} />Sign out</button>
              </div>
            </details>
          ) : <button className="ap-account-trigger" type="button" aria-label="Sign in" onClick={() => requireAuth('/workspace')}><UserRound size={20} strokeWidth={1.6} /></button>}
          <details className="landing-mobile-menu">
            <summary aria-label="Open navigation menu"><Menu size={22} /></summary>
            <nav className="landing-mobile-links" aria-label="Mobile navigation">
              {[
                ['Home', '/'], ['Services', '/services'], ['Programmes', '/challenges'],
                ['Application guide', '/how-it-works'], ['Applicant portal', '/portal'], ['Help', '/help'],
              ].map(([label, to]) => <Link key={label} to={to}>{label}</Link>)}
            </nav>
          </details>
        </div>
      </header>
      <ChatBubble showHint={false} />
    </>
  )
}

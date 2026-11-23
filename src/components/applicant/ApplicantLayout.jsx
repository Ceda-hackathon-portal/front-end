import OptimizedImage from '../shared/OptimizedImage'
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Bell, ChevronDown, CircleHelp, FileText, Home, Layers, LogOut, Mail, Search, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePortal } from '../../context/PortalContext'
import { roleHome } from '../../utils/portal'

const navigation = [
  { label: 'Home', to: '/portal', icon: Home, home: true },
  { label: 'Applications', to: '/workspace/applications', icon: FileText },
  { label: 'Programmes', to: '/portal/programmes', icon: Layers },
  { label: 'Messages', to: '/workspace/messages', icon: Mail },
  { label: 'Help', to: '/portal/help', icon: CircleHelp },
]

const homeHero = {
  title: 'Applicant portal', image: 'Carousel1.jpg', position: 'center 44%', mobilePosition: '85% center',
  action: 'Start an application', to: '/workspace/new',
}
const pageHeroes = {
  '/portal': homeHero,
  '/workspace': homeHero,
  '/workspace/applications': {
    title: 'My applications', image: 'applicant-enterprise.jpg', position: 'center 42%', mobilePosition: '65% center',
    action: 'New application', to: '/workspace/new',
  },
  '/portal/programmes': {
    title: 'Programmes', image: 'applicant-programmes.png', position: 'center 58%', mobilePosition: '70% center',
  },
  '/workspace/messages': {
    title: 'Messages', image: 'applicant-messages.jpg', position: 'center 65%', mobilePosition: '65% center',
  },
  '/portal/help': {
    title: 'Application guide', image: 'applicant-guide.jpg', position: 'center 39%', mobilePosition: '58% center',
    action: 'Start an application', to: '/workspace/new',
  },
  '/workspace/profile': { title: 'My profile', image: 'applicant-guide.jpg', position: 'center 39%', mobilePosition: '58% center' },
  '/portal/eligibility': { title: 'Eligibility check', image: 'applicant-programmes.png', position: 'center 58%', mobilePosition: '70% center' },
  '/workspace/new': {
    title: 'New application', image: 'applicant-guide.jpg', position: 'center 39%', mobilePosition: '58% center',
  },
}

export default function ApplicantLayout() {
  const { user, requireAuth, logout } = useAuth()
  const { messages, profile, storageWarning } = usePortal()
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const isApplicant = user?.role === 'submitter'
  const messageCount = isApplicant ? messages.filter(message => !message.readAt).length : 0
  const dataLight = isApplicant && profile.preferences?.dataLight
  const isHome = location.pathname === '/portal' || location.pathname === '/workspace'
  const isApplication = /^\/workspace\/ideas\/[^/]+$/.test(location.pathname)
  const isConfirmation = /^\/workspace\/ideas\/[^/]+\/submitted$/.test(location.pathname)
  const hero = pageHeroes[location.pathname] || {
    title: isApplication ? 'Application details' : isConfirmation ? 'Application submitted' : 'Page not found',
    image: isApplication || isConfirmation ? 'applicant-enterprise.jpg' : 'applicant-guide.jpg',
    position: 'center 42%', mobilePosition: '65% center',
  }

  function searchApplications(event) {
    event.preventDefault()
    navigate('/workspace/applications?q=' + encodeURIComponent(search.trim()))
  }

  return (
    <div className={'ap-portal' + (dataLight ? ' ap-data-light' : '')}>
      <a className="skip-link" href="#applicant-main">Skip to content</a>
      <aside className="ap-sidebar">
        <nav aria-label="Applicant navigation">
          {navigation.map(({ label, to, icon: Icon, home }) => (
            <NavLink key={label} to={home && isApplicant ? '/workspace' : to} end={home}
              className={({ isActive }) => 'ap-nav-link' + ((home ? isHome : isActive) ? ' is-active' : '')}>
              <Icon size={22} strokeWidth={1.6} aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <Link className="ap-website-link" to="/" aria-label="Back to the CEDA website">
          <ArrowLeft size={19} /><span>Website</span>
        </Link>
      </aside>

      <div className="ap-stage">
        <div className="ap-masthead"
          style={{ '--ap-image-position': hero.position, '--ap-mobile-position': hero.mobilePosition }}>
          {!dataLight && <OptimizedImage key={hero.image} className="ap-masthead-image" name={hero.image} loading="eager"
            alt="" fetchPriority="high" decoding="async" />}
          <header className="ap-header">
            <Link to="/portal" className="ap-brand" aria-label="CEDA applicant portal home">
              <span className="ap-logo-plate"><img src="/images/ceda-logo.png" alt="CEDA" width="80" height="49" /></span>
              <span className="ap-brand-name">Innovation portal</span>
            </Link>
            <form className="ap-header-search" role="search" onSubmit={searchApplications}>
              <Search size={17} aria-hidden="true" />
              <input aria-label="Search applications" placeholder="Search your applications"
                value={search} onChange={event => setSearch(event.target.value)} />
              <button type="submit" aria-label="Run application search"><ArrowRight size={16} /></button>
            </form>
            <div className="ap-header-actions">
              <Link to="/workspace/messages" className="ap-header-icon"
                aria-label={`Messages, ${messageCount} unread`}>
                <Bell size={20} aria-hidden="true" />
                {messageCount > 0 && <span className="ap-notification-count">{messageCount}</span>}
              </Link>
              {isApplicant ? (
                <details className="ap-account" key={location.pathname}>
                  <summary aria-label="Applicant account"><span className="ap-avatar">AP</span><span className="ap-account-name">Applicant</span><ChevronDown size={14} /></summary>
                  <div className="ap-account-menu">
                    <span>{profile.fullName || 'Applicant account'}</span>
                    <Link className="ap-profile-menu-link" to="/workspace/profile"><UserRound size={15} />My profile and documents</Link>
                    <button onClick={async () => {
                      setAuthNotice('')
                      try {
                        await logout()
                        navigate('/portal')
                      } catch {
                        setAuthNotice('Sign out could not be confirmed. Check your connection and try again.')
                      }
                    }}><LogOut size={16} />Sign out</button>
                    {authNotice && <p role="alert">{authNotice}</p>}
                  </div>
                </details>
              ) : user ? (
                <Link className="ap-button ap-button-small ap-button-secondary" to={roleHome(user.role)}>My workspace</Link>
              ) : (
                <button className="ap-account-trigger" type="button" aria-label="Sign in"
                  onClick={() => requireAuth(location.pathname.startsWith('/workspace') ? location.pathname + location.search : '/workspace')}>
                  <UserRound size={20} strokeWidth={1.6} aria-hidden="true" />
                </button>
              )}
            </div>
          </header>
          <section className="ap-page-hero" aria-labelledby="applicant-page-title">
            <h1 id="applicant-page-title">{hero.title}</h1>
            {hero.action && <Link className="ap-button ap-button-primary" to={hero.to}>{hero.action}<ArrowRight size={17} /></Link>}
          </section>
        </div>
        <main className="ap-main" id="applicant-main" tabIndex={-1}>
          {storageWarning && <p className="ap-storage-warning" role="status">{storageWarning}</p>}
          <Outlet />
          <footer className="ap-footer">
            <span>CEDA Innovation Portal</span><span>Saved on this device. CEDA delivery requires the application service.</span>
            <Link to="/portal/help">Help & guidance</Link>
          </footer>
        </main>
      </div>
    </div>
  )
}

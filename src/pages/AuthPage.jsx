import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronDown, Eye, EyeOff } from 'lucide-react'
import Brand from '../components/shared/Brand'
import { useAuth } from '../hooks/useAuth'
import { roles } from '../data/portal'
import { safeReturnPath } from '../utils/portal'
import '../styles/auth.css'

export default function AuthPage({ mode }) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedRole, setSelectedRole] = useState('submitter')
  const { startDemo, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const target = params.get('redirect')
  const suffix = target ? '?redirect=' + encodeURIComponent(target) : ''
  const registering = mode === 'register'
  const resetting = mode === 'reset'
  const title = resetting ? 'Reset password' : registering ? 'Create an account' : 'Sign in'

  function submit(event) {
    event.preventDefault()
    setMessage(resetting ? 'Reset email is not connected yet.' : 'Account services are not connected. Use demo access below.')
  }

  return (
    <div className="auth-entry">
      <a className="skip-link" href="#auth-content">Skip to form</a>
      <header className="auth-entry-brand"><Link to="/" aria-label="CEDA home"><Brand /></Link></header>
      <main className="auth-entry-card" id="auth-content" tabIndex={-1}>
        <section className="auth-entry-form" aria-labelledby="auth-title">
          <div className="auth-entry-form-inner">
            <h1 id="auth-title">{title}</h1>
            <form onSubmit={submit}>
              {registering && <label>Full name<input name="name" autoComplete="name" required maxLength={100} /></label>}
              <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} /></label>
              {!resetting && (
                <label>Password<span className="auth-entry-password">
                  <input name="password" type={visible ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} minLength={8} required />
                  <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </span></label>
              )}
              {!registering && !resetting && <Link className="auth-entry-forgot" to={'/forgot-password' + suffix}>Forgot password?</Link>}
              {message && <p className="auth-entry-notice" role="status">{message}</p>}
              <button className="auth-entry-submit" type="submit">{title}<ArrowRight size={17} /></button>
            </form>
            <Link className="auth-entry-alternate" to={(registering || resetting ? '/login' : '/register') + suffix}>{registering || resetting ? 'Back to sign in' : 'Create an account'}</Link>
            <details className="auth-entry-demo">
              <summary>Demo access<ChevronDown size={14} /></summary>
              <div>
                <label htmlFor="demo-role">Workspace</label>
                <div className="auth-entry-demo-row">
                  <select id="demo-role" value={selectedRole} onChange={event => setSelectedRole(event.target.value)}>{roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}</select>
                  <button type="button" onClick={() => { startDemo(selectedRole); navigate(safeReturnPath(target, selectedRole)) }}>Open<ArrowRight size={15} /></button>
                </div>
                <Link to="/portal" onClick={logout}>Continue as guest</Link>
              </div>
            </details>
            <div className="auth-entry-footer"><Link to="/"><ArrowLeft size={14} />Back to CEDA</Link><Link to="/privacy">Privacy policy</Link></div>
          </div>
        </section>
        <aside className="auth-entry-visual" aria-label="CEDA Innovation Portal">
          <img src="/images/applicant-programmes.png" alt="" fetchPriority="high" />
          <div><span>Innovation portal</span><strong>CEDA</strong></div>
        </aside>
      </main>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import Brand from '../components/shared/Brand'
import { useAuth } from '../hooks/useAuth'
import { roles } from '../data/portal'
import { safeReturnPath } from '../utils/portal'

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
    <section className="container auth-page">
      <div className="auth-story">
        <span className="eyebrow">CEDA</span><h1>Your ideas.<br />One workspace.</h1>
        <p>Submit. Review. Track.</p>
      </div>
      <div className="auth-card">
        <Brand /><h2>{title}</h2>
        <form onSubmit={submit} className="form-stack">
          {registering && <label>Full name<input name="name" autoComplete="name" required maxLength={100} /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          {!resetting && <label>Password<span className="password-input"><input name="password" type={visible ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} minLength={8} required /><button className="icon-button" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>}
          {!registering && !resetting && <Link className="form-link" to={'/forgot-password' + suffix}>Forgot password?</Link>}
          {message && <p className="notice" role="status">{message}</p>}
          <button className="button button-primary" type="submit">{title}<ArrowRight size={16} /></button>
        </form>
        <p className="auth-alternate"><Link to={(registering || resetting ? '/login' : '/register') + suffix}>{registering || resetting ? 'Back to sign in' : 'Create an account'}</Link></p>
        <div className="demo-entry"><label htmlFor="demo-role">Demo access</label><div className="demo-entry-row"><select id="demo-role" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select><button className="button button-outline" onClick={() => { startDemo(selectedRole); navigate(safeReturnPath(target, selectedRole)) }}>Open<ArrowRight size={15} /></button></div></div>
        <Link className="guest-link" to="/" onClick={logout}>Continue as guest</Link>
      </div>
    </section>
  )
}

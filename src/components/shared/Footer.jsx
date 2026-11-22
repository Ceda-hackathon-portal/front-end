import { useState } from 'react'
import { ArrowDownToLine, ArrowUpRight } from 'lucide-react'
import '../../styles/footer.css'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const services = [
  ['Submit an idea', '/workspace/new', true],
  ['My submissions', '/workspace', true],
  ['Programmes', '/challenges'],
  ['Submission guide', '/how-it-works'],
  ['Services', '/services'],
]

const organisation = [
  ['About CEDA', 'https://www.ceda.co.bw/'],
  ['Help', '/help'],
  ['Guidelines', '/how-it-works'],
  ['Privacy', '/privacy'],
  ['CEDA staff sign in', '/staff'],
]

const legalLinks = [
  ['Privacy Policy', '/privacy'],
  ['Security', '/privacy'],
  ['Help', '/help'],
]

export default function Footer() {
  const { requireAuth } = useAuth()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState(null)

  function downloadFeedback(event) {
    event.preventDefault()
    if (!feedback.trim()) {
      setFeedbackStatus({ error: true, text: 'Write your feedback first.' })
      return
    }
    let url
    try {
      const file = new Blob(['CEDA Portal feedback\n\n' + feedback.trim()], { type: 'text/plain;charset=utf-8' })
      url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = 'ceda-portal-feedback.txt'
      document.body.append(link)
      link.click()
      link.remove()
      setFeedbackStatus({ error: false, text: 'Feedback file prepared. Share it with the portal team.' })
    } catch {
      setFeedbackStatus({ error: true, text: 'The file could not be prepared. Your feedback is still here; try again.' })
    } finally {
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }

  function renderLink(label, href, secure) {
    if (href.startsWith('http')) {
      return <a className="cf-link" href={href} target="_blank" rel="noopener noreferrer">{label}</a>
    }
    if (secure) {
      return (
        <a className="cf-link" href={href} onClick={(e) => { e.preventDefault(); if (requireAuth(href)) navigate(href) }}>
          {label}
        </a>
      )
    }
    return <Link className="cf-link" to={href}>{label}</Link>
  }

  return (
    <footer className="cf-footer">
      <div className="cf-shell">
        <section className="cf-feedback" aria-labelledby="footer-feedback-title">
          <div className="cf-feedback-intro">
            <span className="cf-eyebrow">Your experience matters</span>
            <h2 id="footer-feedback-title">Help us improve<br />the portal.</h2>
            <Link to="/portal">Open applicant portal<ArrowUpRight size={18} /></Link>
          </div>
          <form onSubmit={downloadFeedback} className="cf-feedback-form">
            <label htmlFor="footer-feedback">Your feedback</label>
            <textarea id="footer-feedback" value={feedback} onChange={event => { setFeedback(event.target.value); setFeedbackStatus(null) }} placeholder="What worked? What could be better?" required maxLength={2000} rows={3} aria-describedby="footer-feedback-help" />
            <div className="cf-feedback-actions">
              <p id="footer-feedback-help">Download a copy to share with the portal team.</p>
              <button type="submit">Download feedback<ArrowDownToLine size={16} /></button>
            </div>
            {feedbackStatus && <p className="cf-feedback-status" role={feedbackStatus.error ? 'alert' : 'status'}>{feedbackStatus.text}</p>}
          </form>
        </section>
        <div className="cf-columns">
          <div>
            <Link to="/" className="cf-logo" aria-label="CEDA, Citizen Entrepreneurial Development Agency: home">
              <img src="/images/ceda-logo.png" alt="CEDA" width="160" height="98" />
            </Link>
            <ul className="cf-list">
              <li><span className="cf-text">Botswana</span></li>
              <li>{renderLink('www.ceda.co.bw', 'https://www.ceda.co.bw/')}</li>
            </ul>
          </div>

          <nav aria-label="Services">
            <h2 className="cf-heading">Services</h2>
            <ul className="cf-list">
              {services.map(([label, href, secure]) => (
                <li key={label}>{renderLink(label, href, secure)}</li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Organisation">
            <h2 className="cf-heading">Organisation</h2>
            <ul className="cf-list">
              {organisation.map(([label, href]) => (
                <li key={label}>{renderLink(label, href)}</li>
              ))}
            </ul>
          </nav>
        </div>


        <div className="cf-bottom">
          {legalLinks.map(([label, href]) => (
            <span key={label}>{renderLink(label, href)}</span>
          ))}
        </div>
      </div>

    </footer>
  )
}

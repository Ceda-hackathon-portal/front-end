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

const highlights = ['Idea submission', 'Evaluation', 'Feedback', 'Progress tracking', 'CEDA portal']

const legalLinks = [
  ['Privacy Policy', '/privacy'],
  ['Security', '/privacy'],
  ['Help', '/help'],
]

export default function Footer({ showSignature = false }) {
  const { requireAuth } = useAuth()
  const navigate = useNavigate()

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
        <div className="cf-columns">
          <div>
            <h2 className="cf-heading">Citizen Entrepreneurial Development Agency</h2>
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

        <p className="cf-highlights">{highlights.join('  ·  ')}</p>

        <div className="cf-bottom">
          {legalLinks.map(([label, href]) => (
            <span key={label}>{renderLink(label, href)}</span>
          ))}
        </div>
        {showSignature && <div className="cf-signature" aria-hidden="true">CEDA</div>}
      </div>

      <style>{`
        .cf-footer {
          background: #fafafa;
          color: #111111;
          font-family: 'Poppins', sans-serif;
          margin-top: auto;
          padding: 64px 0 0;
        }
        .cf-shell { max-width: 1280px; margin: 0 auto; padding: 0 24px; box-sizing: border-box; }
        .cf-columns {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 36px 28px;
          align-items: start;
        }
        .cf-heading {
          font-family: 'Poppins', sans-serif;
          font-size: 17px;
          font-weight: 400;
          letter-spacing: 0;
          line-height: 1.4;
          color: #111111;
          margin: 0 0 26px;
        }
        .cf-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
        .cf-link, .cf-text {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.5;
          color: #5f6672;
          text-decoration: none;
          transition: color .2s ease;
        }
        .cf-link:hover { color: #000000; text-decoration: underline; }
        .cf-highlights {
          margin: 70px 0 36px;
          text-align: center;
          font-size: 15px;
          font-weight: 400;
          letter-spacing: .1em;
          text-transform: uppercase;
          line-height: 1.8;
          color: #8a6c55;
        }
        .cf-bottom {
          border-top: 1px solid #e5e7eb;
          padding: 36px 0 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px 32px;
          flex-wrap: wrap;
        }
        .cf-signature {
          width: min(100%, 900px);
          margin: 12px auto 0;
          padding: 16px 0 0;
          font-size: clamp(92px, 16vw, 220px);
          font-weight: 700;
          line-height: .86;
          letter-spacing: -.07em;
          text-align: center;
          background: linear-gradient(110deg, #c9906040, #a9664933 48%, #9b8f6e30);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          user-select: none;
        }
        @media (max-width: 700px) {
          .cf-highlights { margin: 64px 0 32px; font-size: 12px; }
        }
      `}</style>
    </footer>
  )
}
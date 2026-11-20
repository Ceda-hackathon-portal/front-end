import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const footerLinkStyle = {
  color: 'rgba(255,255,255,0.68)',
  fontSize: 14,
  textDecoration: 'none',
  lineHeight: 1.8,
}

export default function Footer() {
  const { requireAuth } = useAuth();
  const navigate = useNavigate();
  return (
    <footer
      style={{
        background:
          'radial-gradient(circle at top left, rgba(102,67,45,0.28), transparent 42%), linear-gradient(180deg, #211b17 0%, #100d0b 100%)',
        color: 'rgba(255,255,255,0.72)',
        marginTop: 'auto',
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -18px 50px rgba(27,18,12,0.22)',
        position: 'relative',
      }}
    >
      <div
        style={{
          height: 18,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0))',
        }}
      />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '72px 24px 28px', width: '100%', boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 32,
            alignItems: 'start',
            marginBottom: 56,
          }}
        >
          <div style={{ maxWidth: 540 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: 18,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.72)',
                }}
              >
                CEDA
              </span>
            </div>

            <p
              style={{
                fontSize: 28,
                lineHeight: 1.15,
                color: '#ffffff',
                maxWidth: 540,
                marginBottom: 18,
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
              }}
            >
              Finance. Develop. Sustain.
            </p>

            <p style={{ fontSize: 15, lineHeight: 1.8, maxWidth: 440, marginBottom: 18 }}>
              Citizen Entrepreneurial Development Agency.
            </p>

            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>
              Botswana
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
              www.ceda.co.bw
            </p>
          </div>

          <div>
            <p
              style={{
                fontWeight: 600,
                color: '#ffffff',
                marginBottom: 14,
                fontSize: 14,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Services
            </p>
            {[['Submit an idea', '/workspace/new'], ['My submissions', '/workspace'], ['Programmes', '/challenges'], ['Submission guide', '/how-it-works'], ['Services', '/services']].map(([label, href]) => {
              const secure = href === '/workspace' || href === '/workspace/new';
              return (
                <div key={href}>
                  {secure ? (
                    <a href={href} onClick={(e) => { e.preventDefault(); if (requireAuth(href)) navigate(href); }} style={footerLinkStyle}>
                      {label}
                    </a>
                  ) : (
                    <Link to={href} style={footerLinkStyle}>
                      {label}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <p
              style={{
                fontWeight: 600,
                color: '#ffffff',
                marginBottom: 14,
                fontSize: 14,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Organisation
            </p>
            {[['About CEDA', 'https://www.ceda.co.bw/'], ['Help', '/help'], ['Guidelines', '/how-it-works'], ['Privacy', '/privacy']].map(([label, href]) => (
              <div key={href}>
                <Link to={href} style={footerLinkStyle}>
                  {label}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 32, paddingTop: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
            {[
              'Idea submission',
              'Evaluation',
              'Feedback',
              'Progress tracking',
              'CEDA portal',
            ].map(label => (
              <span key={label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 50, padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
                {label}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/privacy" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/privacy" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Security</a>
            <a href="/help" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Help</a>
          </div>
        </div>

        <div
          style={{
            paddingTop: 28,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 36,
          }}
        >
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            (c) 2026 Citizen Entrepreneurial Development Agency. All rights reserved.
          </p>
          <p
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.45)',
              fontStyle: 'italic',
            }}
          >
            Finance. Develop. Sustain.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="footer-wordmark">CEDA</div>
        </div>
      </div>
    </footer>
  )
}

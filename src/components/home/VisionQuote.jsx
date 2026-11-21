import { Link } from 'react-router-dom'

const SOURCE_URL = 'https://aripo.org/storage/resources-member-state-laws/1691503683_Botswana%20Intellectual%20Property%20Policy%202022.pdf'

export default function VisionQuote() {
  return (
    <section className="vq" aria-labelledby="vq-quote">
      <div className="vq-inner">
        <span className="vq-eyebrow">Botswana Vision 2036</span>
        <span className="vq-mark" aria-hidden="true">“</span>
        <blockquote className="vq-quote">
          <p id="vq-quote">Science, technology, innovation and creativity are the engines of Botswana’s knowledge economy.</p>
        </blockquote>
        <p className="vq-body">
          Vision 2036 recognises the role of innovation in building a knowledge-based, high-income Botswana.
          The CEDA Innovation Portal exists to turn that recognition into action, with a fair route for every idea.
        </p>
        <p className="vq-source">
          Source: <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">Botswana Intellectual Property Policy (2022)</a>, summarising Vision 2036
        </p>
        <Link className="vq-button" to="/login?redirect=%2Fworkspace%2Fnew">Submit your idea</Link>
      </div>

      <style>{`
        .vq {
          background: radial-gradient(circle at 50% 0%, #14305a 0%, #0B1F3A 62%);
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          padding: 110px 24px;
          text-align: center;
        }
        .vq-inner { max-width: 900px; margin: 0 auto; position: relative; }
        .vq-eyebrow {
          display: inline-block;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: #9db8e0;
        }
        .vq-mark {
          display: block;
          font-size: 110px;
          line-height: .8;
          height: 56px;
          margin-top: 28px;
          color: #3A6EC4;
          font-weight: 700;
        }
        .vq-quote { margin: 0; }
        .vq-quote p {
          margin: 0;
          font-size: clamp(30px, 4.6vw, 56px);
          font-weight: 500;
          line-height: 1.18;
          letter-spacing: -0.02em;
          color: #ffffff;
        }
        .vq-body {
          max-width: 720px;
          margin: 34px auto 0;
          font-size: 17px;
          font-weight: 300;
          line-height: 1.75;
          color: #d6e4f7;
        }
        .vq-source {
          margin: 28px 0 0;
          font-size: 14px;
          font-weight: 300;
          color: #b6c8e6;
        }
        .vq-source a { color: #ffffff; text-decoration: underline; text-underline-offset: 3px; }
        .vq-source a:hover { color: #D6E4F7; }
        .vq-button {
          display: inline-block;
          margin-top: 38px;
          padding: 14px 30px;
          border-radius: 999px;
          background: #ffffff;
          color: #0B1F3A;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          transition: transform .2s ease, background .2s ease;
        }
        .vq-button:hover { background: #D6E4F7; transform: translateY(-2px); }
        .vq-button:focus-visible, .vq-source a:focus-visible { outline: 3px solid #ffffff; outline-offset: 4px; }
        @media (max-width: 640px) {
          .vq { padding: 72px 20px; }
          .vq-body { font-size: 15px; }
          .vq-mark { font-size: 84px; height: 44px; }
        }
      `}</style>
    </section>
  )
}

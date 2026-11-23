// Navbar for every page: it uses the same header as the home page (LandingHeader).
// That header is designed to sit on top of the dark hero picture, so on every other
// page it gets a solid black bar behind it. Otherwise its light text and links would
// disappear against the white pages.

import { useLocation } from 'react-router-dom'
import LandingHeader from './LandingHeader'

export default function Navbar({ showHint = false, onChatClose, hideChat = false }) {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <>
      <div className={isHome ? 'site-nav' : 'site-nav site-nav-solid'}>
        <LandingHeader />
      </div>

      <style>{`
        /* Home page: no extra box, so the header behaves exactly as before */
        .site-nav { display: contents; }

        /* Every other page: black bar behind the header so it is always visible */
        .site-nav.site-nav-solid {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9998;
          min-height: 96px;
          background: #050505;
          box-shadow: 0 2px 18px rgba(0, 0, 0, 0.18);
        }
      `}</style>
    </>
  )
}

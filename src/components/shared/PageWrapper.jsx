import Navbar from './Navbar'
import Footer from './Footer'
import { useLocation } from 'react-router-dom'
export default function PageWrapper({ children }) {
  const { pathname } = useLocation()
  if (/^\/(portal|workspace)(\/|$)/.test(pathname)) return children
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar hideChat={['/login', '/register', '/forgot-password'].includes(pathname)} />
      <main id="main-content" tabIndex="-1">{children}</main>
      <Footer />
    </div>
  )
}

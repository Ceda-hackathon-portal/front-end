import Navbar from './Navbar'
import Footer from './Footer'
import { useLocation } from 'react-router-dom'
export default function PageWrapper({ children }) {
  const { pathname } = useLocation()
  if (/^\/(portal|workspace|admin)(\/|$)/.test(pathname) || ['/login', '/register', '/forgot-password'].includes(pathname)) return children
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      {pathname !== '/' && <Navbar />}
      <main id="main-content" tabIndex="-1">{children}</main>
      <Footer showSignature={pathname === '/'} />
    </div>
  )
}

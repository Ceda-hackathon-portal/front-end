import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import LandingHeader from '../components/shared/LandingHeader'
import HomePageSections from '../components/home/HomePageSections'

export default function HomePage() {
  const heroRef = useRef(null)

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    function onScroll() {
      const progress = Math.min(Math.max(window.scrollY / 600, 0), 1)
      hero.style.width = (100 - progress * 40) + '%'
      hero.style.borderRadius = 'calc(' + (18 * (1 - progress)) + 'px + ' + (progress * 50) + '%)'
      hero.style.setProperty('--hero-copy-opacity', String(Math.max(0, 1 - progress * 1.6)))
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <section className="ceda-hero-frame">
        <LandingHeader />
        <div className="ceda-hero-image" ref={heroRef}>
          <div className="ceda-hero-shade" />
          <div className="ceda-hero-copy">
            <div className="ceda-hero-identity">
              <img src="/images/ceda-logo.png" alt="CEDA" width="160" height="98" />
              <span className="ceda-hero-divider" aria-hidden="true" />
              <h1><span>Innovation</span><span>Portal</span></h1>
            </div>
            <Link className="landing-portal-link" to="/portal">Enter the portal<ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>
      <HomePageSections />
    </>
  )
}

import OptimizedImage from '../components/shared/OptimizedImage'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import LandingHeader from '../components/shared/LandingHeader'
import HomePageSections from '../components/home/HomePageSections'
import VisionQuote from '../components/home/VisionQuote'

const slideNames = ['Carousel1', 'Carousel2', 'Carousel3', 'Carousel4']
const AUTOPLAY_MS = 6000

function SlideImage({ name, active, first }) {
  return (
    <OptimizedImage
      className={'ceda-slide' + (active ? ' is-active' : '')}
      name={name + '.jpg'}
      sizes="(max-width: 760px) 150svh, 100vw"
      alt=""
      loading={first ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={first ? 'high' : 'low'}
    />
  )
}

export default function HomePage() {
  const heroRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovered || focused
  const count = slideNames.length

  const go = useCallback((next) => setIndex((next + count) % count), [count])

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    let lastProgress = -1

    function updateHero() {
      frame = 0
      const progress = Math.min(Math.max(window.scrollY / 600, 0), 1)
      if (progress === lastProgress) return
      lastProgress = progress
      hero.style.width = (100 - progress * 40) + '%'
      hero.style.borderRadius = 'calc(' + (18 * (1 - progress)) + 'px + ' + (progress * 50) + '%)'
      hero.style.setProperty('--hero-copy-opacity', String(Math.max(0, 1 - progress * 1.6)))
    }

    function onScroll() {
      if (!frame) frame = window.requestAnimationFrame(updateHero)
    }

    updateHero()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  // Autoplay, stopped on hover/focus and for people who prefer reduced motion
  useEffect(() => {
    if (paused || count < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [paused, count])

  return (
    <>
      <section
        className="ceda-hero-frame"
        aria-roledescription="carousel"
        aria-label="CEDA Innovation Portal highlights"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
        }}
      >
        <LandingHeader />
        <div className="ceda-hero-image" ref={heroRef}>
          {slideNames.map((name, i) => (
            <SlideImage key={name} name={name} active={i === index} first={i === 0} />
          ))}
          <div className="ceda-hero-shade" />
          <div className="ceda-hero-copy">
            <div className="ceda-hero-identity">
              <img src="/images/ceda-logo.png" alt="CEDA" width="160" height="98" />
              <span className="ceda-hero-divider" aria-hidden="true" />
              <h1><span>Innovation</span><span>Portal</span></h1>
            </div>
            <Link className="landing-portal-link" to="/portal">Enter the portal<ArrowRight size={17} /></Link>
          </div>

          {count > 1 && (
            <>
              <button type="button" className="ceda-carousel-arrow is-prev" onClick={() => go(index - 1)} aria-label="Previous slide">
                <ChevronLeft size={22} />
              </button>
              <button type="button" className="ceda-carousel-arrow is-next" onClick={() => go(index + 1)} aria-label="Next slide">
                <ChevronRight size={22} />
              </button>
              <div className="ceda-carousel-dots" role="group" aria-label="Choose slide">
                {slideNames.map((name, i) => (
                  <button
                    key={name}
                    type="button"
                    className={i === index ? 'is-active' : ''}
                    onClick={() => go(i)}
                    aria-label={'Show slide ' + (i + 1) + ' of ' + count}
                    aria-current={i === index ? 'true' : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      <HomePageSections />
      <VisionQuote />

      <style>{`
        .ceda-hero-image .ceda-slide {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity .9s ease;
        }
        .ceda-hero-image .ceda-slide.is-active { opacity: 1; }
        .ceda-carousel-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 3;
          width: 46px;
          height: 46px;
          border: 1px solid rgba(255,255,255,.45);
          border-radius: 50%;
          background: rgba(0,0,0,.35);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(6px);
          transition: background .2s ease;
        }
        .ceda-carousel-arrow:hover { background: rgba(0,0,0,.6); }
        .ceda-carousel-arrow.is-prev { left: 20px; }
        .ceda-carousel-arrow.is-next { right: 20px; }
        .ceda-carousel-dots {
          position: absolute;
          left: 50%;
          bottom: 26px;
          transform: translateX(-50%);
          z-index: 3;
          display: flex;
          gap: 10px;
        }
        .ceda-carousel-dots button {
          width: 12px;
          height: 12px;
          padding: 0;
          border: 1.5px solid #ffffff;
          border-radius: 999px;
          background: transparent;
          cursor: pointer;
          transition: width .25s ease, background .25s ease;
        }
        .ceda-carousel-dots button.is-active { width: 32px; background: #ffffff; }
        .ceda-carousel-arrow:focus-visible,
        .ceda-carousel-dots button:focus-visible { outline: 3px solid #ffffff; outline-offset: 3px; }
        @media (max-width: 700px) {
          .ceda-hero-image .ceda-slide:first-of-type { object-position: 85% center; }
          .ceda-carousel-arrow { width: 38px; height: 38px; }
          .ceda-carousel-arrow.is-prev { left: 10px; }
          .ceda-carousel-arrow.is-next { right: 10px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ceda-hero-image .ceda-slide { transition: none; }
        }
      `}</style>
    </>
  )
}

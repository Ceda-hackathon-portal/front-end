import { useEffect, useState } from 'react'
import '../../styles/loader.css'

// First-visit splash: the three arcs of the CEDA mark draw in, then the wordmark and tagline rise.
// Shown once per browser session, never on later page changes (RouteProgress covers those).
const SEEN_KEY = 'ceda.splash.seen'
const ANIMATION_MS = 1100
const SAFETY_MS = 4000
const EXIT_MS = 400

function seenThisSession() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1' } catch { return false }
}

function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* storage unavailable: the splash may show again next load */ }
}

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export default function PageLoader({ skip = false }) {
  // Decided once, at first render: a session that starts on a skipped route never shows the splash later.
  const [phase, setPhase] = useState(() => (skip || seenThisSession() ? 'gone' : 'showing'))

  useEffect(() => {
    if (phase !== 'showing') return undefined
    markSeen()
    let animationDone = false
    let pageDone = document.readyState === 'complete'
    const finish = () => { if (animationDone && pageDone) setPhase('leaving') }
    const onLoad = () => { pageDone = true; finish() }
    if (!pageDone) window.addEventListener('load', onLoad, { once: true })
    const animationTimer = window.setTimeout(() => { animationDone = true; finish() }, prefersReducedMotion() ? 0 : ANIMATION_MS)
    const safetyTimer = window.setTimeout(() => setPhase('leaving'), SAFETY_MS)
    return () => {
      window.clearTimeout(animationTimer)
      window.clearTimeout(safetyTimer)
      window.removeEventListener('load', onLoad)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'leaving') return undefined
    const timer = window.setTimeout(() => setPhase('gone'), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  if (phase === 'gone') return null

  return (
    <div className={'splash' + (phase === 'leaving' ? ' is-leaving' : '')} role="status" aria-live="polite">
      <span className="sr-only">{phase === 'leaving' ? 'Ready' : 'Loading the CEDA Innovation Portal'}</span>
      <svg className="splash-mark" viewBox="0 0 96 54" aria-hidden="true" focusable="false">
        <path className="splash-arc splash-arc-outer" pathLength="100" d="M8 50 A40 40 0 0 1 88 50" />
        <path className="splash-arc splash-arc-middle" pathLength="100" d="M22 50 A26 26 0 0 1 74 50" />
        <path className="splash-arc splash-arc-inner" pathLength="100" d="M35 50 A13 13 0 0 1 61 50" />
      </svg>
      <p className="splash-wordmark" aria-hidden="true">CEDA</p>
      <p className="splash-tagline" aria-hidden="true">Finance<span />Develop<span />Sustain</p>
    </div>
  )
}

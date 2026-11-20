import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import '../../styles/loader.css'

// Thin bar in the CEDA arc colours across the top on every page change. The page stays visible and usable.
const RUN_MS = 220
const FADE_MS = 450

export default function RouteProgress() {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  const [state, setState] = useState('idle')

  useEffect(() => {
    if (previousPath.current === pathname) return undefined
    previousPath.current = pathname
    setState('running')
    // A timer, not animation frames: frames pause in background tabs and would leave the bar stuck.
    const timer = window.setTimeout(() => setState('done'), RUN_MS)
    return () => window.clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    if (state !== 'done') return undefined
    const timer = window.setTimeout(() => setState('idle'), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [state])

  return <div className={'route-progress is-' + state} aria-hidden="true"><span /></div>
}

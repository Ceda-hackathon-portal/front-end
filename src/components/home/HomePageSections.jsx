import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Pause, Play } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { roleHome } from '../../utils/portal'
import OptimizedImage from '../shared/OptimizedImage'

function BrandStrip() {
  const [paused, setPaused] = useState(false)
  return <section className={'home-brand-strip' + (paused ? ' is-paused' : '')} aria-label="CEDA: Finance, Develop, Sustain">
    <div className="home-brand-viewport"><div className="home-brand-track">
      {[false, true].map(duplicate => <div className="home-brand-group" key={String(duplicate)} aria-hidden={duplicate || undefined}>
        <img src="/images/ceda-logo.png" alt="CEDA" width="112" height="69" />
        <span>Finance.</span><span>Develop.</span><span>Sustain.</span>
      </div>)}
    </div></div>
    <button type="button" className="home-brand-toggle" aria-label={paused ? 'Resume brand animation' : 'Pause brand animation'} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
  </section>
}

export default function HomePageSections() {
  const { user, requireAuth } = useAuth()
  const navigate = useNavigate()
  function follow(event, target) {
    event.preventDefault()
    const destination = user && user.role !== 'submitter' ? roleHome(user.role) : target
    if (requireAuth(destination)) navigate(destination)
  }
  return <div className="home-content">
    <BrandStrip />
    <section className="home-application" aria-labelledby="home-application-title">
      <div className="home-application-photo">
        <OptimizedImage name="Drone.jpg" sizes="(max-width: 760px) 100vw, 55vw" alt="A drone resting in a sunlit field" />
      </div>
      <div className="home-application-copy">
        <span className="home-kicker">Applicant portal</span>
        <h2 id="home-application-title">Your application,<br />in one place.</h2>
        <p>Submit an idea, save your progress and follow your application.</p>
        <Link className="home-primary-action" to="/workspace/new" onClick={event => follow(event, '/workspace/new')}>Start an application<ArrowRight size={18} /></Link>
        <div className="home-secondary-actions">
          <Link to="/workspace/applications" onClick={event => follow(event, '/workspace/applications')}>My applications<ArrowRight size={16} /></Link>
          <Link to="/portal/help">Application guide<ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>
    <nav className="home-resources" aria-label="Portal resources">
      <Link to="/challenges"><span>01</span>Programmes<ArrowRight size={18} /></Link>
      <Link to="/how-it-works"><span>02</span>Guidelines<ArrowRight size={18} /></Link>
      <Link to="/help"><span>03</span>Help & support<ArrowRight size={18} /></Link>
    </nav>
  </div>
}

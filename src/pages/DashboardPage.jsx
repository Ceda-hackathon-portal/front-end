import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, BookOpen, Check, FilePenLine, FilePlus2, Files, Lightbulb } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePortal } from '../context/PortalContext'
import ApplicationList from '../components/applicant/ApplicationList'
import { draftProgress } from '../utils/applicant'

const quickActions = [
  { title: 'Start an application', href: '/workspace/new', icon: FilePlus2 },
  { title: 'Continue a draft', href: '/workspace/new', icon: FilePenLine },
  { title: 'Track an application', href: '/workspace/applications', icon: Files },
  { title: 'Application guide', href: '/portal/help', icon: BookOpen },
]

export default function DashboardPage() {
  const { user, startDemo } = useAuth()
  const { ideas, draft } = usePortal()
  const [tab, setTab] = useState('applications')
  const isApplicant = user?.role === 'submitter'
  const progress = draftProgress(draft)
  return (
    <div className="ap-home">
      <div className="ap-dashboard-grid">
        <div className="ap-dashboard-primary">
          <section className="ap-panel ap-quick-panel"><div className="ap-section-title"><h2>Quick actions</h2><span className="ap-section-line" /></div><div className="ap-quick-grid">{quickActions.map(({ title, href, icon: Icon }) => <Link className="ap-quick-action" to={href} key={title}><Icon size={23} strokeWidth={1.5} aria-hidden="true" /><div><strong>{title}</strong></div><ArrowUpRight className="ap-action-arrow" size={17} /></Link>)}</div></section>
          <section className="ap-programme-feature"><div><h2>Programmes</h2><Link className="ap-text-link" to="/portal/programmes">Explore programmes<ArrowRight size={16} /></Link></div><img src="/images/applicant-programmes.png" width="1916" height="821" alt="A cattle enterprise" loading="lazy" /></section>
          <section className="ap-how-panel"><div className="ap-section-title"><h2>How it works</h2></div><ol className="ap-how-steps">{[['01', 'Prepare', 'Describe your idea'], ['02', 'Submit', 'Check every detail'], ['03', 'Keep track', 'See your next step']].map(([number, title, text]) => <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol></section>
        </div>
        <aside className="ap-dashboard-secondary">
          <section className="ap-panel ap-my-applications"><div className="ap-section-title"><h2>My applications</h2><Files size={19} strokeWidth={1.4} /></div>
            <div className="ap-tabs" role="tablist" aria-label="Application view">{[['applications', 'Submitted', isApplicant ? ideas.length : 0], ['draft', 'Draft', isApplicant && progress.completed ? 1 : 0]].map(([id, label, count]) => <button key={id} id={'tab-' + id} type="button" role="tab" aria-selected={tab === id} aria-controls="application-tab-panel" tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'applications' : event.key === 'End' ? 'draft' : tab === 'applications' ? 'draft' : 'applications'; setTab(next); document.getElementById('tab-' + next)?.focus() } }}>{label}<span>{count}</span></button>)}</div>
            <div id="application-tab-panel" role="tabpanel" aria-labelledby={'tab-' + tab}>
              {!isApplicant ? <div className="ap-empty"><Files size={30} strokeWidth={1.1} /><h3>Applicant preview</h3><p>Open the applicant preview to try the submission journey.</p><button className="ap-button ap-button-secondary" onClick={() => startDemo('submitter')}>Open applicant preview<ArrowRight size={15} /></button></div>
                : tab === 'applications' ? <><ApplicationList ideas={ideas.slice(0, 3)} compact />{ideas.length === 0 && <div className="ap-empty"><p>You have no submissions yet.</p><Link className="ap-text-link" to="/workspace/new">Start your first application<ArrowRight size={15} /></Link></div>}<Link className="ap-panel-bottom-link" to="/workspace/applications">View all applications<ArrowRight size={15} /></Link></>
                  : progress.completed ? <div className="ap-draft-preview"><span className="ap-soft-label"><FilePenLine size={13} />Draft</span><h3>{draft.title || 'Untitled application'}</h3><p>{progress.completed} of {progress.total} fields complete</p><div className="ap-progress-track"><span style={{ width: progress.percent + '%' }} /></div><Link className="ap-text-link" to="/workspace/new">Continue application<ArrowRight size={15} /></Link></div>
                    : <div className="ap-empty"><FilePenLine size={28} strokeWidth={1.1} /><h3>No draft in progress.</h3><p>Your application saves here as you write.</p><Link className="ap-text-link" to="/workspace/new">Start an application<ArrowRight size={15} /></Link></div>}
            </div>
          </section>
          <section className="ap-help-note"><span className="ap-small-icon"><Lightbulb size={21} strokeWidth={1.4} /></span><div><h3>Before you apply</h3><Link className="ap-text-link" to="/portal/help">Read the guide<ArrowUpRight size={14} /></Link></div></section>
          <div className="ap-trust-note"><Check size={15} /><span>Your draft stays on this device.</span></div>
        </aside>
      </div>
    </div>
  )
}

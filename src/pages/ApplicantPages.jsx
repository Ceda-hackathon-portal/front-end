import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, FilePenLine, Files, Inbox, Search } from 'lucide-react'
import { usePortal } from '../context/PortalContext'
import { applicationReference, draftProgress } from '../utils/applicant'
import { displayDateTime } from '../utils/portal'
import { themes } from '../data/portal'
import ApplicationList from '../components/applicant/ApplicationList'

export function ApplicantApplicationsPage() {
  const { ideas, draft } = usePortal()
  const [params, setParams] = useSearchParams()
  const query = params.get('q') || ''
  const status = params.get('status') || 'all'
  const filtered = ideas.filter(idea => (status === 'all' || idea.status === status) && `${idea.title} ${applicationReference(idea)}`.toLowerCase().includes(query.toLowerCase()))
  const progress = draftProgress(draft)
  function filter(key, value) { const next = new URLSearchParams(params); value && value !== 'all' ? next.set(key, value) : next.delete(key); setParams(next, { replace: true }) }
  return <div className="ap-page">
    {progress.completed > 0 && <Link className="ap-draft-callout" to="/workspace/new"><FilePenLine size={23} strokeWidth={1.4} /><div><strong>{draft.title || 'Untitled application'}</strong><span>Draft · {progress.completed} of {progress.total} fields complete</span></div><span>Continue<ArrowRight size={16} /></span></Link>}
    <section className="ap-panel"><div className="ap-filter-row"><label className="ap-search-field"><Search size={17} /><input aria-label="Filter applications" placeholder="Search by title or reference" value={query} onChange={event => filter('q', event.target.value)} /></label><label className="ap-status-filter"><span>Status</span><select value={status} onChange={event => filter('status', event.target.value)}><option value="all">All statuses</option>{['Submitted', 'Under review', 'Feedback', 'Approved', 'Award'].map(value => <option key={value}>{value}</option>)}</select></label></div>
      <div className="ap-list-heading"><span>{filtered.length} application{filtered.length === 1 ? '' : 's'}</span><span>Latest first</span></div>
      <ApplicationList ideas={filtered} />{filtered.length === 0 && <div className="ap-empty"><Files size={28} strokeWidth={1.2} /><h2>{query || status !== 'all' ? 'No matching applications.' : 'No applications yet.'}</h2><p>{query || status !== 'all' ? 'Try a different search or status.' : 'Start an application and save it as you go.'}</p>{(query || status !== 'all') && <button className="ap-text-link" onClick={() => setParams({})}>Clear filters</button>}</div>}
    </section>
  </div>
}

export function ApplicantMessagesPage() {
  const { ideas } = usePortal()
  const updates = ideas.flatMap(idea => idea.feedback.map(feedback => ({ ...feedback, idea }))).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  return <div className="ap-page"><section className="ap-panel">{updates.length ? updates.map(update => <Link className="ap-message-row" key={update.idea.id + update.id} to={'/workspace/ideas/' + update.idea.id}><span className="ap-document-icon"><Inbox size={20} /></span><div><span className="ap-soft-label">Feedback available</span><h2>{update.idea.title}</h2><p>{update.message}</p><small>{displayDateTime(update.createdAt)}</small></div><ArrowUpRight size={18} /></Link>) : <div className="ap-empty"><Inbox size={30} strokeWidth={1.2} /><h2>No feedback yet.</h2><p>Updates will appear here when feedback is available.</p></div>}</section></div>
}

export function ApplicantProgrammesPage() {
  return <div className="ap-page"><section className="ap-programme-intro ap-panel"><div><span className="ap-soft-label">Sample programme</span><h2>CEDA Innovation Challenge</h2><span className="ap-muted">Programme rules and dates will be confirmed by CEDA.</span></div></section><div className="ap-theme-list">{themes.map(theme => <article className="ap-panel ap-theme-row" key={theme.id}><span className="ap-theme-number">{theme.number}</span><div><span className="ap-eyebrow">{theme.category}</span><h2>{theme.name}</h2><p>{theme.description}</p></div><Link className="ap-button ap-button-secondary" to={'/workspace/new?theme=' + theme.id}>Start with this theme<ArrowRight size={16} /></Link></article>)}</div></div>
}

export function ApplicantHelpPage() {
  const questions = [
    ['What should I prepare?', 'Give your idea a clear title. Explain the problem, your solution, the difference it could make and who is working on it.'],
    ['Can I finish my application later?', 'Yes. Your draft saves in this browser as you type. Choose Save and close, then use Continue a draft when you return. Use the same browser and device for this preview.'],
    ['How do I know it was submitted?', 'You will see a confirmation and a CEDA-DEMO reference. The application then appears under My applications. This is a frontend preview: nothing is sent to CEDA.'],
    ['Can I upload documents?', 'Document uploads are outside this first preview. Please use fictional information and do not enter identity numbers or private documents.'],
    ['How do I see feedback?', 'Open an application from My applications, or select an update under Messages. Only the example feedback is available in this preview.'],
  ]
  return <div className="ap-page ap-guide-page"><section className="ap-guide-lead"><h2>What to prepare</h2><ul><li>An idea title and innovation theme.</li><li>The problem, your solution and expected impact.</li><li>Your team or organisation name.</li></ul></section><section className="ap-panel ap-faq"><h2>Common questions</h2>{questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section></div>
}

export function ApplicantNotFoundPage() {
  return <div className="ap-page"><section className="ap-empty ap-panel"><Files size={32} /><h2>Page not found</h2><p>Return to the applicant portal to find your next step.</p><Link className="ap-button ap-button-primary" to="/portal">Applicant home<ArrowRight size={16} /></Link></section></div>
}

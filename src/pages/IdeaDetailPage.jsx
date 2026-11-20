import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Download, MessageSquareText } from 'lucide-react'
import StatusBadge from '../components/shared/StatusBadge'
import { usePortal } from '../context/PortalContext'
import { stages, themes } from '../data/portal'
import { displayDate, displayDateTime } from '../utils/portal'
import { applicationReference, applicationText } from '../utils/applicant'

export default function IdeaDetailPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { ideas } = usePortal()
  const idea = ideas.find(item => item.id === id)
  if (!idea) return <section className="ap-page ap-panel ap-empty"><h2>Application not found.</h2><p>This preview application may belong to a different browser.</p><Link className="ap-button ap-button-primary" to="/workspace/applications">My applications<ArrowRight size={16} /></Link></section>
  const current = stages.indexOf(idea.status)
  function downloadCopy() {
    const url = URL.createObjectURL(new Blob([applicationText(idea)], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = applicationReference(idea) + '.txt'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div className="ap-page"><Link className="ap-text-link ap-back-link" to="/workspace/applications"><ArrowLeft size={15} />My applications</Link>
    {params.get('submitted') === '1' && <section className="ap-receipt" aria-labelledby="receipt-heading"><CheckCircle2 size={34} strokeWidth={1.4} /><div><span className="ap-eyebrow">PREVIEW COMPLETE</span><h2 id="receipt-heading">Application submitted.</h2><p>Saved on this device. Nothing has been sent to CEDA.</p><strong>{applicationReference(idea)}</strong></div><button className="ap-button ap-button-secondary" onClick={downloadCopy}><Download size={16} />Download copy (.txt)</button></section>}
    <header className="ap-page-intro"><div><span className="ap-eyebrow">{applicationReference(idea)}</span><h2 className="ap-application-title">{idea.title}</h2><p>{themes.find(theme => theme.id === idea.theme)?.name} · {displayDate(idea.submittedAt)}</p></div><StatusBadge status={idea.status} /></header>
    <div className="ap-detail-grid"><div><section className="ap-panel ap-detail-panel"><div className="ap-section-title"><h2>Your application</h2><button className="ap-text-link" onClick={downloadCopy}><Download size={15} />Download copy</button></div>{[['The problem', idea.problem], ['Your solution', idea.solution], ['The impact', idea.impact], ['Team or organisation', idea.team]].map(([label, value]) => <div className="ap-answer" key={label}><h3>{label}</h3><p>{value}</p></div>)}</section>
      <section className="ap-panel ap-detail-panel"><div className="ap-section-title"><h2>Feedback</h2><MessageSquareText size={19} strokeWidth={1.4} /></div>{idea.feedback.length ? idea.feedback.map(feedback => <article className="ap-feedback" key={feedback.id}><strong>{feedback.author}</strong><small>{displayDateTime(feedback.createdAt)}</small><p>{feedback.message}</p></article>) : <div className="ap-inline-empty"><p>No feedback yet.</p><span>Example updates will appear here when available.</span></div>}</section></div>
      <aside className="ap-panel ap-timeline-panel"><span className="ap-eyebrow">APPLICATION PROGRESS</span><h2>Your next step</h2><p>{idea.feedback.length ? 'Read the feedback below your application.' : 'No action is needed in this preview.'}</p><ol className="ap-timeline">{stages.map((stage, index) => <li key={stage} className={index === current ? 'is-current' : index < current ? 'is-done' : ''}><span>{index < current ? <Check size={13} /> : index + 1}</span><div><strong>{stage}</strong><small>{index === 0 ? displayDate(idea.submittedAt) : index === current ? 'Current example stage' : index < current ? 'Earlier example stage' : 'Upcoming stage'}</small></div></li>)}</ol><div className="ap-snapshot"><strong>Version 1</strong><span>{displayDateTime(idea.submittedAt)}</span><p>Your submitted answers are kept as a separate snapshot.</p></div></aside>
    </div>
  </div>
}

import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, MessageSquareText } from 'lucide-react'
import WorkspaceLayout from '../components/shared/WorkspaceLayout'
import StatusBadge from '../components/shared/StatusBadge'
import { usePortal } from '../context/PortalContext'
import { stages, themes } from '../data/portal'
import { displayDate, displayDateTime } from '../utils/portal'
export default function IdeaDetailPage() {
  const { id } = useParams()
  const { ideas } = usePortal()
  const idea = ideas.find((item) => item.id === id)
  if (!idea) return <WorkspaceLayout title="Idea not found." description="This demo idea may belong to a different browser."><Link className="button button-primary" to="/workspace">Back to your workspace</Link></WorkspaceLayout>
  const current = stages.indexOf(idea.status)
  return (
    <WorkspaceLayout title={idea.title} description={'Demo reference · ' + idea.id}>
      <Link className="inline-link back-link" to="/workspace"><ArrowLeft size={16} />All submissions</Link>
      <div className="detail-grid">
        <div>
          <section className="panel"><div className="panel-header"><h2>Idea overview</h2><StatusBadge status={idea.status} /></div><p className="muted">{themes.find((theme) => theme.id === idea.theme)?.name} · {displayDate(idea.submittedAt)}</p>{[['The problem', idea.problem], ['The solution', idea.solution], ['The impact', idea.impact], ['Team', idea.team]].map(([title, text]) => <div className="detail-section" key={title}><h3>{title}</h3><p>{text}</p></div>)}</section>
          <section className="panel"><h2><MessageSquareText size={20} />Feedback & conversation</h2>{idea.feedback.length ? idea.feedback.map((feedback) => <article className="feedback-card" key={feedback.id}><strong>{feedback.author}</strong><small>{displayDateTime(feedback.createdAt)}</small><p>{feedback.message}</p></article>) : <p className="muted">No feedback yet. This is where your evaluation team’s notes will appear.</p>}<p className="notice">Replies, revisions and resubmission will be available only when an authorised reviewer requests a revision. The original version must remain traceable.</p></section>
          <section className="panel"><h2>Submission history</h2><div className="history-entry"><span className="tag">Version 1</span><div><strong>Initial demo submission</strong><small>{displayDateTime(idea.submittedAt)}</small></div></div><p className="section-note">This is the initial snapshot. A complete event history and version comparisons will be supplied by the future workflow service.</p></section>
        </div>
        <aside className="panel status-panel"><span className="eyebrow">Your idea’s journey</span><h2>Step by step.</h2><ol className="status-timeline">{stages.map((stage, index) => <li key={stage} className={index < current ? 'is-done' : index === current ? 'is-current' : ''}><span>{index < current ? <Check size={15} /> : index + 1}</span><div><strong>{stage}</strong><small>{index < current ? 'Complete in sample' : index === current ? 'Current stage' : 'Next stage'}</small></div></li>)}</ol><p className="section-note">Prototype status display. Live stage changes and decision history are not connected.</p></aside>
      </div>
    </WorkspaceLayout>
  )
}

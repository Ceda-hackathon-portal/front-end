import { Link } from 'react-router-dom'
import { ArrowRight, FilePlus2, Plus } from 'lucide-react'
import WorkspaceLayout from '../components/shared/WorkspaceLayout'
import StatusBadge from '../components/shared/StatusBadge'
import { usePortal } from '../context/PortalContext'
import { displayDate } from '../utils/portal'

export default function DashboardPage() {
  const { ideas, draft, resetDemo } = usePortal()
  const feedbackIdeas = ideas.filter((idea) => idea.feedback.length)
  const hasDraft = Object.values(draft).some(Boolean)
  return (
    <WorkspaceLayout title="My ideas"
      action={<Link className="button button-primary" to="/workspace/new"><Plus size={17} />New idea</Link>}>
      <div className="metric-grid">{[['Submitted', ideas.length], ['In review', ideas.filter((idea) => idea.status === 'Under review').length], ['Feedback', feedbackIdeas.length]].map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      {hasDraft && <div className="draft-callout"><FilePlus2 size={22} /><div><strong>Your next idea is taking shape.</strong><p>{draft.title || 'Untitled draft'} · Saved in this browser</p></div><Link className="inline-link" to="/workspace/new">Continue draft<ArrowRight size={17} /></Link></div>}
      <section className="panel"><div className="panel-header"><h2>Your submissions</h2><span className="muted">Demo portfolio</span></div><div className="idea-list">{ideas.map((idea) => <Link key={idea.id} to={'/workspace/ideas/' + idea.id} className="idea-row"><span className="idea-row-icon"><FilePlus2 size={19} /></span><div><strong>{idea.title}</strong><small>{displayDate(idea.submittedAt)} · {idea.team}</small></div><StatusBadge status={idea.status} /><ArrowRight size={18} /></Link>)}</div></section>
      <section className="panel notifications-panel"><div className="panel-header"><h2>Updates</h2></div>{feedbackIdeas.map((idea) => <Link to={'/workspace/ideas/' + idea.id} key={idea.id}><span className="live-dot" /><div><strong>{idea.title}</strong><p>Feedback available</p></div><ArrowRight size={17} /></Link>)}</section>
      <button className="text-button" onClick={() => { if (window.confirm('Reset this browser’s demo ideas and draft to the original examples?')) resetDemo() }}>Reset local demo data</button>
    </WorkspaceLayout>
  )
}

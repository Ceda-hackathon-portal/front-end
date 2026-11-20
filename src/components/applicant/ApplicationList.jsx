import { Link } from 'react-router-dom'
import { ArrowUpRight, FileText } from 'lucide-react'
import { displayDate } from '../../utils/portal'
import { applicationReference } from '../../utils/applicant'
import StatusBadge from '../shared/StatusBadge'

export default function ApplicationList({ ideas, compact = false }) {
  return <div className={'ap-application-list' + (compact ? ' ap-application-list-compact' : '')}>
    {ideas.map(idea => <Link className="ap-application-row" key={idea.id} to={'/workspace/ideas/' + idea.id}>
      <span className="ap-document-icon"><FileText size={19} strokeWidth={1.5} /></span>
      <div className="ap-application-copy"><strong>{idea.title}</strong><span>{applicationReference(idea)}</span><small>{displayDate(idea.submittedAt)}</small></div>
      <div className="ap-application-state"><StatusBadge status={idea.status} /><span>{idea.feedback.length ? 'Read feedback' : 'View application'}<ArrowUpRight size={13} /></span></div>
    </Link>)}
  </div>
}

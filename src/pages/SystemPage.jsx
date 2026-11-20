import { Activity, Archive, KeyRound, ListChecks } from 'lucide-react'
import WorkspaceLayout from '../components/shared/WorkspaceLayout'
const controls = [
  { icon: KeyRound, title: 'Identity & technical access', description: 'Connect secure authentication, session controls and server-side permissions.' },
  { icon: Activity, title: 'Availability & monitoring', description: 'Provide service health, useful operational logs and incident visibility.' },
  { icon: Archive, title: 'Backup & recovery', description: 'Define retention, backups, recovery procedures and evidence from restore tests.' },
  { icon: ListChecks, title: 'Security verification', description: 'Record results from access-control checks, file validation and security testing.' },
]
export default function SystemPage() {
  return (
    <WorkspaceLayout title="System">
      <p className="notice">Technical controls · not connected.</p>
      <div className="admin-grid">{controls.map(({ icon: Icon, title, description }) => <article className="panel" key={title}><span className="feature-icon"><Icon size={22} /></span><h2>{title}</h2><p>{description}</p><span className="tag">Service not connected</span></article>)}</div>
      <section className="panel"><h2>Audit record</h2><p>Critical changes will record the actor, timestamp, action, affected record, reason and previous and new state.</p><div className="empty-audit"><ListChecks size={26} /><strong>No audit service connected</strong><p>Technical access does not automatically grant access to private idea content.</p></div></section>
    </WorkspaceLayout>
  )
}

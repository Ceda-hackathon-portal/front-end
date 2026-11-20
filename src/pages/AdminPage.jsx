import { Link } from 'react-router-dom'
import { ArrowRight, BellRing, KeyRound, ListChecks, UsersRound } from 'lucide-react'
import WorkspaceLayout from '../components/shared/WorkspaceLayout'
import { roles } from '../data/portal'
const foundations = [
  { icon: ListChecks, title: 'Challenges & criteria', text: 'Publish challenge briefs, required fields, deadlines and weighted evaluation criteria.' },
  { icon: UsersRound, title: 'Teams & assignments', text: 'Create evaluation teams, assign ideas and manage adjudication responsibilities.' },
  { icon: KeyRound, title: 'Roles & permissions', text: 'Control access to submissions, intellectual property, reviews and administration.' },
  { icon: BellRing, title: 'Workflow & notifications', text: 'Configure stage transitions, feedback requests and notifications.' },
  { icon: ListChecks, title: 'Deadlines & escalation', text: 'Monitor pending reviews, flag overdue work and route escalation to the authorised role.' },
  { icon: KeyRound, title: 'Access & decision history', text: 'Preserve submission versions, actor, timestamp, rationale and changes to critical decisions.' },
]
export default function AdminPage() {
  return (
    <WorkspaceLayout title="Programme settings"
      action={<Link className="button button-outline" to="/reports">View demo reports<ArrowRight size={17} /></Link>}>
      <p className="notice">Demo settings · changes are not connected.</p>
      <div className="admin-grid" id="admin-foundations">{foundations.map(({ icon: Icon, title, text }) => <article className="panel" key={title}><span className="feature-icon"><Icon size={22} /></span><h2>{title}</h2><p>{text}</p><span className="tag">Next phase</span></article>)}</div>
      <section className="panel"><h2>Programme configuration</h2><p>Programme briefs, intake forms, stages, criteria, scoring weights and deadlines will be configured here. Exact CEDA business rules are still to be validated.</p><div className="configuration-preview"><span>Example programme</span><strong>CEDA innovation programme</strong><span className="tag">Illustrative draft</span></div><p className="section-note">No programme has been published. No deadlines or scoring weights are configured.</p></section>
      <section className="panel"><h2>Six proposed roles.</h2><div className="role-list">{roles.map((role) => <div key={role.id}><strong>{role.label}</strong><p>{role.description}</p></div>)}</div><p className="section-note">Proposed actor model from the team requirements deck. CEDA must validate permissions and delegation.</p></section>
    </WorkspaceLayout>
  )
}

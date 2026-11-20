import WorkspaceLayout from '../components/shared/WorkspaceLayout'
import { usePortal } from '../context/PortalContext'
import { stages, themes } from '../data/portal'
export default function ReportsPage() {
  const { ideas } = usePortal()
  const stageCounts = stages.map((stage) => ({ stage, count: ideas.filter((idea) => idea.status === stage).length }))
  return (
    <WorkspaceLayout title="Reports">
      <p className="notice">Sample data from this browser.</p>
      <div className="metric-grid">{[['Demo submissions', ideas.length], ['Themes represented', new Set(ideas.map((idea) => idea.theme)).size], ['With example feedback', ideas.filter((idea) => idea.feedback.length).length]].map(([label, number]) => <div className="metric-card" key={label}><span>{label}</span><strong>{number}</strong><small>Browser demo data</small></div>)}</div>
      <div className="two-column">
        <section className="panel"><h2>Ideas by stage</h2><div className="report-bars">{stageCounts.map(({ stage, count }) => <div key={stage}><span>{stage}</span><div><i style={{ width: (ideas.length ? count / ideas.length * 100 : 0) + '%' }} /></div><strong>{count}</strong></div>)}</div></section>
        <section className="panel"><h2>Participation by theme</h2><div className="criteria-list">{themes.map((theme) => <div className="report-theme" key={theme.id}><strong>{theme.name}</strong><span>{ideas.filter((idea) => idea.theme === theme.id).length} demo ideas</span></div>)}</div></section>
      </div>
      <section className="panel"><h2>Next reporting measures</h2><p className="muted">Applicant participation, time at each stage, overdue reviews, review completion and decision distributions will become available once the platform records real workflow events.</p><span className="tag">Authorised exports · next phase</span><p className="section-note">Report and export permissions must be enforced by the server. Raw private submissions should not be exposed through aggregate reports.</p></section>
    </WorkspaceLayout>
  )
}

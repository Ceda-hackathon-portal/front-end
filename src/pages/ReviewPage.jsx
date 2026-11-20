import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import WorkspaceLayout from '../components/shared/WorkspaceLayout'
import StatusBadge from '../components/shared/StatusBadge'
import { usePortal } from '../context/PortalContext'
import { criteria, stages, themes } from '../data/portal'

export default function ReviewPage({ adjudication = false }) {
  const { ideas } = usePortal()
  const [selectedId, setSelectedId] = useState(ideas[0]?.id || '')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState('')
  const [theme, setTheme] = useState('')
  const [conflicted, setConflicted] = useState(false)
  const selected = ideas.find((idea) => idea.id === selectedId)
  const visibleIdeas = ideas.filter((idea) =>
    idea.title.toLowerCase().includes(query.toLowerCase()) &&
    (!stage || idea.status === stage) && (!theme || idea.theme === theme),
  )
  return (
    <WorkspaceLayout title={adjudication ? 'Decisions' : 'Reviews'}
      >
      <p className="notice">Demo queue. Scores and decisions are not saved.</p>
      <div className="review-filters">
        <label>Find an idea<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search demo titles" /></label>
        <label>Stage<select value={stage} onChange={(event) => setStage(event.target.value)}><option value="">All stages</option>{stages.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Theme<select value={theme} onChange={(event) => setTheme(event.target.value)}><option value="">All themes</option>{themes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      <div className="review-layout">
        <section className="panel review-queue"><h2><ClipboardCheck size={20} />{adjudication ? 'Decision queue' : 'Review queue'}</h2>{visibleIdeas.map((idea) => <button key={idea.id} className={'queue-item' + (selectedId === idea.id ? ' selected' : '')} onClick={() => { setSelectedId(idea.id); setNotice(''); setConflicted(false) }}><strong>{idea.title}</strong><StatusBadge status={idea.status} /></button>)}{!visibleIdeas.length && <p className="muted">No demo ideas match these filters.</p>}<p className="section-note">Reviewer assignments and deadlines are not configured.</p></section>
        {selected && visibleIdeas.some((idea) => idea.id === selectedId) && <section className="panel review-detail" key={selected.id + String(adjudication)}>
          <span className="eyebrow">Sample submission</span><h2>{selected.title}</h2><p className="muted">{selected.team}</p><h3>The problem</h3><p>{selected.problem}</p><h3>The proposed solution</h3><p>{selected.solution}</p>
          {adjudication ? <>
            <div className="notice">Evaluation summaries, team consensus and conflict-of-interest declarations will appear here. No scores have been collected in this prototype.</div>
            <label className="field-label">Decision preview<select defaultValue=""><option value="" disabled>Choose a possible next step</option><option>Request further information</option><option>Recommend approval</option><option>Recommend decline</option></select></label>
            <label className="field-label">Decision rationale<textarea rows={4} placeholder="Explain the reasoning behind the decision." /></label>
          </> : <>
            <div className="conflict-preview">
              <label className="checkbox-label"><input type="checkbox" checked={conflicted} onChange={(event) => setConflicted(event.target.checked)} /><span>I have a conflict of interest with this example submission.</span></label>
              {conflicted && <p className="notice">Scoring paused. Recusal service is not connected.</p>}
            </div>
            <h3>Illustrative scorecard</h3><p className="muted">Preview only. Scores below are not saved.</p>
            <fieldset disabled={conflicted} className="scorecard">{criteria.map((criterion, index) => <div className="criterion-item" key={criterion.name}><label htmlFor={'score-' + index}><span><strong>{criterion.name}</strong><small>{criterion.description}</small></span><select id={'score-' + index} defaultValue="" aria-label={criterion.name + ' score'}><option value="">—</option>{[1, 2, 3, 4, 5].map((score) => <option key={score}>{score}</option>)}</select></label><label className="criterion-reason">Reason for {criterion.name.toLowerCase()}<textarea rows={2} maxLength={2000} placeholder="Explain this rating." /></label></div>)}</fieldset>
            <label className="field-label">Constructive feedback<textarea rows={4} disabled={conflicted} placeholder="What works well? What should the team clarify?" /></label>
          </>}
          <button className="button button-primary" disabled={!adjudication && conflicted} onClick={() => setNotice('This is a workflow skeleton. No ' + (adjudication ? 'decision' : 'evaluation') + ' was saved or sent. Team assignments and the review API are the next step.')}>{adjudication ? 'Preview decision action' : 'Preview evaluation action'}</button>
          {notice && <p className="notice" role="status">{notice}</p>}
        </section>}
      </div>
    </WorkspaceLayout>
  )
}

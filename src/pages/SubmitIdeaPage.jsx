import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Save } from 'lucide-react'
import WorkspaceLayout from '../components/shared/WorkspaceLayout'
import { usePortal } from '../context/PortalContext'
import { themes } from '../data/portal'

export default function SubmitIdeaPage() {
  const { draft, saveDraft, submitDemo } = usePortal()
  const [params] = useSearchParams()
  const [form, setForm] = useState(() => ({ ...draft, theme: draft.theme || themes.find((theme) => theme.id === params.get('theme'))?.id || '' }))
  const [consent, setConsent] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const complete = Object.values(form).filter((value) => value.trim()).length
  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
    setMessage('')
  }
  function submit(event) {
    event.preventDefault()
    if (!consent) return
    try { navigate('/workspace/ideas/' + submitDemo(form)) }
    catch (error) { setMessage(error.message) }
  }
  return (
    <WorkspaceLayout title="New idea">
      <form className="idea-form" onSubmit={submit}>
        <section className="panel">
          <div className="panel-header"><h2>The essentials</h2><span className="tag">{complete} of 6 fields</span></div>
          <div className="completion-bar"><span style={{ width: (complete / 6 * 100) + '%' }} /></div>
          <p className="muted">All fields required.</p>
          <div className="form-stack">
            <label>Idea title<input name="title" value={form.title} onChange={update} placeholder="A short, memorable name for your idea" required maxLength={120} /></label>
            <label>Innovation theme<select name="theme" value={form.theme} onChange={update} required><option value="">Choose a theme</option>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
            <label>The problem<textarea name="problem" value={form.problem} onChange={update} placeholder="What needs to change, and who is affected?" required maxLength={3000} rows={4} /></label>
            <label>Your solution<textarea name="solution" value={form.solution} onChange={update} placeholder="How would your idea help? What makes it different?" required maxLength={5000} rows={5} /></label>
            <label>The impact<textarea name="impact" value={form.impact} onChange={update} placeholder="Who benefits, and how could you measure the difference?" required maxLength={3000} rows={3} /></label>
            <label>Team or organisation<input name="team" value={form.team} onChange={update} placeholder="Your team name" required maxLength={150} /></label>
          </div>
        </section>
        <section className="panel attachment-placeholder"><h3>Attachments</h3><p>File uploads are not connected yet.</p></section>
        <section className="panel"><label className="checkbox-label"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>I’m using fictional information for this demo.</span></label>{message && <p className="notice" role="status">{message}</p>}<div className="form-actions"><button className="button button-outline" type="button" onClick={() => { saveDraft(form); setMessage('Draft saved on this device.') }}><Save size={17} />Save draft</button><button className="button button-primary" type="submit">Submit demo<ArrowRight size={17} /></button></div><small className="muted">Nothing is sent to CEDA.</small></section>
      </form>
    </WorkspaceLayout>
  )
}

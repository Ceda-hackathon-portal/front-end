import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CircleHelp, Save } from 'lucide-react'
import { usePortal } from '../context/PortalContext'
import { themes } from '../data/portal'
import { applicationFields, applicationSteps, draftProgress, resumeStep, validateIdea } from '../utils/applicant'

const hints = {
  title: 'Give your idea a short, descriptive name.',
  theme: 'Choose the theme that best fits your idea.',
  team: 'The name of your team or organisation.',
  problem: 'What needs to change, and who is affected?',
  solution: 'How would your idea help? Explain what you would do differently.',
  impact: 'Who would benefit, and how could you tell the idea is working?',
}

export default function SubmitIdeaPage() {
  const { draft, saveDraft, submitDemo, storageWarning } = usePortal()
  const [params] = useSearchParams()
  const [form, setForm] = useState(() => ({ ...draft, theme: draft.theme || themes.find(theme => theme.id === params.get('theme'))?.id || '' }))
  const [step, setStep] = useState(() => resumeStep(form))
  const [errors, setErrors] = useState({})
  const [consent, setConsent] = useState(false)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(Boolean(draftProgress(draft).completed))
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const stepHeading = useRef(null)
  const previousStep = useRef(step)
  useEffect(() => {
    if (stepHeading.current) {
      stepHeading.current.focus({ preventScroll: true })
      if (previousStep.current !== step) {
        stepHeading.current.scrollIntoView({ block: 'start', behavior: 'instant' })
      }
      previousStep.current = step
    }
  }, [step])
  const navigate = useNavigate()
  const progress = draftProgress(form)
  function update(event) {
    const next = { ...form, [event.target.name]: event.target.value }
    setForm(next)
    setErrors(previous => ({ ...previous, [event.target.name]: undefined }))
    setSaved(saveDraft(next))
    setMessage('')
  }
  function continueForm(event) {
    event.preventDefault()
    const nextErrors = validateIdea(form, step === 3 ? undefined : applicationSteps[step].fields)
    if (step === 3 && !consent) nextErrors.consent = 'Confirm that you are using fictional information.'
    setErrors(nextErrors)
    const firstError = Object.keys(nextErrors)[0]
    if (firstError) {
      const targetStep = applicationSteps.findIndex(item => item.fields.includes(firstError))
      if (targetStep >= 0) setStep(targetStep)
      requestAnimationFrame(() => document.getElementById('application-' + firstError)?.focus())
      return
    }
    if (step < 3) { setStep(step + 1); return }
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    try { navigate('/workspace/ideas/' + submitDemo(form) + '?submitted=1') }
    catch (error) { setMessage(error.message); submitting.current = false; setBusy(false) }
  }
  function renderField(key) {
    const field = applicationFields.find(item => item.key === key)
    const common = { id: 'application-' + key, name: key, value: form[key], onChange: update, required: true, 'aria-invalid': Boolean(errors[key]), 'aria-describedby': `hint-${key}` + (errors[key] ? ` error-${key}` : '') }
    return <div className="ap-field" key={key}><label htmlFor={common.id}>{field.label}</label><p id={'hint-' + key}>{hints[key]}</p>
      {key === 'theme' ? <select {...common}><option value="">Select a theme</option>{themes.map(theme => <option value={theme.id} key={theme.id}>{theme.name}</option>)}</select>
        : ['title', 'team'].includes(key) ? <input {...common} maxLength={field.max} autoComplete="off" /> : <textarea {...common} maxLength={field.max} rows={key === 'solution' ? 6 : 5} />}
      {errors[key] && <span className="ap-field-error" id={'error-' + key}>{errors[key]}</span>}
      {field.max && <span className="ap-field-count">{form[key].length.toLocaleString()} / {field.max.toLocaleString()}</span>}
    </div>
  }
  return <div className="ap-page ap-submission-page"><Link className="ap-text-link ap-back-link" to="/workspace"><ArrowLeft size={15} />Applicant home</Link><header className="ap-page-intro"><span className={'ap-save-status' + (storageWarning ? ' has-warning' : '')} role="status">{storageWarning ? <CircleHelp size={15} /> : <Check size={15} />}{storageWarning ? 'Not saved to this device' : saved ? 'Saved on this device' : 'Your draft saves as you type'}</span></header>
    <div className="ap-form-layout"><aside className="ap-form-sidebar"><ol className="ap-form-steps">{applicationSteps.map((item, index) => { const done = item.fields.length > 0 && !Object.keys(validateIdea(form, item.fields)).length; return <li key={item.title}><button type="button" onClick={() => { setStep(index); setMessage('') }} className={step === index ? 'is-current' : ''} aria-current={step === index ? 'step' : undefined}><span>{done ? <Check size={14} /> : index + 1}</span>{item.title}</button></li> })}</ol><div className="ap-form-help"><Link className="ap-text-link" to="/portal/help">Application guide<ArrowRight size={14} /></Link></div></aside>
      <form className="ap-form-panel ap-panel" onSubmit={continueForm} noValidate><div className="ap-form-panel-header"><span className="ap-eyebrow">STEP {step + 1} OF 4</span><span>{progress.completed} of {progress.total} fields complete</span></div><div className="ap-progress-track"><span style={{ width: ((step + 1) / 4 * 100) + '%' }} /></div><h2 ref={stepHeading} tabIndex={-1}>{applicationSteps[step].title}</h2><p className="ap-form-introduction">{step === 0 ? 'A clear starting point. All fields are required.' : step === 1 ? 'Describe the problem and your solution.' : step === 2 ? 'Describe the expected impact.' : 'Check your answers before creating your preview submission.'}</p>
        {Object.values(errors).some(Boolean) && <div className="ap-form-alert" role="alert">Please complete the highlighted fields before continuing.</div>}
        {step < 3 ? applicationSteps[step].fields.map(renderField) : <><dl className="ap-review-summary">{applicationFields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{field.key === 'theme' ? themes.find(theme => theme.id === form.theme)?.name || 'Not provided' : form[field.key] || 'Not provided'}</dd><button type="button" onClick={() => setStep(applicationSteps.findIndex(item => item.fields.includes(field.key)))} aria-label={'Change ' + field.label.toLowerCase()}>Change</button></div>)}</dl><label className="ap-consent"><input id="application-consent" type="checkbox" checked={consent} onChange={event => { setConsent(event.target.checked); setErrors(previous => ({ ...previous, consent: undefined })) }} aria-invalid={Boolean(errors.consent)} /><span>I am using fictional information for this preview.</span></label>{errors.consent && <p className="ap-field-error">{errors.consent}</p>}<p className="ap-muted ap-preview-explanation">Your application is saved on this device. Nothing is sent to CEDA.</p></>}
        {message && <p role="alert" className="ap-form-alert">{message}</p>}
        <div className="ap-form-controls"><button className="ap-button ap-button-secondary" type="button" onClick={() => { saveDraft(form); navigate('/workspace') }}><Save size={16} />Save and close</button><div>{step > 0 && <button className="ap-button ap-button-quiet" type="button" onClick={() => setStep(step - 1)}><ArrowLeft size={15} />Back</button>}<button className="ap-button ap-button-primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : step === 3 ? 'Submit application' : 'Continue'}<ArrowRight size={16} /></button></div></div>
      </form>
    </div>
  </div>
}

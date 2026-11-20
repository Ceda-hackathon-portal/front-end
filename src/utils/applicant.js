import { themes } from '../data/portal.js'

export const applicationFields = [
  { key: 'title', label: 'Idea title', max: 120 },
  { key: 'theme', label: 'Innovation theme' },
  { key: 'team', label: 'Team or organisation', max: 150 },
  { key: 'problem', label: 'The problem', max: 3000 },
  { key: 'solution', label: 'Your solution', max: 5000 },
  { key: 'impact', label: 'The impact', max: 3000 },
]
export const applicationSteps = [
  { title: 'Your idea', fields: ['title', 'theme', 'team'] },
  { title: 'Problem & solution', fields: ['problem', 'solution'] },
  { title: 'Your impact', fields: ['impact'] },
  { title: 'Review & submit', fields: [] },
]
export function validateIdea(values, keys = applicationFields.map(field => field.key)) {
  const errors = {}
  for (const field of applicationFields.filter(field => keys.includes(field.key))) {
    const value = typeof values[field.key] === 'string' ? values[field.key].trim() : ''
    if (!value) errors[field.key] = field.key === 'theme' ? 'Choose an innovation theme.' : `Enter ${field.label.toLowerCase()}.`
    else if (field.max && value.length > field.max) errors[field.key] = `Use ${field.max} characters or fewer.`
    else if (field.key === 'theme' && !themes.some(theme => theme.id === value)) errors.theme = 'Choose one of the available themes.'
  }
  return errors
}
export function draftProgress(draft) {
  const completed = applicationFields.filter(field => typeof draft[field.key] === 'string' && draft[field.key].trim()).length
  return { completed, total: applicationFields.length, percent: Math.round(completed / applicationFields.length * 100) }
}
export function applicationReference(idea) {
  return idea.reference || 'CEDA-DEMO-' + idea.id.replace('CEDA-DEMO-', '').split('-')[0].toUpperCase()
}
export function applicationText(idea) {
  return ['CEDA applicant preview', applicationReference(idea), `Submitted: ${idea.submittedAt}`, '',
    ...applicationFields.map(field => `${field.label}\n${field.key === 'theme' ? themes.find(theme => theme.id === idea.theme)?.name || idea.theme : idea[field.key]}\n`),
    'Saved on this device. Nothing has been sent to CEDA.'].join('\n')
}

export function resumeStep(draft) {
  const step = applicationSteps.findIndex(item => item.fields.length && Object.keys(validateIdea(draft, item.fields)).length)
  return step < 0 ? applicationSteps.length - 1 : step
}

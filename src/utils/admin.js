// Programme manager rules from the proposal. The API must enforce the same rules; these give instant feedback.

export const limits = { name: 120, code: 20, summary: 600, themeName: 80, themeDescription: 300, criterionName: 80, criterionDescription: 300 }

export const isEditable = (programme) => programme.status === 'draft'

export function weightTotal(criteria) {
  return criteria.reduce((sum, criterion) => sum + (Number.isFinite(Number(criterion.weight)) ? Number(criterion.weight) : 0), 0)
}

// Errors keyed by field path, for example "criteria.2.weight". Empty object means ready to submit for approval.
export function validateProgramme(programme) {
  const errors = {}
  const text = (value) => (typeof value === 'string' ? value.trim() : '')
  if (!text(programme.name)) errors.name = 'Enter a programme name.'
  else if (text(programme.name).length > limits.name) errors.name = `Use ${limits.name} characters or fewer.`
  if (!/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(text(programme.code))) errors.code = 'Use 2 to 20 capital letters, numbers or hyphens, like ICH-2026.'
  if (!text(programme.summary)) errors.summary = 'Enter a short summary for applicants.'
  else if (text(programme.summary).length > limits.summary) errors.summary = `Use ${limits.summary} characters or fewer.`
  const opens = Date.parse(programme.opensAt)
  const closes = Date.parse(programme.closesAt)
  if (!Number.isFinite(opens)) errors.opensAt = 'Enter an opening date.'
  if (!Number.isFinite(closes)) errors.closesAt = 'Enter a closing date.'
  else if (Number.isFinite(opens) && closes <= opens) errors.closesAt = 'The closing date must be after the opening date.'

  if (!programme.themes.length) errors.themes = 'Add at least one theme.'
  programme.themes.forEach((theme, index) => {
    if (!text(theme.name)) errors[`themes.${index}.name`] = 'Enter a theme name.'
  })

  if (!programme.criteria.length) errors.criteria = 'Add at least one criterion.'
  programme.criteria.forEach((criterion, index) => {
    if (!text(criterion.name)) errors[`criteria.${index}.name`] = 'Enter a criterion name.'
    const weight = Number(criterion.weight)
    if (!Number.isInteger(weight) || weight < 1 || weight > 100) errors[`criteria.${index}.weight`] = 'Use a whole number from 1 to 100.'
    const minimum = Number(criterion.minimum)
    if (!Number.isInteger(minimum) || minimum < 0 || minimum > 5) errors[`criteria.${index}.minimum`] = 'Use 0 (no minimum) to 5.'
  })
  if (programme.criteria.length && weightTotal(programme.criteria) !== 100) errors.weights = `Weights add up to ${weightTotal(programme.criteria)}. They must add up to 100.`

  programme.stages.forEach((stage, index) => {
    const days = Number(stage.targetWorkingDays)
    if (!Number.isInteger(days) || days < 1 || days > 90) errors[`stages.${index}.targetWorkingDays`] = 'Use 1 to 90 working days.'
  })
  const reviewers = Number(programme.reviewersPerApplication)
  if (!Number.isInteger(reviewers) || reviewers < 1 || reviewers > 5) errors.reviewersPerApplication = 'Use 1 to 5 reviewers.'
  const shortlist = Number(programme.shortlistSize)
  if (!Number.isInteger(shortlist) || shortlist < 1 || shortlist > 1000) errors.shortlistSize = 'Use 1 to 1,000 places.'
  return errors
}

// A programme opens only after a second manager approves it: not the person who created or last edited it.
export function approvalBlocker(programme, userId) {
  if (programme.status !== 'awaiting_approval') return 'Only a programme awaiting approval can be approved.'
  if (programme.createdBy?.id === userId || programme.lastEditedBy?.id === userId) {
    return 'You created or edited this programme, so a second programme manager must approve it.'
  }
  return ''
}

// Reviewers can be assigned only to eligible applications in a programme that is running, never with a declared conflict.
export function assignmentBlocker({ programme, application, evaluatorIds, evaluators }) {
  if (!['open', 'closed'].includes(programme.status)) return 'Reviewers can be assigned only while the programme is running.'
  if (application.eligibility !== 'eligible') return 'Assign reviewers after the application passes the eligibility check.'
  if (evaluatorIds.some(id => application.conflictedReviewerIds?.includes(id))) return 'A reviewer who declared a conflict must be replaced.'
  if (new Set(evaluatorIds).size !== evaluatorIds.length) return 'Choose each evaluator only once.'
  if (evaluatorIds.length > programme.reviewersPerApplication) return `This programme uses ${programme.reviewersPerApplication} reviewer${programme.reviewersPerApplication === 1 ? '' : 's'} per application.`
  const conflicted = evaluatorIds.map((id) => evaluators.find((item) => item.id === id)).find((evaluator) => !evaluator || evaluator.conflicts.includes(application.id))
  if (conflicted) return `${conflicted?.name || 'That evaluator'} declared a conflict with this application.`
  return ''
}

// Least-loaded evaluators without a conflict, keeping anyone already assigned.
export function suggestReviewers({ programme, application, evaluators, assignments }) {
  const conflicted = new Set((assignments[application.id] || []).filter(item => item.progress === 'conflicted').map(item => item.evaluatorId))
  const current = (assignments[application.id] || []).filter(item => item.progress !== 'conflicted').map((item) => item.evaluatorId)
  const load = (id) => Object.values(assignments).flat().filter((item) => item.evaluatorId === id && !['submitted', 'conflicted'].includes(item.progress)).length
  const candidates = evaluators
    .filter((evaluator) => !evaluator.conflicts.includes(application.id) && !conflicted.has(evaluator.id) && !current.includes(evaluator.id))
    .sort((a, b) => load(a.id) - load(b.id) || a.id.localeCompare(b.id))
  return [...current, ...candidates.map((item) => item.id)].slice(0, programme.reviewersPerApplication)
}

export function isOverdue(assignment, now = Date.now()) {
  return !['submitted', 'conflicted'].includes(assignment.progress) && Date.parse(assignment.dueAt) < now
}

// Applicant demo statuses map to the API's stage codes.
const applicantStage = { Submitted: 'eligibility', 'Under review': 'evaluation', Feedback: 'evaluation', Approved: 'decision', Award: 'award' }
export function fromApplicantIdea(idea) {
  return {
    id: idea.id,
    reference: idea.reference || 'CEDA-DEMO-' + idea.id.replace('CEDA-DEMO-', '').split('-')[0].toUpperCase(),
    title: idea.title, theme: idea.theme, team: idea.team, submittedAt: idea.submittedAt,
    currentStage: applicantStage[idea.status] || 'eligibility',
    eligibility: idea.status === 'Submitted' ? 'pending' : 'eligible',
    fromApplicantDemo: true,
  }
}

// Assignment editors change reviewer membership, not progress or deadlines.
// A fresh progress update must not make an otherwise unchanged selection stale.
export function assignmentEditBlocker(expectedEvaluatorIds, currentAssignments) {
  if (!Array.isArray(expectedEvaluatorIds)) return 'Reopen the reviewer editor before saving.'
  const expected = [...new Set(expectedEvaluatorIds)].sort()
  const current = [...new Set(currentAssignments.map(item => item.evaluatorId))].sort()
  return JSON.stringify(expected) === JSON.stringify(current) ? '' : 'These reviewer assignments changed in another tab. Reopen the editor before saving. Your selection has been kept.'
}

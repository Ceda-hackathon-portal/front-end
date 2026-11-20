import test from 'node:test'
import assert from 'node:assert/strict'
import { approvalBlocker, assignmentBlocker, fromApplicantIdea, isOverdue, suggestReviewers, validateProgramme, weightTotal } from './admin.js'
import { currentManager, evaluators, otherManager, seedProgrammes } from '../data/admin.js'

const open = seedProgrammes.find((item) => item.status === 'open')
const eligible = { id: 'app_x', eligibility: 'eligible' }

test('seeded open programme passes validation and weights add to 100', () => {
  assert.deepEqual(validateProgramme(open), {})
  assert.equal(weightTotal(open.criteria), 100)
})

test('weights that do not add to 100 block approval', () => {
  const programme = structuredClone(open)
  programme.criteria[0].weight = 30
  assert.match(validateProgramme(programme).weights, /add up to 105/)
})

test('closing date must follow opening date and minimums stay on the 0 to 5 scale', () => {
  const programme = { ...structuredClone(open), closesAt: open.opensAt }
  programme.criteria[1].minimum = 6
  const errors = validateProgramme(programme)
  assert.ok(errors.closesAt)
  assert.ok(errors['criteria.1.minimum'])
})

test('creator or last editor cannot approve their own programme', () => {
  const programme = { ...structuredClone(open), status: 'awaiting_approval', createdBy: currentManager, lastEditedBy: currentManager }
  assert.match(approvalBlocker(programme, currentManager.id), /second programme manager/)
  assert.equal(approvalBlocker(programme, otherManager.id), '')
  assert.match(approvalBlocker({ ...programme, lastEditedBy: otherManager }, otherManager.id), /second programme manager/)
})

test('assignment rejects conflicts, ineligible applications and too many reviewers', () => {
  const conflicted = evaluators.find((item) => item.conflicts.length)
  const application = { id: conflicted.conflicts[0], eligibility: 'eligible' }
  assert.match(assignmentBlocker({ programme: open, application, evaluatorIds: [conflicted.id], evaluators }), /conflict/)
  assert.match(assignmentBlocker({ programme: open, application: { ...eligible, eligibility: 'pending' }, evaluatorIds: ['e_01'], evaluators }), /eligibility/)
  assert.match(assignmentBlocker({ programme: open, application: eligible, evaluatorIds: ['e_01', 'e_02', 'e_04'], evaluators }), /2 reviewers/)
  assert.equal(assignmentBlocker({ programme: open, application: eligible, evaluatorIds: ['e_01', 'e_02'], evaluators }), '')
  assert.match(assignmentBlocker({ programme: { ...open, status: 'draft' }, application: eligible, evaluatorIds: ['e_01'], evaluators }), /running/)
})

test('suggestions skip conflicts and prefer the least loaded evaluators', () => {
  const application = { id: 'app_ich_004', eligibility: 'eligible' }
  const assignments = { a: [{ evaluatorId: 'e_01', progress: 'in_progress' }], b: [{ evaluatorId: 'e_02', progress: 'in_progress' }] }
  const picked = suggestReviewers({ programme: open, application, evaluators, assignments })
  assert.equal(picked.length, 2)
  assert.ok(!picked.includes('e_03'), 'e_03 declared a conflict with app_ich_004')
  assert.ok(!picked.includes('e_01') && !picked.includes('e_02'))
})

test('overdue only counts unfinished reviews past their due date', () => {
  const now = Date.parse('2026-11-20T12:00:00+02:00')
  assert.equal(isOverdue({ progress: 'in_progress', dueAt: '2026-11-18T09:00:00+02:00' }, now), true)
  assert.equal(isOverdue({ progress: 'submitted', dueAt: '2026-11-18T09:00:00+02:00' }, now), false)
  assert.equal(isOverdue({ progress: 'not_started', dueAt: '2026-11-26T09:00:00+02:00' }, now), false)
})

test('a new applicant submission waits for the eligibility check', () => {
  const row = fromApplicantIdea({ id: 'CEDA-DEMO-1234abcd-ef', title: 'T', theme: 'digital', team: 'X', submittedAt: '2026-11-20T09:00:00+02:00', status: 'Submitted' })
  assert.equal(row.eligibility, 'pending')
  assert.equal(row.currentStage, 'eligibility')
  assert.equal(row.reference, 'CEDA-DEMO-1234ABCD')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { applicationReference, applicationText, draftProgress, resumeStep, validateIdea } from './applicant.js'
import { safeReturnPath } from './portal.js'

const valid = { title: 'Community enterprise directory', theme: 'digital', team: 'Fictional team', problem: 'Finding local services is difficult.', solution: 'A clear searchable directory.', impact: 'More local businesses can be found.' }
test('incomplete steps report actionable errors without requiring later fields', () => {
  assert.deepEqual(Object.keys(validateIdea({}, ['title', 'theme', 'team'])), ['title', 'theme', 'team'])
  assert.deepEqual(validateIdea({ title: valid.title, theme: valid.theme, team: valid.team }, ['title', 'theme', 'team']), {})
  assert.ok(validateIdea({ ...valid, problem: '  ' }).problem)
})
test('submission validation rejects unsupported themes and oversized fields', () => {
  assert.deepEqual(validateIdea(valid), {})
  assert.ok(validateIdea({ ...valid, theme: 'invented' }).theme)
  assert.ok(validateIdea({ ...valid, title: 'x'.repeat(121) }).title)
})
test('draft progress ignores whitespace and extra saved metadata', () => {
  assert.equal(draftProgress({ title: ' ', programme: 'extra' }).completed, 0)
  assert.deepEqual(draftProgress(valid), { completed: 6, total: 6, percent: 100 })
})
test('downloaded copy contains the submitted snapshot and preview boundary', () => {
  const idea = { ...valid, id: 'CEDA-DEMO-001', submittedAt: '2026-11-20T12:00:00Z' }
  assert.equal(applicationReference(idea), 'CEDA-DEMO-001')
  const copy = applicationText(idea)
  assert.ok(copy.includes(valid.title) && copy.includes(valid.solution) && copy.includes('Nothing has been sent to CEDA.'))
})
test('applicant return routes accept the new workspace and reject external or staff targets', () => {
  for (const path of ['/workspace/applications', '/workspace/messages', '/workspace/applications?q=local%20business', '/workspace/applications?q=local+business', '/workspace/new?theme=digital', '/workspace/ideas/CEDA-DEMO-001?submitted=1']) assert.equal(safeReturnPath(path, 'submitter'), path)
  for (const path of ['https://example.test', '//example.test', '/admin', '/workspace/../admin', '/workspace/new?theme=unknown']) assert.equal(safeReturnPath(path, 'submitter'), '/workspace')
  assert.equal(safeReturnPath('/workspace/messages', 'evaluator'), '/review')
  assert.equal(safeReturnPath('/reports', 'evaluator'), '/reports')
})

test('resuming a draft starts at its first unfinished step', () => {
  assert.equal(resumeStep({}), 0)
  assert.equal(resumeStep({ title: valid.title, theme: valid.theme, team: valid.team }), 1)
  assert.equal(resumeStep({ ...valid, impact: '' }), 2)
  assert.equal(resumeStep(valid), 3)
})

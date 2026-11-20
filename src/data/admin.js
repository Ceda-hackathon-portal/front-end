// Programme manager demo data. Shapes follow docs/API_CONTRACT.md so the API can replace this file.
// Names are fictional placeholders.

export const currentManager = { id: 'u_pm_demo', name: 'You (demo programme manager)' }
export const otherManager = { id: 'u_pm_kagiso', name: 'Kagiso Molefe' }

export const programmeStatuses = {
  draft: 'Draft',
  awaiting_approval: 'Awaiting approval',
  open: 'Open',
  closed: 'Closed to applications',
  scoring_closed: 'Scoring closed',
  outcomes_released: 'Outcomes released',
  archived: 'Archived',
}

export const stageCodes = [
  { code: 'submitted', label: 'Submitted' },
  { code: 'eligibility', label: 'Eligibility check' },
  { code: 'shortlist', label: 'Shortlist' },
  { code: 'evaluation', label: 'Evaluation' },
  { code: 'decision', label: 'Decision' },
  { code: 'award', label: 'Award' },
]

export const eligibilityLabels = {
  pending: 'Awaiting check',
  correction_needed: 'Correction requested',
  eligible: 'Eligible',
  not_eligible: 'Not eligible',
}

const defaultStages = (eligibility, shortlist, evaluation, decision) => [
  { code: 'eligibility', targetWorkingDays: eligibility },
  { code: 'shortlist', targetWorkingDays: shortlist },
  { code: 'evaluation', targetWorkingDays: evaluation },
  { code: 'decision', targetWorkingDays: decision },
]

// The five ready-made templates named in the proposal (section 5).
export const templates = [
  {
    id: 'innovation_challenge', name: 'Innovation challenge or hackathon',
    description: 'Themed call for ideas, short first review, then a shortlist and panel decision.',
    themes: [
      { id: 'digital', name: 'Smarter digital services', description: 'Make everyday services simpler, clearer and easier to reach.' },
      { id: 'sustainable', name: 'Sustainable enterprise', description: 'Help businesses use resources thoughtfully and grow for the long term.' },
      { id: 'inclusive', name: 'Opportunity for everyone', description: 'Bring useful tools and opportunities closer to more Batswana.' },
    ],
    criteria: [
      { id: 'c_problem', name: 'Problem and innovation', description: 'Is the problem clear, and what does the idea do differently?', weight: 25, minimum: 3 },
      { id: 'c_market', name: 'Market potential', description: 'Who would use or pay for it, and how many?', weight: 25, minimum: 3 },
      { id: 'c_feasibility', name: 'Feasibility', description: 'Can the team build and sustain it?', weight: 20, minimum: 2 },
      { id: 'c_team', name: 'Team', description: 'Does the team have the skills it needs?', weight: 15, minimum: 0 },
      { id: 'c_impact', name: 'Impact', description: 'Who benefits, and how would the difference be measured?', weight: 15, minimum: 0 },
    ],
    stages: defaultStages(10, 5, 15, 10), reviewersPerApplication: 2, shortlistSize: 20,
  },
  {
    id: 'youth_seed_funding', name: 'Youth seed funding',
    description: 'Funding window for youth-owned businesses, with ownership checks before evaluation.',
    themes: [{ id: 'general', name: 'Any sector', description: 'Open to youth-owned businesses in any sector.' }],
    criteria: [
      { id: 'c_viability', name: 'Business viability', description: 'Is there a realistic route to revenue?', weight: 35, minimum: 3 },
      { id: 'c_use_of_funds', name: 'Use of funds', description: 'Is the budget clear and proportionate?', weight: 25, minimum: 3 },
      { id: 'c_team', name: 'Team', description: 'Can the owners deliver the plan?', weight: 20, minimum: 2 },
      { id: 'c_jobs', name: 'Jobs and impact', description: 'How many jobs, and for whom?', weight: 20, minimum: 0 },
    ],
    stages: defaultStages(10, 5, 20, 10), reviewersPerApplication: 2, shortlistSize: 30,
  },
  {
    id: 'loan_prequalification', name: 'Loan pre-qualification',
    description: 'Checks readiness for a CEDA loan before a full credit application.',
    themes: [{ id: 'general', name: 'Any sector', description: 'Businesses preparing for a CEDA loan.' }],
    criteria: [
      { id: 'c_cashflow', name: 'Cash flow', description: 'Can the business service a loan?', weight: 40, minimum: 3 },
      { id: 'c_records', name: 'Records and compliance', description: 'Are records and registrations in order?', weight: 30, minimum: 3 },
      { id: 'c_plan', name: 'Business plan', description: 'Is the plan realistic?', weight: 30, minimum: 2 },
    ],
    stages: defaultStages(5, 3, 10, 5), reviewersPerApplication: 1, shortlistSize: 50,
  },
  {
    id: 'mentoring_intake', name: 'Mentoring and incubation intake',
    description: 'Selects entrepreneurs for a mentoring or incubation cohort.',
    themes: [{ id: 'general', name: 'Any sector', description: 'Early-stage entrepreneurs.' }],
    criteria: [
      { id: 'c_commitment', name: 'Commitment', description: 'Can the applicant take part fully?', weight: 40, minimum: 3 },
      { id: 'c_stage', name: 'Fit with the cohort', description: 'Is the business at the right stage?', weight: 30, minimum: 2 },
      { id: 'c_potential', name: 'Growth potential', description: 'Could support make a real difference?', weight: 30, minimum: 0 },
    ],
    stages: defaultStages(5, 3, 10, 5), reviewersPerApplication: 1, shortlistSize: 25,
  },
  {
    id: 'equity_pipeline', name: 'Equity investment pipeline',
    description: 'Screens growth businesses for possible CEDA equity investment.',
    themes: [{ id: 'general', name: 'Growth businesses', description: 'Businesses seeking equity investment.' }],
    criteria: [
      { id: 'c_traction', name: 'Traction', description: 'Revenue, customers and growth so far.', weight: 30, minimum: 3 },
      { id: 'c_market', name: 'Market size', description: 'How large is the opportunity?', weight: 25, minimum: 3 },
      { id: 'c_team', name: 'Team', description: 'Can the team scale the business?', weight: 25, minimum: 3 },
      { id: 'c_returns', name: 'Returns and exit', description: 'Is there a credible route to a return?', weight: 20, minimum: 2 },
    ],
    stages: defaultStages(10, 10, 20, 15), reviewersPerApplication: 3, shortlistSize: 10,
  },
]

export const evaluators = [
  { id: 'e_01', name: 'Evaluator E-01', expertise: 'Digital services', conflicts: [] },
  { id: 'e_02', name: 'Evaluator E-02', expertise: 'Agriculture and livestock', conflicts: [] },
  { id: 'e_03', name: 'Evaluator E-03', expertise: 'Finance', conflicts: ['app_ich_004'] },
  { id: 'e_04', name: 'Evaluator E-04', expertise: 'Sustainability', conflicts: [] },
  { id: 'e_05', name: 'Evaluator E-05', expertise: 'Social enterprise', conflicts: ['app_ich_002'] },
  { id: 'e_06', name: 'Evaluator E-06', expertise: 'Manufacturing', conflicts: [] },
]

const at = (date) => date + 'T09:00:00+02:00'

function fromTemplate(templateId) {
  const { themes, criteria, stages, reviewersPerApplication, shortlistSize } = templates.find((item) => item.id === templateId)
  return structuredClone({ themes, criteria, stages, reviewersPerApplication, shortlistSize })
}

export const seedProgrammes = [
  {
    id: 'p_ich_2026', code: 'ICH-2026', name: 'CEDA Innovation Challenge 2026', templateId: 'innovation_challenge', status: 'open',
    summary: 'Ideas that make services simpler, enterprise more sustainable and opportunity more inclusive.',
    opensAt: at('2026-11-01'), closesAt: at('2026-12-15'), ...fromTemplate('innovation_challenge'),
    version: 6, createdBy: otherManager, lastEditedBy: otherManager, approvedBy: currentManager,
    history: [
      { at: at('2026-10-30'), actor: currentManager.name, action: 'Approved and opened. Settings locked' },
      { at: at('2026-10-27'), actor: otherManager.name, action: 'Submitted for approval' },
      { at: at('2026-10-20'), actor: otherManager.name, action: 'Created from the innovation challenge template' },
    ],
  },
  {
    id: 'p_ysf_2027', code: 'YSF-2027', name: 'Youth Seed Fund 2027', templateId: 'youth_seed_funding', status: 'awaiting_approval',
    summary: 'Seed funding for businesses where citizens aged 18 to 35 hold more than half the shares.',
    opensAt: at('2027-01-12'), closesAt: at('2027-02-27'), ...fromTemplate('youth_seed_funding'),
    version: 3, createdBy: otherManager, lastEditedBy: otherManager, approvedBy: null,
    history: [
      { at: at('2026-11-18'), actor: otherManager.name, action: 'Submitted for approval' },
      { at: at('2026-11-10'), actor: otherManager.name, action: 'Created from the youth seed funding template' },
    ],
  },
  {
    id: 'p_mti_2027', code: 'MTI-2027', name: 'Mentoring intake, March 2027', templateId: 'mentoring_intake', status: 'draft',
    summary: '', opensAt: at('2027-03-01'), closesAt: at('2027-03-31'), ...fromTemplate('mentoring_intake'),
    version: 1, createdBy: currentManager, lastEditedBy: currentManager, approvedBy: null,
    history: [{ at: at('2026-11-19'), actor: currentManager.name, action: 'Created from the mentoring and incubation intake template' }],
  },
]

// Applications in the open programme besides the ones created in the applicant demo.
export const seedApplications = [
  { id: 'app_ich_001', reference: 'CEDA-ICH-2026-00101', title: 'Herd traceability by SMS', theme: 'digital', team: 'Example livestock team', submittedAt: at('2026-11-03'), currentStage: 'evaluation', eligibility: 'eligible' },
  { id: 'app_ich_002', reference: 'CEDA-ICH-2026-00107', title: 'Solar cold storage for vegetable sellers', theme: 'sustainable', team: 'Example energy cooperative', submittedAt: at('2026-11-04'), currentStage: 'evaluation', eligibility: 'eligible' },
  { id: 'app_ich_003', reference: 'CEDA-ICH-2026-00112', title: 'Setswana bookkeeping assistant', theme: 'inclusive', team: 'Example fintech team', submittedAt: at('2026-11-05'), currentStage: 'evaluation', eligibility: 'eligible' },
  { id: 'app_ich_004', reference: 'CEDA-ICH-2026-00118', title: 'Shared tractor booking', theme: 'sustainable', team: 'Example farmers group', submittedAt: at('2026-11-08'), currentStage: 'evaluation', eligibility: 'eligible' },
  { id: 'app_ich_005', reference: 'CEDA-ICH-2026-00126', title: 'Tender alerts for small suppliers', theme: 'digital', team: 'Example supplier network', submittedAt: at('2026-11-12'), currentStage: 'eligibility', eligibility: 'correction_needed' },
  { id: 'app_ich_006', reference: 'CEDA-ICH-2026-00131', title: 'Mobile market stall payments', theme: 'inclusive', team: 'Example traders association', submittedAt: at('2026-11-16'), currentStage: 'eligibility', eligibility: 'pending' },
]

// Reviewer assignments by application id. The manager sees progress only, never score values.
export const seedAssignments = {
  app_ich_001: [
    { evaluatorId: 'e_01', progress: 'submitted', assignedAt: at('2026-11-10'), dueAt: at('2026-11-24') },
    { evaluatorId: 'e_02', progress: 'in_progress', assignedAt: at('2026-11-10'), dueAt: at('2026-11-24') },
  ],
  app_ich_002: [
    { evaluatorId: 'e_04', progress: 'in_progress', assignedAt: at('2026-11-06'), dueAt: at('2026-11-18') },
    { evaluatorId: 'e_06', progress: 'submitted', assignedAt: at('2026-11-06'), dueAt: at('2026-11-18') },
  ],
  app_ich_003: [
    { evaluatorId: 'e_05', progress: 'not_started', assignedAt: at('2026-11-12'), dueAt: at('2026-11-26') },
  ],
}

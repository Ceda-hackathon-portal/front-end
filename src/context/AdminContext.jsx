import { createContext, useContext, useState } from 'react'
import { currentManager, evaluators, seedApplications, seedAssignments, seedProgrammes, templates } from '../data/admin'
import { approvalBlocker, assignmentBlocker, isEditable, validateProgramme } from '../utils/admin'

// Programme manager demo state, saved in this browser. Each action matches one endpoint in docs/API_CONTRACT.md,
// so wiring the API replaces the bodies of these functions, not the pages.
const AdminContext = createContext(null)
const STORAGE_KEY = 'ceda.admin.v1'

function fresh() {
  return { programmes: structuredClone(seedProgrammes), assignments: structuredClone(seedAssignments) }
}

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (value && Array.isArray(value.programmes) && value.programmes.every((item) => item.id && Array.isArray(item.criteria) && Array.isArray(item.history))
      && value.assignments && typeof value.assignments === 'object') return value
  } catch {
    // Unreadable storage starts the demo again.
  }
  return fresh()
}

const entry = (action) => ({ at: new Date().toISOString(), actor: currentManager.name, action })

export function AdminProvider({ children }) {
  const [data, setData] = useState(read)
  const [storageWarning, setStorageWarning] = useState('')

  function persist(next) {
    setData(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStorageWarning('')
    } catch {
      setStorageWarning('Browser storage is unavailable. Changes will last only until this page is refreshed.')
    }
  }

  function changeProgramme(id, change) {
    const programme = data.programmes.find((item) => item.id === id)
    if (!programme) throw new Error('Programme not found.')
    const next = change(programme)
    persist({ ...data, programmes: data.programmes.map((item) => (item.id === id ? { ...next, version: programme.version + 1 } : item)) })
    return next
  }

  // POST /admin/programmes
  function createProgramme({ templateId, name }) {
    const template = templates.find((item) => item.id === templateId)
    if (!template) throw new Error('Choose a template.')
    if (!name?.trim()) throw new Error('Enter a programme name.')
    const id = 'p_' + crypto.randomUUID().slice(0, 8)
    const year = new Date().getFullYear() + 1
    const programme = {
      id, code: template.id.split('_').map((word) => word[0]).join('').toUpperCase() + '-' + year,
      name: name.trim(), templateId, status: 'draft', summary: '', opensAt: '', closesAt: '',
      ...structuredClone({ themes: template.themes, criteria: template.criteria, stages: template.stages }),
      reviewersPerApplication: template.reviewersPerApplication, shortlistSize: template.shortlistSize,
      version: 1, createdBy: currentManager, lastEditedBy: currentManager, approvedBy: null,
      history: [entry(`Created from the ${template.name.toLowerCase()} template`)],
    }
    persist({ ...data, programmes: [programme, ...data.programmes] })
    return id
  }

  // PATCH /admin/programmes/:id (draft only)
  function updateProgramme(id, fields) {
    return changeProgramme(id, (programme) => {
      if (!isEditable(programme)) throw new Error('Settings are locked. Return the programme to draft to change them.')
      const edited = programme.history[0]?.action === 'Edited settings' && programme.history[0]?.actor === currentManager.name
      return { ...programme, ...fields, lastEditedBy: currentManager, history: edited ? programme.history : [entry('Edited settings'), ...programme.history] }
    })
  }

  // POST /admin/programmes/:id/submit-for-approval
  function submitForApproval(id) {
    return changeProgramme(id, (programme) => {
      if (programme.status !== 'draft') throw new Error('Only a draft can be submitted for approval.')
      if (Object.keys(validateProgramme(programme)).length) throw new Error('Fix the highlighted settings first.')
      return { ...programme, status: 'awaiting_approval', history: [entry('Submitted for approval'), ...programme.history] }
    })
  }

  // POST /admin/programmes/:id/approve
  function approveProgramme(id) {
    return changeProgramme(id, (programme) => {
      const blocker = approvalBlocker(programme, currentManager.id)
      if (blocker) throw new Error(blocker)
      return { ...programme, status: 'open', approvedBy: currentManager, history: [entry('Approved and opened. Settings locked'), ...programme.history] }
    })
  }

  // POST /admin/programmes/:id/return
  function returnToDraft(id, reason) {
    if (!reason?.trim()) throw new Error('Give a reason so the other manager knows what to change.')
    return changeProgramme(id, (programme) => {
      if (programme.status !== 'awaiting_approval') throw new Error('Only a programme awaiting approval can be returned.')
      return { ...programme, status: 'draft', history: [entry('Returned to draft: ' + reason.trim()), ...programme.history] }
    })
  }

  // POST /admin/programmes/:id/close
  function closeApplications(id) {
    return changeProgramme(id, (programme) => {
      if (programme.status !== 'open') throw new Error('Only an open programme can be closed.')
      return { ...programme, status: 'closed', history: [entry('Closed to new applications'), ...programme.history] }
    })
  }

  // PUT /admin/programmes/:id/applications/:applicationId/assignments
  function setAssignments(programmeId, application, evaluatorIds) {
    const programme = data.programmes.find((item) => item.id === programmeId)
    const blocker = assignmentBlocker({ programme, application, evaluatorIds, evaluators })
    if (blocker) throw new Error(blocker)
    const previous = data.assignments[application.id] || []
    const due = new Date(Date.now() + 14 * 86400000).toISOString()
    const nextAssignments = evaluatorIds.map((evaluatorId) => previous.find((item) => item.evaluatorId === evaluatorId)
      || { evaluatorId, progress: 'not_started', assignedAt: new Date().toISOString(), dueAt: due })
    const names = evaluatorIds.map((id) => evaluators.find((item) => item.id === id).name).join(', ') || 'nobody'
    persist({
      programmes: data.programmes.map((item) => (item.id === programmeId
        ? { ...item, history: [entry(`Assigned ${names} to ${application.reference}`), ...item.history] } : item)),
      assignments: { ...data.assignments, [application.id]: nextAssignments },
    })
  }

  function resetAdminDemo() {
    persist(fresh())
  }

  return (
    <AdminContext.Provider value={{
      ...data, storageWarning, currentManager, createProgramme, updateProgramme, submitForApproval,
      approveProgramme, returnToDraft, closeApplications, setAssignments, resetAdminDemo,
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => useContext(AdminContext)

import { createContext, useContext, useState } from 'react'
import { demoIdeas, stages, themes } from '../data/portal'
const PortalContext = createContext(null)
const STORAGE_KEY = 'ceda.prototype.v1'
const emptyDraft = { title: '', theme: '', problem: '', solution: '', impact: '', team: '' }

function readPrototype() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (value && Array.isArray(value.ideas) && value.ideas.every((idea) =>
      ['id', 'title', 'problem', 'solution', 'impact', 'team', 'theme'].every((key) => typeof idea[key] === 'string') &&
      stages.includes(idea.status) && themes.some((theme) => theme.id === idea.theme) && Number.isFinite(Date.parse(idea.submittedAt)) &&
      Array.isArray(idea.feedback) &&
      idea.feedback.every((entry) => typeof entry.id === 'string' && typeof entry.author === 'string' && typeof entry.message === 'string' && Number.isFinite(Date.parse(entry.createdAt))),
    ) && value.draft && Object.keys(emptyDraft).every((key) => typeof value.draft[key] === 'string')) return value
  } catch {
    // Invalid or unavailable browser storage starts a fresh, explicitly labelled demo.
  }
  return { ideas: structuredClone(demoIdeas), draft: { ...emptyDraft } }
}
export function PortalProvider({ children }) {
  const [data, setData] = useState(readPrototype)
  const [storageWarning, setStorageWarning] = useState('')
  function persist(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setStorageWarning('')
    } catch {
      setStorageWarning('Browser storage is unavailable. Changes will last only until this page is refreshed.')
    }
    setData(next)
  }
  function saveDraft(draft) {
    persist({ ...data, draft })
  }
  function resetDemo() {
    persist({ ideas: structuredClone(demoIdeas), draft: { ...emptyDraft } })
  }
  function submitDemo(draft) {
    const fields = ['title', 'theme', 'problem', 'solution', 'impact', 'team']
    if (fields.some((key) => !draft[key]?.trim()) || !themes.some((theme) => theme.id === draft.theme)) {
      throw new Error('Complete all required idea fields before adding a demo submission.')
    }
    const idea = {
      ...Object.fromEntries(fields.map((key) => [key, draft[key].trim()])),
      id: 'CEDA-DEMO-' + crypto.randomUUID(), status: 'Submitted',
      submittedAt: new Date().toISOString(), feedback: [],
    }
    persist({ ideas: [idea, ...data.ideas], draft: { ...emptyDraft } })
    return idea.id
  }
  return <PortalContext.Provider value={{ ...data, storageWarning, saveDraft, submitDemo, resetDemo }}>{children}</PortalContext.Provider>
}
export const usePortal = () => useContext(PortalContext)

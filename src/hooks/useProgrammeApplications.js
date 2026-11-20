import { usePortal } from '../context/PortalContext'
import { seedApplications } from '../data/admin'
import { fromApplicantIdea } from '../utils/admin'

// The open demo programme receives the sample applications plus everything submitted in the applicant demo,
// so one idea can be followed from the applicant portal into the programme manager's view.
export const DEMO_INTAKE_PROGRAMME = 'p_ich_2026'

export function useApplicationsByProgramme() {
  const { ideas } = usePortal()
  const intake = [...ideas.map(fromApplicantIdea), ...seedApplications]
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
  return (programmeId) => (programmeId === DEMO_INTAKE_PROGRAMME ? intake : [])
}

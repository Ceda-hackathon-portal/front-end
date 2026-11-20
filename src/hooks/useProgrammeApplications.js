import { useStaffWorkflow } from '../context/StaffWorkflowContext'

export const DEMO_INTAKE_PROGRAMME = 'p_ich_2026'

// Read the same eligibility result used by screening, so newly screened applicant
// submissions become available for reviewer assignment without changing their evidence.
export function useApplicationsByProgramme() {
  const { applications } = useStaffWorkflow()
  return programmeId => applications.filter(application => application.programmeId === programmeId)
}

export function useProgrammeAssignments() {
  return useStaffWorkflow().assignments
}

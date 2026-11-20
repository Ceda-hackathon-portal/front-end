import { Route, Routes, useLocation } from 'react-router-dom'
import PageWrapper from './components/shared/PageWrapper'
import GuestAuthModal from './components/shared/GuestAuthModal'
import ProtectedRoute from './components/shared/ProtectedRoute'
import ScrollToTop from './components/shared/ScrollToTop'
import ApplicantLayout from './components/applicant/ApplicantLayout'
import HomePage from './pages/HomePage'
import ChallengesPage from './pages/ChallengesPage'
import GuidelinesPage from './pages/GuidelinesPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import SubmitIdeaPage from './pages/SubmitIdeaPage'
import IdeaDetailPage from './pages/IdeaDetailPage'
import { ApplicantApplicationsPage, ApplicantHelpPage, ApplicantMessagesPage, ApplicantNotFoundPage, ApplicantProgrammesPage } from './pages/ApplicantPages'
import ReviewPage from './pages/ReviewPage'
import ReportsPage from './pages/ReportsPage'
import StaffLayout from './components/staff/StaffLayout'
import AdminHomePage from './pages/admin/AdminHomePage'
import ProgrammeSettingsPage from './pages/admin/ProgrammeSettingsPage'
import ProgrammeApplicationsPage from './pages/admin/ProgrammeApplicationsPage'
import SystemPage from './pages/SystemPage'
import PageLoader from './components/shared/PageLoader'
import RouteProgress from './components/shared/RouteProgress'
import ServicesPage from './pages/ServicesPage'
import SearchPage from './pages/SearchPage'
import InformationPage from './pages/InformationPage'
import './styles/applicant.css'

export default function App() {
  const { pathname } = useLocation()
  const isApplicantPath = /^\/(portal|workspace|admin)(\/|$)/.test(pathname)
  return <><ScrollToTop /><PageLoader skip={isApplicantPath} /><RouteProgress /><GuestAuthModal /><PageWrapper><Routes>
    <Route element={<ApplicantLayout />}>
      <Route path="/portal" element={<DashboardPage />} />
      <Route path="/portal/programmes" element={<ApplicantProgrammesPage />} />
      <Route path="/portal/help" element={<ApplicantHelpPage />} />
      <Route path="/portal/*" element={<ApplicantNotFoundPage />} />
      <Route element={<ProtectedRoute roles={['submitter']} headingAs="h2" />}>
        <Route path="/workspace" element={<DashboardPage />} />
        <Route path="/workspace/applications" element={<ApplicantApplicationsPage />} />
        <Route path="/workspace/messages" element={<ApplicantMessagesPage />} />
        <Route path="/workspace/new" element={<SubmitIdeaPage />} />
        <Route path="/workspace/ideas/:id" element={<IdeaDetailPage />} />
        <Route path="/workspace/*" element={<ApplicantNotFoundPage />} />
      </Route>
    </Route>
    <Route path="/" element={<HomePage />} />
    <Route path="/challenges" element={<ChallengesPage />} />
    <Route path="/services" element={<ServicesPage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/how-it-works" element={<GuidelinesPage />} />
    <Route path="/login" element={<AuthPage key="login" mode="login" />} />
    <Route path="/register" element={<AuthPage key="register" mode="register" />} />
    <Route path="/forgot-password" element={<AuthPage key="reset" mode="reset" />} />
    <Route path="/about" element={<InformationPage kind="about" />} />
    <Route path="/help" element={<InformationPage kind="help" />} />
    <Route path="/privacy" element={<InformationPage kind="privacy" />} />
    <Route element={<ProtectedRoute roles={['evaluator']} />}><Route path="/review" element={<ReviewPage />} /></Route>
    <Route element={<ProtectedRoute roles={['adjudicator']} />}><Route path="/adjudication" element={<ReviewPage adjudication />} /></Route>
    <Route element={<ProtectedRoute roles={['administrator']} />}>
      <Route element={<StaffLayout />}>
        <Route path="/admin" element={<AdminHomePage />} />
        <Route path="/admin/programmes/:id" element={<ProgrammeSettingsPage />} />
        <Route path="/admin/programmes/:id/applications" element={<ProgrammeApplicationsPage />} />
        <Route path="/admin/*" element={<InformationPage kind="not-found" />} />
      </Route>
    </Route>
    <Route element={<ProtectedRoute roles={['management']} />}><Route path="/management" element={<ReportsPage />} /></Route>
    <Route element={<ProtectedRoute roles={['system-administrator']} />}><Route path="/system" element={<SystemPage />} /></Route>
    <Route element={<ProtectedRoute roles={['evaluator', 'adjudicator', 'administrator', 'management']} />}><Route path="/reports" element={<ReportsPage />} /></Route>
    <Route path="*" element={<InformationPage kind="not-found" />} />
  </Routes></PageWrapper></>
}

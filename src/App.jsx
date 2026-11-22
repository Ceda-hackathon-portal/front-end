import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import PageWrapper from "./components/shared/PageWrapper";
import GuestAuthModal from "./components/shared/GuestAuthModal";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import ScrollToTop from "./components/shared/ScrollToTop";
import ApplicantLayout from "./components/applicant/ApplicantLayout";
import HomePage from "./pages/HomePage";
import ChallengesPage from "./pages/ChallengesPage";
import GuidelinesPage from "./pages/GuidelinesPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import SubmitIdeaPage from "./pages/SubmitIdeaPage";
import ApplicationSubmittedPage from "./pages/ApplicationSubmittedPage";
import ApplicantProfilePage from "./pages/ApplicantProfilePage";
import ApplicantEligibilityPage from "./pages/ApplicantEligibilityPage";
import IdeaDetailPage from "./pages/IdeaDetailPage";
import {
  ApplicantApplicationsPage,
  ApplicantHelpPage,
  ApplicantMessagesPage,
  ApplicantNotFoundPage,
  ApplicantProgrammesPage,
} from "./pages/ApplicantPages";
import StaffLayout from "./components/staff/StaffLayout";
import StaffOverviewPage from "./pages/staff/StaffOverviewPage";
import StaffApplicationsPage from "./pages/staff/StaffApplicationsPage";
import StaffApplicationPage from "./pages/staff/StaffApplicationPage";
import StaffManagementPage from "./pages/staff/StaffManagementPage";
import StaffSystemPage from "./pages/staff/StaffSystemPage";
import AdminHomePage from "./pages/admin/AdminHomePage";
import ProgrammeSettingsPage from "./pages/admin/ProgrammeSettingsPage";
import ProgrammeApplicationsPage from "./pages/admin/ProgrammeApplicationsPage";
import PageLoader from "./components/shared/PageLoader";
import RouteProgress from "./components/shared/RouteProgress";
import ServicesPage from "./pages/ServicesPage";
import SearchPage from "./pages/SearchPage";
import InformationPage from "./pages/InformationPage";
import "./styles/applicant.css";
import "./styles/applicant-workflow.css";

export default function App() {
  const { pathname } = useLocation();
  // The splash is for the public site only, not the applicant portal or any staff page.
  const isApplicantPath =
    /^\/(portal|workspace|staff|admin|review|adjudication|management|reports|system)(\/|$)/.test(
      pathname,
    );
  return (
    <>
      <ScrollToTop />
      <PageLoader skip={isApplicantPath} />
      <RouteProgress />
      <GuestAuthModal />
      <PageWrapper>
        <Routes>
          <Route element={<ApplicantLayout />}>
            <Route path="/portal" element={<DashboardPage />} />
            <Route
              path="/portal/programmes"
              element={<ApplicantProgrammesPage />}
            />
            <Route
              path="/portal/eligibility"
              element={<ApplicantEligibilityPage />}
            />
            <Route path="/portal/help" element={<ApplicantHelpPage />} />
            <Route path="/portal/*" element={<ApplicantNotFoundPage />} />
            <Route
              element={<ProtectedRoute roles={["submitter"]} headingAs="h2" />}
            >
              <Route path="/workspace" element={<DashboardPage />} />
              <Route
                path="/workspace/applications"
                element={<ApplicantApplicationsPage />}
              />
              <Route
                path="/workspace/messages"
                element={<ApplicantMessagesPage />}
              />
              <Route
                path="/workspace/profile"
                element={<ApplicantProfilePage />}
              />
              <Route path="/workspace/new" element={<SubmitIdeaPage />} />
              <Route path="/workspace/ideas/:id/submitted" element={<ApplicationSubmittedPage />} />
              <Route path="/workspace/ideas/:id" element={<IdeaDetailPage />} />
              <Route path="/workspace/*" element={<ApplicantNotFoundPage />} />
            </Route>
          </Route>
          <Route path="/" element={<HomePage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/how-it-works" element={<GuidelinesPage />} />
          <Route
            path="/login"
            element={<AuthPage key="login" mode="login" />}
          />
          <Route
            path="/register"
            element={<AuthPage key="register" mode="register" />}
          />
          <Route
            path="/forgot-password"
            element={<AuthPage key="reset" mode="reset" />}
          />
          <Route
            path="/staff"
            element={<AuthPage key="staff" mode="staff" />}
          />
          <Route path="/about" element={<InformationPage kind="about" />} />
          <Route path="/help" element={<InformationPage kind="help" />} />
          <Route path="/privacy" element={<InformationPage kind="privacy" />} />
          <Route
            element={
              <ProtectedRoute
                roles={[
                  "eligibility-officer",
                  "evaluator",
                  "adjudicator",
                  "administrator",
                  "management",
                  "system-administrator",
                ]}
              />
            }
          >
            <Route element={<StaffLayout />}>
              <Route path="/admin" element={<StaffOverviewPage />} />
              <Route
                element={
                  <ProtectedRoute
                    roles={[
                      "eligibility-officer",
                      "evaluator",
                      "adjudicator",
                      "administrator",
                    ]}
                    headingAs="h2"
                  />
                }
              >
                <Route
                  path="/admin/applications"
                  element={<StaffApplicationsPage />}
                />
                <Route
                  path="/admin/applications/:id"
                  element={<StaffApplicationPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    roles={["eligibility-officer", "administrator"]}
                    headingAs="h2"
                  />
                }
              >
                <Route
                  path="/admin/screening"
                  element={<StaffApplicationsPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    roles={["evaluator", "administrator"]}
                    headingAs="h2"
                  />
                }
              >
                <Route
                  path="/admin/reviews"
                  element={<StaffApplicationsPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    roles={["adjudicator", "administrator"]}
                    headingAs="h2"
                  />
                }
              >
                <Route
                  path="/admin/decisions"
                  element={<StaffApplicationsPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute roles={["administrator"]} headingAs="h2" />
                }
              >
                <Route path="/admin/programmes" element={<AdminHomePage />} />
                <Route
                  path="/admin/programmes/:id"
                  element={<ProgrammeSettingsPage />}
                />
                <Route
                  path="/admin/programmes/:id/applications"
                  element={<ProgrammeApplicationsPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    roles={["administrator", "management"]}
                    headingAs="h2"
                  />
                }
              >
                <Route
                  path="/admin/insights"
                  element={<StaffManagementPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute
                    roles={["system-administrator"]}
                    headingAs="h2"
                  />
                }
              >
                <Route path="/admin/system" element={<StaffSystemPage />} />
              </Route>
              <Route
                path="/admin/*"
                element={
                  <section className="st-panel">
                    <h2>Page not found</h2>
                    <p>Choose a section from the staff navigation.</p>
                  </section>
                }
              />
            </Route>
          </Route>
          <Route
            path="/review"
            element={<Navigate to="/admin/reviews" replace />}
          />
          <Route
            path="/adjudication"
            element={<Navigate to="/admin/decisions" replace />}
          />
          <Route
            path="/management"
            element={<Navigate to="/admin/insights" replace />}
          />
          <Route
            path="/system"
            element={<Navigate to="/admin/system" replace />}
          />
          <Route path="/reports" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<InformationPage kind="not-found" />} />
        </Routes>
      </PageWrapper>
    </>
  );
}

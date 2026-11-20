import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FileSearch,
  ClipboardCheck,
  Scale,
  Layers,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useStaffWorkflow } from "../../context/StaffWorkflowContext";
import { ApplicationStatus, applicationStage } from "./StaffApplicationsPage";
import { displayDate } from "../../utils/portal";
import StaffManagementPage from "./StaffManagementPage";
import StaffSystemPage from "./StaffSystemPage";

const workspaces = {
  "eligibility-officer": {
    title: "Screening overview",
    to: "/admin/screening",
    action: "Open screening queue",
    detail: "Check the evidence and resolve flagged applications.",
  },
  evaluator: {
    title: "Review overview",
    to: "/admin/reviews",
    action: "Open review queue",
    detail: "Review assigned applications against the programme criteria.",
  },
  adjudicator: {
    title: "Decision overview",
    to: "/admin/decisions",
    action: "Open decision queue",
    detail: "Compare completed reviews and record a reasoned outcome.",
  },
  administrator: {
    title: "Programme overview",
    to: "/admin/programmes",
    action: "Manage programmes",
    detail: "Manage programmes, assignments and the progress of applications.",
  },
  management: {
    title: "Portfolio overview",
    to: "/admin/insights",
    action: "View insights",
    detail: "Read participation and progress from the recorded workflow.",
  },
  "system-administrator": {
    title: "System overview",
    to: "/admin/system",
    action: "Open system status",
    detail: "Check local storage and the boundaries of the connected services.",
  },
};

export default function StaffOverviewPage() {
  const { staffUser } = useAuth();
  const { applications, getRecord, programmes, closeScoring } =
    useStaffWorkflow();
  const [programmeId, setProgrammeId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const feedbackRef = useRef(null);
  useEffect(() => {
    if (error || success) {
      feedbackRef.current?.focus({ preventScroll: true });
      feedbackRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [error, success]);
  const workspace = workspaces[staffUser?.role] || workspaces.administrator;
  if (staffUser?.role === "management") return <StaffManagementPage />;
  if (staffUser?.role === "system-administrator") return <StaffSystemPage />;
  const stages = applications.map((application) =>
    applicationStage(application, getRecord(application.id)),
  );
  const lanes = [
    {
      name: "Screening",
      count: stages.filter((stage) =>
        ["Screening pending", "Correction requested"].includes(stage),
      ).length,
      to: "/admin/screening",
      icon: FileSearch,
    },
    {
      name: "Review",
      count: stages.filter((stage) =>
        ["Ready for review", "In review"].includes(stage),
      ).length,
      to: "/admin/reviews",
      icon: ClipboardCheck,
    },
    {
      name: "Decision",
      count: stages.filter((stage) =>
        ["Decision pending", "Decision drafted"].includes(stage),
      ).length,
      to: "/admin/decisions",
      icon: Scale,
    },
    {
      name: "Released",
      count: stages.filter((stage) => stage === "Outcome released").length,
      to: "/admin/applications",
      icon: Layers,
    },
  ];
  const visible = applications.slice(0, 6);
  const laneAccess = {
    Screening: ["eligibility-officer", "administrator"].includes(
      staffUser?.role,
    ),
    Review: ["evaluator", "administrator"].includes(staffUser?.role),
    Decision: ["adjudicator", "administrator"].includes(staffUser?.role),
    Released: true,
  };
  return (
    <div className="st-page sw-page">
      <header className="st-page-header">
        <div>
          <span className="st-eyebrow">YOUR WORKSPACE</span>
          <h1>{workspace.title}</h1>
          <p>{workspace.detail}</p>
        </div>
        <Link className="st-button st-button-primary" to={workspace.to}>
          {workspace.action}
          <ArrowRight size={16} />
        </Link>
      </header>
      <section className="sw-pipeline" aria-label="Application pipeline">
        {lanes.map(({ name, count, to, icon: Icon }, index) => {
          const Lane = laneAccess[name] ? Link : "div";
          return (
            <Lane key={name} {...(laneAccess[name] ? { to } : {})}>
              <span className="sw-pipeline-label">
                <Icon size={18} strokeWidth={1.6} />
                {name}
              </span>
              <strong>{count}</strong>
              <small>
                0{index + 1}
                {laneAccess[name] && <ArrowRight size={16} />}
              </small>
            </Lane>
          );
        })}
      </section>
      <div className="sw-overview-grid">
        <section className="st-panel sw-queue-panel">
          <div className="st-panel-heading">
            <h2>Recent applications</h2>
            <Link className="st-text-link" to="/admin/applications">
              View all
              <ArrowRight size={15} />
            </Link>
          </div>
          {visible.length ? (
            <ul className="sw-recent-list">
              {visible.map((application) => (
                <li key={application.id}>
                  <Link to={"/admin/applications/" + application.id}>
                    <span>
                      <small>{application.reference}</small>
                      <strong>{application.title}</strong>
                      <small>
                        {application.submittedAt
                          ? displayDate(application.submittedAt)
                          : "Date not supplied"}
                      </small>
                    </span>
                    <ApplicationStatus
                      label={applicationStage(
                        application,
                        getRecord(application.id),
                      )}
                    />
                    <ArrowRight size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="st-empty">
              <h2>No application records</h2>
              <p className="st-muted">
                Records available to your role will appear here.
              </p>
            </div>
          )}
        </section>
        <aside className="sw-overview-aside">
          <section className="sw-editorial-note">
            <span className="st-eyebrow">EVIDENCE FIRST</span>
            <h2>Automatic screening</h2>
            <p>
              Automated checks highlight missing or inconsistent information.
              They do not verify identity or make a final eligibility decision.
            </p>
            <Link to="/admin/applications" className="st-text-link">
              Open application register
              <ArrowRight size={16} />
            </Link>
          </section>
          <section className="st-panel">
            <h2>Working locally</h2>
            <p className="st-muted sw-spaced">
              Actions are saved in this browser. Real staff sign-in, delivery
              and secure shared storage need the connected services.
            </p>
          </section>
        </aside>
      </div>
      {staffUser?.role === "administrator" && (
        <section className="st-panel sw-scoring-panel">
          <div>
            <span className="st-eyebrow">SCORING CONTROL</span>
            <h2>Close scoring for a programme</h2>
            <p className="st-muted sw-spaced">
              Close applications in programme settings first. All eligible
              applications need their required reviews before decisions can
              begin.
            </p>
          </div>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy) return;
              setError("");
              setSuccess("");
              setBusy(true);
              try {
                await closeScoring(programmeId);
                setSuccess(
                  "Scoring closed. Authorised decision makers can now compare submitted reviews.",
                );
              } catch (failure) {
                setError(failure.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="st-field">
              Programme
              <select
                aria-label="Programme"
                value={programmeId}
                onChange={(event) => setProgrammeId(event.target.value)}
              >
                <option value="">Choose a programme</option>
                {(programmes || []).map((programme) => (
                  <option key={programme.id} value={programme.id}>
                    {programme.name} · {programme.status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <div className="st-actions">
              <Link
                className="st-text-link"
                to={
                  programmeId
                    ? "/admin/programmes/" + programmeId
                    : "/admin/programmes"
                }
              >
                Programme settings
                <ArrowRight size={14} />
              </Link>
              <button
                className="st-button st-button-secondary"
                disabled={busy || !programmeId}
              >
                Close scoring
              </button>
            </div>
          </form>
          {error && (
            <p
              className="st-alert"
              role="alert"
              ref={feedbackRef}
              tabIndex={-1}
            >
              {error}
            </p>
          )}
          {success && (
            <p
              className="sw-success"
              role="status"
              ref={feedbackRef}
              tabIndex={-1}
            >
              {success}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

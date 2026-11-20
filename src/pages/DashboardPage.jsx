import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  FilePenLine,
  MessageSquareText,
  UserRound,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { usePortal } from "../context/PortalContext";
import ApplicationList from "../components/applicant/ApplicationList";
import {
  firstUnfinishedSection,
  sectionErrors,
  sections,
  workflowProgress,
} from "../utils/applicantWorkflow";
import { displayDate, roleHome } from "../utils/portal";

export default function DashboardPage() {
  const { user, requireAuth } = useAuth();
  const { ideas, drafts, draft, profile, documents, messages } = usePortal();
  const isApplicant = user?.role === "submitter";
  const hasDraft = isApplicant && drafts.length > 0;
  const progress = workflowProgress(draft, profile, documents);
  const nextStep = hasDraft
    ? firstUnfinishedSection(draft, profile, documents)
    : 0;
  const requests = isApplicant
    ? ideas.filter((idea) => idea.revisionRequest?.status === "open")
    : [];
  const updates = isApplicant
    ? [...messages].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      )
    : [];
  const expiring = isApplicant
    ? documents
        .filter(
          (document) =>
            document.expiresAt &&
            (Date.parse(document.expiresAt) - Date.now()) / 86400000 < 30,
        )
        .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
    : [];
  const stats = [
    ["Applications", ideas.length],
    [
      "In review",
      ideas.filter((idea) => idea.status === "Under review").length,
    ],
    ["Actions", requests.length + expiring.length],
    ["Drafts", drafts.length],
  ];
  return (
    <div className="ap-home ap-home-board">
      <aside
        className="ap-journey-rail ap-panel"
        aria-label="Application steps"
      >
        <h2>Application steps</h2>
        <ol>
          {sections.map((item, index) => {
            const done =
              hasDraft &&
              index < 5 &&
              !Object.keys(sectionErrors(item.id, draft, profile, documents))
                .length;
            return (
              <li
                key={item.id}
                className={
                  (done ? "is-complete " : "") +
                  (index === nextStep ? "is-next" : "")
                }
              >
                <span className="ap-journey-marker">
                  {done ? (
                    <Check size={12} />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {done
                      ? "Complete"
                      : index === nextStep
                        ? "Next step"
                        : "Upcoming"}
                  </small>
                </div>
              </li>
            );
          })}
        </ol>
        <Link className="ap-text-link" to="/portal/help">
          View the guide
          <ArrowUpRight size={14} />
        </Link>
      </aside>
      <div className="ap-workspace-grid">
        {Boolean(requests.length || expiring.length) && (
          <section className="ap-action-needed ap-dashboard-action">
            <div>
              <span className="ap-eyebrow">ACTION NEEDED</span>
              <h2>
                {requests.length
                  ? requests[0].title
                  : "Update an expiring document"}
              </h2>
              <p>
                {requests.length
                  ? requests[0].revisionRequest.message
                  : expiring[0].name + " · Expiry " + expiring[0].expiresAt}
              </p>
              {requests[0]?.revisionRequest.dueAt && (
                <small>
                  Due {displayDate(requests[0].revisionRequest.dueAt)}
                </small>
              )}
            </div>
            <Link
              className="ap-button ap-button-primary"
              to={
                requests.length
                  ? "/workspace/ideas/" + requests[0].id
                  : "/workspace/profile"
              }
            >
              {requests.length ? "View request" : "My documents"}
              <ArrowRight size={16} />
            </Link>
          </section>
        )}
        <section
          className="ap-workspace-stats ap-panel"
          aria-label="Workspace overview"
        >
          <dl>
            {stats.map(([label, count]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{isApplicant ? String(count).padStart(2, "0") : "—"}</dd>
              </div>
            ))}
          </dl>
          <Link className="ap-text-link" to="/workspace/applications">
            All applications
            <ArrowUpRight size={15} />
          </Link>
        </section>
        <section className="ap-current-application ap-panel">
          <div className="ap-tile-heading">
            <FilePenLine size={18} strokeWidth={1.5} />
            <span>{hasDraft ? "Application draft" : "New application"}</span>
            <span className="ap-tile-index">
              {String(hasDraft ? drafts.length : 1).padStart(2, "0")}
            </span>
          </div>
          <h2>
            {hasDraft
              ? draft.title || "Untitled application"
              : "Start an application"}
          </h2>
          <div className="ap-draft-metadata">
            <span>
              {hasDraft
                ? sections[nextStep].title
                : "5 sections and a final review"}
            </span>
            <span>{hasDraft ? progress.percent + "% complete" : ""}</span>
          </div>
          <div className="ap-progress-track">
            <span style={{ width: (hasDraft ? progress.percent : 0) + "%" }} />
          </div>
          <Link
            className="ap-button ap-button-primary"
            to={
              hasDraft
                ? "/workspace/new?draft=" + draft.id
                : "/portal/eligibility"
            }
          >
            {hasDraft ? "Continue application" : "Check eligibility"}
            <ArrowRight size={16} />
          </Link>
        </section>
        <Link className="ap-programme-photo" to="/portal/programmes">
          {!profile.preferences?.dataLight && (
            <img
              src="/images/applicant-programmes.png"
              alt="A cattle enterprise"
              width="1916"
              height="821"
              loading="lazy"
            />
          )}
          <span>
            <span>Explore</span>
            <strong>Programmes</strong>
          </span>
          <ArrowUpRight size={23} />
        </Link>
        <section className="ap-board-applications ap-panel">
          <div className="ap-section-title">
            <h2>My applications</h2>
            <Link
              className="ap-text-link"
              to="/workspace/applications"
              aria-label="View all applications"
            >
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {isApplicant ? (
            <>
              <ApplicationList ideas={ideas.slice(0, 3)} compact />
              {!ideas.length && (
                <div className="ap-empty">
                  <p>No submitted applications yet.</p>
                </div>
              )}
              <Link
                className="ap-panel-bottom-link"
                to="/workspace/applications"
              >
                View applications and drafts
                <ArrowRight size={15} />
              </Link>
            </>
          ) : (
            <div className="ap-empty">
              <p>
                {user
                  ? "Continue in your workspace."
                  : "Sign in to see your applications."}
              </p>
              {user ? (
                <Link
                  className="ap-button ap-button-secondary"
                  to={roleHome(user.role)}
                >
                  My workspace
                  <ArrowRight size={15} />
                </Link>
              ) : (
                <button
                  type="button"
                  className="ap-button ap-button-secondary"
                  onClick={() => requireAuth("/workspace")}
                >
                  Sign in
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
          )}
        </section>
        <div className="ap-workspace-notes">
          <section className="ap-board-update ap-panel">
            <div className="ap-tile-heading">
              <MessageSquareText size={18} strokeWidth={1.5} />
              <h2>Latest message</h2>
            </div>
            {updates.length ? (
              <>
                <h3>{updates[0].title}</h3>
                <p>{updates[0].message}</p>
                <Link className="ap-text-link" to="/workspace/messages">
                  {updates.filter((message) => !message.readAt).length} unread ·
                  Open Messages
                  <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <>
                <p>
                  {isApplicant
                    ? "No messages yet."
                    : "Messages appear here after sign-in."}
                </p>
                <Link className="ap-text-link" to="/workspace/messages">
                  View messages
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </section>
          {isApplicant && (
            <Link className="ap-board-guide ap-panel" to="/workspace/profile">
              <UserRound size={23} strokeWidth={1.4} />
              <div>
                <h2>My profile</h2>
                <span>
                  {profile.companyName ||
                    "Personal, company and document details"}
                </span>
                <span>Verification by CEDA pending</span>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          )}
          <Link className="ap-board-guide ap-panel" to="/portal/help">
            <BookOpen size={23} strokeWidth={1.4} />
            <div>
              <h2>Application guide</h2>
              <span>What to prepare</span>
            </div>
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}

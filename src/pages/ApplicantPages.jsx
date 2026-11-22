import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FilePenLine,
  Files,
  Inbox,
  Printer,
  Search,
} from "lucide-react";
import { usePortal } from "../context/PortalContext";
import { applicationReference } from "../utils/applicant";
import {
  documentCategories,
  programme,
  workflowProgress,
} from "../utils/applicantWorkflow";
import { displayDateTime } from "../utils/portal";
import { themes } from "../data/portal";
import ApplicationList from "../components/applicant/ApplicationList";

export function ApplicantApplicationsPage() {
  const { ideas, drafts, profile, documents, applicationsLoading, applicationsError, refreshApplications } = usePortal();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const status = params.get("status") || "all";
  const matches = (value) => value.toLowerCase().includes(query.toLowerCase());
  const filtered =
    status === "Draft"
      ? []
      : ideas.filter(
          (idea) =>
            (status === "all" || idea.status === status) &&
            matches(`${idea.title} ${applicationReference(idea)}`),
        );
  const filteredDrafts = ["all", "Draft"].includes(status)
    ? drafts.filter((draft) => matches(draft.title || "Untitled application"))
    : [];
  function filter(key, value) {
    const next = new URLSearchParams(params);
    value && value !== "all" ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  }
  return (
    <div className="ap-page">
      <section className="ap-panel">
        <div className="ap-filter-row">
          <label className="ap-search-field">
            <Search size={17} />
            <input
              aria-label="Filter applications"
              placeholder="Search by title or reference"
              value={query}
              onChange={(event) => filter("q", event.target.value)}
            />
          </label>
          <label className="ap-status-filter">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => filter("status", event.target.value)}
            >
              <option value="all">All statuses</option>
              {[
                "Draft",
                "Submitted",
                "Under review",
                "Feedback",
                "Approved",
                "Award",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        {applicationsLoading && <p role="status">Loading applications from CEDA…</p>}
        {applicationsError && <div className="ap-form-alert" role="alert"><p>Applications could not be retrieved from CEDA. Existing server records have not been changed.</p><p>{applicationsError}</p><button type="button" className="ap-button ap-button-secondary" onClick={() => void refreshApplications()}>Retry</button></div>}
        {filteredDrafts.map((draft) => {
          const progress = workflowProgress(draft, profile, documents);
          return (
            <Link
              className="ap-draft-callout"
              key={draft.id}
              to={"/workspace/new?draft=" + draft.id}
            >
              <FilePenLine size={23} strokeWidth={1.4} />
              <div>
                <strong>{draft.title || "Untitled application"}</strong>
                <span>
                  Draft · {progress.completed} of {progress.total} sections
                  complete
                  {draft.revisionOf
                    ? " · Updating an existing application"
                    : ""}
                </span>
              </div>
              <span>
                Continue
                <ArrowRight size={16} />
              </span>
            </Link>
          );
        })}
        <div className="ap-list-heading">
          <span>
            {filtered.length} submitted application
            {filtered.length === 1 ? "" : "s"} · {filteredDrafts.length} draft
            {filteredDrafts.length === 1 ? "" : "s"}
          </span>
          <span>Latest first</span>
        </div>
        <ApplicationList ideas={filtered} />
        {filtered.length + filteredDrafts.length === 0 && (
          <div className="ap-empty">
            <Files size={28} strokeWidth={1.2} />
            <h2>
              {query || status !== "all"
                ? "No matching applications."
                : "No applications yet."}
            </h2>
            <p>
              {query || status !== "all"
                ? "Try a different search or status."
                : "Start an application and save it as you go."}
            </p>
            {query || status !== "all" ? (
              <button className="ap-text-link" onClick={() => setParams({})}>
                Clear filters
              </button>
            ) : (
              <Link className="ap-text-link" to="/workspace/new">
                Start an application
                <ArrowRight size={15} />
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
export function ApplicantMessagesPage() {
  const { messages, ideas, markMessageRead, markAllMessagesRead } = usePortal();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const unread = messages.filter((message) => !message.readAt).length;
  const shown = [...messages]
    .filter((message) => !unreadOnly || !message.readAt)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <div className="ap-page">
      <section className="ap-panel">
        <div className="ap-section-title">
          <h2>
            Messages <span className="ap-count">{unread} unread</span>
          </h2>
          <button
            className="ap-text-link"
            type="button"
            disabled={!unread || busy}
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              try {
                await markAllMessagesRead();
                setError("");
              } catch (failure) {
                setError(failure.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Check size={15} />
            Mark all as read
          </button>
        </div>
        <label className="ap-check-row">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => setUnreadOnly(event.target.checked)}
          />
          <span>Unread only</span>
        </label>
        {error && (
          <p role="alert" className="ap-form-alert">
            {error}
          </p>
        )}
        {shown.map((message) => (
          <Link
            className={"ap-message-row" + (!message.readAt ? " is-unread" : "")}
            key={message.id}
            to={"/workspace/ideas/" + message.applicationId}
            aria-disabled={busy}
            onClick={async (event) => {
              event.preventDefault();
              if (busy) return;
              setBusy(true);
              try {
                await markMessageRead(message.id);
                navigate("/workspace/ideas/" + message.applicationId);
              } catch (failure) {
                setError(failure.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <span className="ap-document-icon">
              <Inbox size={20} />
            </span>
            <div>
              <span className="ap-soft-label">
                {message.readAt ? "Read" : "Unread"} · {message.title}
              </span>
              <h2>
                {ideas.find((idea) => idea.id === message.applicationId)
                  ?.title || "Application update"}
              </h2>
              <p>{message.message}</p>
              <small>{displayDateTime(message.createdAt)}</small>
            </div>
            <ArrowUpRight size={18} />
          </Link>
        ))}
        {!shown.length && (
          <div className="ap-empty">
            <Inbox size={30} strokeWidth={1.2} />
            <h2>{unreadOnly ? "No unread messages." : "No messages yet."}</h2>
            <p>Receipts, requests and released feedback appear here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
export function ApplicantProgrammesPage() {
  const documentChecklistRef = useRef(null);

  useEffect(() => {
    let wasOpen = false;
    const expandChecklist = () => {
      if (documentChecklistRef.current) {
        wasOpen = documentChecklistRef.current.open;
        documentChecklistRef.current.open = true;
      }
    };
    const restoreChecklist = () => {
      if (documentChecklistRef.current) {
        documentChecklistRef.current.open = wasOpen;
      }
    };
    window.addEventListener("beforeprint", expandChecklist);
    window.addEventListener("afterprint", restoreChecklist);
    return () => {
      window.removeEventListener("beforeprint", expandChecklist);
      window.removeEventListener("afterprint", restoreChecklist);
    };
  }, []);

  return (
    <div className="ap-page ap-checklist-page">
      <section className="ap-panel ap-before-start">
        <div className="ap-section-title">
          <div>
            <span className="ap-soft-label">Before you start</span>
            <h2>{programme.name}</h2>
          </div>
          <button
            className="ap-text-link ap-no-print"
            type="button"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print checklist / Save PDF
          </button>
        </div>
        <div className="ap-programme-facts">
          <div>
            <h3>Who can apply</h3>
            <p>
              Citizen-owned companies, with citizens aged 18–35 holding more
              than 50% of the shares, under the supplied hackathon guidelines.
            </p>
            <Link className="ap-text-link ap-no-print" to="/portal/eligibility">
              Check eligibility
              <ArrowRight size={15} />
            </Link>
          </div>
          <div>
            <h3>Dates</h3>
            <p>
              {programme.closesAt
                ? "Closes " + displayDateTime(programme.closesAt)
                : "Application dates have not been published in this workspace."}
            </p>
            <p>
              Allow time to prepare your documents and review every section.
            </p>
          </div>
          <div>
            <h3>Prepare these sections</h3>
            <ul>
              <li>Personal and company details.</li>
              <li>Shareholder ownership records.</li>
              <li>Problem, solution and impact.</li>
              <li>Budget, if funding figures apply.</li>
              <li>Technical proposal and supporting evidence.</li>
            </ul>
          </div>
        </div>
        <details className="ap-checklist-documents" ref={documentChecklistRef}>
          <summary>Document checklist and where to get each item</summary>
          <ul>
            {documentCategories.map((category) => (
              <li key={category.id}>
                <strong>
                  {category.name}
                  {programme.requiredDocuments.includes(category.id)
                    ? " · Required"
                    : " · If requested by the programme"}
                </strong>
                <p>
                  {category.guidance}{" "}
                  {
                    {
                      "technical-proposal":
                        "Prepare this with your project team.",
                      "company-registration":
                        "Obtain the current extract from your company records or CIPA.",
                      identity: "Use the evidence specified by CEDA.",
                      shareholding:
                        "Use your company’s current shareholder and director records.",
                      "tax-clearance":
                        "Use the current certificate issued by BURS.",
                      supporting: "Use relevant evidence from your project.",
                    }[category.id]
                  }
                </p>
              </li>
            ))}
          </ul>
        </details>
      </section>
      <div className="ap-theme-list">
        {themes.map((theme) => (
          <article className="ap-panel ap-theme-row" key={theme.id}>
            <span className="ap-theme-number">{theme.number}</span>
            <div>
              <span className="ap-eyebrow">{theme.category}</span>
              <h2>{theme.name}</h2>
              <p>{theme.description}</p>
            </div>
            <Link
              className="ap-button ap-button-secondary"
              to={"/portal/eligibility?theme=" + theme.id}
            >
              Check this theme
              <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
export function ApplicantHelpPage() {
  const questions = [
    [
      "What should I prepare?",
      "Read the programme checklist. Prepare contact details, company and shareholder information, your idea, any funding figures and the technical proposal. Additional evidence depends on the programme.",
    ],
    [
      "Can I finish later?",
      "Yes. Each application is a separate draft. Save and close, then continue it from My applications. Your current files and answers are stored on this device. Cross-device access needs the connected account and application services.",
    ],
    [
      "Which documents can I attach?",
      "PDF, DOCX, JPG and PNG files up to 10 MB each. Attach up to 10 files per application. File contents are saved, so you can reopen and download them. Choose an expiry date if the document has one.",
    ],
    [
      "Can I reuse a document?",
      "Yes. Files saved in My profile appear in the application’s document library. Reuse a saved copy, remove it from a draft, or attach a replacement. Earlier submitted versions keep their original files.",
    ],
    [
      "How are files checked?",
      "The frontend checks type, size, file signature and expiry, and resizes large phone photos. It cannot certify legibility or remove malware. CEDA’s document service must scan and verify files before releasing them to reviewers.",
    ],
    [
      "How do I know it was saved?",
      "A receipt and local reference appear after a complete submission. You can download a text copy or choose Print / Save PDF. Local receipts do not confirm delivery to CEDA.",
    ],
    [
      "How do corrections work?",
      "Open the application, read the item requested and its deadline, then choose Respond and update. Explain the correction and submit a new version. The reference and all earlier versions stay unchanged.",
    ],
    [
      "How do I get help?",
      "Read the guidance beside each field. For programme rules, verification, an expired response window or an accessibility need, contact CEDA through the official CEDA website or visit a CEDA office.",
    ],
  ];
  return (
    <div className="ap-page ap-guide-page">
      <section className="ap-guide-lead">
        <h2>Application guide</h2>
        <p>
          Work through short sections, save when you need to pause and review
          every answer before submitting.
        </p>
        <Link className="ap-text-link" to="/portal/programmes">
          Programme checklist
          <ArrowRight size={15} />
        </Link>
      </section>
      <section className="ap-panel ap-faq">
        <h2>Common questions</h2>
        {questions.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
export function ApplicantNotFoundPage() {
  return (
    <div className="ap-page">
      <section className="ap-empty ap-panel">
        <Files size={32} />
        <h2>Page not found</h2>
        <p>Return to the applicant portal to find your next step.</p>
        <Link className="ap-button ap-button-primary" to="/portal">
          Applicant home
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
}

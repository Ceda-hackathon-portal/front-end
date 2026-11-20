import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  Printer,
} from "lucide-react";
import StatusBadge from "../components/shared/StatusBadge";
import { DocumentList } from "../components/applicant/ApplicantDocuments";
import { usePortal } from "../context/PortalContext";
import { themes } from "../data/portal";
import { displayDate, displayDateTime } from "../utils/portal";
import { applicationReference, applicationText } from "../utils/applicant";
import { budgetTotal, canUpdate } from "../utils/applicantWorkflow";

const stageLabels = [
  ["submitted", "Submitted"],
  ["eligibility", "Eligibility"],
  ["shortlist", "Shortlist"],
  ["evaluation", "Evaluation"],
  ["decision", "Decision"],
  ["award", "Award"],
];
export default function IdeaDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { ideas, startRevision, requestReview, setReferralConsent } =
    usePortal();
  const [version, setVersion] = useState("latest");
  const [error, setError] = useState("");
  const [grounds, setGrounds] = useState("");
  const navigate = useNavigate();
  const idea = ideas.find((item) => item.id === id);
  if (!idea)
    return (
      <section className="ap-page ap-panel ap-empty">
        <h2>Application not found.</h2>
        <p>Check the reference in My applications.</p>
        <Link
          className="ap-button ap-button-primary"
          to="/workspace/applications"
        >
          My applications
          <ArrowRight size={16} />
        </Link>
      </section>
    );
  const versions = idea.versions || [{ ...idea, number: 1 }];
  const snapshot =
    version === "latest"
      ? versions.at(-1)
      : versions.find((item) => String(item.number) === version) ||
        versions.at(-1);
  const currentStage =
    idea.currentStage ||
    {
      Submitted: "submitted",
      "Under review": "evaluation",
      Feedback: "evaluation",
      Approved: "decision",
      Award: "award",
    }[idea.status] ||
    "submitted";
  const current = stageLabels.findIndex(([code]) => code === currentStage);
  function updateApplication() {
    try {
      navigate("/workspace/new?draft=" + startRevision(id));
    } catch (failure) {
      setError(failure.message);
    }
  }
  function downloadCopy() {
    const url = URL.createObjectURL(
      new Blob(
        [
          applicationText({
            ...idea,
            ...snapshot,
            id: idea.id,
            reference: idea.reference,
          }),
        ],
        { type: "text/plain;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download =
      applicationReference(idea) + "-v" + snapshot.number + ".txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="ap-page ap-receipt-page">
      <Link
        className="ap-text-link ap-back-link ap-no-print"
        to="/workspace/applications"
      >
        <ArrowLeft size={15} />
        My applications
      </Link>
      {params.get("submitted") === "1" && (
        <section className="ap-receipt" aria-labelledby="receipt-heading">
          <CheckCircle2 size={32} strokeWidth={1.4} />
          <div>
            <span className="ap-eyebrow">RECEIPT</span>
            <h2 id="receipt-heading">
              {versions.length > 1
                ? "Updated application saved."
                : "Application saved."}
            </h2>
            <p>
              Saved on this device. Delivery to CEDA requires the application
              service.
            </p>
            <strong>{applicationReference(idea)}</strong>
          </div>
          <button
            className="ap-button ap-button-secondary ap-no-print"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            Print / Save PDF
          </button>
        </section>
      )}
      <header className="ap-page-intro">
        <div>
          <span className="ap-eyebrow">{applicationReference(idea)}</span>
          <h2 className="ap-application-title">{idea.title}</h2>
          <p>
            {themes.find((theme) => theme.id === idea.theme)?.name} ·{" "}
            {displayDate(idea.submittedAt)}
          </p>
        </div>
        <StatusBadge status={idea.status} />
      </header>
      {error && (
        <p role="alert" className="ap-form-alert">
          {error}
        </p>
      )}
      {idea.revisionRequest?.status === "open" && (
        <section className="ap-action-needed ap-no-print">
          <div>
            <span className="ap-eyebrow">ACTION NEEDED</span>
            <h2>Respond to the correction request</h2>
            <p>{idea.revisionRequest.message}</p>
            <small>
              {idea.revisionRequest.dueAt
                ? "Due " + displayDateTime(idea.revisionRequest.dueAt)
                : "A response date has not been provided."}
            </small>
          </div>
          {canUpdate(idea) ? (
            <button
              className="ap-button ap-button-primary"
              type="button"
              onClick={updateApplication}
            >
              Respond and update
              <ArrowRight size={16} />
            </button>
          ) : (
            <Link className="ap-text-link" to="/portal/help">
              Contact CEDA about the deadline
              <ArrowRight size={16} />
            </Link>
          )}
        </section>
      )}
      <div className="ap-detail-grid">
        <div>
          <section className="ap-panel ap-detail-panel">
            <div className="ap-section-title">
              <h2>Your application</h2>
              <div className="ap-detail-actions ap-no-print">
                <button className="ap-text-link" onClick={downloadCopy}>
                  <Download size={15} />
                  Download copy
                </button>
                <button className="ap-text-link" onClick={() => window.print()}>
                  <Printer size={15} />
                  Print / Save PDF
                </button>
              </div>
            </div>
            <div className="ap-version-select ap-no-print">
              <label htmlFor="saved-application-version">View version</label>
              <select
                id="saved-application-version"
                value={version}
                onChange={(event) => setVersion(event.target.value)}
              >
                <option value="latest">
                  Latest · Version {versions.at(-1).number}
                </option>
                {versions
                  .slice(0, -1)
                  .reverse()
                  .map((item) => (
                    <option key={item.number} value={item.number}>
                      Version {item.number} ·{" "}
                      {displayDateTime(item.submittedAt)}
                    </option>
                  ))}
              </select>
            </div>
            {version !== "latest" && (
              <p className="ap-inline-note">
                You are viewing an earlier submitted version. Its answers and
                attachments are unchanged.
              </p>
            )}
            <p className="ap-print-only">
              {applicationReference(idea)} · Version {snapshot.number} ·{" "}
              {displayDateTime(snapshot.submittedAt)}
            </p>
            {snapshot.applicant && (
              <div className="ap-answer">
                <h3>Applicant and company</h3>
                <p>
                  {snapshot.applicant.fullName} · {snapshot.applicant.email} ·{" "}
                  {snapshot.applicant.phone}
                </p>
                <p>
                  {snapshot.applicant.companyName} ·{" "}
                  {snapshot.applicant.registrationNumber}
                </p>
                <p>
                  {snapshot.applicant.shareholders
                    ?.map((person) => person.name + ": " + person.percent + "%")
                    .join(" · ")}
                </p>
              </div>
            )}
            {[
              ["The problem", snapshot.problem],
              ["Your solution", snapshot.solution],
              ["The impact", snapshot.impact],
              ["Team or organisation", snapshot.team],
            ].map(([label, value]) => (
              <div className="ap-answer" key={label}>
                <h3>{label}</h3>
                <p>{value}</p>
              </div>
            ))}
            <div className="ap-answer">
              <h3>Budget</h3>
              {snapshot.budgetNotApplicable || !snapshot.budgetItems?.length ? (
                <p>No funding figures included.</p>
              ) : (
                <>
                  <ul className="ap-budget-review">
                    {snapshot.budgetItems.map((item) => (
                      <li key={item.id}>
                        <span>{item.description}</span>
                        <strong>
                          BWP{" "}
                          {Number(item.amount).toLocaleString("en-BW", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </strong>
                      </li>
                    ))}
                  </ul>
                  <p>
                    Total: BWP{" "}
                    {budgetTotal(snapshot.budgetItems).toLocaleString("en-BW", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  {snapshot.fundingRequested !== "" && (
                    <p>
                      Requested: BWP{" "}
                      {Number(snapshot.fundingRequested).toLocaleString(
                        "en-BW",
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="ap-answer">
              <h3>Documents · Version {snapshot.number}</h3>
              {snapshot.documents?.length ? (
                <DocumentList documents={snapshot.documents} />
              ) : (
                <p>No documents in this version.</p>
              )}
            </div>
            {snapshot.responseMessage && (
              <div className="ap-answer">
                <h3>Response / update note</h3>
                <p>{snapshot.responseMessage}</p>
              </div>
            )}
          </section>
          <section className="ap-panel ap-detail-panel">
            <h2>Released feedback</h2>
            {idea.feedback.length ? (
              idea.feedback.map((feedback) => (
                <article className="ap-feedback" key={feedback.id}>
                  <strong>{feedback.author}</strong>
                  <small>{displayDateTime(feedback.createdAt)}</small>
                  <p>{feedback.message}</p>
                </article>
              ))
            ) : (
              <p className="ap-inline-note">No released feedback yet.</p>
            )}
          </section>
          {idea.outcome && (
            <section className="ap-panel ap-detail-panel">
              <h2>Outcome</h2>
              <p>
                {{
                  selected: "Selected",
                  not_selected: "Not selected",
                  not_eligible: "Not eligible",
                }[idea.outcome.result] || idea.outcome.result}
              </p>
              <p>{idea.outcome.reason}</p>
              {idea.outcome.nextSteps?.length > 0 && (
                <>
                  <h3>Next steps</h3>
                  <ul>
                    {idea.outcome.nextSteps.map((next, index) => (
                      <li key={index}>
                        {typeof next === "string" ? next : next.label}
                      </li>
                    ))}
                  </ul>
                  <label className="ap-check-row ap-no-print">
                    <input
                      type="checkbox"
                      checked={Boolean(idea.referralConsent?.consent)}
                      onChange={(event) => {
                        try {
                          setReferralConsent(id, event.target.checked);
                          setError("");
                        } catch (failure) {
                          setError(failure.message);
                        }
                      }}
                    />
                    <span>
                      I consent to being contacted about the suggested support.
                    </span>
                  </label>
                </>
              )}
              {idea.outcome.canRequestReview &&
                (idea.reviewRequest ? (
                  <p className="ap-inline-note">
                    Review request: {idea.reviewRequest.status}
                  </p>
                ) : (
                  <form
                    className="ap-review-request ap-no-print"
                    onSubmit={(event) => {
                      event.preventDefault();
                      try {
                        requestReview(id, grounds);
                        setError("");
                      } catch (failure) {
                        setError(failure.message);
                      }
                    }}
                  >
                    <label htmlFor="review-grounds">Grounds for a review</label>
                    <textarea
                      id="review-grounds"
                      value={grounds}
                      maxLength={3000}
                      onChange={(event) => setGrounds(event.target.value)}
                    />
                    <button
                      className="ap-button ap-button-secondary"
                      type="submit"
                    >
                      Save review request
                      <ArrowRight size={15} />
                    </button>
                  </form>
                ))}
            </section>
          )}
        </div>
        <aside className="ap-panel ap-timeline-panel">
          <span className="ap-eyebrow">APPLICATION PROGRESS</span>
          <h2>Your next step</h2>
          <p>
            {idea.revisionRequest?.status === "open"
              ? "Respond to the correction request."
              : idea.outcome
                ? "Read the outcome and available next steps."
                : "Check Messages for requests and updates."}
          </p>
          {canUpdate(idea) && idea.revisionRequest?.status !== "open" && (
            <button
              type="button"
              className="ap-button ap-button-secondary ap-no-print"
              onClick={updateApplication}
            >
              Update application
              <ArrowRight size={15} />
            </button>
          )}
          <ol className="ap-timeline">
            {stageLabels.map(([code, label], index) => {
              const stage = idea.stages?.find((item) => item.code === code);
              const state =
                stage?.state ||
                (index < current
                  ? "done"
                  : index === current
                    ? "in_progress"
                    : "upcoming");
              return (
                <li
                  key={code}
                  className={
                    state === "done"
                      ? "is-done"
                      : index === current
                        ? "is-current"
                        : ""
                  }
                >
                  <span>
                    {state === "done" ? <Check size={13} /> : index + 1}
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <small>
                      {stage?.completedAt
                        ? displayDateTime(stage.completedAt)
                        : code === "submitted"
                          ? displayDateTime(idea.submittedAt)
                          : stage?.expectedBy
                            ? "Expected by " + displayDate(stage.expectedBy)
                            : state === "waiting_for_applicant"
                              ? "Waiting for you"
                              : index === current
                                ? "Current recorded stage"
                                : "Expected date not published"}
                    </small>
                    {stage?.action?.message && (
                      <p>
                        {stage.action.message}
                        {stage.action.dueAt
                          ? " · Due " + displayDate(stage.action.dueAt)
                          : ""}
                      </p>
                    )}
                    {stage?.delayReason && <p>{stage.delayReason}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="ap-snapshot">
            <strong>
              {versions.length} saved version{versions.length === 1 ? "" : "s"}
            </strong>
            <span>
              Earlier versions keep their original answers and attachments.
            </span>
          </div>
          <div className="ap-record-events">
            <h3>Record history</h3>
            {idea.events?.map((event, index) => (
              <p key={index}>
                <strong>{event.label}</strong>
                <small>{displayDateTime(event.at)}</small>
              </p>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

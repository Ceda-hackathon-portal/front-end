import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  FileText,
  Upload,
  Eye,
  Download,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useStaffWorkflow } from "../../context/StaffWorkflowContext";
import { automaticChecks, reviewCriteria } from "../../utils/staffWorkflow";
import { displayDate, displayDateTime } from "../../utils/portal";
import { downloadDocument, fileSize } from "../../services/applicantDocuments";
import { ApplicationStatus, applicationStage } from "./StaffApplicationsPage";
import StaffDocumentPreview from "../../components/staff/StaffDocumentPreview";

function botswanaInput(value) {
  if (!value) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Gaborone",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const resultLabels = {
  eligible: "Eligible",
  correction_needed: "Correction requested",
  ineligible: "Not eligible",
  not_eligible: "Not eligible",
  selected: "Selected",
  not_selected: "Not selected",
};

export default function StaffApplicationPage() {
  const { id } = useParams();
  const { applications } = useStaffWorkflow();
  const application = applications.find((item) => item.id === id);
  if (!application)
    return (
      <div className="st-page st-panel st-empty">
        <h1>Application unavailable</h1>
        <p className="st-muted">
          This record is missing or is not available to your staff role.
        </p>
        <Link
          className="st-button st-button-secondary"
          to="/admin/applications"
        >
          Back to applications
        </Link>
      </div>
    );
  return (
    <ApplicationRecord
      key={id + ":" + (application.version || 1)}
      application={application}
    />
  );
}

function ApplicationRecord({ application }) {
  const { staffUser } = useAuth();
  const {
    getRecord,
    screenApplication,
    saveReview,
    saveDecision,
    uploadStaffDocuments,
  } = useStaffWorkflow();
  const record = getRecord(application.id);
  const role = staffUser?.role;
  const criteria = application.criteria?.length
    ? application.criteria
    : reviewCriteria;
  const ownReview =
    record.reviews.find((review) => review.reviewerId === staffUser?.id) ||
    record.reviews[0];
  const screeningBaseline = useRef(record.screening?.at || null);
  const decisionBaseline = useRef(record.decision?.at || null);
  const reviewBaseline = useRef(ownReview?.updatedAt || null);
  const canScreen = ["eligibility-officer", "administrator"].includes(role);
  const canReview = role === "evaluator";
  const canDecide = ["adjudicator", "administrator"].includes(role);
  const [section, setSection] = useState("application");
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
  const [screenResult, setScreenResult] = useState(
    record.screening?.result || "",
  );
  const [screenReason, setScreenReason] = useState(
    record.screening?.reason || "",
  );
  const [dueAt, setDueAt] = useState(botswanaInput(record.screening?.dueAt));
  const [scores, setScores] = useState(ownReview?.scores || {});
  const [reasons, setReasons] = useState(ownReview?.reasons || {});
  const [comment, setComment] = useState(ownReview?.comment || "");
  const [conflict, setConflict] = useState(
    ownReview
      ? ownReview.conflict === true
        ? "yes"
        : ownReview.conflict === false
          ? "no"
          : ""
      : "",
  );
  const [decision, setDecision] = useState(record.decision?.result || "");
  const [decisionReason, setDecisionReason] = useState(
    record.decision?.reason || "",
  );
  const [nextSteps, setNextSteps] = useState(
    Array.isArray(record.decision?.nextSteps)
      ? record.decision.nextSteps.join("\n")
      : record.decision?.nextSteps || "",
  );
  const [confirmed, setConfirmed] = useState(false);
  const [preview, setPreview] = useState(null);
  const documents = [
    ...(application.documents || []),
    ...(record.documents || []),
  ].filter(
    (document, index, all) =>
      all.findIndex((item) => item.id === document.id) === index,
  );
  const checks = automaticChecks(application);
  const attention = checks.filter((check) => check.state !== "pass").length;
  const tabs = [
    ["application", "Application"],
    ["screening", "Screening"],
    ["review", "Review"],
    ["decision", "Decision"],
    ["documents", "Documents"],
    ["history", "History"],
  ];
  async function act(operation, message) {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await operation();
      setSuccess(message);
    } catch (failure) {
      setError(
        failure.message || "The action could not be saved. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function persistScreening() {
    const saved = await screenApplication(application.id, {
      result: screenResult,
      reason: screenReason,
      dueAt: dueAt ? new Date(dueAt + "+02:00").toISOString() : "",
      expectedScreeningAt: screeningBaseline.current,
    });
    screeningBaseline.current = saved.screening?.at || null;
  }
  async function persistDecision(publish) {
    const saved = await saveDecision(application.id, {
      result: decision,
      reason: decisionReason,
      nextSteps,
      publish,
      expectedDecisionAt: decisionBaseline.current,
    });
    decisionBaseline.current = saved.decision?.at || null;
  }
  function submitReview(submit) {
    return act(
      async () => {
        if (submit && !conflict)
          throw new Error(
            "Declare whether you have a conflict of interest before submitting.",
          );
        const saved = await saveReview(application.id, {
          expectedReviewUpdatedAt: reviewBaseline.current,
          scores,
          reasons,
          comment,
          conflict: conflict ? conflict === "yes" : null,
          submit,
        });
        reviewBaseline.current =
          saved.reviews.find((item) => item.reviewerId === staffUser.id)
            ?.updatedAt || null;
      },
      conflict === "yes"
        ? "Conflict recorded. This application must be reassigned."
        : submit
          ? "Review submitted and saved on this device."
          : "Review draft saved on this device.",
    );
  }
  return (
    <div className="st-page sw-page">
      <Link className="st-back" to="/admin/applications">
        <ArrowLeft size={15} />
        Applications
      </Link>
      <header className="sw-case-header">
        <div>
          <span className="st-eyebrow">{application.reference}</span>
          <h1>{application.title}</h1>
          <p>
            {application.team || "Team not supplied"}
            {application.submittedAt &&
              " · " + displayDateTime(application.submittedAt)}
          </p>
        </div>
        <ApplicationStatus label={applicationStage(application, record)} />
      </header>
      <nav className="sw-case-nav" aria-label="Application sections">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            aria-pressed={section === id}
            onClick={() => {
              setSection(id);
              setError("");
              setSuccess("");
            }}
          >
            {label}
            {id === "documents" && <span>{documents.length}</span>}
          </button>
        ))}
      </nav>
      {error && (
        <p className="st-alert" role="alert" ref={feedbackRef} tabIndex={-1}>
          {error}
        </p>
      )}
      {success && (
        <p className="sw-success" role="status" ref={feedbackRef} tabIndex={-1}>
          <Check size={17} />
          {success}
        </p>
      )}
      <div className="sw-record-grid">
        <div className="sw-record-main">
          {section === "application" && (
            <section className="st-panel sw-answer-panel">
              <h2>Submitted application</h2>
              {application.sample ? (
                <span className="sw-local-tag">Illustrative staff record</span>
              ) : (
                <span className="sw-local-tag">
                  Applicant record saved in this browser
                </span>
              )}
              {application.applicant && (
                <div className="sw-answer">
                  <h3>Applicant & company</h3>
                  <p>
                    {application.applicant.fullName} ·{" "}
                    {application.applicant.companyName}
                  </p>
                  <p>
                    {application.applicant.email} ·{" "}
                    {application.applicant.phone}
                  </p>
                  <p>
                    {application.applicant.registrationNumber ||
                      "Company number not supplied"}
                  </p>
                  <p>
                    Company registration declared:{" "}
                    {application.applicant.registered === "yes"
                      ? "Registered"
                      : application.applicant.registered === "no"
                        ? "Not registered"
                        : "Not supplied"}
                  </p>
                  {application.applicant.shareholders?.length > 0 && (
                    <div className="sw-shareholder-evidence">
                      <h3>Shareholder declarations</h3>
                      <ul>
                        {application.applicant.shareholders.map(
                          (person, index) => (
                            <li key={person.id || index}>
                              <strong>{person.name}</strong>
                              <dl>
                                <div>
                                  <dt>Date of birth</dt>
                                  <dd>
                                    {person.dateOfBirth
                                      ? displayDate(person.dateOfBirth)
                                      : "Not supplied"}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Botswana citizen</dt>
                                  <dd>
                                    {person.citizen === "yes"
                                      ? "Yes"
                                      : person.citizen === "no"
                                        ? "No"
                                        : "Not supplied"}
                                  </dd>
                                </div>
                                <div>
                                  <dt>Ownership</dt>
                                  <dd>
                                    {person.percent !== "" &&
                                    person.percent != null
                                      ? person.percent + "%"
                                      : "Not supplied"}
                                  </dd>
                                </div>
                              </dl>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {[
                ["The problem", application.problem],
                ["Proposed solution", application.solution],
                ["Expected impact", application.impact],
                ["Team", application.team],
              ].map(([label, value]) => (
                <div className="sw-answer" key={label}>
                  <h3>{label}</h3>
                  <p>{value || "Not included in this illustrative record."}</p>
                </div>
              ))}
              <div className="sw-answer">
                <h3>Budget</h3>
                {application.fundingRequested !== "" &&
                  application.fundingRequested != null && (
                    <p>
                      <strong>
                        Funding requested: BWP{" "}
                        {Number(application.fundingRequested).toLocaleString(
                          "en-BW",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </strong>
                    </p>
                  )}

                {application.budgetItems?.length ? (
                  <ul className="sw-budget">
                    {application.budgetItems.map((item, index) => (
                      <li key={item.id || index}>
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
                ) : (
                  <p>
                    {application.budgetNotApplicable
                      ? "No funding figures included."
                      : "Budget not included in this record."}
                  </p>
                )}
              </div>
            </section>
          )}
          {section === "screening" && (
            <section className="st-panel">
              <div className="st-panel-heading">
                <h2>Evidence checks</h2>
                <span className="sw-status sw-status-attention">
                  {attention} to check
                </span>
              </div>
              <p className="st-muted sw-spaced">
                Automatic checks use submitted answers and metadata. Staff must
                inspect the evidence.
              </p>
              <ul className="sw-checks">
                {checks.map((check) => (
                  <li key={check.id}>
                    <span className={"sw-check-icon sw-check-" + check.state}>
                      {check.state === "pass" ? (
                        <Check size={16} />
                      ) : (
                        <CircleHelp size={16} />
                      )}
                    </span>
                    <div>
                      <strong>{check.label}</strong>
                      <p>{check.detail}</p>
                    </div>
                    <span className="sw-check-state">
                      {check.state === "pass"
                        ? "Present"
                        : check.state === "unknown"
                          ? "Needs evidence"
                          : "Check required"}
                    </span>
                  </li>
                ))}
              </ul>
              {record.screening && (
                <div className="sw-recorded-note">
                  <strong>
                    {resultLabels[record.screening.result] ||
                      record.screening.result}
                  </strong>
                  <p>{record.screening.reason}</p>
                </div>
              )}
              {canScreen ? (
                <form
                  className="sw-action-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    act(
                      () => persistScreening(),
                      "Screening result saved. Applicant messages update for locally submitted records.",
                    );
                  }}
                >
                  <label className="st-field">
                    Screening result
                    <select
                      aria-label="Screening result"
                      value={screenResult}
                      onChange={(event) => setScreenResult(event.target.value)}
                    >
                      <option value="">Choose a result</option>
                      <option value="eligible">Eligible for review</option>
                      <option value="correction_needed">
                        Request a correction
                      </option>
                      <option value="ineligible">Not eligible</option>
                    </select>
                  </label>
                  <label className="st-field">
                    Screening reason
                    <textarea
                      aria-label="Screening reason"
                      value={screenReason}
                      onChange={(event) => setScreenReason(event.target.value)}
                      rows={4}
                      maxLength={3000}
                      placeholder="Explain the evidence and the action required."
                    />
                  </label>
                  {screenResult === "correction_needed" && (
                    <label className="st-field">
                      Response deadline (Botswana time)
                      <input
                        type="datetime-local"
                        aria-label="Response deadline (Botswana time)"
                        value={dueAt}
                        onChange={(event) => setDueAt(event.target.value)}
                      />
                      <span className="st-hint">
                        Choose a future date and time so the applicant knows
                        when to respond.
                      </span>
                    </label>
                  )}
                  <div className="st-actions">
                    <button
                      className="st-button st-button-primary"
                      disabled={busy}
                    >
                      Save screening result
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              ) : (
                <p className="st-muted sw-spaced">
                  Screening results are recorded by the eligibility officer or
                  administrator.
                </p>
              )}
            </section>
          )}
          {section === "review" && (
            <section className="st-panel">
              <h2>Evaluation</h2>
              <p className="st-muted sw-spaced">
                {record.reviewCount || 0} of {record.reviewsRequired || 1}{" "}
                required reviews submitted.
              </p>
              {canReview ? (
                <form
                  className="sw-action-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitReview(true);
                  }}
                >
                  {record.reviewBlocker && (
                    <p className="st-note">{record.reviewBlocker}</p>
                  )}
                  <fieldset disabled={!record.canReview || busy}>
                    <label className="st-field">
                      Conflict of interest
                      <select
                        aria-label="Conflict of interest"
                        value={conflict}
                        onChange={(event) => setConflict(event.target.value)}
                      >
                        <option value="">Make a declaration</option>
                        <option value="no">
                          I have no conflict of interest
                        </option>
                        <option value="yes">
                          I have a conflict and must recuse myself
                        </option>
                      </select>
                    </label>
                    {conflict !== "yes" && (
                      <fieldset className="sw-scorecard">
                        <legend>Programme criteria · 1 to 5</legend>
                        {criteria.map((criterion) => (
                          <div className="sw-criterion" key={criterion.id}>
                            <label>
                              <span>
                                <strong>{criterion.name}</strong>
                                <small>
                                  {criterion.description || ""} · Weight{" "}
                                  {criterion.weight}%
                                </small>
                              </span>
                              <select
                                aria-label={criterion.name + " score"}
                                value={scores[criterion.id] ?? ""}
                                onChange={(event) =>
                                  setScores((previous) => ({
                                    ...previous,
                                    [criterion.id]:
                                      event.target.value === ""
                                        ? ""
                                        : Number(event.target.value),
                                  }))
                                }
                              >
                                <option value="">Score</option>
                                {[1, 2, 3, 4, 5].map((score) => (
                                  <option key={score} value={score}>
                                    {score}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="st-field">
                              {criterion.name} reason
                              <textarea
                                value={reasons[criterion.id] || ""}
                                maxLength={1000}
                                rows={2}
                                onChange={(event) =>
                                  setReasons((previous) => ({
                                    ...previous,
                                    [criterion.id]: event.target.value,
                                  }))
                                }
                              />
                            </label>
                          </div>
                        ))}
                      </fieldset>
                    )}
                    <label className="st-field">
                      {conflict === "yes"
                        ? "Conflict explanation"
                        : "Review comments"}
                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        maxLength={3000}
                        rows={5}
                      />
                    </label>
                    <div className="st-actions">
                      <button
                        type="button"
                        className="st-button st-button-secondary"
                        disabled={busy}
                        onClick={() => submitReview(false)}
                      >
                        Save review draft
                      </button>
                      <button
                        className="st-button st-button-primary"
                        disabled={busy}
                      >
                        {conflict === "yes"
                          ? "Record conflict"
                          : "Submit review"}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </fieldset>
                </form>
              ) : (
                <div className="sw-submitted-reviews">
                  {record.reviews.length ? (
                    record.reviews
                      .filter((review) => review.status === "submitted")
                      .map((review) => (
                        <article key={review.id || review.reviewerId}>
                          <header>
                            <strong>
                              {review.reviewerName || "Assigned evaluator"}
                            </strong>
                            <span>
                              {Number.isFinite(review.weightedScore)
                                ? review.weightedScore.toFixed(1) + " / 100"
                                : "Submitted"}
                            </span>
                          </header>
                          <p>{review.comment}</p>
                          <dl className="sw-review-reasons">
                            {criteria.map((criterion) => (
                              <div key={criterion.id}>
                                <dt>
                                  {criterion.name}
                                  <strong>
                                    {review.scores?.[criterion.id] ?? "—"} / 5
                                  </strong>
                                </dt>
                                <dd>
                                  {review.reasons?.[criterion.id] ||
                                    "No criterion reason supplied in this saved version."}
                                </dd>
                              </div>
                            ))}
                          </dl>
                          {review.submittedAt && (
                            <small>{displayDateTime(review.submittedAt)}</small>
                          )}
                        </article>
                      ))
                  ) : (
                    <p className="st-muted sw-spaced">
                      Individual reviews are visible only to the authorised role
                      at the permitted stage.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
          {section === "decision" && (
            <section className="st-panel">
              <h2>Decision & release</h2>
              <p className="st-muted sw-spaced">
                Record a reason. A draft stays internal until an authorised
                staff member releases it.
              </p>
              {record.decision && (
                <div className="sw-recorded-note">
                  <strong>
                    {resultLabels[record.decision.result]} ·{" "}
                    {record.decision.publishedAt
                      ? "Released"
                      : "Internal draft"}
                  </strong>
                  <p>{record.decision.reason}</p>
                </div>
              )}
              {canDecide ? (
                <form
                  className="sw-action-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    act(() => {
                      if (!confirmed)
                        throw new Error(
                          "Confirm that you have checked the decision before releasing it.",
                        );
                      return persistDecision(true);
                    }, "Outcome released locally. The applicant record and message are updated for local submissions.");
                  }}
                >
                  {record.decisionBlocker && (
                    <p className="st-note">{record.decisionBlocker}</p>
                  )}
                  <p className="st-muted sw-spaced">
                    Scoring {record.scoringClosed ? "closed" : "open"} ·{" "}
                    {record.reviewCount || 0}/{record.reviewsRequired || 1}{" "}
                    reviews received
                  </p>
                  <fieldset
                    disabled={Boolean(record.decision?.publishedAt) || busy}
                  >
                    <label className="st-field">
                      Outcome
                      <select
                        aria-label="Outcome"
                        value={decision}
                        onChange={(event) => setDecision(event.target.value)}
                      >
                        <option value="">Choose an outcome</option>
                        <option value="selected">Selected</option>
                        <option value="not_selected">Not selected</option>
                        <option value="not_eligible">Not eligible</option>
                      </select>
                    </label>
                    <label className="st-field">
                      Decision reason
                      <textarea
                        aria-label="Decision reason"
                        value={decisionReason}
                        onChange={(event) =>
                          setDecisionReason(event.target.value)
                        }
                        maxLength={3000}
                        rows={5}
                      />
                    </label>
                    <label className="st-field">
                      Next steps (one per line)
                      <textarea
                        aria-label="Next steps (one per line)"
                        value={nextSteps}
                        onChange={(event) => setNextSteps(event.target.value)}
                        maxLength={2000}
                        rows={3}
                      />
                    </label>
                    <label className="sw-check-row">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                      />
                      I have checked this outcome and its reason for release.
                    </label>
                    <div className="st-actions">
                      <button
                        type="button"
                        className="st-button st-button-secondary"
                        disabled={busy}
                        onClick={() =>
                          act(
                            () => persistDecision(false),
                            "Decision draft saved. It has not been released to the applicant.",
                          )
                        }
                      >
                        Save decision draft
                      </button>
                      <button
                        className="st-button st-button-primary"
                        disabled={busy || Boolean(record.decision?.publishedAt)}
                      >
                        Release outcome
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </fieldset>
                </form>
              ) : (
                <p className="st-muted sw-spaced">
                  Decision makers and administrators record and release
                  outcomes.
                </p>
              )}
              {canDecide &&
                (application.reviewRequest || application.referralConsent) && (
                  <section
                    className="sw-outcome-followup"
                    aria-labelledby="staff-followup-heading"
                  >
                    <h3 id="staff-followup-heading">Applicant follow-up</h3>
                    {application.referralConsent && (
                      <div className="sw-recorded-note">
                        <strong>
                          Support contact consent:{" "}
                          {application.referralConsent.consent
                            ? "Given"
                            : "Withdrawn"}
                        </strong>
                        {application.referralConsent.recordedAt && (
                          <p>
                            {displayDateTime(
                              application.referralConsent.recordedAt,
                            )}
                          </p>
                        )}
                      </div>
                    )}
                    {application.reviewRequest && (
                      <>
                        <div className="sw-recorded-note">
                          <strong>
                            Review request ·{" "}
                            {{ in_review: "In review", resolved: "Resolved" }[
                              application.reviewRequest.status
                            ] || "Awaiting review"}
                          </strong>
                          <p>{application.reviewRequest.grounds}</p>
                          {application.reviewRequest.createdAt && (
                            <small>
                              Requested{" "}
                              {displayDateTime(
                                application.reviewRequest.createdAt,
                              )}
                            </small>
                          )}
                          {application.reviewRequest.response && (
                            <>
                              <p>
                                <strong>Response</strong>
                              </p>
                              <p>{application.reviewRequest.response}</p>
                              {application.reviewRequest.respondedAt && (
                                <small>
                                  Responded{" "}
                                  {displayDateTime(
                                    application.reviewRequest.respondedAt,
                                  )}
                                </small>
                              )}
                            </>
                          )}
                        </div>
                        <ReviewRequestResponse
                          key={application.reviewRequest.createdAt}
                          applicationId={application.id}
                          request={application.reviewRequest}
                          busy={busy}
                          act={act}
                        />
                      </>
                    )}
                  </section>
                )}
            </section>
          )}
          {section === "documents" && (
            <section className="st-panel">
              <h2>Documents</h2>
              <p className="st-muted sw-spaced">
                Applicant evidence and internal supporting records. File checks
                do not certify authenticity or malware safety.
              </p>
              {documents.length ? (
                <ul className="sw-documents">
                  {documents.map((document) => (
                    <li key={document.id}>
                      <FileText size={22} strokeWidth={1.5} />
                      <div>
                        <strong>{document.name}</strong>
                        <small>
                          {fileSize(document.size || 0)} ·{" "}
                          {document.category || "Supporting document"}
                        </small>
                        <small>{document.verification || "Not verified"}</small>
                      </div>
                      <button
                        type="button"
                        className="st-button st-button-small st-button-secondary"
                        onClick={() => setPreview(document)}
                        aria-label={"Preview " + document.name}
                      >
                        <Eye size={15} />
                        Preview
                      </button>
                      <button
                        type="button"
                        className="st-icon-button"
                        aria-label={"Download " + document.name}
                        onClick={() =>
                          act(
                            () => downloadDocument(document),
                            "Document download prepared.",
                          )
                        }
                      >
                        <Download size={17} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="st-empty">
                  <FileText size={28} />
                  <h3>No file contents attached</h3>
                  <p className="st-muted">
                    Illustrative records may not include files. Actual applicant
                    uploads appear here.
                  </p>
                </div>
              )}
              {[
                "eligibility-officer",
                "evaluator",
                "adjudicator",
                "administrator",
              ].includes(role) && (
                <div className="sw-upload">
                  <label htmlFor="staff-document-upload">
                    <Upload size={18} />
                    <strong>Attach an internal supporting document</strong>
                    <span>PDF, DOCX, JPG or PNG · Up to 10 MB per file</span>
                  </label>
                  <input
                    id="staff-document-upload"
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    multiple
                    disabled={busy}
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      event.target.value = "";
                      if (files.length)
                        act(
                          () => uploadStaffDocuments(application.id, files),
                          "Supporting documents saved on this device.",
                        );
                    }}
                  />
                  <p className="st-hint">
                    Internal uploads do not change the applicant’s submitted
                    attachment list.
                  </p>
                </div>
              )}
            </section>
          )}
          {section === "history" && (
            <section className="st-panel">
              <h2>Workflow history</h2>
              {record.history.length ? (
                <ol className="sw-history">
                  {record.history.map((event, index) => (
                    <li key={event.id || index}>
                      <span className="sw-history-dot" />
                      <div>
                        <strong>{event.action || event.label}</strong>
                        <p>
                          {event.actor?.name || event.actor || "Staff action"}
                        </p>
                        <small>
                          {event.at ? displayDateTime(event.at) : ""}
                        </small>
                        {event.reason && <p>{event.reason}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="st-muted sw-spaced">
                  No staff changes have been recorded for this application.
                </p>
              )}
            </section>
          )}
        </div>
        <aside className="sw-record-aside">
          <section className="st-panel">
            <span className="st-eyebrow">RECORD SUMMARY</span>
            <dl className="sw-case-facts">
              <div>
                <dt>Screening</dt>
                <dd>
                  {resultLabels[record.screening?.result] ||
                    (application.eligibility === "eligible"
                      ? "Eligible · sample record"
                      : "Awaiting check")}
                </dd>
              </div>
              <div>
                <dt>Reviews</dt>
                <dd>
                  {record.reviewCount || 0} / {record.reviewsRequired || 1}{" "}
                  submitted
                </dd>
              </div>
              <div>
                <dt>Documents</dt>
                <dd>{documents.length} attached</dd>
              </div>
              <div>
                <dt>Outcome</dt>
                <dd>
                  {record.decision?.publishedAt
                    ? "Released"
                    : record.decision
                      ? "Draft saved"
                      : "Not recorded"}
                </dd>
              </div>
            </dl>
          </section>
          <section className="sw-aside-note">
            <h3>Next action</h3>
            <p>
              {record.decision?.publishedAt
                ? "The outcome has been released locally. Read the record history for the action taken."
                : record.screening?.result === "correction_needed"
                  ? "Wait for the applicant’s response, then check the revised evidence."
                  : !record.screening && application.eligibility !== "eligible"
                    ? "Inspect the application and documents, then record the screening result."
                    : "Complete assigned reviews before the decision stage."}
            </p>
            <p>Saved locally. No email or SMS is sent.</p>
          </section>
        </aside>
      </div>
      {preview && (
        <StaffDocumentPreview
          key={preview.id}
          document={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

// Each incoming request starts a fresh response form. Later remote responses
// never acknowledge or replace text that this staff member is still editing.
function ReviewRequestResponse({ applicationId, request, busy, act }) {
  const { respondToReviewRequest } = useStaffWorkflow();
  const baseline = useRef(
    request.updatedAt || request.respondedAt || request.createdAt || null,
  );
  const [status, setStatus] = useState(
    request.status === "resolved" ? "resolved" : "in_review",
  );
  const [response, setResponse] = useState(request.response || "");
  async function save() {
    const saved = await respondToReviewRequest(applicationId, {
      status,
      response,
      expectedUpdatedAt: baseline.current,
    });
    baseline.current =
      saved.updatedAt || saved.respondedAt || saved.createdAt || null;
  }
  return (
    <form
      className="sw-action-form"
      onSubmit={(event) => {
        event.preventDefault();
        act(
          save,
          "Review-request response saved. It is visible to the applicant in this browser.",
        );
      }}
    >
      <label className="st-field">
        Follow-up status
        <select
          aria-label="Follow-up status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="in_review">In review</option>
          <option value="resolved">Resolved</option>
        </select>
      </label>
      <label className="st-field">
        Response to review request
        <textarea
          aria-label="Response to review request"
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          maxLength={3000}
          rows={4}
        />
      </label>
      <div className="st-actions">
        <button className="st-button st-button-primary" disabled={busy}>
          Save review-request response
          <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}

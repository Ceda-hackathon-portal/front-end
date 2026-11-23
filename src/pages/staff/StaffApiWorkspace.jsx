import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Download, RefreshCw } from "lucide-react";
import { staffApi } from "../../services/staffApi";
import { themes } from "../../data/portal";
import { displayDate } from "../../utils/portal";
import "../../styles/staff-api.css";

// The workspace for signed-in staff. All of it comes from the API: nothing here reads browser demo data.
const stateLabels = {
  SUBMITTED: "Submitted",
  ELIGIBILITY_SCREENING: "Eligibility check",
  OFFICER_VERIFICATION: "Officer check",
  ASSIGNED: "Ready for review",
  UNDER_EVALUATION: "In review",
  SCORES_LOCKED: "Scoring closed",
  ADJUDICATION: "With adjudicator",
  DECIDED: "Decision recorded",
  OUTCOME_RELEASED: "Outcome released",
};
const conflictLabels = {
  UNDECLARED: "Declaration needed",
  AWAITING_CONFIRMATION: "Declared no conflict, awaiting confirmation",
  CLEARED: "No conflict, confirmed",
  CONFLICT: "Conflict declared",
};
const roleLabels = {
  "eligibility-officer": "Eligibility officer",
  evaluator: "Reviewer",
  adjudicator: "Adjudicator",
  administrator: "Programme manager",
};
const screeningLabels = { MET: "Rules met on the applicant's answers", NOT_MET: "Rules not met", UNKNOWN: "Needs an officer to check" };

const stageOf = (item) => (item.eligibility === "NOT_ELIGIBLE" || item.eligibility?.outcome === "NOT_ELIGIBLE"
  ? "Not eligible"
  : stateLabels[item.state] || item.state);

export default function StaffApiWorkspace() {
  const { pathname } = useLocation();
  const id = /^\/admin\/applications\/([0-9a-f-]{36})$/i.exec(pathname)?.[1];
  return id ? <ApplicationCase key={id} id={id} /> : <ApplicationQueue />;
}

function useLoaded(load) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const next = await load();
      setData(next);
      setError("");
    } catch (failure) {
      setError(failure.message);
    }
  }, [load]);
  useEffect(() => {
    void refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);
  return { data, error, refresh };
}

function ApplicationQueue() {
  const { data, error, refresh } = useLoaded(staffApi.list);
  return (
    <div className="st-page">
      <header className="st-page-header">
        <div>
          <span className="st-eyebrow">CEDA database</span>
          <h1>Applications</h1>
          <p>Only applications your account may see.</p>
        </div>
        <button className="st-button st-button-secondary" type="button" onClick={refresh}>
          <RefreshCw size={16} aria-hidden="true" />Refresh
        </button>
      </header>
      {error && <p className="st-alert" role="alert">{error}</p>}
      {!data && !error && <p className="st-muted" role="status">Loading applications…</p>}
      {data?.length === 0 && (
        <section className="st-panel st-empty">
          <h2>Nothing is waiting for you</h2>
          <p className="st-muted">Submitted or assigned applications appear here.</p>
        </section>
      )}
      {data?.length > 0 && (
        <section className="st-panel sa-queue" aria-label="Applications">
          {data.map((item) => (
            <Link className="sa-row" key={item.id} to={`/admin/applications/${item.id}`}>
              <span className="sa-row-main">
                <strong>{item.title || "Title hidden until your declaration is confirmed"}</strong>
                <small>{item.reference} · {displayDate(item.submittedAt)}</small>
              </span>
              {item.myConflict && item.myConflict !== "CLEARED" && <span className="st-pill">{conflictLabels[item.myConflict]}</span>}
              {item.awaitingConfirmation > 0 && <span className="st-pill">{item.awaitingConfirmation} to confirm</span>}
              <span className="st-status">{stageOf(item)}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

function ApplicationCase({ id }) {
  const load = useCallback(() => staffApi.read(id), [id]);
  const { data: item, error: loadError, refresh } = useLoaded(load);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function run(action, success) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (failure) {
      setError(failure.message);
    } finally {
      await refresh();
      setBusy(false);
    }
  }

  async function download(document) {
    setError("");
    try {
      const url = URL.createObjectURL(await staffApi.document(id, document.id));
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure.message);
    }
  }

  if (!item) {
    return (
      <div className="st-page">
        <Link className="st-back" to="/admin"><ArrowLeft size={15} />All applications</Link>
        {loadError ? <p className="st-alert" role="alert">{loadError}</p> : <p className="st-muted" role="status">Loading application…</p>}
      </div>
    );
  }

  const props = { item, run };
  const cleared = item.assignment?.conflict === "CLEARED";
  const beforeReview = ["SUBMITTED", "ELIGIBILITY_SCREENING", "OFFICER_VERIFICATION"].includes(item.state);

  return (
    <div className="st-page">
      <Link className="st-back" to="/admin"><ArrowLeft size={15} />All applications</Link>
      <header className="st-page-header sa-case-header">
        <div>
          <span className="st-eyebrow">{item.reference}</span>
          <h1>{item.title || "Assigned application"}</h1>
          <p>{item.programme} · {displayDate(item.submittedAt)}</p>
        </div>
        <span className="st-status">{stageOf(item)}</span>
      </header>
      {(error || loadError) && <p className="st-alert" role="alert">{error || loadError}</p>}
      <p className="st-live" role="status">{notice}</p>

      <fieldset className="sa-case" disabled={busy}>
        <legend className="sr-only">Application actions</legend>
        {item.assignment && !cleared && <Declaration {...props} />}
        {item.team.length + item.candidates.length > 0 && <Team {...props} />}
        {item.content && <Submission content={item.content} download={download} />}
        {cleared && item.role === "eligibility-officer" && beforeReview && <Eligibility {...props} />}
        {cleared && item.role === "evaluator" && ["ASSIGNED", "UNDER_EVALUATION"].includes(item.state) && (
          <Scorecard key={item.evaluation?.revision || 0} {...props} />
        )}
        {cleared && item.role === "adjudicator" && <Adjudication {...props} />}
        {cleared && item.role === "administrator" && item.decision && <Release {...props} />}
      </fieldset>
    </div>
  );
}

function Declaration({ item, run }) {
  const state = item.assignment.conflict;
  return (
    <section className="st-panel" aria-labelledby="declaration-heading">
      <h2 id="declaration-heading">Conflict of interest</h2>
      {state === "UNDECLARED" ? (
        <>
          <p className="st-muted">Declare before the idea opens. A colleague confirms a declaration of no conflict.</p>
          <div className="st-actions sa-start">
            <button className="st-button st-button-primary" type="button" onClick={() => run(() => staffApi.declare(item.id, false), "Declaration recorded.")}>
              I have no conflict
            </button>
            <button className="st-button st-button-secondary" type="button" onClick={() => run(() => staffApi.declare(item.id, true), "Conflict recorded.")}>
              I have a conflict
            </button>
          </div>
        </>
      ) : (
        <p className="st-muted">{conflictLabels[state]}. The idea stays closed.</p>
      )}
    </section>
  );
}

function Team({ item, run }) {
  const [userId, setUserId] = useState("");
  return (
    <section className="st-panel" aria-labelledby="team-heading">
      <h2 id="team-heading">Assignments</h2>
      <p className="st-muted">
        {item.screening ? screeningLabels[item.screening.status] : "No screening record"}. Reviews submitted: {item.progress.finalized} of{" "}
        {Math.max(item.progress.assigned, item.progress.required)}.
      </p>
      <ul className="sa-team">
        {item.team.map((person) => (
          <li key={person.id}>
            <span className="sa-row-main">
              <strong>{person.name}</strong>
              <small>
                {roleLabels[person.role] || "Staff"} · {person.live ? conflictLabels[person.conflict] : "Removed"}
                {person.review ? ` · review ${person.review === "FINALIZED" ? "submitted" : "in progress"}` : ""}
              </small>
            </span>
            {person.live && person.disclosureId && !person.self && (
              <button className="st-button st-button-primary st-button-small" type="button"
                onClick={() => run(() => staffApi.confirm(item.id, person.disclosureId), `${person.name}'s declaration is confirmed.`)}>
                Confirm {person.name}
              </button>
            )}
            {person.live && person.conflict === "CONFLICT" && (
              <button className="st-button st-button-secondary st-button-small" type="button"
                onClick={() => run(() => staffApi.revoke(item.id, person.id, "Conflict of interest declared"), `${person.name} was removed.`)}>
                Remove {person.name}
              </button>
            )}
          </li>
        ))}
      </ul>
      {item.candidates.length > 0 && item.state !== "OUTCOME_RELEASED" && item.eligibility?.outcome !== "NOT_ELIGIBLE" && (
        <form className="sa-inline" onSubmit={(event) => {
          event.preventDefault();
          void run(() => staffApi.assign(item.id, userId), "Assignment saved.");
          setUserId("");
        }}>
          <select aria-label="Person to assign" value={userId} onChange={(event) => setUserId(event.target.value)} required>
            <option value="">Choose a person</option>
            {item.candidates.map((person) => (
              <option key={person.id} value={person.id}>{person.name} ({roleLabels[person.role]})</option>
            ))}
          </select>
          <button className="st-button st-button-secondary" type="submit">Assign</button>
        </form>
      )}
    </section>
  );
}

function Submission({ content, download }) {
  const answers = [["The problem", content.problem], ["The solution", content.solution], ["The impact", content.impact]];
  return (
    <section className="st-panel" aria-labelledby="submission-heading">
      <h2 id="submission-heading">Submitted application</h2>
      <p className="st-muted">{themes.find((theme) => theme.id === content.theme)?.name || content.theme}</p>
      <dl className="sa-answers">
        {answers.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        {content.team && <div><dt>Team</dt><dd>{content.team}</dd></div>}
        {content.applicant && (
          <div>
            <dt>Applicant</dt>
            <dd>
              {content.applicant.fullName}, {content.applicant.companyName} ({content.applicant.registrationNumber || "not registered"}).
              Botswana citizen: {content.applicant.citizen || "not answered"}.
            </dd>
          </div>
        )}
        <div>
          <dt>Budget</dt>
          <dd>
            {content.budget.notApplicable
              ? "No funding figures"
              : content.budget.items.map((row) => `${row.description}: P${row.amount}`).join("; ")}
            {content.budget.fundingRequested && `. Requested: P${content.budget.fundingRequested}`}
          </dd>
        </div>
      </dl>
      {content.documents.map((document) => (
        <button className="st-text-link sa-document" key={document.id} type="button" onClick={() => download(document)}>
          <Download size={14} aria-hidden="true" />Download {document.name}
        </button>
      ))}
    </section>
  );
}

function Eligibility({ item, run }) {
  const [outcome, setOutcome] = useState("");
  const [reason, setReason] = useState("");
  const { cleared, required, assigned } = item.progress;
  return (
    <section className="st-panel" aria-labelledby="eligibility-heading">
      <h2 id="eligibility-heading">Eligibility</h2>
      <p className="st-muted">{item.screening ? screeningLabels[item.screening.status] : "No screening record"}</p>
      {!item.eligibility ? (
        <form onSubmit={(event) => {
          event.preventDefault();
          void run(() => staffApi.eligibility(item.id, outcome, reason), "Eligibility result saved.");
        }}>
          <label className="st-field">Eligibility result
            <select aria-label="Eligibility result" value={outcome} onChange={(event) => setOutcome(event.target.value)} required>
              <option value="">Choose a result</option>
              <option value="ELIGIBLE" disabled={item.screening?.status !== "MET"}>Eligible</option>
              <option value="NOT_ELIGIBLE">Not eligible</option>
            </select>
          </label>
          <label className="st-field">Eligibility reason
            <textarea aria-label="Eligibility reason" rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} required />
          </label>
          <p className="st-hint">The applicant receives this reason if the result is not eligible.</p>
          <button className="st-button st-button-primary" type="submit">Save eligibility result</button>
        </form>
      ) : item.eligibility.outcome === "ELIGIBLE" ? (
        <>
          <p>Eligible. {cleared} of {Math.max(assigned, required)} reviewers are cleared.</p>
          <button className="st-button st-button-primary" type="button"
            disabled={assigned < required || cleared !== assigned}
            onClick={() => run(() => staffApi.sendToReview(item.id), "Sent to review.")}>
            Send to review
          </button>
        </>
      ) : (
        <p>Not eligible: {item.eligibility.reason}</p>
      )}
    </section>
  );
}

function Scorecard({ item, run }) {
  const saved = item.evaluation;
  const [scores, setScores] = useState(() =>
    Object.fromEntries((saved?.scores || []).map((score) => [score.criterionId, { value: score.value, evidence: score.evidence }])));
  const [comment, setComment] = useState(saved?.comment || "");
  const [recommendation, setRecommendation] = useState(saved?.recommendation || "");

  if (saved?.state === "FINALIZED") {
    const allIn = item.progress.finalized === item.progress.assigned;
    return (
      <section className="st-panel">
        <h2>Your review is submitted</h2>
        <p className="st-muted">It can no longer be changed.</p>
        {allIn && (
          <button className="st-button st-button-primary" type="button"
            onClick={() => run(() => staffApi.lockScores(item.id, item.revision), "Scoring closed.")}>
            Close scoring
          </button>
        )}
      </section>
    );
  }

  function save(finalize) {
    const entries = Object.entries(scores).filter(([, score]) => score.value !== "" && score.value !== undefined && score.evidence?.trim());
    return run(async () => {
      if (item.state === "ASSIGNED") await staffApi.startEvaluation(item.id);
      await staffApi.evaluate(item.assignment.id, {
        expectedRevision: saved?.revision || 0,
        finalize,
        comment,
        recommendation: recommendation || null,
        scores: entries.map(([criterionId, score]) => ({ criterionId, value: Number(score.value), evidence: score.evidence })),
      });
      if (!finalize) return;
      // The last review in closes scoring, which opens the marks to the adjudicator.
      const latest = await staffApi.read(item.id);
      if (latest.state === "UNDER_EVALUATION" && latest.progress.finalized === latest.progress.assigned)
        await staffApi.lockScores(item.id, latest.revision);
    }, finalize ? "Review submitted." : "Draft saved. Scores without a reason are not saved.");
  }

  const set = (id, key, value) => setScores((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  return (
    <form className="st-panel" onSubmit={(event) => { event.preventDefault(); void save(true); }}>
      <h2>Your review</h2>
      <p className="st-muted">You score alone. Every mark needs a reason and locks when you submit.</p>
      {item.criteria.map((criterion) => (
        <div className="sa-criterion" key={criterion.id}>
          <div><strong>{criterion.name}</strong><small>{criterion.description}</small></div>
          <select aria-label={`${criterion.name} score`} value={scores[criterion.id]?.value ?? ""}
            onChange={(event) => set(criterion.id, "value", event.target.value)} required>
            <option value="">Score</option>
            {Array.from({ length: criterion.maximum - criterion.minimum + 1 }, (_, index) => criterion.minimum + index)
              .map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <textarea aria-label={`${criterion.name} reason`} rows={2} maxLength={4000} value={scores[criterion.id]?.evidence || ""}
            onChange={(event) => set(criterion.id, "evidence", event.target.value)} required />
        </div>
      ))}
      <label className="st-field">Overall comment
        <textarea aria-label="Overall comment" rows={3} maxLength={4000} value={comment} onChange={(event) => setComment(event.target.value)} required />
      </label>
      <label className="st-field">Recommendation
        <select aria-label="Recommendation" value={recommendation} onChange={(event) => setRecommendation(event.target.value)} required>
          <option value="">Choose a recommendation</option>
          <option value="APPROVE">Approve</option>
          <option value="REVISE">Needs work</option>
          <option value="REJECT">Do not approve</option>
        </select>
      </label>
      <div className="st-actions">
        <button className="st-button st-button-quiet" type="button" onClick={() => save(false)}>Save draft</button>
        <button className="st-button st-button-primary" type="submit">Submit review</button>
      </div>
    </form>
  );
}

function Adjudication({ item, run }) {
  const [outcome, setOutcome] = useState("");
  const [reason, setReason] = useState("");
  return (
    <section className="st-panel" aria-labelledby="decision-heading">
      <h2 id="decision-heading">Decision</h2>
      {!item.evaluations.length && <p className="st-muted">Reviews appear here when scoring closes.</p>}
      {item.evaluations.map((review) => (
        <details className="sa-review" key={review.label}>
          <summary>{review.label}: {Math.round(review.total)} of 100</summary>
          <p>{review.comment}</p>
          <ul>
            {review.scores.map((score) => (
              <li key={score.criterionId}>
                {item.criteria.find((criterion) => criterion.id === score.criterionId)?.name || score.criterionId}: {score.value}. {score.evidence}
              </li>
            ))}
          </ul>
        </details>
      ))}
      {item.decision ? (
        <p>{item.decision.outcome === "APPROVED" ? "Selected" : "Not selected"}: {item.decision.reason}</p>
      ) : ["SCORES_LOCKED", "ADJUDICATION"].includes(item.state) ? (
        <form onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            let expectedRevision = item.revision;
            if (item.state === "SCORES_LOCKED") expectedRevision = (await staffApi.openAdjudication(item.id, expectedRevision)).revision;
            await staffApi.decide(item.id, { expectedRevision, outcome, reason });
          }, "Decision recorded.");
        }}>
          <label className="st-field">Decision
            <select aria-label="Decision" value={outcome} onChange={(event) => setOutcome(event.target.value)} required>
              <option value="">Choose a decision</option>
              <option value="APPROVED">Selected</option>
              <option value="REJECTED">Not selected</option>
            </select>
          </label>
          <label className="st-field">Decision reason
            <textarea aria-label="Decision reason" rows={3} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} required />
          </label>
          <button className="st-button st-button-primary" type="submit">Record decision</button>
        </form>
      ) : null}
    </section>
  );
}

function Release({ item, run }) {
  const [message, setMessage] = useState("");
  const { decision } = item;
  return (
    <section className="st-panel" aria-labelledby="release-heading">
      <h2 id="release-heading">Outcome</h2>
      <p>{decision.outcome === "APPROVED" ? "Selected" : "Not selected"}: {decision.reason}</p>
      {decision.releasedAt ? (
        <p className="st-muted">Released to the applicant on {displayDate(decision.releasedAt)}.</p>
      ) : (
        <form onSubmit={(event) => {
          event.preventDefault();
          void run(() => staffApi.release(decision.id, {
            expectedRevision: item.revision,
            reason: "Decision checked and released.",
            applicantMessage: message,
          }), "Outcome released to the applicant.");
        }}>
          <label className="st-field">Feedback for the applicant
            <textarea aria-label="Feedback for the applicant" rows={4} maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} required />
          </label>
          <button className="st-button st-button-primary" type="submit">Release outcome</button>
        </form>
      )}
    </section>
  );
}

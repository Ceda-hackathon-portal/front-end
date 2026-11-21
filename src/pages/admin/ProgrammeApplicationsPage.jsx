import { useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EyeOff, Wand2 } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import {
  useApplicationsByProgramme,
  useProgrammeAssignments,
} from "../../hooks/useProgrammeApplications";
import { eligibilityLabels, evaluators, stageCodes } from "../../data/admin";
import {
  assignmentBlocker,
  isOverdue,
  suggestReviewers,
} from "../../utils/admin";
import { displayDate } from "../../utils/portal";
import ProgrammeHeader from "../../components/staff/ProgrammeHeader";

const progressLabels = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  conflicted: "Conflict declared",
};
const views = [
  { id: "all", label: "All" },
  { id: "unassigned", label: "Needs reviewers" },
  { id: "eligibility", label: "Awaiting eligibility" },
  { id: "overdue", label: "Overdue reviews" },
];

function AssignmentEditor({ programme, application, assignments, onDone }) {
  const { setAssignments } = useAdmin();
  const expectedEvaluatorIds = useRef(
    (assignments[application.id] || []).map((item) => item.evaluatorId),
  );
  const [selected, setSelected] = useState(
    (assignments[application.id] || [])
      .filter((item) => item.progress !== "conflicted")
      .map((item) => item.evaluatorId),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const openLoad = (id) =>
    Object.values(assignments)
      .flat()
      .filter(
        (item) =>
          item.evaluatorId === id &&
          !["submitted", "conflicted"].includes(item.progress),
      ).length;
  const blocker = assignmentBlocker({
    programme,
    application,
    evaluatorIds: selected,
    evaluators,
  });

  function toggle(id) {
    setError("");
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function save(event) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await setAssignments(programme.id, application, selected, {
        expectedEvaluatorIds: expectedEvaluatorIds.current,
      });
      onDone(`Reviewers saved for ${application.reference}.`);
    } catch (problem) {
      setError(problem.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <form
      className="st-assign"
      onSubmit={save}
      aria-label={"Reviewers for " + application.reference}
    >
      <fieldset disabled={busy}>
        <legend>
          Choose {programme.reviewersPerApplication} reviewer
          {programme.reviewersPerApplication === 1 ? "" : "s"}{" "}
          <span>
            {selected.length} of {programme.reviewersPerApplication} chosen
          </span>
        </legend>
        <div className="st-evaluators">
          {evaluators.map((evaluator) => {
            const conflict =
              evaluator.conflicts.includes(application.id) ||
              application.conflictedReviewerIds?.includes(evaluator.id);
            return (
              <label
                key={evaluator.id}
                className={
                  (selected.includes(evaluator.id) ? "is-selected " : "") +
                  (conflict ? "is-conflicted" : "")
                }
              >
                <input
                  type="checkbox"
                  checked={selected.includes(evaluator.id)}
                  disabled={conflict}
                  onChange={() => toggle(evaluator.id)}
                />
                <span>
                  <strong>{evaluator.name}</strong>
                  <small>
                    {evaluator.expertise} · {openLoad(evaluator.id)} open review
                    {openLoad(evaluator.id) === 1 ? "" : "s"}
                  </small>
                  {conflict && <em>Declared a conflict</em>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {(error || (selected.length > 0 && blocker)) && (
        <p className="st-error" role="alert">
          {error || blocker}
        </p>
      )}
      <div className="st-actions">
        <button
          type="button"
          className="st-text-link"
          disabled={busy}
          onClick={() => {
            setError("");
            setSelected(
              suggestReviewers({
                programme,
                application,
                evaluators,
                assignments,
              }),
            );
          }}
        >
          <Wand2 size={14} aria-hidden="true" />
          Suggest least busy
        </button>
        <button
          type="button"
          className="st-button st-button-quiet"
          disabled={busy}
          onClick={() => onDone("")}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="st-button st-button-primary"
          disabled={busy || Boolean(blocker)}
        >
          {busy ? "Saving reviewers…" : "Save reviewers"}
        </button>
      </div>
    </form>
  );
}

export default function ProgrammeApplicationsPage() {
  const { id } = useParams();
  const { programmes } = useAdmin();
  const assignments = useProgrammeAssignments();
  const applicationsFor = useApplicationsByProgramme();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState("");
  const [message, setMessage] = useState("");
  const programme = programmes.find((item) => item.id === id);
  if (!programme) {
    return (
      <div className="st-page">
        <section className="st-panel st-empty">
          <h1>Programme not found</h1>
          <Link className="st-button st-button-primary" to="/admin/programmes">
            All programmes
          </Link>
        </section>
      </div>
    );
  }

  const applications = applicationsFor(programme.id);
  const view = views.some((item) => item.id === params.get("view"))
    ? params.get("view")
    : "all";
  const matches = {
    all: () => true,
    unassigned: (application) =>
      application.eligibility === "eligible" &&
      (assignments[application.id] || []).filter(
        (item) => item.progress !== "conflicted",
      ).length < programme.reviewersPerApplication,
    eligibility: (application) =>
      ["pending", "correction_needed"].includes(application.eligibility),
    overdue: (application) =>
      (assignments[application.id] || []).some((item) => isOverdue(item)),
  };
  const visible = applications.filter(matches[view]);
  const canAssign = ["open", "closed"].includes(programme.status);
  const themeName = (themeId) =>
    programme.themes.find((theme) => theme.id === themeId)?.name || themeId;

  return (
    <div className="st-page">
      <ProgrammeHeader
        programme={programme}
        applicationCount={applications.length}
      />

      <p className="st-note">
        <EyeOff size={16} aria-hidden="true" />
        You see review progress only. Scores stay hidden until scoring closes,
        and evaluators never see each other's marks.
      </p>

      <div className="st-filter" role="group" aria-label="Show applications">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={view === item.id}
            onClick={() => {
              setEditing("");
              setParams(item.id === "all" ? {} : { view: item.id }, {
                replace: true,
              });
            }}
          >
            {item.label}
            <span>{applications.filter(matches[item.id]).length}</span>
          </button>
        ))}
      </div>
      <p className="st-live" role="status">
        {message}
      </p>

      {!applications.length ? (
        <section className="st-panel st-empty">
          <h2>No applications yet</h2>
          <p className="st-muted">
            {programme.status === "open"
              ? "Applications appear here as soon as they are submitted."
              : "This programme is not taking applications yet."}
          </p>
        </section>
      ) : !visible.length ? (
        <section className="st-panel st-empty">
          <h2>Nothing in this view</h2>
          <button
            type="button"
            className="st-text-link"
            onClick={() => setParams({}, { replace: true })}
          >
            Show all applications
          </button>
        </section>
      ) : (
        <section className="st-panel st-table-panel" aria-label="Applications">
          <div className="st-table-wrap">
            <table className="st-table">
              <thead>
                <tr>
                  <th scope="col">Application</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Eligibility</th>
                  <th scope="col">Reviewers</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((application) => {
                  const assigned = assignments[application.id] || [];
                  return [
                    <tr
                      key={application.id}
                      className={editing === application.id ? "is-editing" : ""}
                    >
                      <td>
                        <strong className="st-cell-title">
                          {application.title}
                        </strong>
                        <small>
                          {application.reference} ·{" "}
                          {themeName(application.theme)} ·{" "}
                          {displayDate(application.submittedAt)}
                        </small>
                        {application.fromApplicantDemo && (
                          <span className="st-tag">
                            From the applicant demo
                          </span>
                        )}
                      </td>
                      <td>
                        {
                          stageCodes.find(
                            (item) => item.code === application.currentStage,
                          )?.label
                        }
                      </td>
                      <td>
                        <span
                          className={
                            "st-pill st-pill-" + application.eligibility
                          }
                        >
                          {eligibilityLabels[application.eligibility]}
                        </span>
                      </td>
                      <td>
                        {assigned.length ? (
                          <ul className="st-reviewers">
                            {assigned.map((item) => (
                              <li key={item.evaluatorId}>
                                {
                                  evaluators.find(
                                    (evaluator) =>
                                      evaluator.id === item.evaluatorId,
                                  )?.name
                                }
                                <span
                                  className={
                                    "st-progress st-progress-" +
                                    (isOverdue(item)
                                      ? "overdue"
                                      : item.progress)
                                  }
                                >
                                  {isOverdue(item)
                                    ? "Overdue since " + displayDate(item.dueAt)
                                    : progressLabels[item.progress]}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="st-muted">
                            {application.eligibility === "eligible"
                              ? "None assigned"
                              : "After eligibility"}
                          </span>
                        )}
                      </td>
                      <td className="st-number">
                        {canAssign &&
                          application.eligibility === "eligible" &&
                          editing !== application.id && (
                            <button
                              type="button"
                              className="st-button st-button-secondary st-button-small"
                              onClick={() => {
                                setEditing(application.id);
                                setMessage("");
                              }}
                            >
                              {assigned.length ? "Change" : "Assign"}
                              <span className="sr-only">
                                {" "}
                                reviewers for {application.reference}
                              </span>
                            </button>
                          )}
                      </td>
                    </tr>,
                    editing === application.id && (
                      <tr
                        key={application.id + "-edit"}
                        className="st-edit-row"
                      >
                        <td colSpan={5}>
                          <AssignmentEditor
                            programme={programme}
                            application={application}
                            assignments={assignments}
                            onDone={(text) => {
                              setEditing("");
                              setMessage(text);
                            }}
                          />
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

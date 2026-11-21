import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Plus, X } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import {
  useApplicationsByProgramme,
  useProgrammeAssignments,
} from "../../hooks/useProgrammeApplications";
import { evaluators, templates } from "../../data/admin";
import { approvalBlocker, isOverdue } from "../../utils/admin";
import { displayDate } from "../../utils/portal";
import { ProgrammeStatus } from "../../components/staff/ProgrammeHeader";

export default function AdminHomePage() {
  const { programmes, currentManager, createProgramme } = useAdmin();
  const assignments = useProgrammeAssignments();
  const applicationsFor = useApplicationsByProgramme();
  const navigate = useNavigate();
  const dialog = useRef(null);
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const creating = useRef(false);

  const attention = [];
  for (const programme of programmes) {
    if (
      programme.status === "awaiting_approval" &&
      !approvalBlocker(programme, currentManager.id)
    ) {
      attention.unshift({
        key: programme.id + "-approve",
        to: "/admin/programmes/" + programme.id,
        title: `Approve ${programme.name}`,
        detail: `Submitted by ${programme.lastEditedBy.name}. Check the settings, then approve or return it.`,
      });
    }
    const applications = applicationsFor(programme.id);
    const unassigned = applications.filter(
      (item) =>
        item.eligibility === "eligible" &&
        (assignments[item.id] || []).filter(
          (assignment) => assignment.progress !== "conflicted",
        ).length < programme.reviewersPerApplication,
    );
    if (unassigned.length && ["open", "closed"].includes(programme.status)) {
      attention.push({
        key: programme.id + "-assign",
        to: `/admin/programmes/${programme.id}/applications?view=unassigned`,
        title: `${unassigned.length} application${unassigned.length === 1 ? " needs" : "s need"} reviewers`,
        detail: `${programme.name}. These passed the eligibility check.`,
      });
    }
    for (const application of applications) {
      for (const assignment of (assignments[application.id] || []).filter(
        (item) => isOverdue(item),
      )) {
        const evaluator = evaluators.find(
          (item) => item.id === assignment.evaluatorId,
        );
        attention.push({
          key: application.id + assignment.evaluatorId,
          to: `/admin/programmes/${programme.id}/applications?view=overdue`,
          title: `Review overdue: ${application.reference}`,
          detail: `${evaluator?.name}, due ${displayDate(assignment.dueAt)}. Send a reminder or reassign.`,
        });
      }
    }
  }

  const allApplications = programmes.flatMap((programme) =>
    applicationsFor(programme.id),
  );
  const stats = [
    {
      label: "Open programmes",
      value: programmes.filter((item) => item.status === "open").length,
    },
    { label: "Applications received", value: allApplications.length },
    {
      label: "Awaiting eligibility check",
      value: allApplications.filter((item) =>
        ["pending", "correction_needed"].includes(item.eligibility),
      ).length,
    },
    {
      label: "Reviews overdue",
      value: Object.values(assignments)
        .flat()
        .filter((item) => isOverdue(item)).length,
    },
  ];

  function openDialog() {
    setName("");
    setError("");
    setTemplateId(templates[0].id);
    dialog.current?.showModal();
  }

  async function create(event) {
    event.preventDefault();
    if (creating.current) return;
    creating.current = true;
    setBusy(true);
    setError("");
    try {
      const id = await createProgramme({ templateId, name });
      dialog.current?.close();
      navigate("/admin/programmes/" + id);
    } catch (problem) {
      setError(problem.message);
    } finally {
      creating.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="st-page">
      <header className="st-page-header">
        <div>
          <span className="st-eyebrow">Programme manager</span>
          <h1>Programmes</h1>
        </div>
        <button
          className="st-button st-button-primary"
          type="button"
          onClick={openDialog}
        >
          <Plus size={16} aria-hidden="true" />
          New programme
        </button>
      </header>

      <dl className="st-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section className="st-panel" aria-labelledby="attention-heading">
        <h2 id="attention-heading">Needs your attention</h2>
        {attention.length ? (
          <ul className="st-attention">
            {attention.map((item) => (
              <li key={item.key}>
                <Link to={item.to}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="st-muted">Nothing needs you right now.</p>
        )}
      </section>

      <section className="st-panel" aria-labelledby="programmes-heading">
        <h2 id="programmes-heading">All programmes</h2>
        <div className="st-table-wrap">
          <table className="st-table">
            <thead>
              <tr>
                <th scope="col">Programme</th>
                <th scope="col">Status</th>
                <th scope="col">Applications open</th>
                <th scope="col" className="st-number">
                  Applications
                </th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {programmes.map((programme) => (
                <tr key={programme.id}>
                  <td>
                    <Link
                      className="st-row-link"
                      to={"/admin/programmes/" + programme.id}
                    >
                      {programme.name}
                    </Link>
                    <small>
                      {programme.code} ·{" "}
                      {
                        templates.find(
                          (item) => item.id === programme.templateId,
                        )?.name
                      }
                    </small>
                  </td>
                  <td>
                    <ProgrammeStatus status={programme.status} />
                  </td>
                  <td>
                    {programme.opensAt && programme.closesAt ? (
                      `${displayDate(programme.opensAt)} to ${displayDate(programme.closesAt)}`
                    ) : (
                      <span className="st-muted">Not set</span>
                    )}
                  </td>
                  <td className="st-number">
                    {applicationsFor(programme.id).length}
                  </td>
                  <td className="st-number">
                    <Link
                      className="st-text-link"
                      to={"/admin/programmes/" + programme.id}
                      aria-label={"Open " + programme.name}
                    >
                      Open
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <dialog
        ref={dialog}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        className="st-dialog"
        aria-labelledby="new-programme-heading"
      >
        <form onSubmit={create}>
          <header>
            <h2 id="new-programme-heading">New programme</h2>
            <button
              type="button"
              className="st-icon-button"
              onClick={() => dialog.current?.close()}
              disabled={busy}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </header>
          <p className="st-muted">
            Start from a template. You can change every setting before it is
            approved.
          </p>
          <label className="st-field">
            Programme name
            <input
              disabled={busy}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              maxLength={120}
              required
              autoFocus
              placeholder="For example, Agri Innovation Challenge 2027"
            />
          </label>
          <fieldset className="st-template-list" disabled={busy}>
            <legend>Template</legend>
            {templates.map((template) => (
              <label
                key={template.id}
                className={templateId === template.id ? "is-selected" : ""}
              >
                <input
                  type="radio"
                  name="template"
                  value={template.id}
                  checked={templateId === template.id}
                  onChange={() => setTemplateId(template.id)}
                />
                <span>
                  <strong>{template.name}</strong>
                  <small>{template.description}</small>
                </span>
              </label>
            ))}
          </fieldset>
          {error && (
            <p className="st-error" role="alert">
              {error}
            </p>
          )}
          <footer>
            <button
              type="button"
              className="st-button st-button-quiet"
              disabled={busy}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button
              className="st-button st-button-primary"
              type="submit"
              disabled={busy}
            >
              {busy ? "Creating…" : "Create draft"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}

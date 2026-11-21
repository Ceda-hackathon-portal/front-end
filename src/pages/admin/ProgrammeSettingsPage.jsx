import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { useApplicationsByProgramme } from "../../hooks/useProgrammeApplications";
import { stageCodes } from "../../data/admin";
import {
  approvalBlocker,
  isEditable,
  limits,
  validateProgramme,
  weightTotal,
} from "../../utils/admin";
import { displayDate, displayDateTime } from "../../utils/portal";
import ProgrammeHeader from "../../components/staff/ProgrammeHeader";

const dateValue = (iso) => (iso ? iso.slice(0, 10) : "");
const when = (iso) =>
  Number.isFinite(Date.parse(iso)) ? displayDate(iso) : "a date not set yet";
const toIso = (value, time) => (value ? `${value}T${time}:00+02:00` : "");
const newId = (prefix) => prefix + "_" + crypto.randomUUID().slice(0, 6);

function Field({ label, hint, error, id, children }) {
  return (
    <div className={"st-field" + (error ? " has-error" : "")}>
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p className="st-hint" id={id + "-hint"}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p className="st-error" id={id + "-error"}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function ProgrammeSettingsPage() {
  const { id } = useParams();
  const { programmes } = useAdmin();
  const programme = programmes.find((item) => item.id === id);
  if (!programme)
    return (
      <div className="st-page">
        <section className="st-panel st-empty">
          <h1>Programme not found</h1>
          <p className="st-muted">
            It may have been created in a different browser.
          </p>
          <Link className="st-button st-button-primary" to="/admin/programmes">
            All programmes
          </Link>
        </section>
      </div>
    );
  return (
    <ProgrammeSettingsEditor key={id} id={id} initialProgramme={programme} />
  );
}

function ProgrammeSettingsEditor({ id, initialProgramme }) {
  const {
    programmes,
    currentManager,
    readCurrentState,
    updateProgramme,
    submitForApproval,
    approveProgramme,
    returnToDraft,
    closeApplications,
  } = useAdmin();
  const applicationsFor = useApplicationsByProgramme();
  const savedProgramme = programmes.find((item) => item.id === id);
  const [programme, setProgramme] = useState(initialProgramme);
  const programmeRef = useRef(initialProgramme);
  const savedVersion = useRef(initialProgramme.version);
  const queue = useRef(Promise.resolve());
  const pendingCount = useRef(0);
  const saveFailure = useRef(null);
  const acting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (savedProgramme && !pendingCount.current && !saveFailure.current) {
      programmeRef.current = savedProgramme;
      savedVersion.current = savedProgramme.version;
      setProgramme(savedProgramme);
    }
  }, [savedProgramme]);

  const editable = isEditable(programme);
  const errors = validateProgramme(programme);
  const issueCount = Object.keys(errors).length;
  const shown = (key) => (showErrors ? errors[key] : "");
  const blocker = approvalBlocker(programme, currentManager.id);
  const total = weightTotal(programme.criteria);

  function save(fields) {
    const next = { ...programmeRef.current, ...fields };
    programmeRef.current = next;
    setProgramme(next);
    if (saveFailure.current) return;
    const changes = structuredClone(fields);
    pendingCount.current += 1;
    setPending(true);
    setMessage("Saving…");
    setProblem("");
    queue.current = queue.current.then(async () => {
      try {
        if (saveFailure.current) throw saveFailure.current;
        const saved = await updateProgramme(id, changes, {
          expectedVersion: savedVersion.current,
        });
        savedVersion.current = saved.version;
        programmeRef.current = {
          ...programmeRef.current,
          version: saved.version,
          lastEditedBy: saved.lastEditedBy,
          history: saved.history,
        };
        setProgramme(programmeRef.current);
      } catch (error) {
        saveFailure.current = error;
        setProblem(error.message + " Your typed settings remain on this page.");
      } finally {
        pendingCount.current -= 1;
        const stillPending = pendingCount.current > 0;
        setPending(stillPending);
        setMessage(
          saveFailure.current ? "" : stillPending ? "Saving…" : "Saved",
        );
      }
    });
  }
  const setListItem = (list, index, key, value) =>
    save({
      [list]: programmeRef.current[list].map((item, position) =>
        position === index ? { ...item, [key]: value } : item,
      ),
    });
  const number = (value) => (value === "" ? "" : Number(value));

  async function act(action, success) {
    if (acting.current) return;
    acting.current = true;
    setBusy(true);
    try {
      await queue.current;
      if (saveFailure.current) throw saveFailure.current;
      const saved = await action({ expectedVersion: savedVersion.current });
      if (saved?.version) {
        savedVersion.current = saved.version;
        programmeRef.current = saved;
        setProgramme(saved);
      }
      setMessage(success);
      setProblem("");
      setReturning(false);
      setReason("");
    } catch (error) {
      setProblem(error.message);
      setMessage("");
    } finally {
      acting.current = false;
      setBusy(false);
    }
  }
  function submit() {
    setShowErrors(true);
    const count = Object.keys(validateProgramme(programmeRef.current)).length;
    if (count) {
      setProblem(
        `Fix ${count} setting${count === 1 ? "" : "s"} before submitting for approval.`,
      );
      window.setTimeout(() =>
        document
          .querySelector(
            ".st-field.has-error :is(input, select, textarea), .st-weight-total.has-error",
          )
          ?.focus(),
      );
      return;
    }
    act(
      (options) => submitForApproval(id, options),
      "Submitted. A second programme manager must approve it before it opens.",
    );
  }
  function reloadSaved() {
    try {
      const latest = readCurrentState().programmes.find(
        (item) => item.id === id,
      );
      if (!latest) throw new Error("Programme not found.");
      saveFailure.current = null;
      savedVersion.current = latest.version;
      programmeRef.current = latest;
      setProgramme(latest);
      setProblem("");
      setMessage("Loaded the latest saved settings.");
    } catch (error) {
      setProblem(error.message);
    }
  }

  const statusPanel = {
    draft: {
      title: "Draft",
      text: issueCount
        ? `${issueCount} setting${issueCount === 1 ? " needs" : "s need"} attention before you can submit it for approval.`
        : "Ready to submit. Another programme manager will check it before it opens.",
      actions: (
        <button
          className="st-button st-button-primary"
          type="button"
          onClick={submit}
          disabled={busy}
        >
          Submit for approval
        </button>
      ),
    },
    awaiting_approval: {
      title: "Awaiting approval",
      text: blocker
        ? `${blocker} You can return it to draft to make changes.`
        : `Submitted by ${programme.lastEditedBy.name}. Check every setting. Once you approve, the programme opens on its start date and its settings lock.`,
      actions: (
        <>
          {!blocker && (
            <button
              className="st-button st-button-primary"
              type="button"
              disabled={busy}
              onClick={() =>
                act(
                  (options) => approveProgramme(programme.id, options),
                  "Approved. The programme is open and its settings are locked.",
                )
              }
            >
              <Check size={16} aria-hidden="true" />
              Approve and open
            </button>
          )}
          <button
            className="st-button st-button-secondary"
            type="button"
            disabled={busy}
            onClick={() => setReturning(true)}
          >
            Return to draft
          </button>
        </>
      ),
    },
    open: {
      title:
        Date.parse(programme.opensAt) > Date.now()
          ? `Approved. Opens to applicants on ${when(programme.opensAt)}`
          : "Open for applications",
      text: `Settings are locked so every applicant is judged by the same rules. Applications close on ${when(programme.closesAt)} at 17:00.`,
      actions: (
        <>
          <Link
            className="st-button st-button-primary"
            to={"/admin/programmes/" + programme.id + "/applications"}
          >
            Manage applications
          </Link>
          <button
            className="st-button st-button-secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Close this programme to new applications now? Applicants with drafts will not be able to submit.",
                )
              )
                act(
                  (options) => closeApplications(programme.id, options),
                  "Closed to new applications.",
                );
            }}
          >
            Close applications
          </button>
        </>
      ),
    },
  }[programme.status] || {
    title: "Settings locked",
    text: "This programme has finished taking applications.",
    actions: null,
  };

  return (
    <div className="st-page">
      <ProgrammeHeader
        programme={programme}
        applicationCount={applicationsFor(programme.id).length}
      />

      <section
        className={"st-status-panel st-status-panel-" + programme.status}
        aria-labelledby="status-heading"
      >
        <div>
          <h2 id="status-heading">
            {!editable && <LockKeyhole size={16} aria-hidden="true" />}
            {statusPanel.title}
          </h2>
          <p>{statusPanel.text}</p>
        </div>
        <div className="st-actions">{statusPanel.actions}</div>
        {returning && (
          <form
            className="st-return"
            onSubmit={(event) => {
              event.preventDefault();
              act(
                (options) => returnToDraft(programme.id, reason, options),
                "Returned to draft. The reason is in the history.",
              );
            }}
          >
            <label className="st-field">
              Reason for returning it
              <textarea
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                required
                placeholder="Say what should change, for example the closing date."
              />
            </label>
            <div className="st-actions">
              <button
                className="st-button st-button-quiet"
                type="button"
                disabled={busy}
                onClick={() => setReturning(false)}
              >
                Cancel
              </button>
              <button
                className="st-button st-button-primary"
                type="submit"
                disabled={busy}
              >
                Return to draft
              </button>
            </div>
          </form>
        )}
      </section>
      <p className="st-live" role="status">
        {problem ? "" : message}
      </p>
      {problem && (
        <div className="st-alert" role="alert">
          <p>{problem}</p>
          {saveFailure.current && (
            <button
              type="button"
              className="st-text-link"
              disabled={pending || busy}
              onClick={reloadSaved}
            >
              Reload saved settings
            </button>
          )}
        </div>
      )}

      <div className="st-settings-layout">
        <fieldset
          className="st-settings"
          disabled={!editable || busy}
          aria-busy={pending}
        >
          <legend className="sr-only">Programme settings</legend>

          <section className="st-panel" aria-labelledby="details-heading">
            <h2 id="details-heading">Details</h2>
            <div className="st-grid-2">
              <Field
                id="programme-name"
                label="Programme name"
                error={shown("name")}
              >
                <input
                  id="programme-name"
                  value={programme.name}
                  maxLength={limits.name}
                  onChange={(event) => save({ name: event.target.value })}
                />
              </Field>
              <Field
                id="programme-code"
                label="Reference code"
                hint="Used in application references, like CEDA-ICH-2026-00412."
                error={shown("code")}
              >
                <input
                  id="programme-code"
                  value={programme.code}
                  maxLength={limits.code}
                  onChange={(event) =>
                    save({ code: event.target.value.toUpperCase() })
                  }
                  aria-describedby="programme-code-hint"
                />
              </Field>
            </div>
            <Field
              id="programme-summary"
              label="Summary for applicants"
              hint="One or two sentences on who should apply and why."
              error={shown("summary")}
            >
              <textarea
                id="programme-summary"
                rows={3}
                value={programme.summary}
                maxLength={limits.summary}
                onChange={(event) => save({ summary: event.target.value })}
                aria-describedby="programme-summary-hint"
              />
            </Field>
            <div className="st-grid-2">
              <Field
                id="programme-opens"
                label="Applications open"
                error={shown("opensAt")}
              >
                <input
                  id="programme-opens"
                  type="date"
                  value={dateValue(programme.opensAt)}
                  onChange={(event) =>
                    save({ opensAt: toIso(event.target.value, "00:00") })
                  }
                />
              </Field>
              <Field
                id="programme-closes"
                label="Applications close (17:00)"
                error={shown("closesAt")}
              >
                <input
                  id="programme-closes"
                  type="date"
                  value={dateValue(programme.closesAt)}
                  onChange={(event) =>
                    save({ closesAt: toIso(event.target.value, "17:00") })
                  }
                />
              </Field>
            </div>
          </section>

          <section className="st-panel" aria-labelledby="themes-heading">
            <div className="st-panel-heading">
              <h2 id="themes-heading">Themes</h2>
              {editable && (
                <button
                  type="button"
                  className="st-text-link"
                  onClick={() =>
                    save({
                      themes: [
                        ...programme.themes,
                        { id: newId("t"), name: "", description: "" },
                      ],
                    })
                  }
                >
                  <Plus size={14} aria-hidden="true" />
                  Add theme
                </button>
              )}
            </div>
            <p className="st-muted">
              Applicants choose one theme. Themes lock when the programme opens.
            </p>
            {shown("themes") && <p className="st-error">{errors.themes}</p>}
            <ol className="st-list">
              {programme.themes.map((theme, index) => (
                <li key={theme.id} className="st-list-item">
                  <div className="st-grid-2">
                    <Field
                      id={"theme-name-" + index}
                      label="Theme name"
                      error={shown(`themes.${index}.name`)}
                    >
                      <input
                        id={"theme-name-" + index}
                        value={theme.name}
                        maxLength={limits.themeName}
                        onChange={(event) =>
                          setListItem(
                            "themes",
                            index,
                            "name",
                            event.target.value,
                          )
                        }
                      />
                    </Field>
                    <Field
                      id={"theme-description-" + index}
                      label="Description"
                    >
                      <input
                        id={"theme-description-" + index}
                        value={theme.description}
                        maxLength={limits.themeDescription}
                        onChange={(event) =>
                          setListItem(
                            "themes",
                            index,
                            "description",
                            event.target.value,
                          )
                        }
                      />
                    </Field>
                  </div>
                  {editable && programme.themes.length > 1 && (
                    <button
                      type="button"
                      className="st-icon-button"
                      onClick={() =>
                        save({
                          themes: programme.themes.filter(
                            (_, position) => position !== index,
                          ),
                        })
                      }
                      aria-label={"Remove theme " + (theme.name || index + 1)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </section>

          <section className="st-panel" aria-labelledby="criteria-heading">
            <div className="st-panel-heading">
              <h2 id="criteria-heading">Scoring criteria</h2>
              {editable && (
                <button
                  type="button"
                  className="st-text-link"
                  onClick={() =>
                    save({
                      criteria: [
                        ...programme.criteria,
                        {
                          id: newId("c"),
                          name: "",
                          description: "",
                          weight: 0,
                          minimum: 0,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={14} aria-hidden="true" />
                  Add criterion
                </button>
              )}
            </div>
            <p className="st-muted">
              Evaluators score each criterion from 1 to 5 with a reason. An
              application below a minimum is set aside, and its feedback names
              that criterion.
            </p>
            {shown("criteria") && <p className="st-error">{errors.criteria}</p>}
            <ol className="st-list">
              {programme.criteria.map((criterion, index) => (
                <li key={criterion.id} className="st-list-item st-criterion">
                  <Field
                    id={"criterion-name-" + index}
                    label="Criterion"
                    error={shown(`criteria.${index}.name`)}
                  >
                    <input
                      id={"criterion-name-" + index}
                      value={criterion.name}
                      maxLength={limits.criterionName}
                      onChange={(event) =>
                        setListItem(
                          "criteria",
                          index,
                          "name",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                  <Field
                    id={"criterion-description-" + index}
                    label="What evaluators look for"
                  >
                    <input
                      id={"criterion-description-" + index}
                      value={criterion.description}
                      maxLength={limits.criterionDescription}
                      onChange={(event) =>
                        setListItem(
                          "criteria",
                          index,
                          "description",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                  <Field
                    id={"criterion-weight-" + index}
                    label="Weight %"
                    error={shown(`criteria.${index}.weight`)}
                  >
                    <input
                      id={"criterion-weight-" + index}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      value={criterion.weight}
                      onChange={(event) =>
                        setListItem(
                          "criteria",
                          index,
                          "weight",
                          number(event.target.value),
                        )
                      }
                    />
                  </Field>
                  <Field
                    id={"criterion-minimum-" + index}
                    label="Minimum"
                    error={shown(`criteria.${index}.minimum`)}
                  >
                    <select
                      id={"criterion-minimum-" + index}
                      value={criterion.minimum}
                      onChange={(event) =>
                        setListItem(
                          "criteria",
                          index,
                          "minimum",
                          Number(event.target.value),
                        )
                      }
                    >
                      <option value={0}>None</option>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value} of 5
                        </option>
                      ))}
                    </select>
                  </Field>
                  {editable && programme.criteria.length > 1 && (
                    <button
                      type="button"
                      className="st-icon-button"
                      onClick={() =>
                        save({
                          criteria: programme.criteria.filter(
                            (_, position) => position !== index,
                          ),
                        })
                      }
                      aria-label={
                        "Remove criterion " + (criterion.name || index + 1)
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ol>
            <p
              className={
                "st-weight-total" +
                (total === 100 ? " is-complete" : " has-error")
              }
              tabIndex={-1}
              role="status"
            >
              {total === 100 ? <Check size={15} aria-hidden="true" /> : null}
              Weights add up to {total} of 100
            </p>
          </section>

          <section className="st-panel" aria-labelledby="stages-heading">
            <h2 id="stages-heading">Stages and review</h2>
            <p className="st-muted">
              Applicants see an expected date for each stage, worked out from
              these targets. If a stage runs late, record a reason and a new
              date.
            </p>
            <div className="st-grid-4">
              {programme.stages.map((stage, index) => (
                <Field
                  key={stage.code}
                  id={"stage-" + stage.code}
                  label={
                    stageCodes.find((item) => item.code === stage.code)?.label +
                    " (working days)"
                  }
                  error={shown(`stages.${index}.targetWorkingDays`)}
                >
                  <input
                    id={"stage-" + stage.code}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={90}
                    value={stage.targetWorkingDays}
                    onChange={(event) =>
                      setListItem(
                        "stages",
                        index,
                        "targetWorkingDays",
                        number(event.target.value),
                      )
                    }
                  />
                </Field>
              ))}
            </div>
            <div className="st-grid-2">
              <Field
                id="programme-reviewers"
                label="Reviewers per application"
                hint="Each scores alone. Marks stay hidden until scoring closes."
                error={shown("reviewersPerApplication")}
              >
                <input
                  id="programme-reviewers"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={5}
                  value={programme.reviewersPerApplication}
                  onChange={(event) =>
                    save({
                      reviewersPerApplication: number(event.target.value),
                    })
                  }
                  aria-describedby="programme-reviewers-hint"
                />
              </Field>
              <Field
                id="programme-shortlist"
                label="Shortlist places"
                hint="Places are never filled just to reach this number."
                error={shown("shortlistSize")}
              >
                <input
                  id="programme-shortlist"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  value={programme.shortlistSize}
                  onChange={(event) =>
                    save({ shortlistSize: number(event.target.value) })
                  }
                  aria-describedby="programme-shortlist-hint"
                />
              </Field>
            </div>
          </section>
        </fieldset>

        <aside
          className="st-panel st-history"
          aria-labelledby="history-heading"
        >
          <h2 id="history-heading">History</h2>
          <p className="st-muted">
            Every change is recorded with who made it and when.
          </p>
          <ol>
            {programme.history.map((item, index) => (
              <li key={item.at + index}>
                <strong>{item.action}</strong>
                <span>{item.actor}</span>
                <small>{displayDateTime(item.at)}</small>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

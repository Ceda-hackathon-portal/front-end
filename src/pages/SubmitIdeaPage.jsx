import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Plus, Save, Trash2 } from "lucide-react";
import { usePortal } from "../context/PortalContext";
import { themes } from "../data/portal";
import { applicationFields } from "../utils/applicant";
import {
  budgetTotal,
  firstUnfinishedSection,
  programme,
  sectionErrors,
  sections,
  workflowProgress,
} from "../utils/applicantWorkflow";
import ProfileFields from "../components/applicant/ProfileFields";
import ApplicantDocuments, {
  DocumentList,
} from "../components/applicant/ApplicantDocuments";
import { saveDraftWithFeedback } from "../utils/applicationSaveFeedback.js";

const hints = {
  title: "A short, descriptive name.",
  theme: "Choose the closest theme.",
  team: "The team working on this idea.",
  problem: "What needs to change, and who is affected?",
  solution: "How would your idea solve the problem?",
  impact: "Who benefits, and how will you measure the difference?",
};
const money = (value) =>
  new Intl.NumberFormat("en-BW", { style: "currency", currency: "BWP" }).format(
    value,
  );

export default function SubmitIdeaPage() {
  const { drafts, createDraft, applicationsLoading, applicationsError, refreshApplications } = usePortal();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const requestedId = params.get("draft");
  const draft = drafts.find((item) => item.id === requestedId);
  const requestedTheme = params.get("theme") || "";
  if (draft) return <ApplicationForm key={draft.id} draft={draft} />;
  async function start() {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    try {
      const id = await createDraft(requestedTheme);
      navigate("/workspace/new?draft=" + id, { replace: true });
    } catch (failure) {
      setError(failure.message);
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }
  return (
    <div className="ap-page">
      <section className="ap-panel ap-draft-picker">
        <h2>{requestedId && applicationsLoading ? "Loading your application" : requestedId && applicationsError ? "Application could not be restored" : requestedId ? "Draft not found" : "Your application"}</h2>
        <p>
          {requestedId && applicationsLoading
            ? "Retrieving the saved application from CEDA."
            : requestedId && applicationsError
              ? "Your saved application is still on CEDA. Retry loading it before continuing."
              : requestedId
            ? "It may already have been submitted. Check My applications."
            : "Start a separate draft or continue saved work. Existing answers and files are kept."}
        </p>
        {applicationsError && <p role="alert" className="ap-form-alert">{applicationsError}</p>}
        {requestedId && applicationsError && <button className="ap-button ap-button-secondary" type="button" onClick={() => void refreshApplications()}>Retry loading</button>}
        {requestedTheme && (
          <p className="ap-inline-note">
            Selected theme:{" "}
            {themes.find((theme) => theme.id === requestedTheme)?.name ||
              "Unavailable"}
          </p>
        )}
        {drafts.map((item) => (
          <Link
            className="ap-saved-draft-row"
            key={item.id}
            to={"/workspace/new?draft=" + item.id}
          >
            <span>
              <strong>{item.title || "Untitled application"}</strong>
              <small>
                {themes.find((theme) => theme.id === item.theme)?.name ||
                  "Theme not selected"}
              </small>
            </span>
            <span>
              Continue
              <ArrowRight size={16} />
            </span>
          </Link>
        ))}
        {error && (
          <p role="alert" className="ap-form-alert">
            {error}
          </p>
        )}
        <div className="ap-draft-picker-actions">
          <button
            className="ap-button ap-button-primary"
            type="button"
            onClick={start}
            disabled={starting}
          >
            Start a new application
            <Plus size={16} />
          </button>
          <Link className="ap-text-link" to="/portal/eligibility">
            Check eligibility
            <ArrowRight size={15} />
          </Link>
          <Link className="ap-text-link" to="/workspace/applications">
            My applications
          </Link>
        </div>
      </section>
    </div>
  );
}

function ApplicationForm({ draft }) {
  const {
    profile,
    documents,
    ideas,
    saveDraft,
    submitApplication,
    reloadWorkspace,
    refreshApplications,
    storageWarning,
    documentsBusy,
  } = usePortal();
  const [form, setForm] = useState(() => structuredClone(draft));
  const [person, setPerson] = useState(() => structuredClone(profile));
  const [step, setStep] = useState(() =>
    firstUnfinishedSection(draft, profile, documents),
  );
  const [errors, setErrors] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documentsPending, setDocumentsPending] = useState(false);
  const saveSequence = useRef(0);
  const savingRef = useRef(false);
  const pendingSave = useRef(Promise.resolve(true));
  const documentsLocked = documentsBusy || documentsPending;
  const [busy, setBusy] = useState(false);
  const submissionLock = useRef(false);
  const heading = useRef(null);
  const previousStep = useRef(step);
  const navigate = useNavigate();
  const progress = workflowProgress(form, person, documents);
  const source = ideas.find((idea) => idea.id === form.revisionOf);
  const attachmentIds = JSON.stringify(draft.documentIds);
  useEffect(() => {
    setForm((current) => ({
      ...current,
      documentIds: JSON.parse(attachmentIds),
    }));
    setConfirmed(false);
  }, [attachmentIds]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (previousStep.current !== step)
      heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
    previousStep.current = step;
  }, [step]);
  function persistDraft(next, nextPerson) {
    const sequence = ++saveSequence.current;
    savingRef.current = true;
    setSaved(false);
    setSaving(true);
    const operation = pendingSave.current
      .then(() => saveDraftWithFeedback(next, () => saveDraft(next, nextPerson)));
    pendingSave.current = operation;
    operation.then((result) => {
      if (sequence !== saveSequence.current) return;
      savingRef.current = false;
      setSaved(result.ok);
      setSaving(false);
      if (!result.ok) setMessage(result.message || "The draft could not be saved. Your edits remain open.");
    });
    return operation.then((result) => result.ok);
  }
  function update(next, nextPerson = person) {
    setForm(next);
    setPerson(nextPerson);
    setErrors({});
    setMessage("");
    setConfirmed(false);
    persistDraft(next, nextPerson);
  }
  async function reopenSavedDraft() {
    if (savingRef.current || documentsLocked || busy) return;
    ++saveSequence.current;
    try {
      if (form.backendOwnerId && !(await refreshApplications()))
        throw new Error("The latest application could not be retrieved from CEDA. Your current edits remain open.");
      const latest = reloadWorkspace();
      const current = latest.drafts.find((item) => item.id === form.id);
      if (!current)
        throw new Error(
          "This draft was submitted or removed. Return to My applications.",
        );
      setForm(structuredClone(current));
      setPerson(structuredClone(latest.profile));
      setStep(
        firstUnfinishedSection(current, latest.profile, latest.documents),
      );
      setErrors({});
      setConfirmed(false);
      setSaved(true);
      setMessage("Latest saved answers loaded. Review them before submitting.");
    } catch (failure) {
      setMessage(failure.message);
    }
  }
  function goToStep(index) {
    if (!busy && !documentsLocked && !savingRef.current && saved) {
      setStep(index);
      setErrors({});
      setMessage("");
    }
  }
  function focusError(nextErrors, index) {
    setErrors(nextErrors);
    setStep(index);
    requestAnimationFrame(() =>
      document
        .getElementById("application-" + Object.keys(nextErrors)[0])
        ?.focus(),
    );
  }
  async function continueForm(event) {
    event.preventDefault();
    if (
      busy ||
      documentsLocked ||
      savingRef.current ||
      !saved ||
      submissionLock.current
    )
      return;
    if (step < sections.length - 1) {
      const nextErrors = sectionErrors(
        sections[step].id,
        form,
        person,
        documents,
      );
      if (Object.keys(nextErrors).length) {
        focusError(nextErrors, step);
        return;
      }
      goToStep(step + 1);
      return;
    }
    for (let index = 0; index < sections.length - 1; index++) {
      const nextErrors = sectionErrors(
        sections[index].id,
        form,
        person,
        documents,
      );
      if (Object.keys(nextErrors).length) {
        focusError(nextErrors, index);
        return;
      }
    }
    if (
      source?.revisionRequest?.status === "open" &&
      !form.responseMessage?.trim()
    ) {
      focusError(
        { responseMessage: "Explain how you addressed the correction." },
        step,
      );
      return;
    }
    if (!confirmed) {
      focusError(
        {
          consent:
            "Confirm that you have reviewed the answers and attachments.",
        },
        step,
      );
      return;
    }
    submissionLock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const id = await submitApplication(form, person, confirmed);
      navigate("/workspace/ideas/" + id + "/submitted", { replace: true });
    } catch (failure) {
      setMessage(failure.message);
      submissionLock.current = false;
      setBusy(false);
    }
  }
  async function saveAndClose() {
    if (busy || documentsLocked || savingRef.current) return;
    setBusy(true);
    try {
      if (await persistDraft(form, person)) navigate("/workspace");
    } finally {
      setBusy(false);
    }
  }
  function ideaField(field) {
    const common = {
      id: "application-" + field.key,
      name: field.key,
      value: form[field.key] || "",
      onChange: (event) => update({ ...form, [field.key]: event.target.value }),
      "aria-invalid": Boolean(errors[field.key]),
      "aria-describedby": errors[field.key]
        ? "error-" + field.key
        : "hint-" + field.key,
    };
    return (
      <div className={"ap-field ap-field-" + field.key} key={field.key}>
        <label htmlFor={common.id}>{field.label}</label>
        <p id={"hint-" + field.key}>{hints[field.key]}</p>
        {field.key === "theme" ? (
          <select {...common}>
            <option value="">Select a theme</option>
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        ) : ["title", "team"].includes(field.key) ? (
          <input {...common} maxLength={field.max} />
        ) : (
          <textarea {...common} maxLength={field.max} rows={6} />
        )}
        {errors[field.key] && (
          <span className="ap-field-error" id={"error-" + field.key}>
            {errors[field.key]}
          </span>
        )}
        {field.max && (
          <span className="ap-field-count">
            {(form[field.key] || "").length.toLocaleString()} /{" "}
            {field.max.toLocaleString()} ·{" "}
            {(form[field.key] || "").trim().split(/\s+/).filter(Boolean).length}{" "}
            words
          </span>
        )}
      </div>
    );
  }
  function budget() {
    return (
      <div className="ap-budget">
        <label className="ap-check-row">
          <input
            type="checkbox"
            checked={Boolean(form.budgetNotApplicable)}
            onChange={(event) =>
              update({ ...form, budgetNotApplicable: event.target.checked })
            }
          />
          <span>No funding figures for this application</span>
        </label>
        <p className="ap-muted">
          Only required when the programme asks for funding figures. Amounts are
          in Botswana pula.
        </p>
        {!form.budgetNotApplicable && (
          <>
            <div id="application-budgetItems" tabIndex={-1}>
              {form.budgetItems.map((item, index) => (
                <div className="ap-budget-row" key={item.id}>
                  <label>
                    Item {index + 1}
                    <input
                      aria-label={"Budget item " + (index + 1)}
                      value={item.description}
                      maxLength={200}
                      onChange={(event) =>
                        update({
                          ...form,
                          budgetItems: form.budgetItems.map((row, position) =>
                            position === index
                              ? { ...row, description: event.target.value }
                              : row,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Amount (BWP)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      aria-label={"Budget amount " + (index + 1)}
                      value={item.amount}
                      onChange={(event) =>
                        update({
                          ...form,
                          budgetItems: form.budgetItems.map((row, position) =>
                            position === index
                              ? { ...row, amount: event.target.value }
                              : row,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    className="ap-icon-control"
                    type="button"
                    aria-label={"Remove budget item " + (index + 1)}
                    onClick={() =>
                      update({
                        ...form,
                        budgetItems: form.budgetItems.filter(
                          (_, position) => position !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="ap-text-link"
              type="button"
              onClick={() =>
                update({
                  ...form,
                  budgetItems: [
                    ...form.budgetItems,
                    { id: crypto.randomUUID(), description: "", amount: "" },
                  ],
                })
              }
            >
              <Plus size={16} />
              Add budget item
            </button>
            {errors.budgetItems && (
              <p className="ap-field-error">{errors.budgetItems}</p>
            )}
            <div className="ap-budget-total">
              Total budget
              <strong>{money(budgetTotal(form.budgetItems))}</strong>
            </div>
            <div className="ap-field">
              <label htmlFor="application-fundingRequested">
                Funding requested (BWP, if applicable)
              </label>
              <input
                id="application-fundingRequested"
                type="number"
                min="0"
                step="0.01"
                value={form.fundingRequested}
                onChange={(event) =>
                  update({ ...form, fundingRequested: event.target.value })
                }
                aria-invalid={Boolean(errors.fundingRequested)}
              />
              {errors.fundingRequested && (
                <p className="ap-field-error">{errors.fundingRequested}</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
  function review() {
    const attached = documents.filter((document) =>
      form.documentIds.includes(document.id),
    );
    return (
      <>
        <p className="ap-inline-note">
          {programme.name}. Review every section and the saved attachments.
        </p>
        {[
          [
            "About you",
            <dl className="ap-review-summary" key="profile">
              {[
                ["Full name", person.fullName],
                ["Email", person.email],
                ["Phone", person.phone],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>,
          ],
          [
            "Your business",
            <div key="business">
              <p>
                {person.companyName} ·{" "}
                {person.registrationNumber || "Registration needs confirmation"}
              </p>
              <p>
                {person.shareholders.length} shareholder
                {person.shareholders.length === 1 ? "" : "s"}
              </p>
            </div>,
          ],
          [
            "Your idea",
            <dl className="ap-review-summary" key="idea">
              {applicationFields.map((field) => (
                <div key={field.key}>
                  <dt>{field.label}</dt>
                  <dd>
                    {field.key === "theme"
                      ? themes.find((theme) => theme.id === form.theme)?.name
                      : form[field.key]}
                  </dd>
                </div>
              ))}
            </dl>,
          ],
          [
            "Budget",
            <div key="budget">
              {form.budgetNotApplicable ? (
                <p>No funding figures for this application.</p>
              ) : (
                <>
                  <ul className="ap-budget-review">
                    {form.budgetItems.map((item) => (
                      <li key={item.id}>
                        <span>{item.description}</span>
                        <strong>{money(Number(item.amount))}</strong>
                      </li>
                    ))}
                  </ul>
                  <p>Total: {money(budgetTotal(form.budgetItems))}</p>
                  {form.fundingRequested !== "" && (
                    <p>Requested: {money(Number(form.fundingRequested))}</p>
                  )}
                </>
              )}
            </div>,
          ],
          ["Documents", <DocumentList key="documents" documents={attached} />],
        ].map(([label, content], index) => (
          <section className="ap-review-section" key={label}>
            <div className="ap-section-title">
              <h3>{label}</h3>
              <button
                className="ap-text-link"
                type="button"
                onClick={() => goToStep(index)}
                aria-label={"Change " + label.toLowerCase()}
              >
                Change
              </button>
            </div>
            {content}
          </section>
        ))}
        {source && (
          <div className="ap-field">
            <label htmlFor="application-responseMessage">
              {source.revisionRequest?.status === "open"
                ? "Response to the correction request"
                : "Update note (optional)"}
            </label>
            {source.revisionRequest?.message && (
              <p>{source.revisionRequest.message}</p>
            )}
            <textarea
              id="application-responseMessage"
              maxLength={3000}
              value={form.responseMessage || ""}
              onChange={(event) =>
                update({ ...form, responseMessage: event.target.value })
              }
              aria-invalid={Boolean(errors.responseMessage)}
            />
            {errors.responseMessage && (
              <p className="ap-field-error">{errors.responseMessage}</p>
            )}
          </div>
        )}
        <label className="ap-consent">
          <input
            id="application-consent"
            type="checkbox"
            checked={confirmed}
            onChange={(event) => {
              setConfirmed(event.target.checked);
              setErrors({});
            }}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? "error-consent" : undefined}
          />
          <span>I have reviewed the answers and attachments.</span>
        </label>
        {errors.consent && (
          <p className="ap-field-error" id="error-consent">
            {errors.consent}
          </p>
        )}
      </>
    );
  }
  return (
    <div className="ap-page ap-submission-page">
      <div className="ap-application-toolbar">
        <Link className="ap-text-link" to="/workspace/applications">
          <ArrowLeft size={15} />
          My applications
        </Link>
        <span className="ap-save-status" role="status">
          {saved && !saving && !storageWarning && <Check size={15} />}
          {storageWarning ||
            (saving
              ? "Saving changes…"
              : saved
                ? draft.backendOwnerId ? "Saved to CEDA" : "Saved on this device"
                : "Changes not saved")}
        </span>
      </div>
      {!saved && !saving && (
        <div className="ap-form-alert">
          <p>
            Your changes have not saved. Reopening restores the latest saved
            answers.
          </p>
          <button
            type="button"
            className="ap-button ap-button-secondary"
            onClick={reopenSavedDraft}
            disabled={busy || documentsLocked || saving}
          >
            Reopen saved draft
          </button>
        </div>
      )}
      {source && (
        <div className="ap-inline-note">
          {form.revisionKind === "correction"
            ? "Responding to a correction request"
            : "Updating your application"}{" "}
          · Existing reference and previous versions will be kept.
        </div>
      )}
      <div className="ap-form-layout">
        <form
          className="ap-form-panel ap-panel"
          noValidate
          onSubmit={continueForm}
        >
          <header className="ap-form-panel-header">
            <div>
              <h2 tabIndex={-1} ref={heading}>
                {sections[step].title}
              </h2>
              <p>
                {step === 5
                  ? "Check before you submit."
                  : "Complete this section, or save and return later."}
              </p>
            </div>
            <span className="ap-step-number">
              {String(step + 1).padStart(2, "0")}
              <span> / 06</span>
            </span>
          </header>
          {Object.keys(errors).length > 0 && (
            <div className="ap-form-alert" role="alert">
              Complete the highlighted items to continue.
            </div>
          )}
          <fieldset disabled={busy} className="ap-form-fieldset">
            {step === 0 && (
              <ProfileFields
                profile={person}
                errors={errors}
                onChange={(next) => update(form, next)}
              />
            )}
            {step === 1 && (
              <ProfileFields
                section="business"
                profile={person}
                errors={errors}
                onChange={(next) => update(form, next)}
              />
            )}
            {step === 2 && (
              <div className="ap-field-grid">
                {applicationFields.map(ideaField)}
              </div>
            )}
            {step === 3 && budget()}
            {step === 4 && (
              <ApplicantDocuments
                draftId={form.id}
                error={errors.documents}
                onChanged={() => setErrors({})}
                onPendingChange={setDocumentsPending}
              />
            )}
            {step === 5 && review()}
          </fieldset>
          {message && (
            <p className="ap-form-alert" role="alert">
              {message}
            </p>
          )}
          <div className="ap-form-controls">
            <button
              className="ap-button ap-button-secondary"
              type="button"
              onClick={saveAndClose}
              disabled={busy || documentsLocked || saving}
            >
              <Save size={16} />
              Save and close
            </button>
            <div>
              {step > 0 && (
                <button
                  className="ap-button ap-button-quiet"
                  type="button"
                  disabled={busy || documentsLocked || saving}
                  onClick={() => goToStep(step - 1)}
                >
                  <ArrowLeft size={15} />
                  Back
                </button>
              )}
              <button
                className="ap-button ap-button-primary"
                type="submit"
                disabled={busy || documentsLocked || saving || !saved}
              >
                {busy
                  ? "Saving submission…"
                  : step === 5
                    ? source
                      ? "Submit updated application"
                      : "Submit application"
                    : "Continue"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </form>
        <aside className="ap-form-sidebar" aria-label="Application progress">
          <h2>Your progress</h2>
          <div
            className="ap-completion-ring"
            style={{ "--ap-completion": progress.percent + "%" }}
            role="progressbar"
            aria-label="Application completion"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${progress.completed} of 5 sections complete`}
          >
            <strong>
              {progress.percent}
              <small>%</small>
            </strong>
          </div>
          <p className="ap-completion-caption">
            {progress.completed} of 5 sections complete
          </p>
          <ol className="ap-form-steps">
            {sections.map((section, index) => {
              const done =
                index < 5 &&
                !Object.keys(sectionErrors(section.id, form, person, documents))
                  .length;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    disabled={busy || documentsLocked || saving}
                    onClick={() => goToStep(index)}
                    className={
                      (step === index ? "is-current " : "") +
                      (done ? "is-complete" : "")
                    }
                    aria-current={step === index ? "step" : undefined}
                  >
                    <span>{done ? <Check size={13} /> : index + 1}</span>
                    {section.title}
                  </button>
                </li>
              );
            })}
          </ol>
          <Link className="ap-text-link ap-progress-guide" to="/portal/help">
            Application guide
            <ArrowRight size={14} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

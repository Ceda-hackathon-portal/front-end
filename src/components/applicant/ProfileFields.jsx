import { Plus, Trash2 } from "lucide-react";
import { ownershipSummary } from "../../utils/applicantWorkflow";

export default function ProfileFields({
  profile,
  onChange,
  section = "profile",
  errors = {},
}) {
  function field(key, label, type = "text", hint = "", maxLength = 150) {
    return (
      <div className="ap-field" key={key}>
        <label htmlFor={"application-" + key}>{label}</label>
        {hint && <p id={"hint-" + key}>{hint}</p>}
        <input
          id={"application-" + key}
          type={type}
          value={profile[key] || ""}
          onChange={(event) =>
            onChange({ ...profile, [key]: event.target.value })
          }
          maxLength={maxLength}
          aria-invalid={Boolean(errors[key])}
          aria-describedby={
            errors[key] ? "error-" + key : hint ? "hint-" + key : undefined
          }
        />
        {errors[key] && (
          <span className="ap-field-error" id={"error-" + key}>
            {errors[key]}
          </span>
        )}
      </div>
    );
  }
  function choice(key, label) {
    return (
      <div className="ap-field" key={key}>
        <label htmlFor={"application-" + key}>{label}</label>
        <select
          id={"application-" + key}
          value={profile[key] || ""}
          onChange={(event) =>
            onChange({ ...profile, [key]: event.target.value })
          }
          aria-invalid={Boolean(errors[key])}
          aria-describedby={errors[key] ? "error-" + key : undefined}
        >
          <option value="">Choose an answer</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="unknown">Needs confirmation</option>
        </select>
        {errors[key] && (
          <span className="ap-field-error" id={"error-" + key}>
            {errors[key]}
          </span>
        )}
      </div>
    );
  }
  const shareholders = profile.shareholders || [];
  function changeShareholder(index, key, value) {
    onChange({
      ...profile,
      shareholders: shareholders.map((person, position) =>
        position === index ? { ...person, [key]: value } : person,
      ),
    });
  }
  const ownership = ownershipSummary(shareholders);
  if (section === "profile")
    return (
      <div className="ap-field-grid">
        {field(
          "fullName",
          "Full name",
          "text",
          "Used on your application and contact records.",
          100,
        )}
        {field("email", "Email address", "email", "", 254)}
        {field(
          "phone",
          "Phone number",
          "tel",
          "Botswana number: 8 digits, for example 71 234 567.",
          20,
        )}
        {choice("citizen", "Are you a Botswana citizen?")}
      </div>
    );
  return (
    <>
      <div className="ap-field-grid">
        {field("companyName", "Company name")}
        {choice("registered", "Is your company registered?")}
        {profile.registered === "yes" &&
          field(
            "registrationNumber",
            "Company registration number",
            "text",
            "Copy it from the company registration extract.",
            80,
          )}
      </div>
      <section className="ap-shareholders" aria-labelledby="shareholders-title">
        <div className="ap-section-title">
          <h3 id="shareholders-title">Shareholders</h3>
          <button
            type="button"
            className="ap-text-link"
            onClick={() =>
              onChange({
                ...profile,
                shareholders: [
                  ...shareholders,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    dateOfBirth: "",
                    citizen: "",
                    percent: "",
                  },
                ],
              })
            }
          >
            <Plus size={15} />
            Add shareholder
          </button>
        </div>
        <p className="ap-muted">
          Ownership is calculated from these records. CEDA verifies the
          evidence.
        </p>
        <div
          id="application-shareholders"
          tabIndex={-1}
          aria-describedby={
            errors.shareholders ? "error-shareholders" : undefined
          }
        >
          {shareholders.map((person, index) => (
            <fieldset className="ap-shareholder" key={person.id}>
              <legend>Shareholder {index + 1}</legend>
              <div className="ap-shareholder-grid">
                <label>
                  Name
                  <input
                    aria-label={"Shareholder " + (index + 1) + " name"}
                    value={person.name}
                    maxLength={100}
                    onChange={(event) =>
                      changeShareholder(index, "name", event.target.value)
                    }
                  />
                </label>
                <label>
                  Date of birth
                  <input
                    type="date"
                    aria-label={"Shareholder " + (index + 1) + " date of birth"}
                    value={person.dateOfBirth}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(event) =>
                      changeShareholder(
                        index,
                        "dateOfBirth",
                        event.target.value,
                      )
                    }
                  />
                </label>
                <label>
                  Botswana citizen
                  <select
                    aria-label={"Shareholder " + (index + 1) + " citizenship"}
                    value={person.citizen}
                    onChange={(event) =>
                      changeShareholder(index, "citizen", event.target.value)
                    }
                  >
                    <option value="">Choose</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label>
                  Ownership %
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    aria-label={"Shareholder " + (index + 1) + " ownership"}
                    value={person.percent}
                    onChange={(event) =>
                      changeShareholder(index, "percent", event.target.value)
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                className="ap-text-link"
                aria-label={"Remove shareholder " + (index + 1)}
                onClick={() =>
                  onChange({
                    ...profile,
                    shareholders: shareholders.filter(
                      (_, position) => position !== index,
                    ),
                  })
                }
              >
                <Trash2 size={14} />
                Remove
              </button>
            </fieldset>
          ))}
          {!shareholders.length && (
            <p className="ap-inline-note">
              Add the people who own the company.
            </p>
          )}
        </div>
        {errors.shareholders && (
          <p id="error-shareholders" className="ap-field-error">
            {errors.shareholders}
          </p>
        )}
        <dl className="ap-ownership-totals">
          <div>
            <dt>Total ownership</dt>
            <dd>{ownership.total}%</dd>
          </div>
          <div>
            <dt>Youth citizen ownership (18–35)</dt>
            <dd>{ownership.youthCitizen}%</dd>
          </div>
        </dl>
      </section>
    </>
  );
}

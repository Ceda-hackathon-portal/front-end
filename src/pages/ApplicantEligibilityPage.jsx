import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CircleHelp } from "lucide-react";
import { eligibilityResults, programme } from "../utils/applicantWorkflow";

export default function ApplicantEligibilityPage() {
  const [params] = useSearchParams();
  const [answers, setAnswers] = useState({
    citizen: "",
    registered: "",
    youthOwnership: "",
  });
  const [results, setResults] = useState(null);
  function update(key, value) {
    setAnswers((current) => ({ ...current, [key]: value }));
    setResults(null);
  }
  const theme = ["digital", "sustainable", "inclusive"].includes(
    params.get("theme"),
  )
    ? params.get("theme")
    : "";
  const missesRule = results?.some((result) => result.state === "not_met");
  return (
    <div className="ap-page ap-eligibility-page">
      <Link className="ap-text-link ap-back-link" to="/portal/programmes">
        <ArrowLeft size={15} />
        Programmes
      </Link>
      <section className="ap-panel">
        <h2>Check before you apply</h2>
        <p className="ap-inline-note">
          No account or personal details are needed. These answers are not
          saved.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setResults(eligibilityResults(answers));
          }}
        >
          <div className="ap-field-grid">
            {[
              ["citizen", "Is the company citizen-owned?"],
              ["registered", "Is the company registered?"],
            ].map(([key, label]) => (
              <div className="ap-field" key={key}>
                <label htmlFor={"check-" + key}>{label}</label>
                <select
                  id={"check-" + key}
                  value={answers[key]}
                  onChange={(event) => update(key, event.target.value)}
                >
                  <option value="">Choose</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unknown">Not sure</option>
                </select>
              </div>
            ))}
            <div className="ap-field">
              <label htmlFor="check-ownership">
                Percentage held by Botswana citizens aged 18–35
              </label>
              <input
                id="check-ownership"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={answers.youthOwnership}
                onChange={(event) =>
                  update("youthOwnership", event.target.value)
                }
              />
              <p>Leave blank if you need help calculating it.</p>
            </div>
          </div>
          <button className="ap-button ap-button-primary" type="submit">
            Check eligibility
            <ArrowRight size={16} />
          </button>
        </form>
        {results && (
          <div className="ap-eligibility-results" role="status">
            <h3>
              {missesRule
                ? "An answer does not meet a stated rule"
                : results.every((result) => result.state === "met")
                  ? "Your answers meet the stated rules"
                  : "Some evidence needs confirmation"}
            </h3>
            <ul>
              {results.map((result) => (
                <li key={result.label}>
                  {result.state === "met" ? (
                    <Check size={18} />
                  ) : (
                    <CircleHelp size={18} />
                  )}
                  <div>
                    <strong>
                      {result.label}
                      <span>
                        {result.state === "met"
                          ? "Met, evidence needed"
                          : result.state === "not_met"
                            ? "Not met"
                            : "Needs evidence"}
                      </span>
                    </strong>
                    <p>{result.reason}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p>
              {programme.rulesSource} This check is guidance, not a verified
              eligibility decision.
            </p>
            {missesRule ? (
              <div className="ap-eligibility-actions">
                <button
                  className="ap-button ap-button-secondary"
                  type="button"
                  onClick={() => {
                    setResults(null);
                    document.getElementById("check-citizen")?.focus();
                  }}
                >
                  Review answers
                </button>
                <Link className="ap-text-link" to="/portal/programmes">
                  Explore programmes
                  <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <Link
                className="ap-button ap-button-primary"
                to={"/workspace/new?new=1" + (theme ? "&theme=" + theme : "")}
              >
                Continue to application
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { useStaffWorkflow } from "../../context/StaffWorkflowContext";
import { displayDate } from "../../utils/portal";

export function applicationStage(application, record) {
  if (record.decision?.publishedAt) return "Outcome released";
  if (record.decision) return "Decision drafted";
  if (record.screening?.result === "correction_needed")
    return "Correction requested";
  if (["ineligible", "not_eligible"].includes(record.screening?.result))
    return "Not eligible";
  if (
    record.screening?.result === "eligible" ||
    application.eligibility === "eligible"
  ) {
    return record.reviewCount >= (record.reviewsRequired || 1)
      ? "Decision pending"
      : record.reviewCount > 0
        ? "In review"
        : "Ready for review";
  }
  return "Screening pending";
}

export function ApplicationStatus({ label }) {
  const style = label.includes("released")
    ? "success"
    : label.includes("Not eligible")
      ? "muted"
      : label.includes("Correction")
        ? "attention"
        : "neutral";
  return <span className={"sw-status sw-status-" + style}>{label}</span>;
}

export default function StaffApplicationsPage() {
  const { applications, getRecord } = useStaffWorkflow();
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const route = pathname.split("/").at(-1);
  const title =
    {
      screening: "Screening queue",
      reviews: "Review queue",
      decisions: "Decision queue",
    }[route] || "Applications";
  const [filter, setFilter] = useState("all");
  const search = query.trim().toLowerCase();
  const rows = applications.filter((application) => {
    const record = getRecord(application.id);
    const label = applicationStage(application, record);
    if (
      route === "screening" &&
      !["Screening pending", "Correction requested", "Not eligible"].includes(
        label,
      )
    )
      return false;
    if (
      route === "reviews" &&
      !["Ready for review", "In review", "Decision pending"].includes(label)
    )
      return false;
    if (
      route === "decisions" &&
      ![
        "Decision pending",
        "Decision drafted",
        "Outcome released",
        "Not eligible",
      ].includes(label)
    )
      return false;
    return (
      (filter === "all" || label === filter) &&
      (!search ||
        [application.reference, application.title, application.team].some(
          (value) => value?.toLowerCase().includes(search),
        ))
    );
  });
  const statuses = [
    "Screening pending",
    "Correction requested",
    "Ready for review",
    "In review",
    "Decision pending",
    "Decision drafted",
    "Outcome released",
    "Not eligible",
  ];

  return (
    <div className="st-page sw-page">
      <header className="st-page-header">
        <div>
          <span className="st-eyebrow">CASEWORK</span>
          <h1>{title}</h1>
          <p>
            {rows.length} of {applications.length} records in this browser
          </p>
        </div>
      </header>
      <section
        className="st-panel sw-register"
        aria-label="Application register"
      >
        <div className="sw-register-tools">
          <label className="sw-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search applications</span>
            <input
              value={query}
              placeholder="Search title, team or reference"
              onChange={(event) => {
                setQuery(event.target.value);
                setParams(event.target.value ? { q: event.target.value } : {}, {
                  replace: true,
                });
              }}
            />
          </label>
          <label className="sw-filter">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className="sr-only">Application stage</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All stages</option>
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>
        {rows.length ? (
          <div className="sw-application-list">
            <div className="sw-list-heading" aria-hidden="true">
              <span>Application</span>
              <span>Stage</span>
              <span>Received</span>
              <span />
            </div>
            {rows.map((application) => (
              <Link
                className="sw-application-row"
                key={application.id}
                to={"/admin/applications/" + application.id}
              >
                <div className="sw-case-title">
                  <small>{application.reference}</small>
                  <strong>{application.title}</strong>
                  <span>
                    {application.team || "Company details not supplied"}
                  </span>
                </div>
                <ApplicationStatus
                  label={applicationStage(
                    application,
                    getRecord(application.id),
                  )}
                />
                <span className="sw-row-date">
                  {application.submittedAt
                    ? displayDate(application.submittedAt)
                    : "Date not supplied"}
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="st-empty">
            <h2>No matching applications</h2>
            <p className="st-muted">Try another search or stage.</p>
            <button
              className="st-text-link"
              onClick={() => {
                setQuery("");
                setFilter("all");
                setParams({});
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

import { useState } from "react";
import { Download } from "lucide-react";
import { useStaffWorkflow } from "../../context/StaffWorkflowContext";
import { themes } from "../../data/portal";
import { applicationStage } from "./StaffApplicationsPage";

export default function StaffManagementPage() {
  const { applications, getRecord } = useStaffWorkflow();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const stages = [
    "Screening pending",
    "Correction requested",
    "Ready for review",
    "In review",
    "Decision pending",
    "Decision drafted",
    "Outcome released",
    "Not eligible",
  ];
  const counts = stages.map((stage) => ({
    stage,
    count: applications.filter(
      (application) =>
        applicationStage(application, getRecord(application.id)) === stage,
    ).length,
  }));
  const released = applications.filter(
    (application) => getRecord(application.id).decision?.publishedAt,
  );
  function exportSummary() {
    try {
      const rows = [
        ["Stage", "Applications"],
        ...counts.map((item) => [item.stage, item.count]),
      ];
      const blob = new Blob([rows.map((row) => row.join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "ceda-workflow-summary.csv";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError("");
      setSuccess("Summary export prepared. It contains counts only.");
    } catch {
      setError("The export could not be prepared. Please retry.");
      setSuccess("");
    }
  }
  return (
    <div className="st-page sw-page">
      <header className="st-page-header">
        <div>
          <span className="st-eyebrow">MANAGEMENT</span>
          <h1>Participation & progress</h1>
          <p>Counts from the records in this browser.</p>
        </div>
        <button
          className="st-button st-button-secondary"
          onClick={exportSummary}
        >
          <Download size={16} />
          Export summary
        </button>
      </header>
      {error && (
        <p className="st-alert" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="sw-success" role="status">
          {success}
        </p>
      )}
      <dl className="sw-metrics">
        <div>
          <dt>Applications</dt>
          <dd>{applications.length}</dd>
        </div>
        <div>
          <dt>Themes represented</dt>
          <dd>
            {new Set(applications.map((application) => application.theme)).size}
          </dd>
        </div>
        <div>
          <dt>Outcomes released</dt>
          <dd>{released.length}</dd>
        </div>
        <div>
          <dt>Selected</dt>
          <dd>
            {
              released.filter(
                (application) =>
                  getRecord(application.id).decision.result === "selected",
              ).length
            }
          </dd>
        </div>
      </dl>
      <div className="sw-insights-grid">
        <section className="st-panel">
          <h2>Applications by stage</h2>
          <div className="sw-report-bars">
            {counts.map(({ stage, count }) => (
              <div key={stage}>
                <span>{stage}</span>
                <div>
                  <i
                    style={{
                      width:
                        (applications.length
                          ? (count / applications.length) * 100
                          : 0) + "%",
                    }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="st-panel">
          <h2>Participation by theme</h2>
          <ul className="sw-theme-counts">
            {themes.map((theme) => (
              <li key={theme.id}>
                <span>{theme.name}</span>
                <strong>
                  {
                    applications.filter(
                      (application) => application.theme === theme.id,
                    ).length
                  }
                </strong>
              </li>
            ))}
          </ul>
          <p className="st-muted sw-spaced">
            Sample and locally created records are included. These are not
            national programme statistics.
          </p>
        </section>
      </div>
    </div>
  );
}

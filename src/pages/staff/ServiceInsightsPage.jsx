import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  CalendarDays,
  ChartNoAxesCombined,
  Clock,
  Layers,
  RefreshCw,
} from "lucide-react";
import { serviceApi } from "../../services/serviceApi";
import { useServiceData } from "../../components/service/useServiceData";
import "../../styles/service-center.css";
const day = (date) => date.toISOString().slice(0, 10);
const readable = (s) => s.toLowerCase().replaceAll("_", " ");
export default function ServiceInsightsPage() {
  const [from, setFrom] = useState(() =>
      day(new Date(Date.now() - 89 * 86400000)),
    ),
    [to, setTo] = useState(() => day(new Date())),
    [programme, setProgramme] = useState(""),
    [exportError, setExportError] = useState("");
  const [breakdown, setBreakdown] = useState("workflow");
  const programmes = useServiceData(() => serviceApi.get("/programmes"));
  const query = `?from=${from}&to=${to}${programme ? "&programmeId=" + programme : ""}`;
  const { data, error, refresh } = useServiceData(
    () => serviceApi.get("/insights" + query),
    15000,
    query,
  );

  const total =
      data?.participation.reduce((n, d) => n + d.applications, 0) || 0,
    submitted = data?.participation.reduce((n, d) => n + d.submissions, 0) || 0;
  const maximum = Math.max(
    2,
    ...(data?.participation || []).map((d) =>
      Math.max(d.applications, d.submissions),
    ),
  );
  const stages = data?.stages || [],
    stageTotal = stages.reduce((n, x) => n + x.count, 0),
    resolved = data?.support?.resolved || 0;
  const breakdownRows =
    breakdown === "outcomes"
      ? (data?.outcomes || []).map((o) => ({
          stage:
            { APPROVED: "Selected", REJECTED: "Not selected" }[o.outcome] ||
            readable(o.outcome),
          count: o.count,
        }))
      : stages;
  const breakdownTotal = breakdownRows.reduce((sum, row) => sum + row.count, 0);
  function exportCsv() {
    try {
      const rows = [
        ["Date", "Applications created", "Submissions"],
        ...data.participation.map((d) => [
          d.day,
          d.applications,
          d.submissions,
        ]),
        [],
        ["Stage", "Applications"],
        ...stages.map((s) => [s.stage, s.count]),
        [],
        ["Published outcome", "Count"],
        ...data.outcomes.map((o) => [o.outcome, o.count]),
      ];
      const blob = new Blob([rows.map((r) => r.join(",")).join("\r\n")], {
          type: "text/csv;charset=utf-8",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `ceda-insights-${from}-${to}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportError("");
    } catch {
      setExportError("The report could not be exported. Try again.");
    }
  }
  return (
    <div className="sc-page sc-insights">
      <header className="sc-page-title">
        <div>
          <span className="sc-eyebrow">PROGRAMME INTELLIGENCE</span>
          <h1>Insights</h1>
        </div>
        <button onClick={refresh} aria-label="Refresh insights">
          <RefreshCw size={16} />
        </button>
      </header>
      <div className="sc-report-toolbar">
        <CalendarDays size={16} />
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter programme"
          value={programme}
          onChange={(e) => setProgramme(e.target.value)}
        >
          <option value="">All authorised programmes</option>
          {(programmes.data || []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button disabled={!data} onClick={exportCsv}>
          <ArrowDownToLine size={15} />
          Export
        </button>
      </div>
      {(error || exportError || programmes.error) && (
        <p role="alert" className="sc-error">
          {error || exportError || programmes.error}
        </p>
      )}
      {!data ? (
        <p role="status">
          {error
            ? "Report unavailable. Adjust the filters or retry."
            : "Loading programme records…"}
        </p>
      ) : (
        <>
          <section className="sc-report-card sc-trend-card">
            <header>
              <h2>
                Participation trend <ChartNoAxesCombined size={16} />
              </h2>
              <span>Applications / submitted</span>
            </header>
            <div
              className="sc-trend"
              role="img"
              aria-label={`Daily participation: ${total} applications created and ${submitted} submissions between ${from} and ${to}.`}
            >
              <div className="sc-chart-scale">
                <span>{maximum}</span>
                <span>{Math.round(maximum / 2)}</span>
                <span>0</span>
              </div>
              <div className="sc-chart-columns">
                {data.participation.map((d) => (
                  <div
                    className="sc-chart-column"
                    key={d.day}
                    title={`${d.day}: ${d.applications} created; ${d.submissions} submitted`}
                  >
                    {Array.from({ length: 24 }, (_, i) => {
                      const threshold = ((24 - i) / 24) * maximum;
                      return (
                        <i
                          key={i}
                          className={
                            d.submissions >= threshold
                              ? "submitted"
                              : d.applications >= threshold
                                ? "created"
                                : ""
                          }
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="sc-chart-labels">
              <span>{from}</span>
              <span>Each column represents one day</span>
              <span>{to}</span>
            </div>
            <div className="sc-metrics">
              {[
                [Layers, "Applications created", total],
                [ChartNoAxesCombined, "Submissions", submitted],
                [
                  Clock,
                  "Average decision time",
                  data.timing?.averageDays == null
                    ? "—"
                    : data.timing.averageDays.toFixed(1) + " days",
                ],
                [Layers, "Outcomes published", data.timing?.released || 0],
              ].map(([Icon, label, value]) => (
                <div key={label}>
                  <small>
                    <Icon size={14} />
                    {label}
                  </small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
          <div className="sc-insight-grid">
            <section className="sc-report-card">
              <header>
                <h2>
                  {breakdown === "outcomes"
                    ? "Published outcomes"
                    : "Workflow breakdown"}
                </h2>
                <select
                  aria-label="Breakdown view"
                  value={breakdown}
                  onChange={(e) => setBreakdown(e.target.value)}
                >
                  <option value="workflow">Workflow</option>
                  <option value="outcomes">Published outcomes</option>
                </select>
              </header>
              <strong className="sc-large-stat">
                {breakdown === "outcomes" ? breakdownTotal : submitted}
              </strong>
              <p className="sc-fine">
                {breakdown === "outcomes"
                  ? "Outcomes published during the selected period"
                  : `${stageTotal} applications created; submissions during this period shown above`}
              </p>
              <div className="sc-stage-bar">
                {breakdownRows.map((s, i) => (
                  <span
                    key={s.stage}
                    style={{
                      width:
                        (breakdownTotal
                          ? (s.count / breakdownTotal) * 100
                          : 0) + "%",
                      background: [
                        "var(--sc-series-1, #a95c36)",
                        "var(--sc-series-2, #c99c61)",
                        "var(--sc-series-3, #999d7b)",
                        "var(--sc-series-4, #687b67)",
                        "var(--sc-series-5, #bdb5a8)",
                      ][i % 5],
                    }}
                    title={`${s.stage}: ${s.count}`}
                  />
                ))}
              </div>
              <dl className="sc-breakdown">
                {breakdownRows.map((s, i) => (
                  <div key={s.stage}>
                    <dt>
                      <i
                        style={{
                          background: [
                            "var(--sc-series-1, #a95c36)",
                            "var(--sc-series-2, #c99c61)",
                            "var(--sc-series-3, #999d7b)",
                            "var(--sc-series-4, #687b67)",
                            "var(--sc-series-5, #bdb5a8)",
                          ][i % 5],
                        }}
                      />
                      {readable(s.stage)}
                    </dt>
                    <dd>{s.count}</dd>
                  </div>
                ))}
              </dl>
              {!breakdownRows.length && (
                <p className="sc-empty">
                  {breakdown === "outcomes"
                    ? "No outcomes were published in this period."
                    : "No applications were created in this period."}
                </p>
              )}
            </section>
            <section className="sc-report-card">
              <header>
                <h2>Consultant service</h2>
                <span>From conversations</span>
              </header>
              <strong className="sc-large-stat">
                {data.support?.total
                  ? Math.round((resolved / data.support.total) * 100)
                  : 0}
                <small>% resolved</small>
              </strong>
              <div className="sc-service-meter">
                <span
                  style={{
                    width:
                      (data.support?.total
                        ? (resolved / data.support.total) * 100
                        : 0) + "%",
                  }}
                />
              </div>
              <dl className="sc-breakdown">
                <div>
                  <dt>Conversations</dt>
                  <dd>{data.support?.total || 0}</dd>
                </div>
                <div>
                  <dt>Average first reply</dt>
                  <dd>
                    {data.support?.averageReplyMinutes == null
                      ? "—"
                      : Math.round(data.support.averageReplyMinutes) + " min"}
                  </dd>
                </div>
                <div>
                  <dt>Average resolution</dt>
                  <dd>
                    {data.support?.averageResolutionHours == null
                      ? "—"
                      : data.support.averageResolutionHours.toFixed(1) + " hrs"}
                  </dd>
                </div>
              </dl>
              <p className="sc-fine">
                Elapsed time includes closed hours. Unanswered conversations are
                excluded from response averages.
              </p>
            </section>
          </div>
          <details className="sc-report-card sc-accessible-data">
            <summary>View chart data</summary>
            <table>
              <caption>Participation by day</caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Created</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {data.participation.map((d) => (
                  <tr key={d.day}>
                    <td>{d.day}</td>
                    <td>{d.applications}</td>
                    <td>{d.submissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { serviceApi } from "../../services/serviceApi";
import { useServiceData } from "../../components/service/useServiceData";
import "../../styles/service-center.css";
export default function ServiceAuditPage() {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState(""),
    [offset, setOffset] = useState(0),
    [before] = useState(() => new Date().toISOString());
  const { data, error, refresh } = useServiceData(
    () =>
      serviceApi.get(
        `/audit?before=${encodeURIComponent(before)}&action=${encodeURIComponent(filter)}&offset=${offset}`,
      ),
    0,
    `${filter}:${offset}`,
  );

  return (
    <div className="sc-page">
      <header className="sc-page-title">
        <div>
          <span className="sc-eyebrow">ACCOUNTABILITY</span>
          <h1>Activity trail</h1>
        </div>
        <ShieldCheck size={22} />
      </header>
      <form
        className="sc-report-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setOffset(0);
          setFilter(query);
        }}
      >
        <Search size={16} />
        <input
          aria-label="Search action"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by action, for example document…"
        />
        <button type="submit">Search</button>
      </form>
      {error && (
        <p role="alert" className="sc-error">
          {error}
        </p>
      )}
      <div className="sc-report-card sc-table-scroll">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Activity</th>
              <th>Record</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.actor}</td>
                <td>{r.action}</td>
                <td>
                  <code title={r.target}>{r.target.slice(0, 8)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !data.items.length && (
          <p className="sc-empty">
            No matching activities in your authorised programmes.
          </p>
        )}
      </div>
      <div className="sc-pagination">
        <button
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          Previous
        </button>
        <span>Page {offset / 50 + 1}</span>
        <button
          disabled={!data?.hasMore}
          onClick={() => setOffset(offset + 50)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

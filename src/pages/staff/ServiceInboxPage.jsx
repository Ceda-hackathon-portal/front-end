import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { MessageSquare, Search } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { serviceApi } from "../../services/serviceApi";
import { useServiceData } from "../../components/service/useServiceData";
import Conversation from "../../components/service/Conversation";
import "../../styles/service-center.css";

export default function ServiceInboxPage() {
  const { staffUser } = useAuth();
  const [params] = useSearchParams();
  const [selected, setSelected] = useState(null),
    [filter, setFilter] = useState("OPEN"),
    [query, setQuery] = useState(""),
    [available, setAvailable] = useState(false),
    [failure, setFailure] = useState("");
  const [page, setPage] = useState(0);
  const filterKey = `${filter}:${query}:${page}`;
  const { data, error, refresh } = useServiceData(
    () =>
      serviceApi.get(
        `/conversations?paged=1&offset=${page * 100}&status=${filter}&q=${encodeURIComponent(query)}`,
      ),
    3000,
    filterKey,
  );
  useEffect(() => {
    const id = params.get("conversation");
    if (id && /^[0-9a-f-]{36}$/i.test(id)) setSelected(id);
  }, [params]);
  const status = useServiceData(() => serviceApi.get("/availability"), 10000);
  useEffect(() => {
    if (!available) return;
    const beat = () =>
      serviceApi
        .post("/agent", { available: true })
        .catch((e) => setFailure(e.message));
    void beat();
    const timer = setInterval(beat, 15000);
    return () => clearInterval(timer);
  }, [available]);
  async function toggle() {
    try {
      await serviceApi.post("/agent", { available: !available });
      setAvailable(!available);
      setFailure("");
      await status.refresh();
    } catch (e) {
      setFailure(e.message);
    }
  }
  const items = (data?.items || []).filter(
    (c) =>
      (filter === "ALL" || c.status === filter) &&
      `${c.name} ${c.subject}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="sc-page sc-inbox-page">
      <header className="sc-page-title">
        <div>
          <span className="sc-eyebrow">CONSULTANT WORKSPACE</span>
          <h1>Conversations</h1>
        </div>
        <label className="sc-toggle">
          <input type="checkbox" checked={available} onChange={toggle} />
          <span className={available ? "is-online" : ""} />{" "}
          {available ? "Available" : "Offline"}
        </label>
      </header>
      <p className="sc-availability">
        {status.data?.message || "Checking service availability…"}
      </p>
      {(error || failure) && (
        <p className="sc-error" role="alert">
          {failure || error}
        </p>
      )}
      <div className="sc-inbox">
        <aside className="sc-thread-list">
          <h2>
            <MessageSquare size={18} />
            My conversations <span>{data?.items.length ?? 0}</span>
          </h2>
          <label className="sc-search">
            <Search size={15} />
            <input
              aria-label="Search conversations"
              placeholder="Find an applicant…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <div className="sc-filter-tabs">
            {[
              ["OPEN", "Open"],
              ["RESOLVED", "Resolved"],
              ["ALL", "All"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={value === filter ? "active" : ""}
                onClick={() => {
                  setFilter(value);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {items.map((c) => (
            <button
              key={c.id}
              className={"sc-thread" + (selected === c.id ? " active" : "")}
              onClick={() => setSelected(c.id)}
            >
              <span className="sc-avatar">{c.name?.slice(0, 1)}</span>
              <span>
                <strong>{c.name}</strong>
                <small>{c.subject}</small>
              </span>
              {c.unread > 0 && <b className="sc-unread">{c.unread}</b>}
            </button>
          ))}
          {!items.length && (
            <p className="sc-empty">
              {data
                ? "No conversations in this view."
                : "Loading conversations…"}
            </p>
          )}
          <div className="sc-pagination">
            <button disabled={!page} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>{page + 1}</span>
            <button disabled={!data?.hasMore} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </aside>
        {selected ? (
          <Conversation
            key={selected}
            id={selected}
            user={staffUser}
            onChanged={refresh}
            showContext
          />
        ) : (
          <section className="sc-select-thread">
            <MessageSquare size={32} />
            <h2>Choose a conversation</h2>
            <p>
              Select a conversation to read the applicant’s question, see its
              context and reply.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  MessageSquare,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest } from "../../services/apiClient";
import { serviceApi } from "../../services/serviceApi";
import { useServiceData } from "./useServiceData";
import Conversation from "./Conversation";
import ServicePreferences from "./ServicePreferences";
import "../../styles/service-center.css";

export function ApplicantServiceContent({ user, initialConversation = null }) {
  const [tab, setTab] = useState("chat"),
    [selected, setSelected] = useState(null),
    [subject, setSubject] = useState(""),
    [programme, setProgramme] = useState(""),
    [error, setError] = useState(""),
    [creating, setCreating] = useState(false);
  useEffect(() => {
    if (initialConversation) {
      setSelected(initialConversation);
      setTab("chat");
    }
  }, [initialConversation]);
  const [chatPage, setChatPage] = useState(0);
  const chats = useServiceData(
      () => serviceApi.get(`/conversations?paged=1&offset=${chatPage * 100}`),
      3000,
      chatPage,
    ),
    alerts = useServiceData(() => serviceApi.get("/notifications"), 10000);
  const programmes = useServiceData(async () => {
    const r = await apiRequest("/programmes");
    return r.data;
  });
  const applications = useServiceData(async () => {
    const r = await apiRequest("/applications");
    return r.data;
  });
  const [applicationId, setApplicationId] = useState("");
  const [retryId, setRetryId] = useState(() => crypto.randomUUID());
  async function create(e) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const result = await serviceApi.post("/conversations", {
        clientId: retryId,
        programmeId: programme || programmes.data?.[0]?.programmeId,
        subject,
        ...(applicationId ? { applicationId } : {}),
      });
      setChatPage(0);
      setSelected(result.id);
      setRetryId(crypto.randomUUID());
      setSubject("");
      setError("");
      await chats.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }
  return (
    <>
      <nav className="sc-drawer-tabs">
        {[
          ["chat", "Messages", MessageSquare],
          ["alerts", "Updates", Bell],
          ["settings", "Settings", Settings],
        ].map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              setSelected(null);
            }}
            className={tab === id ? "active" : ""}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>
      {tab === "chat" &&
        (selected ? (
          <>
            <button className="sc-back" onClick={() => setSelected(null)}>
              <ArrowLeft size={14} />
              All conversations
            </button>
            <Conversation
              key={selected}
              id={selected}
              user={user}
              onChanged={chats.refresh}
            />
          </>
        ) : (
          <div className="sc-drawer-content">
            <h3>Your conversations</h3>
            {(chats.data?.items || []).map((c) => (
              <button
                className="sc-thread"
                key={c.id}
                onClick={() => setSelected(c.id)}
              >
                <MessageSquare size={17} />
                <span>
                  <strong>{c.subject}</strong>
                  <small>
                    {c.status === "OPEN"
                      ? "Awaiting or in conversation"
                      : "Resolved"}
                  </small>
                </span>
                {c.unread > 0 && <b>{c.unread}</b>}
              </button>
            ))}
            <div className="sc-pagination">
              <button
                disabled={!chatPage}
                onClick={() => setChatPage(chatPage - 1)}
              >
                Previous
              </button>
              <span>{chatPage + 1}</span>
              <button
                disabled={!chats.data?.hasMore}
                onClick={() => setChatPage(chatPage + 1)}
              >
                Next
              </button>
            </div>
            <form className="sc-new-chat" onSubmit={create}>
              <h3>
                <Plus size={16} /> Ask a consultant
              </h3>
              <label>
                Programme
                <select
                  value={programme || programmes.data?.[0]?.programmeId || ""}
                  onChange={(e) => {
                    setProgramme(e.target.value);
                    setApplicationId("");
                  }}
                >
                  {(programmes.data || []).map((p) => (
                    <option key={p.programmeVersionId} value={p.programmeId}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Related application
                <select
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                >
                  <option value="">General question</option>
                  {(applications.data || [])
                    .filter(
                      (a) =>
                        a.programmeId ===
                        (programme || programmes.data?.[0]?.programmeId),
                    )
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.latestSubmission?.reference ||
                          a.fields?.title ||
                          "Draft application"}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                What do you need help with?
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={160}
                  required
                  placeholder="For example, uploading a document"
                />
              </label>
              <button
                type="submit"
                disabled={
                  creating || !subject.trim() || !programmes.data?.length
                }
              >
                {creating ? "Opening…" : "Start conversation"}
              </button>
            </form>
            <p className="sc-error" role="alert">
              {error || chats.error || programmes.error || applications.error}
            </p>
          </div>
        ))}
      {tab === "alerts" && (
        <div className="sc-drawer-content">
          <h3>Application updates</h3>
          <p className="sc-fine">Free updates from your applications.</p>
          {alerts.error && <p role="alert">{alerts.error}</p>}
          {alerts.data?.length === 0 && (
            <p className="sc-empty">No updates yet.</p>
          )}
          {(alerts.data || []).map((n) => (
            <article
              key={n.id}
              className={"sc-notification" + (!n.read_at ? " unread" : "")}
            >
              <Link
                to={n.href}
                onClick={() =>
                  serviceApi
                    .post(`/notifications/${n.id}/read`)
                    .then(alerts.refresh)
                    .catch((e) => setError(e.message))
                }
              >
                {n.title}
              </Link>
              <small>{new Date(n.created_at).toLocaleString()}</small>
            </article>
          ))}
        </div>
      )}
      {tab === "settings" && <ServicePreferences />}
    </>
  );
}
export default function ApplicantServiceDrawer() {
  const { user } = useAuth(),
    { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [incomingConversation, setIncomingConversation] = useState(null);
  useEffect(() => {
    const show = (e) => {
      if (e.detail?.conversationId) {
        setIncomingConversation(e.detail.conversationId);
        setOpen(true);
      }
    };
    window.addEventListener("ceda:support-open", show);
    return () => window.removeEventListener("ceda:support-open", show);
  }, []);
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    function trap(event) {
      if (event.key !== "Tab") return;
      const controls = [
        ...panel.current.querySelectorAll(
          "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
        ),
      ];
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    const section = panel.current;
    section?.addEventListener("keydown", trap);
    return () => {
      section?.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [open]);
  const status = useServiceData(() => serviceApi.get("/availability"), 30000);
  if (
    /^\/(admin|staff|review|adjudication|management|system)(\/|$)/.test(
      pathname,
    )
  )
    return null;
  return (
    <div className="sc-support-widget">
      {open && (
        <>
          <button
            className="sc-drawer-backdrop"
            aria-label="Close support"
            onClick={() => setOpen(false)}
          />
          <section
            ref={panel}
            className="sc-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="CEDA support"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          >
            <header className="sc-drawer-header">
              <img src="/images/ceda-logo.png" alt="CEDA" />
              <div>
                <strong>Here to help</strong>
                <small>Innovation portal support</small>
              </div>
              <button
                autoFocus
                onClick={() => setOpen(false)}
                aria-label="Close support"
              >
                <X size={18} />
              </button>
            </header>
            <p className="sc-availability">
              {status.data?.message ||
                status.error ||
                "Checking consultant availability…"}
            </p>
            {user && !user.demo ? (
              <ApplicantServiceContent
                user={user}
                initialConversation={incomingConversation}
              />
            ) : (
              <div className="sc-drawer-content">
                <h3>Speak with CEDA</h3>
                <p>
                  Sign in to send a private message and keep the conversation
                  with your application.
                </p>
                <Link
                  className="sc-primary-link"
                  to="/login"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>
                <Link to="/help" onClick={() => setOpen(false)}>
                  Read the help guide
                </Link>
              </div>
            )}
          </section>
        </>
      )}
      <button
        className="sc-support-trigger"
        aria-expanded={open}
        aria-label={open ? "Close support" : "Open CEDA support"}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </div>
  );
}

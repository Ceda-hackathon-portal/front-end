import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCheck, Phone, Send } from "lucide-react";
import { serviceApi } from "../../services/serviceApi";
import { useServiceData } from "./useServiceData";
import CallPanel from "./CallPanel";

const time = (value) =>
  new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
export default function Conversation({
  id,
  user,
  onChanged,
  showContext = false,
}) {
  const { data, error, refresh } = useServiceData(
    () => serviceApi.get(`/conversations/${id}`),
    2000,
  );
  const [text, setText] = useState(""),
    [internal, setInternal] = useState(false),
    [sending, setSending] = useState(false),
    [failure, setFailure] = useState("");
  const [handoffReason,setHandoffReason]=useState("");
  const [history, setHistory] = useState([]),
    [canLoadOlder, setCanLoadOlder] = useState(null),
    [loadingOlder, setLoadingOlder] = useState(false);
  const transcript = useRef(null),
    scrollAnchor = useRef(null),
    atBottom = useRef(true);
  const mergeMessages = (current, next) =>
    [...new Map([...current, ...next].map((m) => [m.id, m])).values()].sort(
      (a, b) =>
        (a.sort_key || a.created_at).localeCompare(
          b.sort_key || b.created_at,
        ) || a.id.localeCompare(b.id),
    );
  useEffect(() => {
    if (data?.messages)
      setHistory((current) => mergeMessages(current, data.messages));
  }, [data?.messages]);
  useLayoutEffect(() => {
    if (scrollAnchor.current && transcript.current) {
      const { height, top } = scrollAnchor.current;
      transcript.current.scrollTop =
        top + transcript.current.scrollHeight - height;
      scrollAnchor.current = null;
    } else if (atBottom.current) {
      bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [history]);
  async function loadOlder() {
    if (loadingOlder || !history[0]) return;
    setLoadingOlder(true);
    setFailure("");
    try {
      const older = await serviceApi.get(
        `/conversations/${id}?beforeId=${history[0].id}`,
      );
      if (transcript.current)
        scrollAnchor.current = {
          height: transcript.current.scrollHeight,
          top: transcript.current.scrollTop,
        };
      atBottom.current = false;
      setHistory((current) => mergeMessages(current, older.messages));
      setCanLoadOlder(older.hasMoreMessages);
    } catch (e) {
      setFailure(e.message);
    } finally {
      setLoadingOlder(false);
    }
  }
  const retry = useRef(null),
    bottom = useRef(null);
  useEffect(() => {
    void refresh();
  }, [id, refresh]);
  useEffect(() => {
    if (data?.id && document.visibilityState === "visible")
      serviceApi
        .post(`/conversations/${id}/read`)
        .catch((e) => setFailure(e.message));
  }, [id, data?.messages?.length]);
  async function act(action, body = {}) {
    setFailure("");
    try {
      await serviceApi.post(`/conversations/${id}/${action}`, body);
      await refresh();
      onChanged?.();
    } catch (e) {
      setFailure(e.message);
    }
  }
  async function send(event) {
    event.preventDefault();
    if (sending || !text.trim()) return;
    setSending(true);
    setFailure("");
    const body = text.trim();
    if (
      !retry.current ||
      retry.current.body !== body ||
      retry.current.internal !== internal
    )
      retry.current = { clientId: crypto.randomUUID(), body, internal };
    try {
      await serviceApi.post(`/conversations/${id}/messages`, retry.current);
      retry.current = null;
      setText("");
      await refresh();
      onChanged?.();
    } catch (e) {
      setFailure(
        e.message + " Your message has not been cleared. Retry to send it.",
      );
    } finally {
      setSending(false);
    }
  }
  if (!data)
    return (
      <p role={error ? "alert" : "status"}>
        {error || "Opening conversation…"}
      </p>
    );
  const mine = data.agent_id === user.id;
  return (
    <div
      className={"sc-conversation-layout" + (showContext ? " has-context" : "")}
    >
      <section className="sc-conversation">
        <header className="sc-chat-header">
          <span className="sc-avatar">{data.name?.slice(0, 1)}</span>
          <div>
            <strong>{data.staff ? data.name : "CEDA consultant"}</strong>
            <small>{data.subject}</small>
          </div>
          <span
            className={"sc-state " + (data.status === "OPEN" ? "is-open" : "")}
          >
            {data.status === "OPEN" ? "Open" : "Resolved"}
          </span>
          {data.staff && !mine && data.status === "OPEN" && (!data.agent_id?<button onClick={()=>act("claim")}>Take conversation</button>:<details className="sc-handoff"><summary>Take over</summary><div><label>Reason for reassignment<textarea aria-label="Reason for reassignment" value={handoffReason} onChange={e=>setHandoffReason(e.target.value)} maxLength={1000}/></label><small>The assigned consultant must be offline.</small><button disabled={handoffReason.trim().length<3} onClick={()=>act("claim",{reason:handoffReason.trim()})}>Take over conversation</button></div></details>)}
          {data.agent_id && data.status === "OPEN" && (!data.staff || mine) && (
            <button
              title="Start audio call"
              aria-label="Start audio call"
              onClick={() => act("calls", { clientId: crypto.randomUUID() })}
            >
              <Phone size={17} />
            </button>
          )}
        </header>
        <CallPanel
          key={data.call?.id || "none"}
          call={data.call}
          userId={user.id}
          onRefresh={refresh}
        />
        <div
          ref={transcript}
          onScroll={(e) => {
            const el = e.currentTarget;
            atBottom.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className="sc-transcript"
          role="log"
          aria-label="Conversation messages"
          aria-live="polite"
        >
          <div className="sc-day">
            {new Date(data.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
            })}
          </div>
          {(canLoadOlder ?? data.hasMoreMessages) && (
            <button onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? "Loading…" : "Load earlier messages"}
            </button>
          )}
          {!history.length && (
            <p className="sc-empty">
              Send your question. A consultant will reply here.
            </p>
          )}
          {history.map((m) => (
            <article
              key={m.id}
              className={
                "sc-message " +
                (m.sender_id === user.id ? "is-mine " : "") +
                (m.internal ? "is-note" : "")
              }
            >
              <small>
                {m.internal ? "Internal note · " : ""}
                {m.name}
              </small>
              <p>{m.body}</p>
              <footer>
                {time(m.created_at)}{" "}
                {m.sender_id === user.id && (
                  <CheckCheck size={12} aria-label="Saved to server" />
                )}
              </footer>
            </article>
          ))}
          <div ref={bottom} />
        </div>
        {(error || failure) && (
          <p className="sc-error" role="alert">
            {failure || error}
          </p>
        )}
        {data.status === "RESOLVED" ? (
          <div className="sc-resolved">
            This conversation is resolved.{" "}
            <button onClick={() => act("status", { status: "OPEN" })}>
              Reopen
            </button>
          </div>
        ) : (
          <>
            {data.staff && (
              <div className="sc-compose-tabs">
                <button
                  className={!internal ? "active" : ""}
                  onClick={() => setInternal(false)}
                >
                  Reply
                </button>
                <button
                  className={internal ? "active" : ""}
                  onClick={() => setInternal(true)}
                >
                  Internal note
                </button>
                <button
                  className="sc-resolve"
                  disabled={!mine}
                  onClick={() => act("status", { status: "RESOLVED" })}
                >
                  Resolve conversation
                </button>
              </div>
            )}
            <form
              className={"sc-compose" + (internal ? " is-note" : "")}
              onSubmit={send}
            >
              <textarea
                aria-label={internal ? "Internal note" : "Your message"}
                placeholder={
                  internal
                    ? "Only consultants can see this note…"
                    : "Write a message…"
                }
                value={text}
                maxLength={4000}
                onChange={(e) => setText(e.target.value)}
                disabled={sending || (data.staff && !mine)}
              />
              <footer>
                <small>
                  {internal
                    ? "Visible to CEDA staff only"
                    : "Messages are saved securely to your account"}
                </small>
                <button
                  type="submit"
                  disabled={sending || !text.trim() || (data.staff && !mine)}
                >
                  <Send size={15} />
                  {sending ? "Sending…" : "Send"}
                </button>
              </footer>
            </form>
          </>
        )}
      </section>
      {showContext && (
        <aside className="sc-context">
          <h3>Applicant & context</h3>
          <span className="sc-avatar large">{data.name?.slice(0, 1)}</span>
          <h4>{data.name}</h4>
          <dl>
            <dt>Email</dt>
            <dd>
              <a href={"mailto:" + data.email}>{data.email}</a>
            </dd>
            <dt>Conversation</dt>
            <dd>{data.subject}</dd>
            <dt>Opened</dt>
            <dd>{new Date(data.created_at).toLocaleString()}</dd>
            <dt>Assignment</dt>
            <dd>
              {mine
                ? "Assigned to you"
                : data.agent_id
                  ? "Assigned to another consultant"
                  : "Unassigned"}
            </dd>
          </dl>
          {data.application_id ? (
            <Link
              className="sc-context-link"
              to={"/admin/applications/" + data.application_id}
            >
              Open application <ArrowUpRight size={16} />
            </Link>
          ) : (
            <p>No application linked to this conversation.</p>
          )}
          <p className="sc-fine">
            Application access is checked separately. A support assignment does
            not grant permission to view confidential submissions.
          </p>
        </aside>
      )}
    </div>
  );
}

import { Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { serviceApi } from "../../services/serviceApi";
import { useServiceData } from "./useServiceData";
export default function IncomingCall() {
  const { user, staffUser } = useAuth(),
    person = staffUser || user,
    navigate = useNavigate();
  const incoming = useServiceData(
    () =>
      person && !person.demo
        ? serviceApi.get("/calls/incoming")
        : Promise.resolve([]),
    2000,
    person?.id || "guest",
  );
  const call = incoming.data?.[0];
  if (!call) return null;
  function open() {
    if (staffUser)
      navigate("/admin/support?conversation=" + call.conversation_id);
    else
      window.dispatchEvent(
        new CustomEvent("ceda:support-open", {
          detail: { conversationId: call.conversation_id },
        }),
      );
  }
  return (
    <aside className="sc-incoming-toast" role="status" aria-live="polite">
      <Phone size={20} />
      <div>
        <strong>Incoming audio call</strong>
        <small>{call.caller}</small>
      </div>
      <button onClick={open}>Open conversation</button>
    </aside>
  );
}

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { serviceApi } from "../../services/serviceApi";

export default function CallPanel({ call, userId, onRefresh }) {
  const [state, setState] = useState(call?.state),
    [error, setError] = useState(""),
    [muted, setMuted] = useState(false),
    [connected, setConnected] = useState(false);
  const peer = useRef(null),
    stream = useRef(null),
    audio = useRef(null),
    cursor = useRef(0),
    offered = useRef(false),
    candidates = useRef([]),
    cancelled = useRef(false),
    ended = useRef(false);
  const caller = call?.caller_id === userId;
  function cleanup() {
    peer.current?.close();
    peer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setConnected(false);
  }
  useEffect(() => {
    if (!call?.id) return;
    cancelled.current = false;
    let polling = false;
    async function signal(kind, payload) {
      await serviceApi.post(`/calls/${call.id}/signals`, {
        clientId: crypto.randomUUID(),
        kind,
        payload,
      });
    }
    async function connect(iceServers) {
      if (peer.current) return peer.current;
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Calls need HTTPS or localhost and a browser with microphone support.",
        );
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelled.current) {
        media.getTracks().forEach((t) => t.stop());
        return null;
      }
      stream.current = media;
      const pc = new RTCPeerConnection({ iceServers });
      peer.current = pc;
      media.getTracks().forEach((track) => pc.addTrack(track, media));
      pc.ontrack = (event) => {
        if (audio.current) {
          audio.current.srcObject = event.streams[0];
          audio.current
            .play()
            .catch(() => setError("Select Enable audio to hear the caller."));
        }
      };
      pc.onicecandidate = (event) => {
        if (event.candidate)
          signal("candidate", event.candidate.toJSON()).catch(() =>
            setError("A call network update failed. End the call and retry."),
          );
      };
      pc.onconnectionstatechange = () => {
        setConnected(pc.connectionState === "connected");
        if (pc.connectionState === "failed")
          setError(
            "Audio could not connect. End the call and try again, or send a message for assistance.",
          );
        if (pc.connectionState === "disconnected")
          setError("Audio was interrupted. Waiting for the network…");
        if (pc.connectionState === "connected") setError("");
      };
      return pc;
    }
    async function poll() {
      if (polling || cancelled.current || ended.current) return;
      polling = true;
      try {
        const data = await serviceApi.get(
          `/calls/${call.id}?after=${cursor.current}`,
        );
        if (cancelled.current) return;
        setState(data.state);
        if (["ENDED", "DECLINED", "MISSED"].includes(data.state)) {
          ended.current = true;
          cleanup();
          return;
        }
        if (data.state !== "ACCEPTED") return;
        const pc = await connect(data.iceServers);
        if (!pc) return;
        if (caller && !offered.current) {
          offered.current = true;
          await pc.setLocalDescription(await pc.createOffer());
          await signal("offer", pc.localDescription.toJSON());
        }
        for (const item of data.signals) {
          if (item.kind === "candidate") {
            if (pc.remoteDescription) await pc.addIceCandidate(item.payload);
            else candidates.current.push(item.payload);
          } else {
            await pc.setRemoteDescription(item.payload);
            for (const candidate of candidates.current)
              await pc.addIceCandidate(candidate);
            candidates.current = [];
            if (item.kind === "offer") {
              await pc.setLocalDescription(await pc.createAnswer());
              await signal("answer", pc.localDescription.toJSON());
            }
          }
          cursor.current = item.sequence;
        }
      } catch (e) {
        if (
          !cancelled.current &&
          ["NotAllowedError", "NotFoundError"].includes(e.name)
        ) {
          ended.current = true;
          cleanup();
          const reason =
            e.name === "NotAllowedError"
              ? "Microphone permission was denied. Allow microphone access and start a new call."
              : "No microphone was found. Connect a microphone and start a new call.";
          try {
            await serviceApi.post(`/calls/${call.id}/state`, {
              state: "ENDED",
            });
            setState("ENDED");
            setError(reason);
            onRefresh();
          } catch {
            setError(
              reason +
                " The other person could not be notified; the connection will expire.",
            );
            setState("ENDED");
          }
          return;
        }
        if (!cancelled.current)
          setError(
            e.name === "NotAllowedError"
              ? "Microphone permission was denied. Allow it in your browser and retry."
              : e.message,
          );
      } finally {
        polling = false;
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 1000);
    return () => {
      cancelled.current = true;
      clearInterval(timer);
      cleanup();
    };
  }, [call?.id, caller]);
  if (!call?.id) return null;
  const terminal = ["ENDED", "DECLINED", "MISSED"].includes(state);
  async function update(next) {
    try {
      await serviceApi.post(`/calls/${call.id}/state`, { state: next });
      setState(next);
      if (next !== "ACCEPTED") {
        ended.current = true;
        cleanup();
      }
      onRefresh();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <section className="sc-call" aria-label="Audio call">
      <Phone size={18} />
      <div>
        <strong>
          {connected
            ? "Audio connected"
            : state === "RINGING"
              ? caller
                ? "Calling consultant…"
                : "Incoming audio call"
              : state === "ACCEPTED"
                ? "Connecting audio…"
                : `Call ${String(state).toLowerCase()}`}
        </strong>
        <small>Private browser audio · not recorded</small>
      </div>
      {!terminal && state === "RINGING" && !caller && (
        <>
          <button onClick={() => update("ACCEPTED")}>Accept</button>
          <button onClick={() => update("DECLINED")}>Decline</button>
        </>
      )}
      {!terminal && (
        <>
          <button
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            onClick={() => {
              stream.current?.getAudioTracks().forEach((t) => {
                t.enabled = muted;
              });
              setMuted(!muted);
            }}
          >
            {muted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button aria-label="End call" onClick={() => update("ENDED")}>
            <PhoneOff size={16} />
          </button>
        </>
      )}
      {error && (
        <p role="alert">
          {error}{" "}
          {error.startsWith("Select") && (
            <button onClick={() => audio.current?.play()}>Enable audio</button>
          )}
        </p>
      )}
      <audio ref={audio} autoPlay playsInline />
    </section>
  );
}

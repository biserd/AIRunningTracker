import React, { useEffect, useRef, useState } from "react";
import { Mic, Send, Square } from "lucide-react";
import type { State, Proposal } from "../shared/coach";
import type { ReminderProposal } from "../shared/reminders";
import type {PlanReview} from '../shared/training';
import { ReminderPanel } from "./Reminders";
import { RunningChart } from "./RunningChart";
import { CoachTyping } from "./CoachTyping";
import { whatsappCall, type WhatsAppStatus } from './WhatsApp';
import {publicSourceURL} from '../worker/knowledge-tools';

function CoachMessage({content}:{content:string}) {
  return <p>{content.split(/(https:\/\/[^\s<>]+)/g).map((part,index)=>{
    const url=publicSourceURL(part);
    return url?<a key={index} href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname}</a>:<React.Fragment key={index}>{part}</React.Fragment>;
  })}</p>;
}
type Message = { role: string; content: string };
type Answer = {
  planReview?: PlanReview;
  message: string;
  proposal?: Proposal;
  reminderProposal?: ReminderProposal;
};
async function request<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const r = await fetch("/api/ai/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal || AbortSignal.timeout(120_000),
  });
  const result = await r.json();
  if (!r.ok)
    throw new Error(
      result &&
        typeof result === "object" &&
        "error" in result &&
        typeof result.error === "string"
        ? result.error
        : "Please try again later.",
    );
  return result as T;
}
export function CoachAI({
  onProposal,
  version,
  state,
  onWeek,
  onSettings,
}: {
  onProposal: (p: Proposal) => void;
  version: number;
  state: State;
  onWeek: () => void;
  onSettings: () => void;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [voice, setVoice] = useState("off"),
    [muted, setMuted] = useState(false),
    [caption, setCaption] = useState("");
  const [pending, setPending] = useState<Proposal>();
  const [whatsapp, setWhatsapp] = useState<WhatsAppStatus>();
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void whatsappCall<WhatsAppStatus>().then(status => {
        if (active) setWhatsapp(status);
      }).catch(() => { if (active) setWhatsapp(undefined); });
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, []);
  const [planReview,setPlanReview]=useState<PlanReview>();
  const [savingPlan,setSavingPlan]=useState(false);
  async function savePlan(){
    if(!planReview || savingPlan)return;
    setSavingPlan(true);setError('');
    try {const result=await request<{message:string}>('plan-confirm',{id:planReview.id,confirm:true});
      setPlanReview(undefined);receive({message:result.message});
    }catch(e){setError(e instanceof Error?e.message:'Check your main-site plan before trying again.');}
    finally {setSavingPlan(false);}
  }
  const [reminderProposal, setReminderProposal] = useState<ReminderProposal>();
  useEffect(() => setPending(undefined), [version]);
  const connection = useRef<RTCPeerConnection | null>(null),
    channel = useRef<RTCDataChannel | null>(null),
    stream = useRef<MediaStream | null>(null),
    audio = useRef<HTMLAudioElement | null>(null),
    timer = useRef<ReturnType<typeof setTimeout>>();
  const generation = useRef(0),
    abort = useRef<AbortController>(),
    voiceAbort = useRef<AbortController>();
  const transcript = useRef(""),
    delegateBusy = useRef(false),
    seen = useRef(new Set<string>());
  function clean() {
    clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    channel.current?.close();
    channel.current = null;
    connection.current?.close();
    connection.current = null;
    if (audio.current) {
      audio.current.pause();
      audio.current.srcObject = null;
    }
    voiceAbort.current?.abort();
    setVoice("off");
    setMuted(false);
  }
  useEffect(() => {
    request<{ configured: boolean; history: Message[] }>("status")
      .then((s) => {
        setConfigured(s.configured);
        setMessages(s.history);
      })
      .catch((e) => setError(e.message));
    return () => {
      const hadCall = !!connection.current;
      generation.current++;
      abort.current?.abort();
      clean();
      if (hadCall)
        void fetch("/api/ai/voice/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          keepalive: true,
        }).catch(() => {});
    };
  }, []);
  const [card,setCard] = useState<"chart"|"week"|null>(null);
  function showRequested(message:string) {
    if (/\b(chart|graph|plot)\b/i.test(message)) { setCard("chart"); return "Here is your recorded distance by week. Distance alone is not a fitness score."; }
    if (/^(show|view|open) (me )?(my |the )?(week|plan|schedule)[.!?]*$/i.test(message.trim())) { setCard("week"); return "Here is your current week. Nothing has been changed."; }
    return null;
  }
  function receive(answer: Answer) {
    setMessages((m) =>
      [...m, { role: "assistant", content: answer.message }].slice(-12),
    );
    if (answer.proposal) setPending(answer.proposal);
    if (answer.planReview) setPlanReview(answer.planReview);
    if (answer.reminderProposal) setReminderProposal(answer.reminderProposal);
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !text.trim()) return;
    const message = text.trim();
    setText("");
    setBusy(true);
    setError("");
    setMessages((m) => [...m, { role: "user", content: message }].slice(-12));
    const local = showRequested(message);
    if(local) { receive({message:local}); setBusy(false); return; }
    abort.current = new AbortController();
    try {
      receive(
        await request<Answer>(
          "chat",
          { id: crypto.randomUUID(), message },
          AbortSignal.any([abort.current.signal, AbortSignal.timeout(85_000)]),
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error && e.name === "AbortError"
          ? "Stopped waiting. Your week was not changed."
          : e instanceof Error
            ? e.message
            : "Could not contact the coach.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function stop() {
    generation.current++;
    stream.current?.getTracks().forEach((t) => t.stop());
    setVoice("ending");
    voiceAbort.current?.abort();
    // Backend owns finalization; its durable alarm survives a closed browser.
    try {
      await request("voice/stop", {});
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The server is finalizing the call.",
      );
    } finally {
      clean();
    }
  }
  async function startVoice() {
    if (voice !== "off") return;
    const call = ++generation.current;
    setVoice("connecting");
    setError("");
    transcript.current = "";
    seen.current.clear();
    delegateBusy.current = false;
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (call !== generation.current) {
        mic.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = mic;
      const pc = new RTCPeerConnection();
      connection.current = pc;
      mic.getTracks().forEach((t) => pc.addTrack(t, mic));
      const dc = pc.createDataChannel("oai-events");
      channel.current = dc;
      pc.ontrack = (event) => {
        if (audio.current) {
          audio.current.srcObject =
            event.streams[0] || new MediaStream([event.track]);
          void audio.current
            .play()
            .catch(() => setError("Tap Play audio below to hear your coach."));
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" && call === generation.current) {
          setError("Voice connection interrupted.");
          void stop();
        }
      };
      dc.onmessage = (event) => {
        if (call !== generation.current || typeof event.data !== "string")
          return;
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === "session.started") setVoice("live");
        if (data.type === "session.closed") {
          generation.current++;
          clean();
        }
        if (data.type === "error")
          setError("Voice encountered a problem. End the call and try again.");
        if (
          data.type === "session.input_transcript.delta" &&
          typeof data.delta === "string"
        ) {
          transcript.current = (transcript.current + data.delta).slice(-1800);
          setCaption(transcript.current);
        }
        if (
          data.type === "session.delegation.created" &&
          typeof data.delegation?.id === "string"
        ) {
          const id = data.delegation.id;
          if (seen.current.has(id)) return;
          seen.current.add(id);
          const answerBack = (content: string) => {
            if (call === generation.current && dc.readyState === "open")
              dc.send(
                JSON.stringify({
                  type: "session.commentary.append",
                  event_id: crypto.randomUUID(),
                  delegation_id: id,
                  content: content.slice(0, 1500),
                }),
              );
          };
          if (delegateBusy.current) {
            answerBack(
              "I am still checking the previous question. Please wait.",
            );
            return;
          }
          const message = transcript.current.trim();
          if (!message) {
            answerBack("I did not catch that. Please repeat your question.");
            return;
          }
          const local=showRequested(message);
          if(local) { receive({message:local}); answerBack(local); return; }
          delegateBusy.current = true;
          voiceAbort.current = new AbortController();
          setMessages((m) =>
            [...m, { role: "user", content: message }].slice(-12),
          );
          void request<Answer>(
            "chat",
            { id: crypto.randomUUID(), message },
            AbortSignal.any([
              voiceAbort.current.signal,
              AbortSignal.timeout(85_000),
            ]),
          )
            .then((answer) => {
              if (call !== generation.current) return;
              receive(answer);
              answerBack(
                answer.message +
                  (answer.planReview?' Review the plan action on screen and tap Save to AITracker to apply it. Nothing is saved yet.':'')+
                  (answer.proposal
                    ? " A proposed change is ready on screen. It is not saved. Tap Review adjustment to confirm."
                    : "") +
                  (answer.reminderProposal
                    ? " A reminder review is ready in the email reminders panel. Nothing is scheduled or cancelled until you confirm on screen."
                    : ""),
              );
            })
            .catch(() =>
              answerBack(
                "I could not check your plan just now. No changes were made.",
              ),
            )
            .finally(() => {
              delegateBusy.current = false;
            });
        }
      };
      await pc.setLocalDescription(await pc.createOffer());
      if (pc.iceGatheringState !== "complete")
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Could not establish voice networking.")),
            10_000,
          );
          pc.addEventListener("icegatheringstatechange", () => {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              resolve();
            }
          });
        });
      if (call !== generation.current) return;
      const result = await request<{ sdp: string; seconds: number }>("voice", {
        id: crypto.randomUUID(),
        sdp: pc.localDescription?.sdp,
      });
      if (call !== generation.current) {
        void request("voice/stop", {}).catch(() => {});
        return;
      }
      await pc.setRemoteDescription({ type: "answer", sdp: result.sdp });
      timer.current = setTimeout(() => void stop(), result.seconds * 1000);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Microphone access or voice connection failed.",
      );
      clean();
      void request("voice/stop", {}).catch(() => {});
    }
  }
  function mute() {
    const next = !muted;
    stream.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
    if (channel.current?.readyState === "open")
      channel.current.send(
        JSON.stringify({
          type: next
            ? "session.input_audio.mute"
            : "session.input_audio.unmute",
          event_id: crypto.randomUUID(),
        }),
      );
  }
  return (
    <>
      <section className="conversation ai-coach">
        <div className="section-heading">
          <h1>Let’s talk running.</h1>
          <span>{configured ? "AI coach" : "AI setup"}</span>
        </div>
        <p>
          How are you feeling today?
        </p>
        {configured === false && (
          <p role="status">
            AI is not ready yet. The site owner needs to add the server API key.
            You can still review your runs and schedule.
          </p>
        )}
        <nav className="coach-shortcuts" aria-label="Coach tools">
          <button onClick={onWeek}>My schedule</button>
          <button onClick={onSettings}>{!whatsapp ? 'WhatsApp settings' : whatsapp.connected && whatsapp.authorized ? 'Manage WhatsApp' : whatsapp.connected ? 'Reconnect WhatsApp' : 'Connect WhatsApp'}</button>
          <button onClick={onSettings}>Reminders</button>
        </nav>
        <div className="chat-history" aria-live="polite" aria-label="Conversation with your coach">
          {messages.map((m, i) => (
            <div key={i} className={"chat-message " + m.role}>
              <small>{m.role === "user" ? "You" : "Coach"}</small>
              {m.role==='assistant'?<CoachMessage content={m.content}/>:<p>{m.content}</p>}
            </div>
          ))}
          {busy && <CoachTyping onStop={() => abort.current?.abort()}/>}
        </div>
        {pending && (
          <button className="secondary" onClick={() => onProposal(pending)}>
            Review adjustment
          </button>
        )}
        {card && <section className="chat-attachment" aria-label={card==="chart"?"Running chart":"Your week"}>
          <button className="text-button" onClick={()=>setCard(null)}>Close {card==="chart"?"chart":"plan"}</button>
          {card==="chart"?<RunningChart state={state}/>:<><h3>Your week</h3>{!state.days.length && <p>No workouts scheduled this week.</p>}{state.days.map(day=><p key={day.id}><strong>{day.date}</strong> · {day.title} · {day.minutes} min{day.completed?" · Completed":""}</p>)}<button className="secondary" onClick={onWeek}>Review my week</button></>}
        </section>}
        {planReview && <section className="inline-reminder" aria-label="Review plan action"><h3>Review your plan change</h3><p>{planReview.description}</p>{planReview.details.kind==='create' && <><p>Run days: {planReview.details.preferredRunDays.join(', ')}. Up to {planReview.details.maxWeeklyHours} hours per week.</p><p>{planReview.details.constraints || 'No additional constraints supplied.'}</p></>}<p>This updates your real AITracker account. Nothing is saved until you confirm.</p><button className="primary" disabled={savingPlan} onClick={()=>void savePlan()}>{savingPlan?'Saving…':'Save to AITracker'}</button><button className="text-button" disabled={savingPlan} onClick={()=>setPlanReview(undefined)}>Cancel</button><a href="https://aitracker.run/training-plans" target="_blank" rel="noopener noreferrer">View current plan</a></section>}
        {reminderProposal && <div className="inline-reminder"><ReminderPanel proposal={reminderProposal} reviewOnly/><button className="text-button" onClick={onSettings}>Manage connections in Settings</button></div>}
        <div className="coach-composer">
        <div className="ai-actions voice-primary">
          {voice === "off" ? (
            <button
              className="primary"
              disabled={!configured || busy}
              onClick={() => void startVoice()}
            >
              <Mic size={16} /> Talk to your coach
            </button>
          ) : (
            <>
              <button
                className="secondary"
                onClick={() => void stop()}
                disabled={voice === "ending"}
              >
                <Square size={14} />{" "}
                {voice === "ending" ? "Ending call…" : "End call"}
              </button>
              <button disabled={voice !== "live"} onClick={mute}>
                {muted ? "Unmute" : "Mute"}
              </button>
              <span role="status">
                {voice === "connecting"
                  ? "Connecting…"
                  : muted
                    ? "Microphone muted"
                    : "Voice connected"}
              </span>
            </>
          )}
        </div>
        <form onSubmit={ask}>
          <input
            aria-label="Ask your running coach"
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask your coach…"
            disabled={!configured || busy || voice !== "off"}
          />
          <button
            aria-label="Send message"
            disabled={!configured || busy || !text.trim() || voice !== "off"}
          >
            <Send size={18} />
          </button>
        </form>
        </div>
        {error && (
          <p className="ai-error" role="alert">
            {error}
          </p>
        )}
        <audio ref={audio} autoPlay controls hidden={voice === "off"} />
        {voice !== "off" && caption && (
          <p className="voice-caption">You: {caption}</p>
        )}
        <details className="coach-privacy"><summary>Preview & privacy</summary><p className="footnote">
          AI-generated replies and voice. Your messages and available running context are sent to OpenAI when you ask.
          Public lookups use only public search terms, not your saved running history. Weather uses a city you name or your opted-in saved location.
          Voice uses your microphone only during a call, limited to five minutes. Research links open external sites.
        </p>
        </details>

      </section>

    </>
  );
}

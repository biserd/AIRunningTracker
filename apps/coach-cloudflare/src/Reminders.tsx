import React, { useEffect, useState } from "react";
import { Bell, Mail } from "lucide-react";
import { WhatsAppPanel, whatsappCall, type WhatsAppStatus } from './WhatsApp';
import type { ReminderProposal } from "../shared/reminders";
type Item = {
  channel: 'email'|'whatsapp';
  delivery_status?: string;
  id: string;
  title: string;
  local_time: string;
  timezone: string;
  status: string;
};
type Status = {
  configured: boolean;
  verified: boolean;
  email: string;
  timezone: string;
  expiresAt?: number;
  reminders: Item[];
};
async function call<T>(path = "", body?: unknown): Promise<T> {
  const r = await fetch("/api/reminders" + (path ? "/" + path : ""), {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      data && typeof data === "object" && "error" in data
        ? String(data.error)
        : "Please try again.",
    );
  return data as T;
}
const labels: Record<string, string> = {
  draft: "Needs confirmation",
  scheduled: "Scheduled",
  sending: "Sending; too late to cancel",
  sent: "Accepted by email service",
  failed: "Not sent",
  unknown: "Delivery uncertain. Check your inbox.",
  cancelled: "Cancelled",
  expired: "Expired without sending",
};
export function ReminderPanel({ proposal, reviewOnly=false }: { proposal?: ReminderProposal; reviewOnly?:boolean }) {
  const [creating, setCreating] = useState(false);
  const [whatsapp,setWhatsapp]=useState<WhatsAppStatus>();
  const [channel,setChannel]=useState<'email'|'whatsapp'>('email');
  const [data, setData] = useState<Status>(),
    [email, setEmail] = useState(""),
    [zone, setZone] = useState(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    ),
    [code, setCode] = useState(""),
    [codeSent, setCodeSent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [title, setTitle] = useState(""),
    [time, setTime] = useState(""),
    [review, setReview] = useState<ReminderProposal>(),
    [disconnect, setDisconnect] = useState(false);
  async function refresh() {
    const result = await call<Status>();
    setData(result);
    if(reviewOnly) setWhatsapp(await whatsappCall<WhatsAppStatus>());
    if (result.timezone) setZone(result.timezone);
  }
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    const timer = setInterval(() => void refresh().catch(() => {}), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (proposal) {
      setReview(proposal);
      void refresh().catch(() => {});
    }
  }, [proposal]);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={"reminder-panel"+(reviewOnly?' review-only':'')} aria-label="Connections and reminders">
      {!reviewOnly && <WhatsAppPanel verified={!!data?.verified} onStatus={setWhatsapp}/>}
      <section className={reviewOnly ? '' : 'settings-group'} aria-label="Email reminders">
      {!reviewOnly && <>
      <div className="section-heading">
        <h3>
          <Bell size={18} /> Email reminders
        </h3>
      </div>
      <p>{data?.verified ? 'Ask your coach for a reminder, or create one here.' : 'Want reminders by email? Verify your inbox to get started.'}</p>
      {data && <span className="connection-status">{data.verified ? 'Connected' : 'Not connected · Optional'}</span>}
      {!data ? (
        <p>Loading reminder settings…</p>
      ) : !data.verified ? (
        <>
          <form
            className="reminder-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await call("verify/start", { email, timezone: zone });
                setCodeSent(true);
                setMessage("Check your inbox. Enter the code in this browser.");
              });
            }}
          >
            <label>
              Your email
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Your timezone
              <input
                required
                maxLength={80}
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="America/New_York"
              />
            </label>
            <button className="secondary" disabled={busy || !data.configured}>
              <Mail size={16} />{" "}
              {codeSent ? "Send a new code" : "Verify my email"}
            </button>
          </form>
          {!data.configured && (
            <p>Email sending is waiting for site-owner setup.</p>
          )}
          {codeSent && (
            <form
              className="reminder-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await call("verify/finish", {
                    code: code.replace(/\s/g, ""),
                  });
                  setCode("");
                  setCodeSent(false);
                  setMessage(
                    "Email verified. Ask the coach for a reminder, or create one below.",
                  );
                });
              }}
            >
              <label>
                Verification code
                <input
                  required
                  maxLength={16}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="12 characters from your email"
                />
              </label>
              <button className="primary" disabled={busy}>
                Confirm email
              </button>
            </form>
          )}
        </>
      ) : (
        <>
          <p className="reminder-address">
            {data.email}
            <br />
            <small>{data.timezone}</small>
          </p>
          <button type="button" aria-expanded={creating} aria-controls="email-reminder-create" onClick={()=>setCreating(!creating)}>{creating ? 'Close reminder form' : 'Create a reminder'}</button>
          {creating && <div id="email-reminder-create">
            <form
              className="reminder-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () =>
                  setReview(
                    await call<ReminderProposal>("draft", {
                      kind: "create",
                      title,
                      localTime: time,
                    }),
                  ),
                );
              }}
            >
              <label>
                Remind me to
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={160}
                  placeholder="Lay out my running kit"
                />
              </label>
              <label>
                When ({data.timezone})
                <input
                  type="datetime-local"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
              <button className="secondary" disabled={busy}>
                Review reminder
              </button>
            </form>
          </div>}
          <button className="text-button" onClick={() => setDisconnect(true)}>
            Disconnect email
          </button>
        </>
      )}
      </>}
      {review && (
        <div
          className="reminder-review"
          role="region"
          aria-label="Review email reminder"
        >
          <h4>
            {review.kind === "cancel"
              ? "Cancel this reminder?"
              : "Schedule this reminder?"}
          </h4>
          <p>{review.title}</p>
          <p>
            {review.localTime.replace("T", " ")}
            <br />
            {review.timezone}
          </p>
          {review.kind==='create'&&<label>Deliver through <select value={channel} onChange={e=>setChannel(e.target.value as 'email'|'whatsapp')}><option value="email">Email</option><option value="whatsapp" disabled={!whatsapp?.connected}>WhatsApp</option></select></label>}
          <p>To: {channel==='whatsapp'?whatsapp?.destination:data?.email || "your verified inbox"}</p>
          <div className="ai-actions">
            <button
              className="primary"
              disabled={busy || !data?.verified}
              onClick={() =>
                void run(async () => {
                  await call("confirm", {
                    id: review.id,
                    kind: review.kind,
                    confirm: true,
                    channel,
                  });
                  setMessage(
                    review.kind === "cancel"
                      ? "Reminder cancelled."
                      : "Reminder scheduled. You can close this page.",
                  );
                  setReview(undefined);
                })
              }
            >
              {review.kind === "cancel"
                ? "Confirm cancellation"
                : "Confirm reminder"}
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setReview(undefined)}
            >
              Not now
            </button>
          </div>
        </div>
      )}
      {disconnect && (
        <div className="reminder-review">
          <p>
            Stop all pending reminders for this preview and disconnect{" "}
            {data?.email}? An email already being sent may still arrive.
          </p>
          <button
            disabled={busy}
            className="secondary"
            onClick={() =>
              void run(async () => {
                await call("disconnect", { confirm: true });
                setReview(undefined);
                setDisconnect(false);
                setMessage("Email disconnected. Pending reminders cancelled.");
              })
            }
          >
            Yes, disconnect
          </button>
          <button disabled={busy} onClick={() => setDisconnect(false)}>
            Keep connected
          </button>
        </div>
      )}
      {!reviewOnly && !!data?.reminders.length && (
        <ul className="reminder-list">
          {data.reminders.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <small>
                {item.local_time.replace("T", " ")} · {item.timezone}
              </small>
              <span>{item.channel==='whatsapp'?'WhatsApp':'Email'} · {item.channel==='whatsapp'&&item.status==='sent'?'Accepted by Twilio':labels[item.status] || item.status}{item.delivery_status?' · '+item.delivery_status:''}</span>
              {["scheduled", "draft"].includes(item.status) && (
                <div>
                  {item.status === "draft" && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        setReview({
                          id: item.id,
                          kind: "create",
                          title: item.title,
                          localTime: item.local_time,
                          timezone: item.timezone,
                        })
                      }
                    >
                      Review
                    </button>
                  )}
                  <button
                    disabled={busy}
                    onClick={() =>
                      setReview({
                        id: item.id,
                        kind: "cancel",
                        title: item.title,
                        localTime: item.local_time,
                        timezone: item.timezone,
                      })
                    }
                  >
                    Cancel reminder
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="ai-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!reviewOnly && <details className="settings-details"><summary>Delivery & privacy</summary><p className="footnote">
        Email reminders stop when this connection expires
        {data?.expiresAt
          ? ` (${new Date(data.expiresAt * 1000).toLocaleString()})`
          : ""}
        . Delivery is checked every minute and may be delayed. One-time reminders only. No marketing emails.
      </p></details>}
      </section>
    </section>
  );
}
export function ReminderUnsubscribe() {
  const [token] = useState(() =>
      new URLSearchParams(location.hash.slice(1)).get("stop-reminders"),
    ),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (token)
      history.replaceState(null, "", location.pathname + location.search);
  }, [token]);
  if (!token) return null;
  return (
    <section className="reminder-review">
      <h2>Stop email reminders</h2>
      {done ? (
        <p role="status">
          Pending reminders for this preview are stopped. An email already being
          sent may still arrive.
        </p>
      ) : (
        <>
          <p>
            This stops all pending reminders associated with the email link. No
            sign-in is needed.
          </p>
          <button
            className="primary"
            onClick={() =>
              void call("unsubscribe", { token })
                .then(() => setDone(true))
                .catch((e) => setError(e.message))
            }
          >
            Stop these reminders
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

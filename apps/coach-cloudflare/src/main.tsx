import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  CalendarDays,
  ChartNoAxesCombined,
  MessageCircle,
  Footprints,
  Clock3,
  Moon,
  MoveRight,
  X,
  Info,
  Undo2,
  Settings2,
  Mic,
  Send,
  Leaf,
} from "lucide-react";
import {
  evidence,
  type Day,
  type Snapshot,
  type Proposal,
} from "../shared/coach";
import "./style.css";
import "./chat-first.css";
import { CoachAI } from "./CoachAI";
import { ReminderPanel, ReminderUnsubscribe } from "./Reminders";
import { Landing, WaitlistUnsubscribe } from "./Landing";
import { AccountLogin, signOut } from "./Account";
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result &&
        typeof result === "object" &&
        "error" in result &&
        typeof result.error === "string"
        ? result.error
        : "Something went wrong. Please try again.",
    );
  return result as T;
}
const dayLabel = (date: string) =>
  new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
function App() {
  const [data, setData] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [tab, setTab] = useState("Coach"),
    [adjust, setAdjust] = useState<Day | null>(null),
    [kind, setKind] = useState("shorten"),
    [minutes, setMinutes] = useState(20),
    [moveDate, setMoveDate] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null),
    [toast, setToast] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const refresh = async () => {
    const value = await api<Snapshot>("state");
    setData(value);
  };
  useEffect(() => {
    refresh()
      .catch((e) => {
        if (!/Start your private|expired/.test(e.message)) setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (adjust || proposal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [adjust, proposal]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const upcoming = data?.state.days.find(
    (d) => !d.completed && d.kind !== "rest",
  );
  const today = data?.state.days.find((d) => d.date === data.state.today);
  const openAdjust = (day: Day, type = "shorten") => {
    setError("");
    setAdjust(day);
    setKind(type);
    setMinutes(Math.min(20, day.minutes - 5));
    setMoveDate("");
  };
  const close = () => {
    if (!busy) {
      setAdjust(null);
      setProposal(null);
      setError("");
    }
  };
  const propose = () =>
    run(async () => {
      const p = await api<Proposal>("proposals", {
        dayId: adjust!.id,
        kind,
        ...(kind === "shorten" ? { minutes } : {}),
        ...(kind === "move" ? { date: moveDate } : {}),
      });
      setProposal(p);
      setAdjust(null);
    });
  const confirm = () =>
    run(async () => {
      await api("confirm", { proposalId: proposal!.id, confirm: true });
      await refresh();
      setProposal(null);
      setToast("Your week is updated. Saved to your private preview.");
    });
  const totals = data?.state.days.reduce((a, d) => a + d.minutes, 0) || 0;
  const stats = data ? evidence(data.state) : null;
  return (
    <div className="app-shell chat-first">
      <main>
        <header className="coach-topbar">
          <a className="coach-wordmark" href="/">AITracker<span>.</span></a>
          <nav aria-label="Main navigation">
            {data && <button className="secondary" disabled={busy} onClick={()=>void run(refresh)}>Refresh runs</button>}
            {tab !== "Coach" && <button className="secondary" onClick={()=>setTab("Coach")}>Back to coach</button>}
            <button className="secondary" aria-label="Settings" onClick={()=>setTab("Settings")}><Settings2 size={18}/> Settings</button>
          </nav>
        </header>
        <div className="page-content">
          <ReminderUnsubscribe />
          <div className="preview-note">
            <Info size={16} />
            <span>
              {data?.runner ? `Connected as ${data.runner.name}. Using your AITracker running data.` : "Sign in to use your running data."}
            </span>
          </div>
          {loading ? (
            <div className="welcome">
              <p>Opening your running space…</p>
            </div>
          ) : !data ? (
            <><AccountLogin/>{error && !/Sign in with/.test(error) && <p role="alert">{error}</p>}</>
          ) : (
            <>
              {tab !== "Coach" && <div className="title-row">
                <div>
                  <span className="eyebrow">
                    {tab === "Coach"
                      ? "ONE RUN AT A TIME"
                      : tab === "My week"
                        ? "STRUCTURE, WITH ROOM TO BREATHE"
                        : tab === "Progress"
                          ? "THE BIGGER PICTURE"
                          : "YOUR PREVIEW"}
                  </span>
                  <h1>
                    {tab === "Coach"
                      ? "Let’s make today a good one."
                      : tab === "My week"
                        ? "Your week, your way."
                        : tab === "Progress"
                          ? "Small steps. Steady progress."
                          : "A separate space to explore."}
                  </h1>
                  <p>
                    {tab === "Coach"
                      ? "You don’t need to do more. You need a plan that fits."
                      : tab === "My week"
                        ? "A plan is a starting point. Adjust it when life happens."
                        : tab === "Progress"
                          ? "Useful context, without a wall of numbers."
                          : "Nothing here changes your existing account."}
                  </p>
                </div>
                <span className="date-tag">
                  {new Date(data.state.today + "T12:00:00Z").toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", timeZone: "UTC" },
                  )}
                  <small>{data.state.timezone || "UTC"}</small>
                </span>
              </div>
              }
              {error && !adjust && !proposal && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {tab === "Coach" && <>{!data.canUseAI && <p>Start a trial on <a href="https://aitracker.run/pricing">AITracker</a> to use AI coaching. Your runs and schedule are available here.</p>}<CoachAI onProposal={setProposal} version={data.version} state={data.state} onWeek={()=>setTab("My week")} onSettings={()=>setTab("Settings")}/></>}
              {tab === "My week" && (
                <section className="week-full">
                  <div className="section-heading">
                    <div>
                      <h3>A steady week</h3>
                      <p>
                        {totals} minutes planned ·{" "}
                        {
                          data.state.days.filter((d) => d.kind !== "rest")
                            .length
                        }{" "}
                        runs · from your active AITracker plan
                      </p>
                    </div>
                    {data.lastAction && (
                      <button
                        className="outline"
                        disabled={busy}
                        onClick={() =>
                          run(async () =>
                            setProposal(
                              await api<Proposal>("undo-proposal", {
                                actionId: data.lastAction,
                              }),
                            ),
                          )
                        }
                      >
                        <Undo2 size={16} />
                        Undo last change
                      </button>
                    )}
                  </div>
                  {!data.state.days.length && <p>No workouts are scheduled for this week. <a href="https://aitracker.run/training-plans">Review your training plans</a>.</p>}
                  {data.state.days.map((d) => (
                    <article
                      className={
                        "day-row " +
                        (d.date === data.state.today ? "current" : "")
                      }
                      key={d.id}
                    >
                      <div className="day-date">
                        <strong>{dayLabel(d.date)}</strong>
                        <span>{d.date.slice(5)}</span>
                      </div>
                      <span className={"day-icon " + d.kind}>
                        {d.completed ? (
                          <Check />
                        ) : d.kind === "rest" ? (
                          <Moon />
                        ) : (
                          <Footprints />
                        )}
                      </span>
                      <div className="day-main">
                        <h3>
                          {d.title}
                          {d.date === data.state.today && <small>Today</small>}
                        </h3>
                        <p>
                          {d.kind === "rest"
                            ? "A little breathing room"
                            : `${d.minutes} minutes · ${d.kind === "long" ? "Comfortable long effort" : "Conversational effort"}`}
                        </p>
                      </div>
                      {d.completed ? (
                        <span className="completed">Completed</span>
                      ) : data.state.source === "production_account" ? (
                        <a href="https://aitracker.run/training-plans">Manage plan</a>
                      ) : d.kind !== "rest" ? (
                        <button
                          className="outline"
                          onClick={() => openAdjust(d)}
                        >
                          Adjust <ChevronRight size={15} />
                        </button>
                      ) : (
                        <span className="subtle">Rest</span>
                      )}
                    </article>
                  ))}
                  <p className="footnote">
                    This schedule comes from your active plan. Manage changes on AITracker.
                  </p>
                </section>
              )}
              {tab === "Progress" && stats && (
                <section className="progress-layout">
                  <div className="progress-card">
                    <span className="eyebrow">CONSISTENCY</span>
                    <h2>Your recent weeks.</h2>
                    <p>
                      Recorded runs by calendar week. Run count alone does not measure fitness.
                    </p>
                    <div
                      className="bar-chart"
                      role="img"
                      aria-label="Recorded runs in recent calendar weeks"
                    >
                      {stats.weeks.slice(-4).map((w) => (
                        <div key={w.label}>
                          <strong>{w.runs} runs</strong>
                          <div
                            className="bar"
                            style={{ height: w.runs * 30 }}
                          />
                          <span>{w.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="source-note">
                      <Info size={17} />
                      <div>
                        <strong>What this is based on</strong>
                        <p>
                          {stats.totalRuns} recorded runs · {stats.from || "No runs yet"}{" "}
                          {stats.to ? `to ${stats.to}` : ""}. Distance: {stats.totalKm.toFixed(1)} km.
                          Up to {data.state.historyLimit} runs in the last {data.state.historyDays} days. No inferred recovery measurements.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="progress-card">
                    <h3>The runs behind the pattern</h3>
                    <div className="activity-list">
                      {data.state.activities
                        .slice()
                        .reverse()
                        .map((a,index) => (
                          <div key={a.date+":"+index}>
                            <span>{a.date}</span>
                            <strong>{a.km} km</strong>
                            <span>{a.minutes} min</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </section>
              )}
              {tab === "Settings" && (
                <section className="settings-card">
                  <h2>Connections & reminders</h2>
                  <ReminderPanel />
                  <p>Your account, runs and training plan come from AITracker. Chat, reminder and WhatsApp preferences are private to your account in this experience.</p>
                  <dl>
                    <dt>Runner data</dt>
                    <dd>Your recorded runs, up to {data.state.historyLimit} in the last {data.state.historyDays} days</dd>
                    <dt>Storage</dt>
                    <dd>Secure sign-in. Your existing subscription applies.</dd>
                    <dt>Strava, billing and Telegram</dt>
                    <dd><a href="https://aitracker.run/coach/settings">Manage on AITracker</a></dd>
                    <dt>AI and voice</dt>
                    <dd>
                      OpenAI integration. Availability is shown in the Coach
                      tab. Uses your recorded runs and current plan.
                    </dd>
                  </dl>
                  <button className="outline" onClick={()=>void signOut().catch(()=>setError("Could not sign out. Please retry."))}>Sign out</button>
                  <p className="footnote">
                    Do not enter private or medical information. This is a
                    product preview, not training or medical advice.
                  </p>
                </section>
              )}
            </>
          )}
          <footer>
            <span>AITracker Coach Preview</span>
            <span>Less noise. More running.</span>
          </footer>
        </div>
      </main>
      <dialog
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="dialog-top">
          <span className="eyebrow">
            {proposal ? "REVIEW YOUR CHANGE" : "MAKE IT FIT"}
          </span>
          <button aria-label="Close adjustment" disabled={busy} onClick={close}>
            <X />
          </button>
        </div>
        {proposal ? (
          <>
            <h2>
              A small change.
              <br />A week that fits better.
            </h2>
            <p>{proposal.description}</p>
            <div className="changes">
              {proposal.after
                .filter(
                  (d) =>
                    JSON.stringify(d) !==
                    JSON.stringify(proposal.before.find((b) => b.id === d.id)),
                )
                .map((d) => {
                  const b = proposal.before.find((x) => x.id === d.id)!;
                  return (
                    <div key={d.id}>
                      <span>
                        {dayLabel(b.date)} · {b.title} · {b.minutes} min
                      </span>
                      <MoveRight size={16} />
                      <strong>
                        {dayLabel(d.date)} · {d.title} · {d.minutes} min
                      </strong>
                    </div>
                  );
                })}
            </div>
            <p className="footnote">
              Nothing changes until you confirm. Completed sessions stay
              untouched.
            </p>
            <button className="primary wide" disabled={busy} onClick={confirm}>
              {busy ? "Saving…" : "Confirm change"}
              <Check size={18} />
            </button>
          </>
        ) : (
          adjust && (
            <>
              <h2>What works better?</h2>
              <p>
                {dayLabel(adjust.date)} · {adjust.title} · {adjust.minutes}{" "}
                minutes
              </p>
              <div className="choice-row">
                {[
                  ["shorten", "Less time"],
                  ["rest", "Rest day"],
                  ["move", "Move run"],
                ].map(([value, label]) => (
                  <button
                    className={kind === value ? "selected" : ""}
                    key={value}
                    onClick={() => setKind(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {kind === "shorten" ? (
                <label className="field">
                  How many minutes do you have?
                  <input
                    type="number"
                    value={minutes}
                    min={10}
                    max={adjust.minutes - 1}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                  />
                  <small>
                    Keep the effort easy. No need to squeeze the same work into
                    less time.
                  </small>
                </label>
              ) : kind === "move" ? (
                <label className="field">
                  Choose an upcoming rest day
                  <select
                    value={moveDate}
                    onChange={(e) => setMoveDate(e.target.value)}
                  >
                    <option value="">Choose a day</option>
                    {data?.state.days
                      .filter(
                        (d) =>
                          d.kind === "rest" &&
                          !d.completed &&
                          d.date >= data.state.today,
                      )
                      .map((d) => (
                        <option key={d.id} value={d.date}>
                          {dayLabel(d.date)} · {d.date}
                        </option>
                      ))}
                  </select>
                  <small>Only rest days within this week are available.</small>
                </label>
              ) : (
                <div className="rest-message">
                  <Moon />
                  <p>
                    Let’s take this run off the schedule. We won’t move the
                    workload to another day.
                  </p>
                </div>
              )}
              <button
                className="primary wide"
                disabled={busy || (kind === "move" && !moveDate)}
                onClick={propose}
              >
                {busy ? "Preparing…" : "Review adjustment"}
                <ArrowRight size={18} />
              </button>
            </>
          )
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="cancel wide" disabled={busy} onClick={close}>
          Keep my plan as it is
        </button>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  location.pathname === "/auth/magic-link" ? <AccountLogin/> :
  location.pathname === "/waitlist/unsubscribe" ? <WaitlistUnsubscribe/> :
  location.pathname === "/" ? <Landing/> : <App />
);

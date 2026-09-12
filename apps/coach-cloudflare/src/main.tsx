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
import { CoachAI } from "./CoachAI";
import { ReminderPanel, ReminderUnsubscribe } from "./Reminders";
import { Landing, WaitlistUnsubscribe } from "./Landing";
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
  const start = () =>
    run(async () => {
      await api("session", {});
      await refresh();
    });
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
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="AITracker home">
          <span className="brand-mark">
            <Footprints size={22} />
          </span>
          AITracker<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR RUNNING SPACE</div>
        <nav aria-label="Main navigation">
          {[
            { name: "Coach", icon: MessageCircle },
            { name: "My week", icon: CalendarDays },
            { name: "Progress", icon: ChartNoAxesCombined },
          ].map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={tab === name ? "nav active" : "nav"}
              onClick={() => setTab(name)}
              aria-current={tab === name ? "page" : undefined}
            >
              <Icon size={19} />
              {name}
              {tab === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={23} />
          <p>
            Good training fits
            <br />
            your actual life.
          </p>
          <span>A little direction. More good runs.</span>
        </div>
        <button className="nav settings" onClick={() => setTab("Settings")}>
          <Settings2 size={18} />
          Preview settings
        </button>
        <div className="profile">
          <span className="avatar">R</span>
          <div>
            Sample runner<small>Private preview workspace</small>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <span className="breadcrumb">
            Your running / <strong>{tab}</strong>
          </span>
          <span className="preview-pill">
            <span />
            UX preview
          </span>
        </header>
        <div className="page-content">
          <ReminderUnsubscribe />
          <div className="preview-note">
            <Info size={16} />
            <span>
              Sample training data. Changes are saved only to your private
              preview, never your AITracker account.
            </span>
          </div>
          {loading ? (
            <div className="welcome">
              <p>Opening your running space…</p>
            </div>
          ) : !data ? (
            <section className="welcome">
              <span className="eyebrow">MEET YOUR NEW RUNNING SPACE</span>
              <h1>
                A little direction.
                <br />A better week of running.
              </h1>
              <p>
                Start with what matters today. Make room for real life.
                <br />
                See how a coach-first AITracker could feel.
              </p>
              <button className="primary" disabled={busy} onClick={start}>
                Explore the coach preview <ArrowRight size={18} />
              </button>
              <small>
                No login or Strava connection needed. Fictional data, real saved
                plan adjustments.
              </small>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
            </section>
          ) : (
            <>
              <div className="title-row">
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
                  <small>UTC preview</small>
                </span>
              </div>
              {error && !adjust && !proposal && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              {tab === "Coach" && (
                <div className="coach-grid">
                  <div>
                    <section className="recommendation">
                      <div className="card-kicker">
                        <span className="round-icon">
                          <Leaf size={19} />
                        </span>
                        TODAY’S DIRECTION
                        <span className="sample-label">
                          Sample recommendation
                        </span>
                      </div>
                      <h2>
                        {today?.kind === "rest"
                          ? "Make room for a little recovery."
                          : today?.minutes
                            ? `${today.minutes} minutes. Keep it easy.`
                            : "Your week is in a good place."}
                      </h2>
                      <p>
                        {today?.kind === "rest"
                          ? "A rest day is already part of this sample plan. There’s nothing to make up today."
                          : "This sample plan keeps today conversational. Finish feeling like you could have done a little more."}
                      </p>
                      <div className="run-details">
                        <span>
                          <Clock3 size={17} />
                          {today?.minutes || 0} min
                        </span>
                        <span>
                          <Footprints size={17} />
                          {today?.kind === "rest" ? "Rest day" : "Easy effort"}
                        </span>
                        <span>
                          <CalendarDays size={17} />
                          {dayLabel(data.state.today)}
                        </span>
                      </div>
                      <div className="reason">
                        <span>WHY THIS FITS</span>
                        <p>
                          {today?.kind === "rest"
                            ? "Space between runs is built into your sample week. No recovery score or health assessment is being inferred."
                            : "An easy session keeps the sample week balanced around its longer run. This is plan context, not a physiological readiness score."}
                        </p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setTab("My week")}
                      >
                        See where it fits in my week <ArrowRight size={17} />
                      </button>
                    </section>
                    <section className="adapt">
                      <h3>Life happens. Let’s work with it.</h3>
                      <div className="quick-actions">
                        <button
                          disabled={!upcoming}
                          onClick={() => upcoming && openAdjust(upcoming)}
                        >
                          <Clock3 />
                          <strong>I have less time</strong>
                          <span>Make the next run shorter</span>
                          <ArrowUpRight size={17} />
                        </button>
                        <button
                          disabled={!upcoming}
                          onClick={() =>
                            upcoming && openAdjust(upcoming, "rest")
                          }
                        >
                          <Moon />
                          <strong>I feel tired</strong>
                          <span>Make room for a rest day</span>
                          <ArrowUpRight size={17} />
                        </button>
                        <button onClick={() => setTab("My week")}>
                          <CalendarDays />
                          <strong>Adjust my week</strong>
                          <span>Find a better place for a run</span>
                          <ArrowUpRight size={17} />
                        </button>
                      </div>
                    </section>
                    <CoachAI onProposal={setProposal} version={data.version} />
                  </div>
                  <aside className="right-column">
                    <section className="week-card">
                      <div className="section-heading">
                        <h3>This week</h3>
                        <button
                          aria-label="Open my week"
                          onClick={() => setTab("My week")}
                        >
                          <ArrowUpRight size={18} />
                        </button>
                      </div>
                      <p className="subtle">{data.state.goal}</p>
                      <div className="week-mini">
                        {data.state.days.map((d) => (
                          <div
                            key={d.id}
                            className={
                              d.date === data.state.today ? "today" : ""
                            }
                          >
                            <span>{dayLabel(d.date).slice(0, 1)}</span>
                            <i
                              className={
                                d.completed
                                  ? "done"
                                  : d.kind === "rest"
                                    ? "rest"
                                    : "run"
                              }
                            >
                              {d.completed ? (
                                <Check size={13} />
                              ) : d.kind === "rest" ? (
                                <span>·</span>
                              ) : (
                                <span />
                              )}
                            </i>
                          </div>
                        ))}
                      </div>
                      <div className="week-total">
                        <strong>
                          {Math.floor(totals / 60)}h {totals % 60}m
                        </strong>
                        <span>planned this week</span>
                      </div>
                      <button
                        className="outline wide"
                        onClick={() => setTab("My week")}
                      >
                        Open my week <ArrowRight size={16} />
                      </button>
                    </section>
                    <section className="insight-card">
                      <span className="eyebrow">A LITTLE PERSPECTIVE</span>
                      <h3>
                        Consistency beats
                        <br />a perfect run.
                      </h3>
                      <p>
                        The sample runner logged four runs each week. Repeating
                        a manageable routine can be more useful than chasing one
                        big effort.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => setTab("Progress")}
                      >
                        Show me the evidence <ArrowRight size={16} />
                      </button>
                    </section>
                    <div className="quiet-note">
                      <Leaf size={18} />
                      <p>
                        Built around the runner.
                        <br />
                        Not around the numbers.
                      </p>
                    </div>
                  </aside>
                </div>
              )}
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
                        runs · saved in D1
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
                    Completed sample sessions are protected. Moving a run uses
                    an upcoming rest day within this week.
                  </p>
                </section>
              )}
              {tab === "Progress" && stats && (
                <section className="progress-layout">
                  <div className="progress-card">
                    <span className="eyebrow">CONSISTENCY</span>
                    <h2>Four runs. Four weeks in a row.</h2>
                    <p>
                      In this fictional history, the weekly run count is steady.
                      That shows consistency, not necessarily improved fitness.
                    </p>
                    <div
                      className="bar-chart"
                      role="img"
                      aria-label="Sample data: four runs in each of four weeks"
                    >
                      {stats.weeks.map((w) => (
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
                          {stats.totalRuns} fictional activities · {stats.from}{" "}
                          to {stats.to}. Distance: {stats.totalKm} km. No real
                          Strava data or recovery measurements.
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
                        .map((a) => (
                          <div key={a.date}>
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
                  <h2>Cloudflare-native. Intentionally separate.</h2>
                  <ReminderPanel />
                  <p>
                    This preview uses Cloudflare Workers for its API and D1 for
                    saved plans. There are no requests to Replit or the live
                    AITracker backend.
                  </p>
                  <dl>
                    <dt>Runner data</dt>
                    <dd>Fictional, created for this browser</dd>
                    <dt>Storage</dt>
                    <dd>Private session, expires after seven days</dd>
                    <dt>Strava, billing and Telegram</dt>
                    <dd>Not connected</dd>
                    <dt>AI and voice</dt>
                    <dd>
                      OpenAI integration. Availability is shown in the Coach
                      tab. Uses your sample plan, not your real running history.
                    </dd>
                  </dl>
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
  location.pathname === "/waitlist/unsubscribe" ? <WaitlistUnsubscribe/> :
  location.pathname === "/" ? <Landing/> : <App />
);

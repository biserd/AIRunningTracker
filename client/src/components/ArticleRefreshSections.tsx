import { Link } from "wouter";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type Variant = "strava-tools" | "pace" | "training-plan" | "ai-guide" | "agent-coach" | "ultra";

const panels: Record<Variant, { title: string; intro: string; columns: string[]; rows: string[][]; cautions: string[]; links: Array<{ href: string; label: string }> }> = {
  "strava-tools": {
    title: "How we evaluated Strava analytics tools",
    intro: "The comparison now separates recorded capabilities from marketing claims. Products are reviewed by current use case, price visibility, data depth, setup friction and important limitations.",
    columns: ["Runner need", "What to verify", "RunAnalytics position"],
    rows: [
      ["Fast post-run explanation", "Does the tool explain why a metric changed?", "Strong when a synced activity contains usable pace, heart-rate or cadence data."],
      ["Long-term exploration", "Can the runner filter and compare historical periods?", "Useful summaries, but specialized desktop analysis products may offer deeper manual exploration."],
      ["Adaptive next step", "Does the recommendation preserve context through signup and payment?", "Premium Preview and contextual return paths are designed for this workflow."],
      ["Free use", "What works before connecting an account?", "Public calculators work manually; personal history requires Strava and some coaching paths require Premium."],
    ],
    cautions: ["Screenshots and prices should be rechecked quarterly.", "No product is best for every runner.", "RunAnalytics is compared by its own editorial team, so advantages and limitations are disclosed together."],
    links: [{ href: "/tools", label: "Try the free tools" }, { href: "/pricing", label: "See current plan details" }],
  },
  pace: {
    title: "Diagnose the limiter before adding speed",
    intro: "A slower-than-expected pace is a symptom, not a diagnosis. Use several weeks of comparable training before choosing the next intervention.",
    columns: ["Observed pattern", "Likely question", "Useful next step"],
    rows: [
      ["Easy pace slowing at higher heart rate", "Heat, fatigue, aerobic durability or sensor error?", "Compare similar runs with the aerobic-decoupling tool."],
      ["Most runs sit in moderate intensity", "Are easy days too hard to support quality sessions?", "Review four to six weeks in the Training Split Analyzer."],
      ["Cadence changes only when pace changes", "Is the number simply responding to speed?", "Compare cadence at similar pace before changing form."],
      ["Race result has improved but training paces have not", "Are workout targets stale?", "Recalculate broad training pace ranges."],
    ],
    cautions: ["Do not respond to every plateau by adding intervals.", "Pain, illness and persistent unusual fatigue need appropriate professional attention.", "Four-week examples are structure, not individualized prescriptions."],
    links: [{ href: "/tools/training-pace-calculator", label: "Calculate training paces" }, { href: "/tools/race-predictor", label: "Estimate a race scenario" }],
  },
  "training-plan": {
    title: "Training-plan decision table",
    intro: "Choose the least aggressive plan that matches your current consistency, available days and realistic goal date.",
    columns: ["Current situation", "Appropriate starting structure", "Red flag"],
    rows: [
      ["New or returning runner", "Three repeatable days with mostly easy running", "A plan that begins above current weekly volume."],
      ["Consistent intermediate runner", "One or two purposeful sessions plus protected easy volume", "Multiple hard days without recovery space."],
      ["Experienced race-focused runner", "Event-specific work built on a stable baseline", "A goal based only on a prediction without distance-specific preparation."],
      ["Frequently changing schedule", "Adaptive plan with explicit availability", "Treating every missed workout as something to make up."],
    ],
    cautions: ["Do not begin an aggressive build while pain or illness is unresolved.", "A goal date cannot compensate for insufficient preparation time.", "Static and adaptive plans both require runner judgment."],
    links: [{ href: "/training-plans", label: "Preview training-plan setup" }, { href: "/blog/ai-running-coach-vs-training-plan", label: "Compare static plans and AI coaching" }],
  },
  "ai-guide": {
    title: "What an AI running coach knows and what it does not",
    intro: "Useful coaching starts by separating recorded evidence from missing human context.",
    columns: ["Can use when available", "Cannot safely infer", "Runner should provide"],
    rows: [
      ["Pace, distance, splits and elevation", "Pain or emerging injury", "Symptoms and professional advice"],
      ["Heart rate, cadence and recent volume", "Sleep, illness or life stress", "Readiness and schedule constraints"],
      ["Training history and stated goals", "Whether a goal remains personally important", "Changed priorities and race plans"],
      ["Completed versus planned workouts", "Why a workout was missed", "Travel, weather or recovery context"],
    ],
    cautions: ["AI output is coaching guidance, not medical diagnosis.", "Missing or inaccurate device data weakens recommendations.", "A human coach remains better positioned for observation, relationship and complex context."],
    links: [{ href: "/ai-agent-coach", label: "See the Premium Preview workflow" }, { href: "/faq", label: "Read methodology and limitations" }],
  },
  "agent-coach": {
    title: "Concrete proactive-coaching triggers",
    intro: "A proactive message is valuable only when it identifies the evidence, states the limitation and gives one proportionate action.",
    columns: ["Trigger", "Evidence used", "Appropriate response"],
    rows: [
      ["Return after inactivity", "Days since the latest synced run", "Suggest an easy return rather than pretending current readiness is known."],
      ["Sudden volume increase", "Recent weekly load versus established baseline", "Flag the change and protect recovery; do not diagnose injury risk."],
      ["Missed planned run", "Plan schedule and activity history", "Ask why before moving or stacking workouts."],
      ["Pace deterioration at similar effort", "Comparable pace and heart-rate history", "Review conditions, fatigue and data quality before changing the plan."],
      ["Race goal lacks preparation", "Goal date, recent volume and long-run history", "Explain the gap and offer a safer goal or timeline."],
    ],
    cautions: ["Recommendations depend on the activities that successfully sync.", "The system cannot see unrecorded training or symptoms.", "One clear next step is usually more useful than a long generic recap."],
    links: [{ href: "/ai-agent-coach", label: "See how proactive coaching works" }, { href: "/pricing", label: "Review Premium access" }],
  },
  ultra: {
    title: "Scope and readiness for this ultra guide",
    intro: "This article provides a planning framework, not an individualized 100-mile prescription. The demands of terrain, altitude, climate and cutoff times vary materially between events.",
    columns: ["Readiness question", "Evidence to review", "Reason to pause"],
    rows: [
      ["Is current training consistent?", "Several months of repeatable running and recovery", "Recent inactivity or rapidly changing volume"],
      ["Does training match the course?", "Surface, climbing, descending and time-on-feet", "No opportunity to practice key terrain"],
      ["Has fueling been rehearsed?", "Products, timing, fluids and gastrointestinal response", "Race-day plan depends on untested intake"],
      ["Is support appropriate?", "Medical context, race rules, crew and safety plan", "Unresolved symptoms or missing mandatory preparation"],
    ],
    cautions: ["The article has not been presented as a substitute for an experienced ultra coach.", "Back-to-back long runs add stress and are not mandatory for every runner.", "Use race-organizer safety requirements and qualified medical advice where relevant."],
    links: [{ href: "/tools/marathon-fueling", label: "Draft a fueling schedule" }, { href: "/blog/marathon-fueling-calculator-guide", label: "Learn how to rehearse fueling" }],
  },
};

export function ArticleRefreshSections({ variant }: { variant: Variant }) {
  const panel = panels[variant];
  return (
    <section className="mx-auto mb-10 max-w-5xl px-4 sm:px-6" aria-label="Updated practical guidance">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-charcoal dark:text-white">{panel.title}</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{panel.intro}</p>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b">{panel.columns.map((column) => <th key={column} className="p-3">{column}</th>)}</tr></thead><tbody>{panel.rows.map((row) => <tr key={row[0]} className="border-b last:border-0">{row.map((cell, index) => <td key={cell} className={`p-3 align-top ${index === 0 ? "font-semibold" : "text-slate-600 dark:text-slate-300"}`}>{cell}</td>)}</tr>)}</tbody></table></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30"><h3 className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-amber-700" />Important limitations</h3><ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">{panel.cautions.map((item) => <li key={item}>• {item}</li>)}</ul></div>
          <div className="rounded-xl bg-green-50 p-4 dark:bg-green-950/30"><h3 className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-green-700" />Continue with the evidence</h3><ul className="mt-2 space-y-2 text-sm">{panel.links.map((link) => <li key={link.href}><Link href={link.href} className="font-semibold text-blue-700 hover:underline dark:text-blue-300">{link.label} →</Link></li>)}</ul></div>
        </div>
      </div>
    </section>
  );
}

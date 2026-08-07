import { useEffect } from "react";
import { Link } from "wouter";
import { AlertTriangle, BookOpen, CheckCircle2 } from "lucide-react";
import { trackFunnelEvent } from "@/lib/analytics";

type ToolVariant = "race-predictor" | "aerobic-decoupling" | "cadence" | "training-split" | "marathon-fueling" | "training-pace" | "race-splits";

const CONTENT: Record<ToolVariant, {
  source: string;
  capability: string;
  example: string;
  methodology: string;
  limitations: string[];
  interpretations: string[];
  articleHref: string;
  articleLabel: string;
}> = {
  "race-predictor": {
    source: "race_predictor",
    capability: "race_prediction",
    example: "A recent 45:00 10K can estimate longer-distance outcomes, but the marathon result becomes less dependable when long-run volume is missing.",
    methodology: "The calculator applies a Riegel distance relationship and then adjusts the scenario for the training inputs you provide. The result is a modeled range, not a probability interval.",
    limitations: ["Old or non-race efforts weaken the estimate.", "Heat, hills, wind, fueling and pacing can dominate race-day performance.", "Predictions across very different distances require more assumptions."],
    interpretations: ["Use the midpoint as a planning scenario, not a guaranteed finish time.", "Prefer a recent all-out effort at a nearby distance.", "Recalculate after a meaningful race or training block."],
    articleHref: "/blog/how-to-improve-running-pace",
    articleLabel: "Diagnose what may be limiting your pace",
  },
  "aerobic-decoupling": {
    source: "aerobic_decoupling",
    capability: "aerobic_decoupling",
    example: "If pace slows while heart rate rises in the second half, the calculator reports positive fade. A negative value means efficiency improved rather than deteriorated.",
    methodology: "We compare pace-to-heart-rate efficiency in equal halves using one positive-fade convention. Steady, mostly flat runs are more interpretable than variable workouts.",
    limitations: ["Heat, dehydration, hills and sensor error can create apparent drift.", "Short or highly variable runs are poor candidates.", "One result cannot establish an aerobic trend."],
    interpretations: ["Below roughly 5% fade is often stable in suitable conditions.", "Repeated results matter more than a single day.", "Compare similar routes, durations and effort levels."],
    articleHref: "/blog/heart-rate-drift-aerobic-decoupling",
    articleLabel: "Learn how to interpret heart-rate drift",
  },
  cadence: {
    source: "cadence_analyzer",
    capability: "cadence_analysis",
    example: "A runner averaging 164 spm may be stable and efficient for their pace, while a forced jump to 180 spm could be counterproductive.",
    methodology: "The analyzer normalizes device cadence to steps per minute, then examines variability and late-run change. The stability score describes the recorded run rather than diagnosing form quality.",
    limitations: ["Cadence varies with pace, height, terrain and fatigue.", "Wrist-based devices can produce missing or half-cadence values.", "The tool cannot see foot strike, posture or pain."],
    interpretations: ["Focus on changes within comparable runs.", "A lower number is not automatically a problem.", "Use gradual experiments rather than chasing 180 spm."],
    articleHref: "/blog/running-cadence-by-pace",
    articleLabel: "Understand cadence in the context of pace",
  },
  "training-split": {
    source: "training_split_analyzer",
    capability: "training_split",
    example: "A 28-day total of 1,200 easy minutes is presented as about 300 minutes per week before recommendations are generated.",
    methodology: "Recent zone totals are normalized to weekly averages and classified as polarized, pyramidal or threshold-heavy. Recommendations redistribute intensity before suggesting any increase.",
    limitations: ["Zone definitions must match your physiology.", "Heart-rate lag can misclassify short intervals.", "Intensity distribution alone cannot determine whether total load is appropriate."],
    interpretations: ["Protect easy volume before adding hard minutes.", "Both polarized and pyramidal patterns can be reasonable.", "Review at least four consistent weeks."],
    articleHref: "/blog/80-20-running-training-split",
    articleLabel: "See how 80/20 relates to your actual split",
  },
  "marathon-fueling": {
    source: "marathon_fueling",
    capability: "fueling_plan",
    example: "A four-hour runner targeting 60 g of carbohydrate per hour needs about 240 g across the race, minus any carbohydrate supplied by drink mix or food.",
    methodology: "The planner converts your chosen hourly carbohydrate and sodium targets into a schedule using product serving sizes and timing preferences.",
    limitations: ["Tolerance varies substantially between runners.", "Weather and sweat rate affect fluid and sodium needs.", "The calculator cannot identify medical or gastrointestinal conditions."],
    interpretations: ["Practice the full strategy in long runs.", "Start with a tolerable target and progress gradually.", "Include drink mix and food when counting total carbohydrate."],
    articleHref: "/blog/marathon-fueling-calculator-guide",
    articleLabel: "Build and test a complete fueling strategy",
  },
  "training-pace": {
    source: "training_pace_calculator",
    capability: "training_paces",
    example: "A recent 10K result is normalized to a 10K-equivalent pace and converted into deliberately broad easy, long, steady, threshold and interval ranges.",
    methodology: "The tool uses a Riegel-normalized 10K equivalent and transparent pace multipliers. Recency, race distance and current volume determine the usefulness label.",
    limitations: ["Race fitness does not capture sleep, soreness, illness or terrain.", "The ranges are not individualized physiological thresholds.", "Heat and hills should move the target toward effort rather than pace."],
    interpretations: ["Begin at the slower end of each range.", "Easy pace should remain conversational.", "Do not add every pace category in the same week."],
    articleHref: "/blog/how-to-improve-running-pace",
    articleLabel: "Choose the right workout for your limiting factor",
  },
  "race-splits": {
    source: "race_split_calculator",
    capability: "race_splits",
    example: "A negative-split plan makes the first half slightly slower and the second half slightly faster while preserving the exact goal time.",
    methodology: "The calculator assigns a small pace weight to each segment, scales all segments back to the requested finish time and handles the final partial mile or kilometer.",
    limitations: ["Real courses rarely distribute hills and wind evenly.", "GPS distance can differ from certified course markers.", "Aggressive negative splits may be unrealistic for first-time racers."],
    interpretations: ["Use official course markers on race day.", "Choose even pacing unless you have practiced another strategy.", "Adjust individual splits for known climbs without changing the overall effort plan."],
    articleHref: "/blog/how-to-pick-a-training-plan",
    articleLabel: "Match your race goal to a realistic plan",
  },
};

export function ToolEducationPanel({ variant }: { variant: ToolVariant }) {
  const content = CONTENT[variant];
  useEffect(() => {
    trackFunnelEvent("tool_viewed", { source: content.source, capability: content.capability }, { oncePerSession: true, dedupeParts: [content.source, content.capability] });
  }, [content.source, content.capability]);

  return (
    <section className="mt-10 space-y-6" aria-label="Tool methodology and interpretation">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-strava-orange" /><h2 className="text-2xl font-bold">How to use this result</h2></div>
        <p className="text-slate-700 dark:text-slate-300"><strong>Worked example:</strong> {content.example}</p>
        <h3 className="mt-5 font-semibold">Methodology</h3>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{content.methodology}</p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-amber-600" />Limitations</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">{content.limitations.map((item) => <li key={item}>• {item}</li>)}</ul>
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4 text-green-600" />Interpretation</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">{content.interpretations.map((item) => <li key={item}>• {item}</li>)}</ul>
          </div>
        </div>
        <p className="mt-6 text-sm"><Link href={content.articleHref} className="font-semibold text-blue-700 hover:underline dark:text-blue-300">{content.articleLabel} →</Link></p>
      </div>
    </section>
  );
}

import type { RunningShoe } from "./schema";
import { safeShoeSource, shoeNumber, shoeAvailability } from "./shoeEvidence";

export const SHOE_EDITORIAL_VERSION = "2026-09-26.1";
export const SHOE_METHODOLOGY =
  "Specification-based buying guidance, not a hands-on review. Running Warehouse is our primary specification source. Categories and buying considerations are editorial interpretations, not measured performance. We do not invent comfort scores, durability mileage, fit tests or race-time gains.";
export const shoeName = (s: Pick<RunningShoe, "brand" | "model">) =>
  `${s.brand} ${s.model}`;
export const shoeUrl = (s: Pick<RunningShoe, "slug">) =>
  `https://aitracker.run/tools/shoes/${s.slug}`;
export const categoryName = (category: string) =>
  ({
    daily_trainer: "daily training",
    racing: "racing",
    long_run: "long runs",
    recovery: "easy and recovery runs",
    speed_training: "speed sessions",
    trail: "trail running",
  })[category] || category.replaceAll("_", " ");
export function evidenceDate(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toISOString().slice(0, 10)
    : null;
}
export function shoeEvidence(s: RunningShoe) {
  const sourceUrl = safeShoeSource(s.sourceUrl) || null;
  const checked = evidenceDate(s.lastVerified);
  const primary =
    !!sourceUrl &&
    new URL(sourceUrl).hostname === "www.runningwarehouse.com" &&
    s.dataSource === "running_warehouse" &&
    !!checked;
  return {
    status: primary ? "source_checked" : "historical_unverified",
    sourceUrl,
    checked,
    sourceName: primary
      ? "Running Warehouse"
      : sourceUrl
        ? new URL(sourceUrl).hostname
        : null,
    measurementBasis: primary
      ? "One men's/unisex US 9 shoe, ounces; stack/drop in millimetres"
      : "Measurement size and source comparability not verified",
    priceBasis:
      "Recorded USD price; may be colorway-specific or clearance. Not MSRP, a live quote or a stock guarantee.",
    handsOnTested: false,
    limitations: primary
      ? [
          "Source checked on the stated date, not continuously refreshed.",
          "Fit, durability and running economy have not been independently tested by RunAnalytics.",
        ]
      : [
          "Historical catalog record: recheck every measurement and price against a current retailer or manufacturer listing before a buying decision.",
          "Existing generated scores and mileage estimates are not evidence and are not published as measured facts.",
        ],
  } as const;
}

/** Preserve the stored record privately; do not syndicate unsubstantiated AI scores. */
export function publicShoe(
  s: RunningShoe,
): RunningShoe & { evidence: ReturnType<typeof shoeEvidence> } {
  return {
    ...s,
    evidence: shoeEvidence(s),
    sourceUrl: safeShoeSource(s.sourceUrl) || null,
    comfortRating: null,
    durabilityRating: null,
    responsivenessRating: null,
    aiResilienceScore: null,
    aiMileageEstimate: null,
    aiNarrative: null,
    aiFaq: null,
    aiTargetUsage: null,
    description:
      shoeEvidence(s).status === "source_checked" ? s.description : null,
  };
}
type Section = { title: string; text: string };
export type ShoeGuide = {
  title: string;
  description: string;
  summary: string;
  sections: Section[];
  questions: { question: string; answer: string }[];
  evidence: ReturnType<typeof shoeEvidence>;
  methodology: string;
  version: string;
};
const usage: Record<string, string> = {
  daily_trainer:
    "Consider it for the regular easy runs that make up most of your week. Try it at your usual easy pace; an appealing specification sheet cannot establish whether the upper, heel hold and ride suit you.",
  racing:
    "Consider it for a race-specific shortlist, then rehearse in training before committing to race day. Check comfort over your intended distance and stability at your target pace. Carbon reinforcement alone does not establish a faster shoe for you.",
  long_run:
    "Consider it for sustained training outings. Test toe room, heel hold and underfoot comfort as your feet warm up; stack height alone cannot establish comfort late in a run.",
  recovery:
    "Consider it for relaxed outings where comfort and control matter more than pace. Softness is a catalog classification, not a measured recovery benefit, and no shoe guarantees faster recovery.",
  speed_training:
    "Consider it for the faster sessions in your schedule. Try both warm-up pace and your intended repetitions; a low weight does not establish grip, stability or how the shoe transitions between paces.",
  trail:
    "Match the shoe to the actual surface: smooth paths, rocky ground and mud make different demands. Verify outsole, lug depth, protection and weather suitability in the source listing; a trail category alone does not establish those details.",
};
export function buildShoeGuide(s: RunningShoe): ShoeGuide {
  const name = shoeName(s),
    evidence = shoeEvidence(s),
    label =
      evidence.status === "source_checked" ? "Source-checked" : "Historical";
  const summary =
    evidence.status === "source_checked" && s.description
      ? s.description
      : `${name} is catalogued for ${categoryName(s.category)}. Its older specifications have not been reverified; treat this page as a starting point for research, not an independently tested recommendation.`;
  const sections: Section[] = [
    {
      title: `Where ${s.model} fits in your rotation`,
      text:
        usage[s.category] ||
        "Start with the intended surface and session, then assess fit. The catalog classification is a starting point, not a guarantee of suitability.",
    },
    {
      title: "What the recorded measurements tell you",
      text: `${label} record: ${shoeNumber(s.weight, " oz")} per shoe, ${shoeNumber(s.heelStackHeight, " mm")} heel stack, ${shoeNumber(s.forefootStackHeight, " mm")} forefoot stack and ${shoeNumber(s.heelToToeDrop, " mm")} drop. Weight is a comparison input, not a speed prediction. Stack describes height, not softness; drop describes heel-to-forefoot geometry, not injury protection. ${evidence.measurementBasis}.`,
    },
    {
      title: "Construction and trade-offs to check",
      text: `The record classifies the platform as ${s.stability.replaceAll("_", " ")} with ${s.cushioningLevel} cushioning. ${s.hasCarbonPlate == null ? "Carbon reinforcement is not verified." : s.hasCarbonPlate ? "Carbon reinforcement is recorded; check the source for whether this is a plate or rods and how it is arranged." : "No carbon reinforcement is recorded."} ${s.hasSuperFoam == null ? "Foam classification is not verified." : s.hasSuperFoam ? "A performance-foam classification is recorded, but it does not quantify energy return." : "The catalog does not classify the midsole as super foam."} Confirm toe-box room, heel hold and cornering confidence yourself; these are not established by the listed geometry.`,
    },
    {
      title: "Price, availability and when to wait",
      text: `${shoeAvailability(s)}. The recorded price is ${shoeNumber(s.price, " USD")}. ${evidence.priceBasis} ${s.availability === "upcoming" ? "Do not rely on this model for an imminent race: the expected date can change, and unpublished measurements remain unknown." : "Compare the same size, width and colorway, including return terms. A discounted older model may be worth considering if its fit and condition meet your needs."}`,
    },
    {
      title: "Before buying or upgrading",
      text: `Use the series links to check the previous ${s.seriesName || s.model} model, but only draw numerical conclusions when both entries have comparable, dated source measurements. Keep a comfortable existing shoe unless the new version addresses a specific need. For a new model, verify sizing, width options, outsole and return policy rather than inferring them from weight or price.`,
    },
  ];
  return {
    title: `${name}: Specs & Buying Guide`,
    description: `${name} for ${categoryName(s.category)}: weight, stack, drop, recorded price, alternatives and buying guidance. ${evidence.status === "source_checked" ? "Dated source evidence." : "Historical data clearly labeled."}`,
    summary,
    sections,
    questions: [
      {
        question: `What is the ${name} intended for?`,
        answer: `The catalog places it in ${categoryName(s.category)}. ${usage[s.category] || "Confirm the intended surface and use in the source listing."}`,
      },
      {
        question: `What is the weight and drop of the ${s.model}?`,
        answer: `Recorded weight: ${shoeNumber(s.weight, " oz")}; drop: ${shoeNumber(s.heelToToeDrop, " mm")}. ${evidence.measurementBasis}. ${evidence.status === "historical_unverified" ? "These older values require source verification." : "Missing measurements are not estimated."}`,
      },
      {
        question: `Is the ${s.model} available now?`,
        answer: `${shoeAvailability(s)}. This is not a live inventory check. Confirm current stock for your size and colorway directly with the seller.`,
      },
      {
        question: `How long will the ${s.model} last, and will it fit me?`,
        answer:
          "We do not have independent wear-testing or fit measurements for this model. A fixed mileage lifespan or comfort rating would be misleading. Inspect your shoes for wear and changes in feel; use a try-on and the seller’s return policy to assess fit.",
      },
      {
        question: "How was this page researched?",
        answer: `${evidence.sourceName ? `The linked source is ${evidence.sourceName}.` : "No validated source link is recorded."} ${evidence.checked ? `Recorded verification date: ${evidence.checked}.` : "No verification date is recorded."} ${SHOE_METHODOLOGY}`,
      },
    ],
    evidence,
    methodology: SHOE_METHODOLOGY,
    version: SHOE_EDITORIAL_VERSION,
  };
}

export function buildComparisonGuide(a: RunningShoe, b: RunningShoe) {
  const an = shoeName(a),
    bn = shoeName(b),
    ae = shoeEvidence(a),
    be = shoeEvidence(b);
  const comparable =
    ae.status === "source_checked" && be.status === "source_checked";
  const sameSeries =
    a.brand === b.brand && !!a.seriesName && a.seriesName === b.seriesName;
  const differences: Section[] = [];
  for (const [field, label, unit] of [
    ["weight", "Weight", "oz"],
    ["heelStackHeight", "Heel stack", "mm"],
    ["forefootStackHeight", "Forefoot stack", "mm"],
    ["heelToToeDrop", "Drop", "mm"],
  ] as const) {
    const av = a[field],
      bv = b[field];
    differences.push({
      title: label,
      text: `${a.model}: ${shoeNumber(av, ` ${unit}`)}; ${b.model}: ${shoeNumber(bv, ` ${unit}`)}. ${
        av == null || bv == null
          ? "A value is unpublished, so no numerical difference is asserted."
          : !comparable
            ? "At least one record is historical or lacks comparable source evidence; do not treat this as a verified difference."
            : av === bv
              ? "The source-checked values are the same."
              : `The recorded difference is ${Math.abs(av - bv)
                  .toFixed(1)
                  .replace(
                    /\.0$/,
                    "",
                  )} ${unit}; ${av > bv ? a.model : b.model} has the higher value. This does not establish better performance.`
      }`,
    });
  }
  const verdict =
    a.availability === "upcoming" || b.availability === "upcoming"
      ? `At least one model is upcoming. Shortlist an available, well-fitting shoe for an imminent race; wait for the unreleased model’s confirmed stock and missing specifications before treating it as an upgrade.`
      : !comparable
        ? `There is not enough comparable, verified evidence to name a winner between ${an} and ${bn}. Use the historical values as research leads, then confirm the source and try the fit.`
        : `Choose between ${an} and ${bn} by the session you need it for, fit and current price—not by assuming that lighter, newer or more expensive means better.`;
  const sections: Section[] = [
    {
      title: `When to shortlist ${a.model}`,
      text: `${an} is catalogued for ${categoryName(a.category)}. ${usage[a.category] || ""} ${a.availability === "upcoming" ? "Its upcoming status makes availability a deciding factor." : ""}`,
    },
    {
      title: `When to shortlist ${b.model}`,
      text: `${bn} is catalogued for ${categoryName(b.category)}. ${usage[b.category] || ""} ${b.availability === "upcoming" ? "Its upcoming status makes availability a deciding factor." : ""}`,
    },
    {
      title: sameSeries
        ? "Is the newer version worth upgrading to?"
        : "Different models, different buying decisions",
      text: sameSeries
        ? `Both belong to ${a.seriesName}. Start with what you want to change about your current pair: fit, intended use or a specific construction detail. Read each source-linked model overview below for documented changes. ${comparable ? "The measurements below can establish geometry and weight differences, not a faster race time." : "Older or unpublished specifications prevent a complete like-for-like upgrade claim."} If your current shoe works well, a new version number alone is not a reason to replace it.`
        : `These are separate models, not necessarily direct replacements. ${a.category === b.category ? `Both sit in the ${categoryName(a.category)} category, so try them for the same session before judging fit and feel.` : `The catalog assigns ${a.model} to ${categoryName(a.category)} and ${b.model} to ${categoryName(b.category)}; decide which role is missing in your rotation first.`} A specification comparison cannot substitute for a fit test.`,
    },
    {
      title: "Price and value—not a live deal comparison",
      text: `${a.model}: ${shoeNumber(a.price, " USD")}; ${b.model}: ${shoeNumber(b.price, " USD")}. These are recorded offers, potentially from different dates, colors or clearance periods. They are not necessarily launch prices. Check both source links for matching size/width, current price and return policy before deciding which offers better value.`,
    },
    {
      title: "What this comparison cannot establish",
      text: "We have not independently measured fit, outsole grip, energy return, comfort or durability for this pair. The absence of a rating is not a poor score. No universal winner, injury-prevention claim or race-time improvement is inferred from carbon construction, foam classification or stack height.",
    },
  ];
  const questions = [
    { question: `Which is better: ${an} or ${bn}?`, answer: verdict },
    {
      question: `Which of these shoes is lighter?`,
      answer: differences[0].text,
    },
    {
      question: sameSeries
        ? `Should I upgrade within the ${a.seriesName} series?`
        : "Can these shoes serve different roles in my rotation?",
      answer: sections[2].text,
    },
    {
      question: "Are the listed prices and availability current?",
      answer: `${a.model}: ${shoeAvailability(a)}. ${b.model}: ${shoeAvailability(b)}. ${sections[3].text}`,
    },
    { question: "Is this a hands-on review?", answer: SHOE_METHODOLOGY },
  ];
  return {
    title: `${an} vs ${bn}`,
    description: `${a.model} vs ${b.model}: compare ${a.heelToToeDrop ?? "unpublished"}/${b.heelToToeDrop ?? "unpublished"} mm drop, weight, construction, price and whether switching makes sense. ${comparable ? "Source-checked specs." : "Evidence gaps disclosed."}`,
    verdict,
    sections,
    differences,
    questions,
    methodology: SHOE_METHODOLOGY,
    version: SHOE_EDITORIAL_VERSION,
    evidence: [ae, be],
  };
}

export function safeJson(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

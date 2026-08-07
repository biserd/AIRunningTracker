export type EditorialTopic = "training" | "ai" | "tools";

export interface EditorialPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  dateLabel: string;
  readTime: string;
  category: string;
  topic: EditorialTopic;
  lede: string;
  sections: Array<{ id: string; title: string; html: string }>;
  faqs: Array<{ question: string; answer: string }>;
  sources: Array<{ label: string; href: string }>;
}

export const editorialPosts: EditorialPost[] = [
  {
    slug: "heart-rate-drift-aerobic-decoupling",
    title: "Heart Rate Drift and Aerobic Decoupling Explained",
    description: "Learn what heart-rate drift means, how aerobic decoupling is calculated, which runs are suitable, and how to avoid misleading conclusions.",
    date: "2026-08-07",
    dateLabel: "August 7, 2026",
    readTime: "9 min read",
    category: "Running Analytics",
    topic: "training",
    lede: "Heart rate often rises during a steady run even when pace stays unchanged. Aerobic decoupling turns that relationship into a comparison, but the number is useful only when the route, effort and data are suitable.",
    sections: [
      { id: "meaning", title: "What heart-rate drift actually measures", html: `<p>During prolonged running, heat, hydration, fatigue and changes in muscle recruitment can increase cardiovascular demand. If pace stays similar while heart rate rises, pace-to-heart-rate efficiency has faded. This is commonly called cardiac drift; aerobic decoupling expresses the change between two parts of the activity.</p><p>It is not a direct measurement of aerobic capacity. It is a field observation influenced by both fitness and conditions.</p>` },
      { id: "calculation", title: "How RunAnalytics calculates decoupling", html: `<p>The <a href="/tools/aerobic-decoupling-calculator">Aerobic Decoupling Calculator</a> compares equal halves of a run. It calculates an efficiency value from speed and heart rate for each half, then reports the percentage lost in the second half. Positive values mean fade; negative values mean efficiency improved.</p><p>Using one sign convention matters. If pace slows and heart rate rises, the result must not be described as an improvement.</p>` },
      { id: "suitable-runs", title: "Choose a run that can answer the question", html: `<p>Use a continuous, mostly flat, steady run long enough for drift to develop. Avoid interval sessions, stop-start city routes, large climbs, races with major pace changes and activities with obvious sensor dropouts. Compare similar durations, routes and weather whenever possible.</p><p>A single run is a snapshot. A repeated pattern across comparable long runs is more informative.</p>` },
      { id: "interpretation", title: "Interpretation without rigid pass/fail rules", html: `<p>Low fade in stable conditions suggests that the chosen duration and effort were aerobically sustainable that day. Larger fade can reflect intensity that was too high, limited endurance, heat, dehydration, fueling, fatigue or bad data. A commonly used five-percent reference can be a useful conversation point, but it is not a universal physiological boundary.</p>` },
      { id: "next-step", title: "What to do with the result", html: `<p>If fade repeats, first control the test: slow the opening pace, choose cooler conditions and verify the heart-rate sensor. Then compare several similar runs. Use the result alongside perceived effort and your broader <a href="/tools/training-split-analyzer">training-intensity distribution</a>, not as a reason to add more hard training automatically.</p>` },
    ],
    faqs: [
      { question: "Is aerobic decoupling the same as cardiac drift?", answer: "They are closely related. Cardiac drift describes the heart-rate change; aerobic decoupling compares the change in heart rate relative to pace or power." },
      { question: "Is less than five percent always good?", answer: "No universal cutoff applies to every runner and condition. Use it as a reference and prioritize repeated comparisons on similar runs." },
      { question: "Can hills invalidate the result?", answer: "Large elevation or pace changes make a split-half comparison harder to interpret because the work performed in each half is no longer comparable." },
    ],
    sources: [
      { label: "RunAnalytics Aerobic Decoupling Calculator", href: "/tools/aerobic-decoupling-calculator" },
      { label: "ACSM exercise guidance", href: "https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines" },
    ],
  },
  {
    slug: "running-cadence-by-pace",
    title: "Running Cadence by Pace: Interpret Your Step Rate",
    description: "Understand how cadence changes with pace, height, terrain and fatigue—and why runners should not chase one universal steps-per-minute target.",
    date: "2026-08-07",
    dateLabel: "August 7, 2026",
    readTime: "8 min read",
    category: "Running Form",
    topic: "training",
    lede: "Cadence is the number of steps taken per minute. It is easy to measure and easy to misuse: pace, leg length, terrain and fatigue all change the number, so 180 steps per minute is not a universal target.",
    sections: [
      { id: "context", title: "Cadence needs pace context", html: `<p>Most runners increase cadence as they accelerate and decrease it on slower recovery runs. Two athletes at the same pace can use different combinations of step rate and stride length. Height and leg length contribute, but they do not determine a single correct value.</p><p>Compare your cadence at similar paces and terrain before concluding that it changed.</p>` },
      { id: "myth", title: "Why 180 spm became a misleading rule", html: `<p>The widely repeated 180-spm idea came from observations of competitive runners, not a prescription for every runner at every pace. Forcing a large increase can feel awkward and raise energy cost. When cadence experiments are appropriate, use small changes and evaluate comfort rather than chasing a round number.</p>` },
      { id: "drift", title: "What cadence drift can and cannot show", html: `<p>Late-run cadence change may accompany fatigue, slowing, climbing or a deliberate pacing change. The <a href="/tools/cadence-analyzer">Cadence Analyzer</a> normalizes device data and measures within-run stability. It cannot see posture, foot strike, pain or biomechanics, so its score describes the recorded pattern—not overall form quality or injury risk.</p>` },
      { id: "device-data", title: "Check the device before judging the runner", html: `<p>Some devices store revolutions of one leg rather than total steps. A value near half the expected cadence should be normalized once, not doubled repeatedly in different layers of an application. Missing sections, wrist movement and treadmill calibration can also distort the stream.</p>` },
      { id: "actions", title: "Practical cadence experiments", html: `<p>Start with relaxed strides, short hill efforts or a metronome set only a few percent above your normal rate. Keep the experiment brief and stop if it creates pain or tension. Use cadence alongside pace and perceived effort in a <a href="/tools/training-pace-calculator">training pace range</a>.</p>` },
    ],
    faqs: [
      { question: "Is 180 steps per minute ideal?", answer: "No. Cadence varies with pace, body dimensions, terrain and individual mechanics. Consistency and comfort are usually more useful than a universal target." },
      { question: "Why does cadence fall late in a run?", answer: "It can fall because pace slows, fatigue changes mechanics, terrain changes or the device records poorly. Review all of those factors." },
      { question: "Should I deliberately increase cadence?", answer: "Only gradually and for a clear reason. Small experiments are preferable to forcing a large immediate change." },
    ],
    sources: [
      { label: "RunAnalytics Cadence Analyzer", href: "/tools/cadence-analyzer" },
      { label: "World Athletics health and science resources", href: "https://worldathletics.org/about-iaaf/health-science" },
    ],
  },
  {
    slug: "80-20-running-training-split",
    title: "80/20 Running: Calculate Your Actual Training Split",
    description: "Learn how to calculate easy, moderate and hard training time, distinguish polarized from pyramidal training, and avoid rigid 80/20 rules.",
    date: "2026-08-07",
    dateLabel: "August 7, 2026",
    readTime: "10 min read",
    category: "Training Plans",
    topic: "training",
    lede: "The useful idea behind 80/20 running is not a perfect ratio. It is protecting enough low-intensity volume that harder work remains purposeful and recoverable.",
    sections: [
      { id: "definitions", title: "What counts as easy, moderate and hard", html: `<p>A three-zone model groups training below the first threshold as easy, between thresholds as moderate and above the second threshold as hard. Your device's five heart-rate zones do not map automatically to this model. Confirm the definitions before calculating a split.</p>` },
      { id: "time-or-sessions", title: "Count time or sessions consistently", html: `<p>Research and coaching discussions sometimes count sessions and sometimes count minutes. They answer different questions. RunAnalytics uses time in zone, then normalizes a 28–42 day total into a weekly average so a six-week sample is not mislabeled as one week.</p>` },
      { id: "patterns", title: "Polarized, pyramidal and threshold-heavy", html: `<p>Polarized training contains a large easy share, little moderate work and a distinct hard share. Pyramidal training still prioritizes easy work but includes more moderate than hard time. Threshold-heavy training concentrates too much work in the middle. Both polarized and pyramidal structures can be reasonable depending on the event and phase.</p>` },
      { id: "analyze", title: "Calculate your real distribution", html: `<p>Use at least four consistent weeks in the <a href="/tools/training-split-analyzer">Training Split Analyzer</a>. Review warm-ups, cooldowns and heart-rate lag. When moderate time is excessive, redistribute part of it to easy running before considering additional hard minutes.</p>` },
      { id: "apply", title: "Use the ratio as a guardrail", html: `<p>A percentage cannot tell you whether total volume is safe, whether you are recovering or whether your zones are correct. Combine the split with schedule, symptoms, recent consistency and the purpose of the training block. The simplest useful action is often to make easy days genuinely easy.</p>` },
    ],
    faqs: [
      { question: "Must every week be exactly 80/20?", answer: "No. Treat the ratio as a broad guardrail across a training block, not a pass/fail target for every week." },
      { question: "Is polarized better than pyramidal training?", answer: "Both can be reasonable. The appropriate distribution depends on the runner, event, training phase and zone definitions." },
      { question: "Should threshold-heavy runners add more hard training?", answer: "Usually the first adjustment is to reduce or redistribute moderate intensity, not automatically increase hard minutes." },
    ],
    sources: [
      { label: "RunAnalytics Training Split Analyzer", href: "/tools/training-split-analyzer" },
      { label: "Frontiers review of endurance intensity distribution", href: "https://www.frontiersin.org/journals/physiology" },
    ],
  },
  {
    slug: "marathon-fueling-calculator-guide",
    title: "Marathon Fueling Calculator Guide: Build a Race Plan",
    description: "Build a marathon carbohydrate, gel, sodium and fluid schedule—and learn how to test tolerance before race day.",
    date: "2026-08-07",
    dateLabel: "August 7, 2026",
    readTime: "10 min read",
    category: "Race Preparation",
    topic: "training",
    lede: "A fueling calculator organizes a plan; it does not prove that your gut can tolerate it. The most reliable strategy is specific, counts every carbohydrate source and has been rehearsed in long runs.",
    sections: [
      { id: "inputs", title: "Start with duration, not just distance", html: `<p>Two marathoners cover the same distance but may spend very different amounts of time on course. Goal time determines how many fueling opportunities are available. Use a realistic estimate from the <a href="/tools/race-predictor">Race Predictor</a>, then choose a carbohydrate target you have already approached in training.</p>` },
      { id: "carbohydrate", title: "Count total carbohydrate", html: `<p>Gels are only one source. Add drink mix, chews and food when calculating grams per hour. More is not automatically better: tolerance, product concentration and fluid availability matter. Increase intake gradually during training instead of testing a high target on race morning.</p>` },
      { id: "schedule", title: "Turn the target into a schedule", html: `<p>The <a href="/tools/marathon-fueling">Marathon Fueling Planner</a> divides the selected target into product servings and intervals. Start before energy feels low and coordinate gels with aid stations when water is needed. The output should be simple enough to follow under fatigue.</p>` },
      { id: "sodium-fluid", title: "Keep sodium and fluid individualized", html: `<p>Sweat rate, sodium concentration and weather vary widely. Avoid treating one universal sodium or fluid number as a prescription. Use thirst, practiced intake, event conditions and qualified advice when you have a relevant health condition.</p>` },
      { id: "rehearsal", title: "Rehearse and record what happened", html: `<p>Test the product, concentration, timing and carrying method during long runs. Record gastrointestinal symptoms, thirst and unused fuel. Adjust one variable at a time. Race day should repeat a plan that already worked rather than introduce a new product or aggressive target.</p>` },
    ],
    faqs: [
      { question: "How many gels are needed for a marathon?", answer: "It depends on course time, carbohydrate per gel and carbohydrate from drinks or food. Calculate grams per hour rather than relying on a universal gel count." },
      { question: "When should fueling begin?", answer: "Most plans begin early enough to avoid playing catch-up. The exact timing should be practiced and coordinated with water when the product requires it." },
      { question: "Can a calculator determine sodium needs?", answer: "It can organize a chosen target, but individual sweat and sodium losses require context that a basic calculator does not measure." },
    ],
    sources: [
      { label: "RunAnalytics Marathon Fueling Planner", href: "/tools/marathon-fueling" },
      { label: "Australian Institute of Sport sports food guidance", href: "https://www.ais.gov.au/nutrition/supplements/group_a" },
    ],
  },
  {
    slug: "ai-running-coach-vs-training-plan",
    title: "AI Running Coach vs Static Training Plan",
    description: "Compare AI coaching, fixed training plans and human coaching by adaptability, context, accountability, cost and limitations.",
    date: "2026-08-07",
    dateLabel: "August 7, 2026",
    readTime: "9 min read",
    category: "AI & Technology",
    topic: "ai",
    lede: "A static plan provides structure. An AI coach can respond to recorded training. A human coach can ask about context that sensors never capture. The right choice depends on the decision you need help making.",
    sections: [
      { id: "static", title: "What a static plan does well", html: `<p>A well-designed fixed plan is predictable, inexpensive and easy to understand. It works best when the runner starts near the assumed fitness level and can follow the schedule consistently. Its weakness is not being static by itself—it is that missed runs, illness or unusually rapid progress require the runner to make adjustments.</p>` },
      { id: "ai", title: "What an AI coach can adapt", html: `<p>An AI coach can summarize synced activities, compare recent patterns and connect a recommendation to recorded pace, heart rate, cadence and training load. RunAnalytics provides a <a href="/ai-agent-coach">Premium Preview</a> so a runner can inspect the style of analysis before starting a trial.</p><p>The system cannot infer pain, illness, sleep or life stress unless that context is supplied.</p>` },
      { id: "human", title: "Where a human coach remains different", html: `<p>A qualified human coach can observe behavior, ask follow-up questions, interpret non-training constraints and provide accountability through a relationship. Quality, availability and cost vary. AI analysis can support a human coach with summaries, but it should not be presented as equivalent in every situation.</p>` },
      { id: "comparison", title: "Choose by the decision, not the label", html: `<table><thead><tr><th>Need</th><th>Best starting option</th></tr></thead><tbody><tr><td>Simple race structure</td><td>Static plan</td></tr><tr><td>Frequent feedback from recorded runs</td><td>AI coach</td></tr><tr><td>Complex context, recurring pain or high accountability</td><td>Qualified human support</td></tr><tr><td>Data summaries for an existing coach</td><td>AI plus human coach</td></tr></tbody></table>` },
      { id: "evaluate", title: "Evaluate an AI coach before paying", html: `<p>Ask which data is used, how missing data is handled, whether recommendations explain their reasoning, how subscription intent is preserved and how easy cancellation is. Compare the analysis with your own knowledge and never treat a training recommendation as medical diagnosis.</p><p>Read the <a href="/blog/ai-running-coach-complete-guide-2026">complete AI running coach guide</a> or inspect the <a href="/pricing">current plan details</a>.</p>` },
    ],
    faqs: [
      { question: "Can an AI coach replace a human coach?", answer: "It can automate analysis and routine feedback, but it cannot fully replace observation, relationship, judgment and context supplied to a qualified human coach." },
      { question: "Is a static plan bad because it does not adapt?", answer: "No. A suitable static plan can provide excellent structure. The runner must know when and how to adjust it." },
      { question: "What data can an AI running coach use?", answer: "Depending on the product and device, it may use pace, distance, heart rate, cadence, elevation, training history, goals and information the runner explicitly provides." },
    ],
    sources: [
      { label: "RunAnalytics methodology and limitations", href: "/faq" },
      { label: "Strava API agreement", href: "https://www.strava.com/legal/api" },
    ],
  },
];

export function getEditorialPost(slug: string): EditorialPost | undefined {
  return editorialPosts.find((post) => post.slug === slug);
}

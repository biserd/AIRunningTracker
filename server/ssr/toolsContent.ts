export interface ToolContent {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  features: string[];
  howItWorks: string;
  benefits: string[];
  faq?: { question: string; answer: string }[];
}

export const toolsContent: ToolContent[] = [
  {
    slug: "race-predictor",
    title: "Race Time Predictor | Riegel Running Calculator",
    description: "Estimate a race finish time from a recent performance using a transparent Riegel model and clearly labeled scenario range.",
    keywords: "race predictor, ai race predictor, marathon time predictor, half marathon predictor, 10k race predictor, 5k race predictor, strava race predictor, vdot calculator",
    features: [
      "Predict times for 5K, 10K, Half Marathon, and Marathon",
      "Uses the published Riegel distance relationship",
      "Import your best race from Strava automatically",
      "See equivalent times across all standard distances",
      "Shows assumptions and limitations"
    ],
    howItWorks: "Enter a recent race time or connect Strava to select a suitable performance. The calculator uses the Riegel relationship T2 = T1 × (D2/D1)^1.06, plus the training variables you provide. The output is an estimate rather than a calibrated probability forecast.",
    benefits: [
      "Set realistic race goals backed by science",
      "Identify which race distance suits you best",
      "Track your fitness progression over time",
      "Plan your training paces accurately"
    ],
    faq: [
      { question: "How accurate is the Race Predictor?", answer: "Use it as a planning estimate. A recent all-out result at a nearby distance is more informative, while weather, terrain, pacing, fueling and distance-specific training can materially change the outcome." },
      { question: "Do I need a Strava account?", answer: "No! You can manually enter any recent race time. Strava integration just makes it easier by finding your best races automatically." }
    ]
  },
  {
    slug: "marathon-fueling",
    title: "Marathon Fueling Calculator | Gel Timing & Nutrition Plan",
    description: "Turn your chosen carbohydrate, product and timing inputs into a marathon fueling schedule that you can rehearse in training.",
    keywords: "marathon fueling, gel timing calculator, marathon nutrition plan, race nutrition, carbohydrate calculator, sodium intake running",
    features: [
      "Personalized carb targets based on your goal time",
      "Gel timing schedule with exact mile markers",
      "Sodium and electrolyte requirements",
      "Choose your preferred gel brand",
      "Printable race day fueling card"
    ],
    howItWorks: "Enter a realistic marathon time and the intake you have practiced. The planner converts product serving sizes and timing preferences into a schedule. It does not measure individual tolerance, sweat rate or medical needs.",
    benefits: [
      "Avoid the dreaded 'wall' with proper fueling",
      "Practice race-day nutrition in training",
      "Know exactly when and what to consume",
      "Prevent GI distress with gradual intake"
    ],
    faq: [
      { question: "How many gels do I need?", answer: "Typically 4-7 gels for a marathon, depending on your pace and carb tolerance. Faster runners need more carbs per hour." },
      { question: "When should I start taking gels?", answer: "We recommend starting at 30-45 minutes into the race, before you feel fatigued, to stay ahead of your energy needs." }
    ]
  },
  {
    slug: "aerobic-decoupling-calculator",
    title: "Aerobic Decoupling Calculator | Running Endurance Test",
    description: "Measure aerobic fade on long runs. Calculate your Pa:HR ratio and endurance efficiency score. Free tool with Strava import.",
    keywords: "aerobic decoupling, running endurance test, cardiac drift calculator, Pa:HR ratio, aerobic efficiency, heart rate drift",
    features: [
      "Calculate Pa:HR decoupling percentage",
      "Analyze pace vs heart rate drift over time",
      "Import long runs from Strava automatically",
      "Get your Aerobic Efficiency Score",
      "Track aerobic development over months"
    ],
    howItWorks: "The calculator compares speed-to-heart-rate efficiency in equal halves and uses one positive-fade convention. A positive result means efficiency declined. Heat, hills, hydration and sensor quality can affect the number.",
    benefits: [
      "Objectively measure aerobic fitness progress",
      "Know when you're ready for harder training",
      "Identify if you're running easy runs too hard",
      "Monitor recovery and fatigue"
    ],
    faq: [
      { question: "What is good aerobic decoupling?", answer: "Under 5% is excellent and indicates strong aerobic fitness. 5-10% is moderate, over 10% suggests more aerobic base work." },
      { question: "Which runs should I analyze?", answer: "Use steady-state runs of 60+ minutes at easy pace. Hilly runs or runs with surges won't give accurate readings." }
    ]
  },
  {
    slug: "training-split-analyzer",
    title: "Training Split Analyzer | Polarized vs Pyramidal Training",
    description: "Analyze your running intensity distribution. Discover if you're training polarized, pyramidal, or threshold-heavy. Free with Strava sync.",
    keywords: "training split analyzer, polarized training, pyramidal training, running zones, intensity distribution, 80/20 running",
    features: [
      "Calculate your Zone 1/2/3 training distribution",
      "Identify if you're polarized, pyramidal, or threshold-heavy",
      "Compare your split with clearly labeled reference patterns",
      "Sync with Strava for automatic analysis",
      "Track distribution changes over training blocks"
    ],
    howItWorks: "The analyzer calculates time in a three-zone model, normalizes the selected period into weekly averages and classifies the distribution. Zone definitions and data quality must be checked before acting on the result.",
    benefits: [
      "Avoid the 'gray zone' trap of mediocre training",
      "Optimize your hard/easy balance",
      "Run your easy runs truly easy",
      "Maximize training adaptations"
    ],
    faq: [
      { question: "Is polarized training better?", answer: "Both polarized and pyramidal work well. The key is avoiding too much 'moderate' intensity where you're not easy enough to recover or hard enough to get faster." },
      { question: "How much data do I need?", answer: "At least 4 weeks of consistent training data gives the most accurate picture of your training distribution." }
    ]
  },
  {
    slug: "cadence-analyzer",
    title: "Running Cadence Analyzer | Form Stability Score",
    description: "Detect running form fade with cadence and stride analysis. Get your Form Stability Score and identify late-run form breakdown.",
    keywords: "running cadence analyzer, form stability, stride length, running form analysis, cadence drift, running efficiency",
    features: [
      "Track cadence changes throughout your run",
      "Calculate Form Stability Score (FSS)",
      "Detect late-run form breakdown",
      "Analyze stride length patterns",
      "Compare cadence across different runs"
    ],
    howItWorks: "Your cadence naturally varies during a run, but excessive drift often indicates fatigue and form breakdown. We analyze cadence data from your watch, comparing early vs late-run patterns to calculate a Form Stability Score. Higher scores indicate better form maintenance.",
    benefits: [
      "Identify when form breaks down on long runs",
      "Monitor fatigue patterns over time",
      "Improve running economy",
      "Prevent overstriding when tired"
    ],
    faq: [
      { question: "What's a good running cadence?", answer: "There is no universal target. Cadence varies with pace, height, terrain and individual mechanics. Compare your own values on similar runs and focus on comfort and stability." },
      { question: "Why does cadence drop late in runs?", answer: "Fatigue causes muscle weakness and coordination loss, leading to longer ground contact time and lower cadence." }
    ]
  },
  {
    slug: "training-pace-calculator",
    title: "Training Pace Calculator | Free Running Pace Zones",
    description: "Calculate broad easy, long-run, steady, threshold and interval pace ranges from a recent race, with transparent assumptions.",
    keywords: "training pace calculator, running pace zones, easy run pace, threshold pace, interval pace",
    features: ["Five practical pace ranges", "Miles or kilometers", "Usefulness rating based on recency and distance", "No account required"],
    howItWorks: "A recent result is normalized to a 10K equivalent using the Riegel relationship. Broad multipliers create starting pace ranges; recency, race distance and weekly volume determine the usefulness label.",
    benefits: ["Start workouts with realistic pace ranges", "Avoid one-number false precision", "Understand when a result is less dependable", "Connect the result to a personalized training plan"],
    faq: [
      { question: "Are these physiological training zones?", answer: "No. They are broad pace starting ranges, not laboratory-measured thresholds." },
      { question: "Which result should I enter?", answer: "Use a recent, well-paced race or hard effort. A 5K through half marathon usually transfers most directly." },
    ],
  },
  {
    slug: "race-split-calculator",
    title: "Race Split Calculator | Mile and Kilometer Chart",
    description: "Create exact mile or kilometer splits for even, conservative-start or negative-split race strategies.",
    keywords: "race split calculator, marathon pace chart, mile splits, kilometer splits, negative split",
    features: ["Even, conservative-start and negative-split strategies", "Exact cumulative time", "Partial final split", "Copy and print plan"],
    howItWorks: "The calculator applies a small strategy weight to each segment, scales all segments back to the requested finish time and includes the final partial mile or kilometer.",
    benefits: ["Carry a simple race-day pacing plan", "See cumulative checkpoints", "Avoid accidental rounding errors", "Practice the same strategy in training"],
    faq: [
      { question: "Which strategy is best?", answer: "Even pacing is the simplest default. Use another strategy only when it fits the course and has been practiced." },
      { question: "Why is the last split shorter?", answer: "Standard race distances are not whole numbers of both miles and kilometers, so the final row covers the exact remaining distance." },
    ],
  },
  {
    slug: "heatmap",
    title: "Running Heatmap | Visualize Your Training Routes",
    description: "See your most-run routes on an interactive heatmap. Discover training patterns and favorite paths from your Strava activities.",
    keywords: "running heatmap, training routes, Strava heatmap, route visualization, running map, GPS tracking",
    features: [
      "Interactive map showing all your running routes",
      "Heat intensity based on frequency",
      "Filter by date range and activity type",
      "Zoom and explore your running territory",
      "Share your heatmap with friends"
    ],
    howItWorks: "Connect your Strava account and we'll overlay all your GPS tracks on an interactive map. Routes you run frequently glow brighter, revealing your preferred training loops, favorite paths, and unexplored areas nearby.",
    benefits: [
      "Discover your running patterns visually",
      "Find new routes in your neighborhood",
      "See your running 'territory' grow over time",
      "Celebrate your training consistency"
    ],
    faq: [
      { question: "How many activities do I need?", answer: "Even 10-20 runs will create an interesting heatmap, but it really shines with 50+ activities." },
      { question: "Is my location data private?", answer: "Yes! Your heatmap is only visible to you. We use Strava's privacy settings and never share your location data." }
    ]
  },
  {
    slug: "shoe-finder",
    title: "Running Shoe Finder | Personalized Shoe Recommendations",
    description: "Find your perfect running shoe based on foot type, running style & goals. AI-powered recommendations from 100+ models.",
    keywords: "running shoe finder, best running shoes, shoe recommendations, running shoe quiz, personalized shoes",
    features: [
      "Answer a few questions about your running",
      "Get personalized shoe recommendations",
      "Browse 100+ shoes in our database",
      "Filter by brand, price, and features",
      "Compare multiple shoes side-by-side"
    ],
    howItWorks: "Tell us about your foot type, weekly mileage, running goals, and preferred feel. Our algorithm matches you with shoes that fit your specific needs from our database of 100+ models with detailed specifications and runner reviews.",
    benefits: [
      "Save hours of research",
      "Find shoes that match your running style",
      "Discover new brands and models",
      "Make confident purchase decisions"
    ],
    faq: [
      { question: "How often should I replace running shoes?", answer: "Most shoes last 300-500 miles. Heavier runners or those with inefficient gaits may need replacements sooner." },
      { question: "Should I rotate between multiple shoes?", answer: "Yes! Studies show rotating 2-3 shoes reduces injury risk by varying the stress on your legs." }
    ]
  },
  {
    slug: "rotation-planner",
    title: "Running Shoe Rotation Planner | Build Your Shoe Lineup",
    description: "Plan the perfect running shoe rotation. Get AI recommendations for daily trainers, speed shoes & race day options.",
    keywords: "shoe rotation, running shoe lineup, multiple running shoes, shoe rotation planner, running shoe strategy",
    features: [
      "Build your optimal shoe rotation",
      "Get recommendations for each workout type",
      "Track mileage on each pair",
      "Know when to replace each shoe",
      "Balance cushion, speed, and durability"
    ],
    howItWorks: "Tell us your weekly training structure (easy runs, tempos, long runs, intervals, races). We'll recommend a rotation strategy and specific shoe models for each purpose, balancing performance and durability across your lineup.",
    benefits: [
      "Extend shoe lifespan with strategic rotation",
      "Match shoes to workout purposes",
      "Reduce injury risk through variety",
      "Optimize performance for each session"
    ],
    faq: [
      { question: "How many shoes do I need?", answer: "Most runners benefit from 2-3 shoes: a daily trainer for easy/long runs, a lightweight shoe for speed work, and optionally a racing shoe." },
      { question: "Do carbon plated shoes make you faster?", answer: "Studies show 2-4% improvement for most runners. They're best reserved for races and key workouts due to lower durability." }
    ]
  }
];

export function getToolBySlug(slug: string): ToolContent | null {
  return toolsContent.find(tool => tool.slug === slug) || null;
}

export function getAllToolSlugs(): string[] {
  return toolsContent.map(tool => tool.slug);
}

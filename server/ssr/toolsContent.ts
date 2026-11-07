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
    title: "Race Predictor for Strava Runs & Manual Race Times",
    description: "Predict 5K to marathon times from a recent race result. Enter it free or sign in to select a synced Strava run, then review pacing and scenario ranges.",
    keywords: "race predictor, ai race predictor, marathon time predictor, half marathon predictor, 10k race predictor, 5k race predictor, strava race predictor, vdot calculator",
    features: [
      "Predict times for 5K, 10K, Half Marathon, and Marathon",
      "Uses the published Riegel distance relationship",
      "Choose a recent saved Strava run after connecting and syncing",
      "See equivalent times across all standard distances",
      "Shows assumptions and limitations"
    ],
    howItWorks: "Enter a recent race time without an account, or sign in, connect Strava on the dashboard and sync your runs. The picker shows saved runs of at least 3 km and 10 minutes from up to 100 activities in the last 90 days. You choose the hard effort; it is not detected automatically. The calculator uses a Riegel relationship with your training inputs and displays a planning scenario.",
    benefits: [
      "Set realistic race goals backed by science",
      "Identify which race distance suits you best",
      "Track your fitness progression over time",
      "Plan your training paces accurately"
    ],
    faq: [
      { question: "How accurate is the Race Predictor?", answer: "Use it as a planning estimate. A recent all-out result at a nearby distance is more informative, while weather, terrain, pacing, fueling and distance-specific training can materially change the outcome." },
      { question: "Do I need a Strava account?", answer: "No. Manual entry is free and needs no account. To use Strava, sign in, connect and sync from the dashboard, then choose a saved run yourself." }
    ]
  },
  {
    slug: "marathon-fueling",
    title: "Marathon Fueling Calculator: Carbs, Gels & Race Schedule",
    description: "Turn your chosen carbohydrate, product and timing inputs into a marathon fueling schedule that you can rehearse in training.",
    keywords: "marathon fueling, gel timing calculator, marathon nutrition plan, race nutrition, carbohydrate calculator, sodium intake running",
    features: [
      "Use the hourly intake targets you have practiced",
      "Gel schedule in elapsed minutes",
      "Separate pre-start and in-race totals",
      "Choose your preferred gel brand",
      "Copy or print a schedule to rehearse on a long run"
    ],
    howItWorks: "Enter a realistic marathon time and the intake you have practiced. The planner converts product serving sizes and timing preferences into a schedule. It does not measure individual tolerance, sweat rate or medical needs.",
    benefits: [
      "See the arithmetic behind your chosen schedule",
      "Practice race-day nutrition in training",
      "Know exactly when and what to consume",
      "Compare the schedule with your own tolerance"
    ],
    faq: [
      { question: "How many gels do I need?", answer: "It depends on your chosen target, duration, product serving sizes and drink carbohydrate. The calculator shows the total and separates any pre-start gel." },
      { question: "What should I do with the result?", answer: "Copy or print the schedule, confirm product labels and aid-station access, then practice it on a long run before using it in a race." }
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
    title: "Running Shoe Finder: Build a Shortlist in 3 Questions",
    description: "Build a running-shoe shortlist from your goal, body weight and support preference. Review catalogue matches, compare specifications and check fit before buying.",
    keywords: "running shoe finder, best running shoes, shoe recommendations, running shoe quiz, personalized shoes",
    features: [
      "Answer a few questions about your running",
      "See catalogue options for your chosen running goal",
      "Review the matching category and support preference",
      "Follow dated sources and compare recorded prices",
      "Compare multiple shoes side-by-side"
    ],
    howItWorks: "Enter your weight, running goal and support preference. The shortlist ranks category matches and uses runner-weight ranges where recorded. It does not diagnose foot mechanics, predict comfort or establish an injury outcome. Compare two options and try the fit before buying.",
    benefits: [
      "Save hours of research",
      "Find shoes that match your running style",
      "Discover new brands and models",
      "Make confident purchase decisions"
    ],
    faq: [
      { question: "How often should I replace running shoes?", answer: "Most shoes last 300-500 miles. Heavier runners or those with inefficient gaits may need replacements sooner." },
      { question: "Should I rotate between multiple shoes?", answer: "Different shoes can cover different sessions, but you do not need every suggested role. Start with what your current pair does well and add only for a useful purpose." }
    ]
  },
  {
    slug: "rotation-planner",
    title: "Running Shoe Rotation Planner | Build Your Shoe Lineup",
    description: "Explore shoe roles for daily mileage, long runs, speed and races using your weight and weekly mileage. Compare options and save a rotation to review.",
    keywords: "shoe rotation, running shoe lineup, multiple running shoes, shoe rotation planner, running shoe strategy",
    features: [
      "Explore a suggested shoe rotation",
      "Get recommendations for each workout type",
      "Compare recorded shoe specifications",
      "Save a text copy on this device",
      "Balance cushion, speed, and durability"
    ],
    howItWorks: "Enter your weight, weekly mileage and preferred unit. Review suggested models for different running roles, compare their specifications and save a text copy. This tool does not track mileage on your individual pairs or determine when they need replacing.",
    benefits: [
      "Identify gaps in your current shoe setup",
      "Match shoes to workout purposes",
      "Avoid buying a pair for every suggested role",
      "Review fit and current price before buying"
    ],
    faq: [
      { question: "How many shoes do I need?", answer: "Most runners benefit from 2-3 shoes: a daily trainer for easy/long runs, a lightweight shoe for speed work, and optionally a racing shoe." },
      { question: "Do I need a carbon-plated shoe?", answer: "No. A plate is one part of a shoe's construction, not a guarantee of a faster race. Consider fit, intended session, experience and budget before adding a racing shoe." }
    ]
  }
];

export function getToolBySlug(slug: string): ToolContent | null {
  return toolsContent.find(tool => tool.slug === slug) || null;
}

export function getAllToolSlugs(): string[] {
  return toolsContent.map(tool => tool.slug);
}

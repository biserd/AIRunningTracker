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
    title: "Race Time Predictor | Free 5K to Marathon Calculator",
    description: "Predict your 5K, 10K, half marathon & marathon times using the Riegel formula. Import Strava data for personalized race predictions. Free calculator.",
    keywords: "race time predictor, marathon time calculator, running pace calculator, Riegel formula, 5K prediction, half marathon time",
    features: [
      "Predict times for 5K, 10K, Half Marathon, and Marathon",
      "Uses the scientifically-validated Riegel formula",
      "Import your best race from Strava automatically",
      "See equivalent times across all standard distances",
      "Calculate your VDOT running fitness score"
    ],
    howItWorks: "Enter a recent race time or connect Strava to import your best performance. The calculator uses Pete Riegel's formula (T2 = T1 × (D2/D1)^1.06) to predict times at other distances. For Strava users, we auto-detect your races and use your best performance for predictions.",
    benefits: [
      "Set realistic race goals backed by science",
      "Identify which race distance suits you best",
      "Track your fitness progression over time",
      "Plan your training paces accurately"
    ],
    faq: [
      { question: "How accurate is the Race Predictor?", answer: "The Riegel formula is highly accurate for well-trained runners. Predictions assume similar training and racing conditions across distances." },
      { question: "Do I need a Strava account?", answer: "No! You can manually enter any recent race time. Strava integration just makes it easier by finding your best races automatically." }
    ]
  },
  {
    slug: "marathon-fueling",
    title: "Marathon Fueling Calculator | Gel Timing & Nutrition Plan",
    description: "Calculate your marathon nutrition plan with exact gel timing, carb targets & sodium needs. Get a personalized race fueling strategy in minutes.",
    keywords: "marathon fueling, gel timing calculator, marathon nutrition plan, race nutrition, carbohydrate calculator, sodium intake running",
    features: [
      "Personalized carb targets based on your goal time",
      "Gel timing schedule with exact mile markers",
      "Sodium and electrolyte requirements",
      "Choose your preferred gel brand",
      "Printable race day fueling card"
    ],
    howItWorks: "Enter your marathon goal time, body weight, and preferred gel brand. We calculate your hourly carbohydrate needs (30-90g/hour depending on intensity), then create a precise fueling schedule with gel intake at optimal intervals to prevent bonking.",
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
    howItWorks: "Aerobic decoupling measures how well your heart rate stays stable relative to pace during a long run. We compare the first and second halves of your run: (HR2/Pace2) vs (HR1/Pace1). Under 5% decoupling indicates excellent aerobic fitness; over 10% suggests more base training is needed.",
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
      "Compare your split to elite training patterns",
      "Sync with Strava for automatic analysis",
      "Track distribution changes over training blocks"
    ],
    howItWorks: "We analyze your recent runs by heart rate or pace to calculate time spent in each training zone. Polarized training (80% easy, 5% moderate, 15% hard) and pyramidal (70-75% easy, 15-20% moderate, 5-10% hard) are both effective approaches used by elites.",
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
      { question: "What's a good running cadence?", answer: "Most efficient runners land between 170-190 steps per minute. What matters more is consistency throughout your run." },
      { question: "Why does cadence drop late in runs?", answer: "Fatigue causes muscle weakness and coordination loss, leading to longer ground contact time and lower cadence." }
    ]
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

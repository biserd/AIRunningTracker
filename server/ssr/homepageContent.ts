export interface HomepageContent {
  hero: {
    title: string;
    subtitle: string;
    description: string;
    cta: { text: string; href: string };
    trustIndicators: string[];
  };
  aiCoach: {
    title: string;
    subtitle: string;
    description: string;
    features: { title: string; description: string }[];
    cta: { text: string; href: string };
  };
  runnerScore: {
    title: string;
    subtitle: string;
    description: string;
    features: { title: string; description: string }[];
    cta: { text: string; href: string };
  };
  coreFeatures: {
    title: string;
    icon: string;
    description: string;
    sample?: string;
  }[];
  freeTools: {
    title: string;
    description: string;
    href: string;
    badge?: string;
  }[];
  pricing: {
    title: string;
    subtitle: string;
    plans: {
      name: string;
      price: string;
      description: string;
      features: string[];
      cta: { text: string; href: string };
      highlighted?: boolean;
    }[];
  };
  testimonials: {
    quote: string;
    author: string;
    role: string;
  }[];
  finalCta: {
    title: string;
    description: string;
    buttonText: string;
    href: string;
  };
}

export const homepageContent: HomepageContent = {
  hero: {
    title: "The Missing Analytics Layer for Strava",
    subtitle: "Strava tracks your miles. We tell you how to run them faster and stay healthy.",
    description: "Don't just log your runs, learn from them. Sync your history instantly to unlock the AI coaching, race predictions, and deep insights that your dashboard is missing.",
    cta: { text: "Get My Free Strava Analysis", href: "/auth" },
    trustIndicators: [
      "Free tier available",
      "No credit card required",
      "Syncs instantly with Strava"
    ]
  },
  aiCoach: {
    title: "Your 24/7 Running Strategist",
    subtitle: "Strava gives you charts. We give you answers.",
    description: "Stop staring at graphs wondering if you're improving. Just ask. From \"Am I overtraining?\" to \"What's my marathon pace?\", get instant advice based on your actual history.",
    features: [
      { title: "Turn complex data into plain English", description: "" },
      { title: "100% Personal Context", description: "Unlike generic chatbots, we analyze your last 12 months of Strava logs before answering." },
      { title: "Instant Race-Readiness Checks", description: "Ask \"Am I ready?\" and get an honest prediction based on your recent long runs." },
      { title: "Spot Injury Risks Early", description: "Identify volume spikes and fatigue trends before they sideline you." }
    ],
    cta: { text: "Ask My Coach a Question", href: "/auth" }
  },
  runnerScore: {
    title: "Get Your Personal \"Runner Grade\"",
    subtitle: "Are you an A+ Athlete or a C-Student?",
    description: "Our algorithm ranks you against thousands of other runners to show exactly where you stand. Finally, a metric that rewards consistency, not just speed.",
    features: [
      { title: "Track 4 Key Metrics at Once", description: "" },
      { title: "Instant Strengths & Weaknesses", description: "See instantly if you need more speed or more volume." },
      { title: "The Ultimate \"Humble Brag\"", description: "Export beautiful, pro-level visuals to share your score on Instagram or Strava." }
    ],
    cta: { text: "Calculate My Score Now", href: "/auth" }
  },
  coreFeatures: [
    {
      title: "Smart Performance Insights",
      icon: "brain",
      description: "Get personalized insights about your performance patterns, recovery needs, and training recommendations.",
      sample: "\"Your pace has improved 12% over the last month. Consider adding interval training to break through your current plateau.\""
    },
    {
      title: "Race Time Predictions",
      icon: "target",
      description: "AI-powered predictions for 5K, 10K, half marathon, and marathon distances based on your training data."
    },
    {
      title: "Injury Prevention",
      icon: "shield",
      description: "Smart analysis identifies training patterns that may lead to injury and provides prevention strategies."
    }
  ],
  freeTools: [
    { title: "Race Time Predictor", description: "Predict your 5K to marathon times using the Riegel formula", href: "/tools/race-predictor" },
    { title: "Marathon Fueling Calculator", description: "Calculate exact gel timing and carb targets", href: "/tools/marathon-fueling" },
    { title: "Aerobic Decoupling", description: "Measure your endurance efficiency", href: "/tools/aerobic-decoupling-calculator" },
    { title: "Training Split Analyzer", description: "Discover your training intensity distribution", href: "/tools/training-split-analyzer" },
    { title: "Cadence Analyzer", description: "Detect running form fade patterns", href: "/tools/cadence-analyzer" },
    { title: "Running Heatmap", description: "Visualize your most-run routes", href: "/tools/heatmap" },
    { title: "Shoe Database", description: "Browse and compare 100+ running shoes", href: "/tools/shoes", badge: "New" },
    { title: "Shoe Finder", description: "Find your perfect running shoe", href: "/tools/shoe-finder" },
    { title: "Rotation Planner", description: "Plan your ideal shoe rotation", href: "/tools/rotation-planner" }
  ],
  pricing: {
    title: "Simple, Transparent Pricing",
    subtitle: "Start free, upgrade when you're ready",
    plans: [
      {
        name: "Free",
        price: "$0",
        description: "Perfect for casual runners",
        features: [
          "Basic Runner Score",
          "Race Time Predictions",
          "Last 30 days of activities",
          "AI Chat (unlimited)",
          "Free Running Tools"
        ],
        cta: { text: "Get Started Free", href: "/auth" }
      },
      {
        name: "Pro",
        price: "$8/month",
        description: "For dedicated runners",
        features: [
          "Everything in Free",
          "Full activity history",
          "Advanced analytics",
          "Training plans",
          "Priority support"
        ],
        cta: { text: "Start Pro Trial", href: "/pricing" },
        highlighted: true
      },
      {
        name: "Premium",
        price: "$15/month",
        description: "For serious athletes",
        features: [
          "Everything in Pro",
          "AI Agent Coach",
          "Proactive coaching alerts",
          "Goal tracking",
          "Custom insights"
        ],
        cta: { text: "Go Premium", href: "/pricing" }
      }
    ]
  },
  testimonials: [
    {
      quote: "Finally, an app that actually tells me what my Strava data means. The AI coach is like having a personal trainer in my pocket.",
      author: "Sarah M.",
      role: "Marathon Runner"
    },
    {
      quote: "The Runner Score gave me a clear picture of where I stand. Now I know exactly what to focus on.",
      author: "James K.",
      role: "Ultra Runner"
    },
    {
      quote: "The race predictions were spot-on for my half marathon. Finished within 30 seconds of the predicted time!",
      author: "Emily R.",
      role: "Half Marathon Enthusiast"
    }
  ],
  finalCta: {
    title: "Ready to Run Smarter?",
    description: "Join thousands of runners who've discovered the insights hiding in their Strava data.",
    buttonText: "Get My Free Analysis",
    href: "/auth"
  }
};

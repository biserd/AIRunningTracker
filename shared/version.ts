export const VERSION = "2.5.0";

export interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: {
    type: "feature" | "fix" | "improvement" | "breaking";
    description: string;
  }[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "2.5.0",
    date: "2025-10-19",
    title: "GPT-5 AI Engine Upgrade",
    description: "Complete platform upgrade to OpenAI's GPT-5 (released August 2025) for superior AI-powered insights and training recommendations. Enhanced intelligence across all AI features including performance analysis, training plans, race predictions, and personalized coaching with improved accuracy and more nuanced recommendations.",
    changes: [
      {
        type: "improvement",
        description: "Upgraded AI Insights generation from GPT-4o to GPT-5 for more intelligent pattern recognition and personalized coaching"
      },
      {
        type: "improvement",
        description: "Upgraded Training Plan generation from GPT-4o to GPT-5 for enhanced training recommendations"
      },
      {
        type: "improvement",
        description: "Enhanced training plan context with race predictions, dual VO2 max scores, and Runner Score for more realistic pacing"
      },
      {
        type: "improvement",
        description: "Improved unit conversion system with percentage-based pace adjustments for accurate metric/imperial recommendations"
      },
      {
        type: "fix",
        description: "Fixed training plan pace calculations to prevent unrealistic pace recommendations (e.g., 6:50/mi when runner averages 10-11 min/mi)"
      },
      {
        type: "fix",
        description: "Corrected pace range calculations to use percentage-based adjustments instead of fixed values for both metric and imperial users"
      },
      {
        type: "improvement",
        description: "Added comprehensive fitness context to AI prompts including actual pace distribution, fastest/slowest runs, and clear boundaries"
      },
      {
        type: "improvement",
        description: "Enhanced error handling with safe defaults for edge cases and insufficient data scenarios"
      }
    ]
  },
  {
    version: "2.4.0",
    date: "2025-10-18",
    title: "Free Platform & User Feedback System",
    description: "RunAnalytics is now completely free for all users with all premium features unlocked. Enhanced user feedback system, improved pricing page readability, full marathon predictions, and refined training recommendations.",
    changes: [
      {
        type: "breaking",
        description: "All premium features now completely free - removed subscription paywalls for everyone"
      },
      {
        type: "feature",
        description: "Bug Report & Feature Suggestion system with popup dialog, database storage, and email notifications"
      },
      {
        type: "feature",
        description: "Floating feedback button in all authenticated pages for easy bug reporting and feature suggestions"
      },
      {
        type: "feature",
        description: "Full Marathon (42.2km) race prediction added alongside 5K, 10K, and Half Marathon predictions"
      },
      {
        type: "improvement",
        description: "Training Recommendations now show top 3 most important items with improved visual hierarchy"
      },
      {
        type: "improvement",
        description: "Pricing page completely redesigned with better readability and contrast - white background with green checkmarks"
      },
      {
        type: "improvement",
        description: "All existing users automatically upgraded to Pro tier with full feature access"
      },
      {
        type: "improvement",
        description: "Removed billing navigation, Pro badges, and upgrade prompts from interface"
      },
      {
        type: "improvement",
        description: "SEO enhancement with comprehensive meta tags, Open Graph, and JSON-LD structured data"
      },
      {
        type: "improvement",
        description: "Mobile optimization - all touch targets 44px minimum, responsive text scaling"
      },
      {
        type: "improvement",
        description: "Landing page CTA optimization with social proof and trust indicators"
      },
      {
        type: "improvement",
        description: "4-step onboarding modal and progress checklist for new user guidance"
      },
      {
        type: "improvement",
        description: "Welcome email system for new users with admin signup notifications"
      }
    ]
  },
  {
    version: "2.3.0",
    date: "2025-09-28",
    title: "Strava API Agreement Compliance",
    description: "Full compliance with Strava's API Agreement and Terms of Service, including enhanced privacy protections, security procedures, and clear subscription model transparency. RunAnalytics now meets all official Strava developer requirements while maintaining user privacy and data protection.",
    changes: [
      {
        type: "feature",
        description: "Enhanced Privacy Policy with comprehensive Strava data handling section"
      },
      {
        type: "feature",
        description: "Official Strava branding compliance with 'Connect with Strava' buttons, 'Powered by Strava' attribution, and 'View on Strava' links"
      },
      {
        type: "feature",
        description: "Security procedures documentation with 24-hour breach notification requirement to Strava"
      },
      {
        type: "feature",
        description: "Subscription model transparency - clarifying users pay for AI analytics services, not Strava data access"
      },
      {
        type: "improvement",
        description: "Added Strava attribution to all relevant pages including dashboard, activity pages, and footer"
      },
      {
        type: "improvement",
        description: "Enhanced security protocols with incident response procedures and compliance templates"
      },
      {
        type: "improvement",
        description: "Clear separation of Strava integration (free) from premium AI analytics features"
      }
    ]
  },
  {
    version: "2.2.0",
    date: "2025-09-28",
    title: "Promotion Code System",
    description: "Enhanced subscription system with promotion code support for friend testing and user acquisition. Share discount codes to invite friends to test RunAnalytics Pro with special pricing or completely free access.",
    changes: [
      {
        type: "feature",
        description: "Promotion code system with real-time validation via Stripe API"
      },
      {
        type: "feature",
        description: "Test promotion codes: TESTFREE1 (100% off 1 month), HALFPRICE (50% off 3 months), FIRSTFREE ($9.99 off first month)"
      },
      {
        type: "feature",
        description: "Smart subscription handling for 100% discount codes with immediate activation"
      },
      {
        type: "feature",
        description: "Promotion code input field on subscription page with apply functionality"
      },
      {
        type: "feature",
        description: "Success/error notifications for promotion code validation and application"
      },
      {
        type: "improvement",
        description: "Enhanced subscription creation API to support coupon application and discount tracking"
      },
      {
        type: "improvement",
        description: "Automatic subscription activation for free trials without payment processing"
      },
      {
        type: "fix",
        description: "Fixed null pointer exception for 100% discount subscriptions that don't require payment"
      }
    ]
  },
  {
    version: "2.1.0",
    date: "2025-09-28",
    title: "SaaS Platform Transformation",
    description: "RunAnalytics is now a full Software-as-a-Service platform with subscription-based billing, featuring Free and Pro tiers with advanced AI insights, unlimited data access, and premium features for serious runners",
    changes: [
      {
        type: "feature",
        description: "Subscription billing system with Stripe integration for secure payments"
      },
      {
        type: "feature", 
        description: "Free tier with basic analytics, Strava integration, and 30 days of data"
      },
      {
        type: "feature",
        description: "Pro tier ($9.99/month) with advanced AI insights, training plans, race predictions, and unlimited history"
      },
      {
        type: "feature",
        description: "Feature gating system with smart upgrade prompts and subscription status tracking"
      },
      {
        type: "feature",
        description: "Billing management page for subscription control and cancellation"
      },
      {
        type: "feature",
        description: "Pricing page with clear plan comparison and upgrade flows"
      },
      {
        type: "feature",
        description: "Pro badge indicators in navigation for subscribed users"
      },
      {
        type: "improvement",
        description: "Enhanced navigation with billing access and subscription status indicators"
      },
      {
        type: "improvement",
        description: "Comprehensive API endpoints for subscription management and webhook handling"
      },
      {
        type: "improvement",
        description: "Database schema updates for customer and subscription tracking"
      }
    ]
  },
  {
    version: "2.0.0",
    date: "2025-09-13",
    title: "Advanced Analytics & Admin Dashboard",
    description: "Major platform enhancement with comprehensive analytics, administrative monitoring, and advanced user insights - transforming RunAnalytics into an enterprise-grade running analytics platform",
    changes: [
      {
        type: "feature",
        description: "Enhanced Quick Stats with comparison arrows and trend indicators for better progress visualization"
      },
      {
        type: "feature",
        description: "Performance Chart Time Filters with multiple time periods (7 days, 3 months, 6 months, 1 year)"
      },
      {
        type: "feature",
        description: "AI Insights Categories Expansion with 5 comprehensive categories: Performance, Training, Health, Goals, and Motivation"
      },
      {
        type: "feature",
        description: "Insight History Timeline with progressive tracking and trend visualization"
      },
      {
        type: "feature",
        description: "Actionable Recommendations with interactive action items and implementation guidance"
      },
      {
        type: "feature",
        description: "Historical Runner Score tracking with trend charts and progression analysis"
      },
      {
        type: "feature",
        description: "Detailed Splits Analysis with table view, chart view, and comprehensive per-split metrics"
      },
      {
        type: "feature",
        description: "Admin Dashboard User Analytics with 12+ comprehensive usage metrics including DAU/WAU/MAU tracking"
      },
      {
        type: "feature",
        description: "Admin Dashboard Performance Monitoring with real-time system health metrics and API performance tracking"
      },
      {
        type: "improvement",
        description: "Real-time monitoring with 30-second refresh intervals for live system status"
      },
      {
        type: "improvement",
        description: "Enhanced user experience with loading states, responsive design, and accessibility improvements"
      },
      {
        type: "improvement",
        description: "Comprehensive admin tools for platform management and user monitoring"
      }
    ]
  },
  {
    version: "1.0.0",
    date: "2025-09-13",
    title: "Initial Release",
    description: "Welcome to RunAnalytics - Your AI-powered running analytics platform",
    changes: [
      {
        type: "feature",
        description: "AI-powered running insights and performance analysis"
      },
      {
        type: "feature",
        description: "Strava integration for activity synchronization"
      },
      {
        type: "feature",
        description: "Comprehensive dashboard with fitness trends and metrics"
      },
      {
        type: "feature",
        description: "Runner Score system with radar chart visualization"
      },
      {
        type: "feature",
        description: "Personalized training plans and race predictions"
      },
      {
        type: "feature",
        description: "VO2 Max estimation and heart rate zone analysis"
      },
      {
        type: "feature",
        description: "User authentication and secure data management"
      },
      {
        type: "feature",
        description: "FAQ page with comprehensive support information"
      },
      {
        type: "improvement",
        description: "Landing page with direct registration and login"
      },
      {
        type: "fix",
        description: "Corrected fitness trends calculation for accurate weekly volume"
      }
    ]
  }
];
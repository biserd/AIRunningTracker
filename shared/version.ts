export const VERSION = "2.0.0";

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
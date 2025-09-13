export const VERSION = "1.0.0";

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
    version: "1.0.0",
    date: "2025-01-13",
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
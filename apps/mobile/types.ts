export interface User {
  id: number;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  stravaConnected?: boolean | null;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
  subscriptionPlan?: string | null;
  unitPreference?: "km" | "miles" | null;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface Activity {
  id: number;
  stravaId: string | null;
  name: string;
  type: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  startDate: string;
  averageSpeed: number | null;
  maxSpeed?: number | null;
  averageHeartrate: number | null;
  maxHeartrate?: number | null;
  totalElevationGain: number | null;
  averageCadence?: number | null;
  startLatitude?: number | null;
  startLongitude?: number | null;
  endLatitude?: number | null;
  endLongitude?: number | null;
}

export interface DashboardStats {
  monthlyTotalDistance: string;
  monthlyAvgPace: string;
  monthlyTotalActivities: number;
  monthlyTrainingLoad: number;
  weeklyTotalDistance: string;
  weeklyAvgPace: string;
  weeklyTotalActivities: number;
  weeklyTrainingLoad: number;
  recovery: "Good" | "Moderate" | "Low";
  unitPreference: "km" | "miles";
  monthlyDistanceChange: number | null;
  monthlyPaceChange: number | null;
  monthlyActivitiesChange: number | null;
  weeklyDistanceChange: number | null;
  weeklyPaceChange: number | null;
  weeklyActivitiesChange: number | null;
}

export interface DashboardData {
  user: {
    name: string;
    stravaConnected?: boolean;
    unitPreference?: "km" | "miles";
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    lastSyncAt?: string | null;
  };
  stats: DashboardStats;
}

export interface ChartPoint {
  week: string;
  pace: number;
  distance: number;
  activitiesCount: number;
}

export interface ChartResponse {
  chartData: ChartPoint[];
}

export interface RunnerScore {
  totalScore: number;
  grade: string;
  percentile: number;
  components: {
    consistency: number;
    performance: number;
    volume: number;
    improvement: number;
  };
  trends: {
    weeklyChange: number;
    monthlyChange: number;
  };
  badges: string[];
  shareableMessage: string;
}

export interface SuitableActivity {
  id: number;
  name: string;
  distance: number;
  distanceFormatted: string;
  movingTime: number;
  durationFormatted: string;
  paceFormatted: string;
  startDate: string;
  distanceUnit: string;
}

export interface RacePrediction {
  predictedTime: number;
  predictedPace: number;
  formattedTime: string;
  formattedPace: string;
  confidence?: "high" | "medium" | "low";
  k?: number;
}

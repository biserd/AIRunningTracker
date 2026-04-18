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

export interface DashboardData {
  user: User;
  activities: Activity[];
  insights?: unknown[];
  quickStats?: {
    thisMonthDistance?: number;
    thisMonthRuns?: number;
    lastMonthDistance?: number;
    lastMonthRuns?: number;
    thisWeekDistance?: number;
    thisWeekRuns?: number;
    lastWeekDistance?: number;
    lastWeekRuns?: number;
    currentStreak?: number;
    longestStreak?: number;
    totalDistance?: number;
    totalRuns?: number;
    weeklyAverage?: number;
  } | null;
  syncState?: { status?: string; lastSyncAt?: string | null } | null;
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

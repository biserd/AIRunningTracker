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

export interface Goal {
  id: number;
  userId: number;
  title: string;
  description: string;
  type: string;
  targetValue: string | null;
  currentProgress: number | null;
  status: "active" | "completed";
  source: "recommendation" | "manual";
  completedAt: string | null;
  createdAt: string | null;
}

export interface Conversation {
  id: number;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
}

export interface AppNotification {
  id: number;
  userId: number;
  title: string;
  body: string;
  channel?: string;
  status?: string;
  readAt?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

export interface SubscriptionStatus {
  subscriptionStatus: string;
  subscriptionPlan: string;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  isReverseTrial: boolean;
  trialDaysRemaining: number;
  usage?: {
    insightsUsedToday?: number;
    insightsLimitPerDay?: number;
    chatMessagesUsedToday?: number;
    chatMessagesLimitPerDay?: number;
  };
}

export interface InsightItem {
  id: number;
  type: string;
  title: string;
  content: string;
  priority?: string | null;
  createdAt: string;
}

export interface CoachVerdict {
  grade: "A" | "B" | "C" | "D" | "F";
  gradeLabel: string;
  summary: string;
  evidenceBullets: { type: "positive" | "neutral" | "negative"; text: string }[];
  effortScore: number;
  consistencyLabel: "recovery" | "easier" | "consistent" | "harder" | "much_harder";
  consistencyDescription: string;
  comparison: {
    paceVsAvg: number;
    hrVsAvg: number;
    effortVsAvg: number;
    distanceVsAvg: number;
  };
  nextSteps: string[];
}

export interface DataQuality {
  score: number;
  flags: string[];
  hrQuality: number;
  gpsQuality: number;
  pauseQuality: number;
  totalDataPoints: number;
  affectedPercentage: number;
}

export interface EfficiencyMetrics {
  aerobicDecoupling: number | null;
  decouplingLabel: "excellent" | "good" | "moderate" | "concerning" | "unknown";
  paceHrEfficiency: number | null;
  pacingStability: number;
  pacingLabel: "very_stable" | "stable" | "variable" | "erratic";
  cadenceDrift: number | null;
  firstHalfPace: number | null;
  secondHalfPace: number | null;
  firstHalfHr: number | null;
  secondHalfHr: number | null;
  splitVariance: number;
}

export interface CoachRecap {
  id: number;
  userId: number;
  activityId: number;
  recapBullets: string[];
  coachingCue: string;
  nextStep: "rest" | "easy" | "workout" | "long_run" | "recovery";
  nextStepRationale: string;
  confidenceFlags: string[] | null;
  activityName: string;
  activityDate: string;
  viewedAt: string | null;
  createdAt: string;
}

export interface VO2MaxData {
  current: number;
  raceVO2Max: number;
  trainingVO2Max: number;
  trend: "improving" | "stable" | "declining";
  ageGradePercentile: number;
  comparison: string;
  raceComparison: string;
  trainingComparison: string;
  targetRange: { min: number; max: number };
}

export interface FitnessMetric {
  date: string;
  ctl: number; // Chronic training load (fitness)
  atl: number; // Acute training load (fatigue)
  tsb: number; // Training stress balance (form)
  trainingLoad: number;
}

export interface FitnessResponse {
  metrics: FitnessMetric[];
  currentForm: FitnessMetric | null;
  interpretation: { label: string; description: string; color?: string } | string | null;
}

export interface RecoveryState {
  daysSinceLastRun: number;
  lastRunDate: string | null;
  lastRunName: string | null;
  acuteLoadKm: number;
  chronicLoadKm: number;
  acuteChronicRatio: number;
  freshnessScore: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  originalRiskLevel: "low" | "moderate" | "high" | "critical";
  riskReduced: boolean;
  readyToRun: boolean;
  recommendedNextStep: "rest" | "easy" | "workout" | "long_run" | "recovery";
  statusMessage: string;
  recoveryMessage: string;
}

export interface InjuryRiskAnalysis {
  riskLevel: "Low" | "Medium" | "High";
  riskFactors: string[];
  recommendations: string[];
}

export interface MLRacePrediction {
  distance: string;
  predictedTime: string;
  confidence: number;
  recommendation: string;
}

export interface InsightDayGroup {
  date: string;
  insights: {
    performance: InsightItem[];
    pattern: InsightItem[];
    recovery: InsightItem[];
    motivation: InsightItem[];
    technique: InsightItem[];
    recommendation: InsightItem[];
  };
}

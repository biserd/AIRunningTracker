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
  averageHeartrate: number | null;
  totalElevationGain: number | null;
}

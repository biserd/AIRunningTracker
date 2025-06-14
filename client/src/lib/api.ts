import { apiRequest } from "./queryClient";

export interface DashboardData {
  user: {
    name: string;
    stravaConnected: boolean;
    unitPreference?: string;
  };
  stats: {
    totalDistance: string;
    avgPace: string;
    trainingLoad: number;
    recovery: string;
  };
  activities: Array<{
    id: number;
    name: string;
    distance: string;
    pace: string;
    duration: string;
    elevation: string;
    date: string;
    startDate: Date;
  }>;
  insights: {
    performance?: {
      title: string;
      content: string;
    };
    pattern?: {
      title: string;
      content: string;
    };
    recovery?: {
      title: string;
      content: string;
    };
    recommendations: Array<{
      title: string;
      content: string;
    }>;
  };
  chartData: Array<{
    week: string;
    pace: number;
    distance: number;
  }>;
}

export const api = {
  async createDemoUser() {
    const response = await apiRequest("POST", "/api/demo/user");
    return response.json();
  },

  async connectStrava(code: string, userId: number) {
    const response = await apiRequest("POST", "/api/strava/connect", { code, userId });
    return response.json();
  },

  async syncActivities(userId: number) {
    const response = await apiRequest("POST", `/api/strava/sync/${userId}`);
    return response.json();
  },

  async generateInsights(userId: number) {
    const response = await apiRequest("POST", `/api/ai/insights/${userId}`);
    return response.json();
  },

  async getDashboardData(userId: number): Promise<DashboardData> {
    const response = await apiRequest("GET", `/api/dashboard/${userId}`);
    return response.json();
  },
};

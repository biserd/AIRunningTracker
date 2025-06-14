import { storage } from "../storage";

interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  start_date: string;
  type: string;
}

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    username: string;
  };
}

export class StravaService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID || "default_client_id";
    this.clientSecret = process.env.STRAVA_CLIENT_SECRET || "default_secret";
  }

  async exchangeCodeForTokens(code: string): Promise<StravaTokenResponse> {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    return response.json();
  }

  async getActivities(accessToken: string, page = 1, perPage = 30): Promise<StravaActivity[]> {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - token may be expired');
      }
      throw new Error('Failed to fetch activities from Strava');
    }

    return response.json();
  }

  async syncActivitiesForUser(userId: number): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user || !user.stravaAccessToken) {
      throw new Error('User not connected to Strava');
    }

    try {
      const stravaActivities = await this.getActivities(user.stravaAccessToken);
      
      for (const stravaActivity of stravaActivities) {
        // Check if activity already exists
        const existingActivity = await storage.getActivityByStravaId(stravaActivity.id.toString());
        if (existingActivity) continue;

        // Only sync running activities
        if (stravaActivity.type !== 'Run') continue;

        await storage.createActivity({
          userId,
          stravaId: stravaActivity.id.toString(),
          name: stravaActivity.name,
          distance: stravaActivity.distance,
          movingTime: stravaActivity.moving_time,
          totalElevationGain: stravaActivity.total_elevation_gain || 0,
          averageSpeed: stravaActivity.average_speed,
          maxSpeed: stravaActivity.max_speed,
          averageHeartrate: stravaActivity.average_heartrate || null,
          maxHeartrate: stravaActivity.max_heartrate || null,
          startDate: new Date(stravaActivity.start_date),
          type: stravaActivity.type,
        });
      }
    } catch (error) {
      if (error.message.includes('Unauthorized')) {
        // Try to refresh token
        if (user.stravaRefreshToken) {
          try {
            const tokenData = await this.refreshAccessToken(user.stravaRefreshToken);
            await storage.updateUser(userId, {
              stravaAccessToken: tokenData.access_token,
              stravaRefreshToken: tokenData.refresh_token,
            });
            
            // Retry sync with new token
            await this.syncActivitiesForUser(userId);
            return;
          } catch (refreshError) {
            throw new Error('Failed to refresh Strava token');
          }
        }
      }
      throw error;
    }
  }
}

export const stravaService = new StravaService();

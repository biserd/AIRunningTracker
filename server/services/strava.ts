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
  // Additional Strava fields
  calories?: number;
  average_cadence?: number;
  max_cadence?: number;
  average_watts?: number;
  max_watts?: number;
  suffer_score?: number;
  comment_count?: number;
  kudos_count?: number;
  achievement_count?: number;
  start_latlng?: [number, number];
  end_latlng?: [number, number];
  average_temp?: number;
  has_heartrate?: boolean;
  device_watts?: boolean;
  map?: {
    id: string;
    polyline: string;
    summary_polyline: string;
  };
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

  async getDetailedActivity(accessToken: string, activityId: number): Promise<StravaActivity> {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=false`,
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
      throw new Error('Failed to fetch detailed activity from Strava');
    }

    return response.json();
  }

  async syncActivitiesForUser(userId: number): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user || !user.stravaAccessToken) {
      throw new Error('User not connected to Strava');
    }

    try {
      console.log(`Syncing activities for user ${userId} with token: ${user.stravaAccessToken?.substring(0, 10)}...`);
      const stravaActivities = await this.getActivities(user.stravaAccessToken);
      console.log(`Fetched ${stravaActivities.length} activities from Strava API`);
      
      let syncedCount = 0;
      const activityTypes = new Set();
      
      for (const stravaActivity of stravaActivities) {
        activityTypes.add(stravaActivity.type);
        
        // Check if activity already exists for this user
        const existingActivity = await storage.getActivityByStravaIdAndUser(stravaActivity.id.toString(), userId);
        if (existingActivity) {
          console.log(`Activity already exists for user ${userId}: ${stravaActivity.name}`);
          continue;
        }

        // Sync running-related activities (Run, VirtualRun, Workout, etc.)
        const runningTypes = ['Run', 'VirtualRun', 'Workout', 'TrailRun'];
        if (!runningTypes.includes(stravaActivity.type)) {
          console.log(`Skipping non-running activity: ${stravaActivity.name} (${stravaActivity.type})`);
          continue;
        }

        console.log(`Syncing running activity: ${stravaActivity.name}`);
        
        // Fetch detailed activity data to get polyline
        let detailedActivity = stravaActivity;
        try {
          detailedActivity = await this.getDetailedActivity(user.stravaAccessToken, stravaActivity.id);
          console.log(`Fetched detailed data for activity ${stravaActivity.id}`);
        } catch (error) {
          console.log(`Could not fetch detailed data for activity ${stravaActivity.id}, using basic data`);
        }
        
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
          // Additional Strava fields
          calories: stravaActivity.calories || null,
          averageCadence: stravaActivity.average_cadence || null,
          maxCadence: stravaActivity.max_cadence || null,
          averageWatts: stravaActivity.average_watts || null,
          maxWatts: stravaActivity.max_watts || null,
          sufferScore: stravaActivity.suffer_score || null,
          commentsCount: stravaActivity.comment_count || 0,
          kudosCount: stravaActivity.kudos_count || 0,
          achievementCount: stravaActivity.achievement_count || 0,
          startLatitude: stravaActivity.start_latlng?.[0] || null,
          startLongitude: stravaActivity.start_latlng?.[1] || null,
          endLatitude: stravaActivity.end_latlng?.[0] || null,
          endLongitude: stravaActivity.end_latlng?.[1] || null,
          polyline: detailedActivity.map?.summary_polyline || null,
          detailedPolyline: detailedActivity.map?.polyline || null,
          averageTemp: stravaActivity.average_temp || null,
          hasHeartrate: stravaActivity.has_heartrate || false,
          deviceWatts: stravaActivity.device_watts || false,
        });
        syncedCount++;
      }

      console.log(`Activity types found: ${Array.from(activityTypes).join(', ')}`);
      console.log(`Successfully synced ${syncedCount} running activities for user ${userId}`);
      
      // Update last sync timestamp
      await storage.updateUser(userId, {
        lastSyncAt: new Date(),
      });
    } catch (error) {
      if ((error as Error).message?.includes('Unauthorized')) {
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

import { storage } from "../storage";
import { runnerScoreService } from "./runnerScore";

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

  async getActivityStreams(accessToken: string, activityId: number): Promise<any> {
    const streamTypes = ['time', 'distance', 'latlng', 'altitude', 'velocity_smooth', 'heartrate', 'cadence', 'watts', 'temp', 'grade_smooth'];
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/streams?keys=${streamTypes.join(',')}&key_by_type=true`,
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
      if (response.status === 404) {
        // Activity streams not available
        return null;
      }
      throw new Error('Failed to fetch activity streams from Strava');
    }

    return response.json();
  }

  async getActivityLaps(accessToken: string, activityId: number): Promise<any[]> {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/laps`,
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
      if (response.status === 404) {
        return [];
      }
      throw new Error('Failed to fetch activity laps from Strava');
    }

    return response.json();
  }

  generateBrandingText(template: string, runnerScore?: number, insight?: string): string {
    let text = template || "🏃 Analyzed with AITracker.run";
    
    // Replace placeholders (check for valid finite number to allow score of 0)
    const validScore = runnerScore !== undefined && Number.isFinite(runnerScore);
    text = text.replace('{score}', validScore ? runnerScore.toString() : 'N/A');
    text = text.replace('{insight}', insight || 'Keep up the great work!');
    
    return text;
  }

  async applyBrandingToActivity(
    accessToken: string, 
    activityId: number, 
    existingDescription: string | null,
    brandingText: string
  ): Promise<boolean> {
    // Don't add branding if it's already there (check for exact branding text or AITracker.run marker)
    if (existingDescription) {
      // Check for the exact branding text or the AITracker.run marker
      if (existingDescription.includes(brandingText.trim()) || existingDescription.includes('AITracker.run')) {
        console.log(`[Branding] Activity ${activityId} already has branding, skipping`);
        return true;
      }
    }
    
    // Append branding to existing description with clean formatting
    const newDescription = existingDescription?.trim()
      ? `${existingDescription.trim()}\n\n${brandingText.trim()}`
      : brandingText.trim();
    
    return this.updateActivityDescription(accessToken, activityId, newDescription);
  }

  async updateActivityDescription(accessToken: string, activityId: number, description: string): Promise<boolean> {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - token may be expired or lacks write scope');
      }
      if (response.status === 403) {
        throw new Error('Forbidden - activity:write scope not granted');
      }
      console.error(`Failed to update activity ${activityId}:`, response.status, response.statusText);
      return false;
    }

    return true;
  }

  async getActivityById(accessToken: string, activityId: number): Promise<any> {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - token may be expired');
      }
      return null;
    }

    return response.json();
  }

  async syncActivitiesForUser(
    userId: number, 
    maxActivities: number = 100,
    onProgress?: (current: number, total: number, activityName: string) => void
  ): Promise<{ syncedCount: number; totalActivities: number }> {
    const user = await storage.getUser(userId);
    if (!user || !user.stravaAccessToken) {
      throw new Error('User not connected to Strava');
    }

    try {
      console.log(`Syncing up to ${maxActivities} activities for user ${userId}...`);
      
      // Fetch multiple pages to get more historical data
      const allActivities: any[] = [];
      const perPage = 50; // Max allowed by Strava API
      const totalPages = Math.ceil(maxActivities / perPage);
      
      for (let page = 1; page <= totalPages; page++) {
        const activities = await this.getActivities(user.stravaAccessToken, page, perPage);
        if (activities.length === 0) break; // No more activities
        allActivities.push(...activities);
        console.log(`Fetched page ${page}: ${activities.length} activities (total: ${allActivities.length})`);
        if (activities.length < perPage) break; // Last page
      }
      
      const stravaActivities = allActivities.slice(0, maxActivities);
      console.log(`Fetched ${stravaActivities.length} activities from Strava API`);
      
      // Batch lookup: Fetch all existing Strava IDs for this user in one query
      const existingStravaIds = new Set(await storage.getUserStravaIds(userId));
      console.log(`User has ${existingStravaIds.size} existing activities in database`);
      
      let syncedCount = 0;
      const activityTypes = new Set();
      const sportTypes = new Set();
      let skippedExisting = 0;
      
      // Filter to only new activities that need syncing (accept ALL activity types)
      const activitiesToProcess: any[] = [];
      
      for (const stravaActivity of stravaActivities) {
        activityTypes.add(stravaActivity.type);
        sportTypes.add(stravaActivity.sport_type || stravaActivity.type);
        
        // Check if activity already exists for this user (in-memory lookup)
        if (existingStravaIds.has(stravaActivity.id.toString())) {
          skippedExisting++;
          continue;
        }

        // Accept all activity types (running, cross-training, cycling, etc.)
        activitiesToProcess.push(stravaActivity);
      }
      
      // Summary logs
      if (skippedExisting > 0) {
        console.log(`Skipped ${skippedExisting} existing activities (already synced)`);
      }
      console.log(`Found ${activitiesToProcess.length} new activities to sync (all types)`);
      
      // Process activities in batches of 5 for better performance
      const batchSize = 5;
      const totalToSync = activitiesToProcess.length;
      
      for (let i = 0; i < activitiesToProcess.length; i += batchSize) {
        const batch = activitiesToProcess.slice(i, i + batchSize);
        
        // Process batch in parallel
        await Promise.all(batch.map(async (stravaActivity, batchIndex) => {
          const currentIndex = i + batchIndex + 1;
          const activityName = stravaActivity.name;
          
          // Report progress
          if (onProgress) {
            onProgress(currentIndex, totalToSync, activityName);
          }
          
          console.log(`[${currentIndex}/${totalToSync}] Syncing: ${activityName}`);
          
          try {
            // Fetch detailed activity data and performance streams in parallel
            const accessToken = user.stravaAccessToken!; // Already checked at function start
            const [detailedActivity, streams, laps] = await Promise.all([
              this.getDetailedActivity(accessToken, stravaActivity.id),
              this.getActivityStreams(accessToken, stravaActivity.id),
              this.getActivityLaps(accessToken, stravaActivity.id)
            ]);
            
            // Create activity in database
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
              type: stravaActivity.sport_type || stravaActivity.type,
              calories: stravaActivity.calories || null,
              averageCadence: stravaActivity.average_cadence ? stravaActivity.average_cadence * 2 : null,
              maxCadence: stravaActivity.max_cadence ? stravaActivity.max_cadence * 2 : null,
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
              streamsData: streams ? JSON.stringify(streams) : null,
              lapsData: laps && laps.length > 0 ? JSON.stringify(laps) : null,
              averageTemp: stravaActivity.average_temp || null,
              hasHeartrate: stravaActivity.has_heartrate || false,
              deviceWatts: stravaActivity.device_watts || false,
            });
            
            syncedCount++;
          } catch (error) {
            console.error(`Failed to sync activity ${activityName}:`, error);
          }
        }));
      }

      console.log(`Activity types found: ${Array.from(activityTypes).join(', ')}`);
      console.log(`Sport types found: ${Array.from(sportTypes).join(', ')}`);
      console.log(`Successfully synced ${syncedCount} activities for user ${userId}`);
      
      // Apply branding to newly synced activities if enabled
      if (syncedCount > 0 && user.stravaHasWriteScope && user.stravaBrandingEnabled) {
        console.log(`[Branding] Applying branding to ${syncedCount} newly synced activities`);
        const brandingTemplate = user.stravaBrandingTemplate || "🏃 Analyzed with AITracker.run";
        
        // Calculate Runner Score for branding
        let runnerScore: number | undefined;
        let insight: string | undefined;
        
        try {
          const scoreData = await runnerScoreService.calculateRunnerScore(userId);
          runnerScore = scoreData.totalScore;
          console.log(`[Branding] Calculated Runner Score: ${runnerScore}`);
        } catch (scoreError) {
          console.error(`[Branding] Failed to calculate Runner Score:`, scoreError);
        }
        
        // Fetch most recent AI insight for branding
        try {
          const recentInsights = await storage.getAIInsightsByUserId(userId, undefined, 1);
          if (recentInsights.length > 0 && recentInsights[0].content?.trim()) {
            // Extract a short insight (first sentence or first 100 chars)
            const fullInsight = recentInsights[0].content.trim();
            const firstSentence = fullInsight.split(/[.!?]/)[0]?.trim();
            if (firstSentence) {
              insight = firstSentence.length > 100 ? firstSentence.substring(0, 97) + '...' : firstSentence;
              console.log(`[Branding] Using insight: ${insight}`);
            }
          }
        } catch (insightError) {
          console.error(`[Branding] Failed to fetch AI insight:`, insightError);
        }
        
        const brandingText = this.generateBrandingText(brandingTemplate, runnerScore, insight);
        
        // Apply branding to each newly synced activity (limit to avoid rate limiting)
        const brandingLimit = Math.min(syncedCount, 10);
        let brandedCount = 0;
        
        for (const stravaActivity of activitiesToProcess.slice(0, brandingLimit)) {
          try {
            // Get the activity details to check existing description
            const detailedActivity = await this.getActivityById(user.stravaAccessToken!, stravaActivity.id);
            if (detailedActivity) {
              const success = await this.applyBrandingToActivity(
                user.stravaAccessToken!,
                stravaActivity.id,
                detailedActivity.description || null,
                brandingText
              );
              if (success) brandedCount++;
            }
            // Small delay to avoid Strava rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (brandingError) {
            console.error(`[Branding] Failed to brand activity ${stravaActivity.id}:`, brandingError);
          }
        }
        console.log(`[Branding] Applied branding to ${brandedCount}/${brandingLimit} activities`);
      }
      
      // Update last sync timestamp
      await storage.updateUser(userId, {
        lastSyncAt: new Date(),
      });
      
      return { syncedCount, totalActivities: stravaActivities.length };
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
            return await this.syncActivitiesForUser(userId, maxActivities, onProgress);
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

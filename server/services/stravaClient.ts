/**
 * Centralized Strava API Client with Global Rate Limiting
 * 
 * All Strava HTTP calls should go through this client to:
 * 1. Track rate limit usage from X-RateLimit headers
 * 2. Automatically pause requests when approaching limits
 * 3. Handle token refresh transparently
 * 4. Provide exponential backoff for errors
 */

import { storage } from "../storage";

export interface RateLimitState {
  shortTermUsage: number;      // 15-minute window usage
  shortTermLimit: number;      // 15-minute window limit (default 100 for read, 100 for write)
  longTermUsage: number;       // Daily window usage
  longTermLimit: number;       // Daily window limit (default 1000)
  lastUpdated: Date;
  isPaused: boolean;
  pauseUntil: Date | null;
}

export interface StravaRequestOptions {
  userId: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params?: Record<string, string | number>;
  body?: any;
  skipRateLimitCheck?: boolean;
}

export interface StravaResponse<T = any> {
  data: T;
  rateLimitState: RateLimitState;
}

class StravaClient {
  private clientId: string;
  private clientSecret: string;
  private rateLimitState: RateLimitState;
  private refreshLock: Map<number, Promise<string>> = new Map();
  
  private readonly SHORT_TERM_THRESHOLD = 80;
  private readonly LONG_TERM_THRESHOLD = 900;
  private readonly PAUSE_DURATION_MS = 60000;

  constructor() {
    this.clientId = process.env.STRAVA_CLIENT_ID || process.env.VITE_STRAVA_CLIENT_ID || "";
    this.clientSecret = process.env.STRAVA_CLIENT_SECRET || "";
    
    this.rateLimitState = {
      shortTermUsage: 0,
      shortTermLimit: 100,
      longTermUsage: 0,
      longTermLimit: 1000,
      lastUpdated: new Date(),
      isPaused: false,
      pauseUntil: null,
    };
  }

  getRateLimitState(): RateLimitState {
    return { ...this.rateLimitState };
  }

  isRateLimited(): boolean {
    if (this.rateLimitState.isPaused) {
      if (this.rateLimitState.pauseUntil && new Date() > this.rateLimitState.pauseUntil) {
        this.rateLimitState.isPaused = false;
        this.rateLimitState.pauseUntil = null;
        console.log('[StravaClient] Rate limit pause expired, resuming requests');
        return false;
      }
      return true;
    }
    return false;
  }

  shouldPauseRequests(): boolean {
    return (
      this.rateLimitState.shortTermUsage >= this.SHORT_TERM_THRESHOLD ||
      this.rateLimitState.longTermUsage >= this.LONG_TERM_THRESHOLD
    );
  }

  private updateRateLimitFromHeaders(headers: Headers): void {
    const usage = headers.get('X-RateLimit-Usage');
    const limit = headers.get('X-RateLimit-Limit');
    
    if (usage) {
      const [shortTerm, longTerm] = usage.split(',').map(Number);
      this.rateLimitState.shortTermUsage = shortTerm || 0;
      this.rateLimitState.longTermUsage = longTerm || 0;
    }
    
    if (limit) {
      const [shortTermLimit, longTermLimit] = limit.split(',').map(Number);
      this.rateLimitState.shortTermLimit = shortTermLimit || 100;
      this.rateLimitState.longTermLimit = longTermLimit || 1000;
    }
    
    this.rateLimitState.lastUpdated = new Date();
    
    if (this.shouldPauseRequests()) {
      this.rateLimitState.isPaused = true;
      this.rateLimitState.pauseUntil = new Date(Date.now() + this.PAUSE_DURATION_MS);
      console.log(`[StravaClient] Rate limit threshold reached (${this.rateLimitState.shortTermUsage}/${this.rateLimitState.shortTermLimit}), pausing for ${this.PAUSE_DURATION_MS / 1000}s`);
    }
  }

  private async getAccessToken(userId: number): Promise<string> {
    const user = await storage.getUser(userId);
    if (!user || !user.stravaAccessToken) {
      throw new Error('User not connected to Strava');
    }
    return user.stravaAccessToken;
  }

  private async refreshTokenWithLock(userId: number): Promise<string> {
    const existingLock = this.refreshLock.get(userId);
    if (existingLock) {
      return existingLock;
    }

    const refreshPromise = this.doRefreshToken(userId);
    this.refreshLock.set(userId, refreshPromise);
    
    try {
      const token = await refreshPromise;
      return token;
    } finally {
      this.refreshLock.delete(userId);
    }
  }

  private async doRefreshToken(userId: number): Promise<string> {
    const user = await storage.getUser(userId);
    if (!user || !user.stravaRefreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: user.stravaRefreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        this.rateLimitState.isPaused = true;
        this.rateLimitState.pauseUntil = new Date(Date.now() + this.PAUSE_DURATION_MS);
        throw new Error('RATE_LIMIT: Token refresh rate limited');
      }
      throw new Error(`Failed to refresh Strava token: ${response.status}`);
    }

    const data = await response.json();
    
    await storage.updateUser(userId, {
      stravaAccessToken: data.access_token,
      stravaRefreshToken: data.refresh_token,
    });

    console.log(`[StravaClient] Refreshed token for user ${userId}`);
    return data.access_token;
  }

  async request<T = any>(options: StravaRequestOptions, isRetry = false): Promise<StravaResponse<T>> {
    const { userId, method, path, params, body, skipRateLimitCheck } = options;

    if (!skipRateLimitCheck && this.isRateLimited()) {
      const waitTime = this.rateLimitState.pauseUntil 
        ? Math.max(0, this.rateLimitState.pauseUntil.getTime() - Date.now())
        : this.PAUSE_DURATION_MS;
      throw new Error(`RATE_LIMIT: Strava requests paused. Retry in ${Math.ceil(waitTime / 1000)}s`);
    }

    const accessToken = await this.getAccessToken(userId);
    
    let url = `https://www.strava.com/api/v3${path}`;
    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      url += `?${queryString}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    
    this.updateRateLimitFromHeaders(response.headers);

    if (response.status === 429) {
      this.rateLimitState.isPaused = true;
      this.rateLimitState.pauseUntil = new Date(Date.now() + this.PAUSE_DURATION_MS);
      throw new Error('RATE_LIMIT: Strava API rate limit exceeded');
    }

    if (response.status === 401 && !isRetry) {
      console.log(`[StravaClient] 401 received, refreshing token for user ${userId}`);
      await this.refreshTokenWithLock(userId);
      return this.request<T>(options, true);
    }

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED: Strava token expired or invalid after refresh');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Strava API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as T;
    
    return {
      data,
      rateLimitState: this.getRateLimitState(),
    };
  }

  async getActivities(userId: number, page = 1, perPage = 30, after?: number) {
    const params: Record<string, string | number> = { page, per_page: perPage };
    if (after) params.after = after;
    
    return this.request({
      userId,
      method: 'GET',
      path: '/athlete/activities',
      params,
    });
  }

  async getActivityStreams(userId: number, activityId: number) {
    const streamTypes = ['time', 'distance', 'latlng', 'altitude', 'velocity_smooth', 'heartrate', 'cadence', 'watts', 'temp', 'grade_smooth'];
    return this.request({
      userId,
      method: 'GET',
      path: `/activities/${activityId}/streams`,
      params: {
        keys: streamTypes.join(','),
        key_by_type: 'true',
      },
    });
  }

  async getActivityLaps(userId: number, activityId: number) {
    return this.request({
      userId,
      method: 'GET',
      path: `/activities/${activityId}/laps`,
    });
  }

  async updateActivityDescription(userId: number, activityId: number, description: string) {
    return this.request({
      userId,
      method: 'PUT',
      path: `/activities/${activityId}`,
      body: { description },
    });
  }
}

export const stravaClient = new StravaClient();

export function isRateLimitError(error: any): boolean {
  if (error instanceof Error) {
    return error.message.startsWith('RATE_LIMIT:');
  }
  return false;
}

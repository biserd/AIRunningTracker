import { GARMIN_CALLBACK_PATH } from '../../shared/garmin';
import { garminChallenge } from './crypto';
const gateway = 'https://apis.garmin.com/partner-gateway/rest/user';
export interface GarminTokens { access_token: string; refresh_token: string; expires_in: number; refresh_token_expires_in: number }
export interface GarminConfig { clientId: string; clientSecret: string; encryptionKey: string; origin: string }
export function garminConfig(env: NodeJS.ProcessEnv = process.env): GarminConfig {
  const clientId = env.GARMIN_CLIENT_ID || '', clientSecret = env.GARMIN_CLIENT_SECRET || '', encryptionKey = env.GARMIN_TOKEN_ENCRYPTION_KEY || '';
  if (env.GARMIN_SYNC_ENABLED !== 'true' || !clientId || !clientSecret || Buffer.from(encryptionKey, 'base64').length !== 32) throw new Error('GARMIN_UNAVAILABLE');
  const origin = env.PUBLIC_APP_URL || 'https://aitracker.run';
  if (new URL(origin).origin !== origin || !origin.startsWith('https://')) throw new Error('GARMIN_ORIGIN_REQUIRED');
  return { clientId, clientSecret, encryptionKey, origin };
}
export class GarminClient {
  constructor(private config: GarminConfig, private request: typeof fetch = fetch) {}
  authorize(state: string, verifier: string) {
    const url = new URL('https://connect.garmin.com/oauth2Confirm');
    url.search = new URLSearchParams({ client_id: this.config.clientId, response_type: 'code', redirect_uri: this.config.origin + GARMIN_CALLBACK_PATH, state, code_challenge: garminChallenge(verifier), code_challenge_method: 'S256' }).toString();
    return url.toString();
  }
  private async tokens(parameters: Record<string, string>): Promise<GarminTokens> {
    const response = await this.request('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(this.config.clientId + ':' + this.config.clientSecret).toString('base64') },
      body: new URLSearchParams(parameters),
    });
    if (!response.ok) throw new Error(response.status === 400 || response.status === 401 ? 'GARMIN_REAUTHORIZE' : 'GARMIN_PROVIDER_UNAVAILABLE');
    const value = await response.json() as GarminTokens;
    if (!value.access_token || !value.refresh_token || !Number.isFinite(value.expires_in) || value.expires_in <= 0 || !Number.isFinite(value.refresh_token_expires_in) || value.refresh_token_expires_in <= 0) throw new Error('GARMIN_INVALID_TOKENS');
    return value;
  }
  exchange(code: string, verifier: string) {
    return this.tokens({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: this.config.origin + GARMIN_CALLBACK_PATH });
  }
  refresh(refreshToken: string) { return this.tokens({ grant_type: 'refresh_token', refresh_token: refreshToken }); }
  async identity(token: string): Promise<{ userId: string; permissions: string[] }> {
    const call = async (path: string) => {
      const response = await this.request(gateway + path, { redirect: 'error', signal: AbortSignal.timeout(10_000), headers: { Authorization: 'Bearer ' + token } });
      if (!response.ok) throw new Error('GARMIN_IDENTITY_FAILED');
      return response.json();
    };
    const identity = await call('/id') as { userId: unknown }, permission = await call('/permissions') as { permissions: unknown };
    if (typeof identity.userId !== 'string' || !/^[\w-]{1,128}$/.test(identity.userId) || !Array.isArray(permission.permissions) || permission.permissions.some(p => typeof p !== 'string')) throw new Error('GARMIN_IDENTITY_FAILED');
    return { userId: identity.userId, permissions: permission.permissions };
  }
  async revoke(token: string) {
    const response = await this.request(gateway + '/registration', { method: 'DELETE', redirect: 'error', signal: AbortSignal.timeout(10_000), headers: { Authorization: 'Bearer ' + token } });
    if (!response.ok && ![401,403,404].includes(response.status)) throw new Error('GARMIN_REVOCATION_PENDING');
  }
}

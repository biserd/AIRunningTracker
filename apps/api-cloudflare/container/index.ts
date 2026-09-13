import { Container, getContainer } from '@cloudflare/containers';
import { servePublicAsset } from './public-assets';

/** Staging deliberately has no billing, messaging or Strava provider credentials. */
export class RunAnalyticsWeb extends Container<Env> {
  defaultPort = 5000;
  sleepAfter = '30m';
  envVars = {
    NODE_ENV: 'production',
    APP_PLATFORM: 'cloudflare',
    APP_ENV: 'staging',
    APP_ROLE: 'web',
    PORT: '5000',
    COACH_MULTI_RUNNER_PILOT_ENABLED: 'false',
    ENABLE_PROACTIVE_COACH_WORKER: 'false',
    OPENAI_API_KEY: 'disabled-in-migration-staging',
    DATABASE_URL: this.env.DATABASE_URL,
    JWT_SIGNING_SECRET: this.env.JWT_SIGNING_SECRET,
    EMAIL_UNSUBSCRIBE_SIGNING_SECRET_V2: this.env.CUTOVER_EMAIL_UNSUBSCRIBE_SIGNING_SECRET_V2,
  };
}

export default {
  async fetch(request, env): Promise<Response> {
    // Keep each browser on a stable shard without putting identity in routing state.
    const cookie = request.headers.get('cookie')?.match(/(?:^|;\s*)cf_migration_shard=([01])(?:;|$)/)?.[1];
    const shard = cookie ?? String(crypto.getRandomValues(new Uint8Array(1))[0] % 2);
    try {
      const asset = await servePublicAsset(request, env.PUBLIC_ASSETS);
      if (asset) {
        asset.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return asset;
      }
      const upstream = await getContainer(env.WEB, `web-${shard}`).fetch(request);
      const response = new Response(upstream.body, upstream);
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      if (!cookie) response.headers.append('Set-Cookie', `cf_migration_shard=${shard}; Path=/; HttpOnly; Secure; SameSite=Lax`);
      return response;
    } catch {
      // Never print connection details, request bodies or provider errors.
      console.error(JSON.stringify({ event: 'container_unavailable' }));
      return Response.json({ error: 'Service temporarily unavailable' }, { status: 503, headers: { 'Retry-After': '10', 'X-Robots-Tag': 'noindex' } });
    }
  },
} satisfies ExportedHandler<Env>;

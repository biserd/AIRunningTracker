import { Container, getContainer } from '@cloudflare/containers';
import { servePublicAsset } from './public-assets';
import { privateAssets } from './private-assets';
import { magicLinks } from './magic-links';
import { RunnerReads } from '../src/runner-reads';
import { migrationReadiness } from './readiness';
import { providerChecks } from './provider-checks';
import { productionChecks } from './production-checks';

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
      const readiness = await migrationReadiness(request, { signingSecret: env.JWT_SIGNING_SECRET,
        inspect: session => new RunnerReads(env.HYPERDRIVE).migrationReadiness(session),
        limit: async key => (await env.AUTH_LIMITER.limit({ key })).success,
        // The single approved delivery test was received. No further test sends are enabled.
        providers: async () => [...await providerChecks({ stripe: env.CUTOVER_STRIPE_SECRET_KEY, resend: env.CUTOVER_RESEND_API_KEY,
          openai: env.CUTOVER_OPENAI_API_KEY, stravaClientId: env.CUTOVER_VITE_STRAVA_CLIENT_ID, stravaSecret: env.CUTOVER_STRAVA_CLIENT_SECRET }),
          ...await productionChecks(request => env.PRODUCTION.fetch(request),env.CUTOVER_RESEND_WEBHOOK_SECRET)] });
      if (readiness) return readiness;
      const auth = await magicLinks(request, {
        database: env.AUTH_DB, signingSecret: env.JWT_SIGNING_SECRET,
        origin: 'https://aitracker-api-staging.biser-d.workers.dev',
        findUser: key => new RunnerReads(env.HYPERDRIVE).findLoginUser(key),
        limit: async key => (await env.AUTH_LIMITER.limit({ key })).success,
        send: async (to, link) => { await env.AUTH_EMAIL.send({ from: 'reminders@aitracker.run', to,
          subject: 'Sign in to AITracker staging',
          text: `Here is your secure sign-in link:\n\n${link}\n\nIt expires in 15 minutes and works once. This is the read-only migration test site.\n\nIf you did not request this, ignore this email.` }); },
      });
      if (auth) return auth;
      const container = getContainer(env.WEB, `web-${shard}`);
      const privateResponse = await privateAssets(request, env.PUBLIC_ASSETS, async () => {
        const authorization = request.headers.get('authorization');
        if (!authorization?.startsWith('Bearer ')) return null;
        const check = await container.fetch(new Request(new URL('/api/auth/identity', request.url), { headers: { authorization } }));
        if (!check.ok) { await check.body?.cancel(); return null; }
        const identity: { id?: number } = await check.json();
        return Number.isSafeInteger(identity.id) && identity.id! > 0 ? identity.id! : null;
      }, false, async userId => (await env.UPLOAD_LIMITER.limit({ key: String(userId) })).success);
      if (privateResponse) { privateResponse.headers.set('X-Robots-Tag','noindex, nofollow'); return privateResponse; }
      const asset = await servePublicAsset(request, env.PUBLIC_ASSETS);
      if (asset) {
        asset.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return asset;
      }
      const upstream = await container.fetch(request);
      const response = new Response(upstream.body, upstream);
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      if (!cookie) response.headers.append('Set-Cookie', `cf_migration_shard=${shard}; Path=/; HttpOnly; Secure; SameSite=Lax`);
      if (response.headers.get('content-type')?.includes('text/html')) {
        return new HTMLRewriter().on('head', { element(element) {
          element.append('<meta name="app-environment" content="staging">', { html: true });
        } }).transform(response);
      }
      return response;
    } catch {
      // Never print connection details, request bodies or provider errors.
      console.error(JSON.stringify({ event: 'container_unavailable' }));
      return Response.json({ error: 'Service temporarily unavailable' }, { status: 503, headers: { 'Retry-After': '10', 'X-Robots-Tag': 'noindex' } });
    }
  },
} satisfies ExportedHandler<Env>;

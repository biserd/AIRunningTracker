import { Container, ContainerProxy, getContainer } from '@cloudflare/containers';
import { privateDatabaseHandler } from '../../../server/d1/transport';
import { nativeD1Transport } from './d1-database';
export { ContainerProxy };
import { servePublicAsset } from './public-assets';
import { privateAssets } from './private-assets';
import { productionEnvironment } from './production-environment';
import {consentPage} from '../../../shared/mcpConsentPage';
import {privateCoachNotifications} from './coach-notification-bridge';
import {receiveGarminWebhook} from './garmin-webhook';
import {GarminStore} from '../../../server/garmin/store';
import type {AtomicSqlDatabase} from '../../../server/d1/jobStore';

// Promoted after Replit was paused. The old preflight instance has APP_ROLE=web.
// Keep this identity stable across subsequent deployments for caches and SSE.
const productionInstance = 'production-live';
const garminRuntimeNames = ['GARMIN_SYNC_ENABLED','GARMIN_CLIENT_ID','GARMIN_CLIENT_SECRET','GARMIN_TOKEN_ENCRYPTION_KEY','GARMIN_WEBHOOK_SECRET'];
function garminRuntime(values: object): Record<string,string> {
  return Object.fromEntries(garminRuntimeNames.map(name=>[name,Reflect.get(values,name)]).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
}

export class RunAnalyticsProduction extends Container<ProductionEnv> {
  defaultPort = 5000;
  sleepAfter = '10m';
  entrypoint = ['node', 'dist/d1-index.mjs'];
  envVars = productionEnvironment(this.env);
  async ensureD1Runtime(signupReminders = false, garmin: Record<string,string> = {}): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      // Pass this non-secret release flag explicitly from the current Worker
      // environment; a warm Durable Object can retain its previous env snapshot.
      this.envVars.ENABLE_SIGNUP_PAYMENT_REMINDERS = signupReminders ? 'true' : 'false';
      for(const name of garminRuntimeNames){
        if(typeof garmin[name]==='string')this.envVars[name]=garmin[name];
        else delete this.envVars[name];
      }
      const release = `garmin-direct-sync-20261107-v1-${signupReminders}-${garmin.GARMIN_SYNC_ENABLED==='true'}-rollout-complete`;
      if (await this.ctx.storage.get(release)) return;
      // An image rollout can retain an already-running process and its old env.
      // Stop it once before accepting D1 traffic; external database data is untouched.
      await this.destroy();
      await this.ctx.storage.put(release, true);
    });
  }
}

RunAnalyticsProduction.outboundByHost = {
  'aitracker.coach.internal': async(request,env:ProductionEnv)=>privateCoachNotifications(env.D1_TRANSPORT_SECRET,env.COACH_NOTIFICATIONS as unknown as Parameters<typeof privateCoachNotifications>[1])(request),
  'aitracker.database.internal': async (request, env: ProductionEnv) =>
    privateDatabaseHandler(nativeD1Transport(env.DB), env.D1_TRANSPORT_SECRET)(request),
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (!['aitracker.run','www.aitracker.run'].includes(url.hostname)) return new Response('Not found',{status:404});
    if (url.hostname === 'www.aitracker.run') { url.hostname='aitracker.run'; return Response.redirect(url.toString(),308); }
    if (url.pathname.startsWith('/internal/')) return new Response('Not found',{status:404});
    if (url.pathname === '/api/garmin/webhook') {
      if (Reflect.get(env,'GARMIN_SYNC_ENABLED') !== 'true') return new Response('Garmin sync unavailable',{status:503});
      return receiveGarminWebhook(request,env.DB as unknown as AtomicSqlDatabase,String(Reflect.get(env,'GARMIN_CLIENT_ID') || ''),work=>ctx.waitUntil(work));
    }
    // Render only the consent shell at the edge. All authentication, request
    // ownership and approval remain enforced by the existing OAuth backend.
    if(url.pathname==='/mcp/consent'&&request.method==='GET'){
      const id=url.searchParams.get('request')||'';
      if(!/^ra_mcp_req_[A-Za-z0-9_-]{40,80}$/.test(id))return new Response('Invalid authorization request',{status:400});
      const {html,policy}=consentPage(id);
      return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':policy,'X-Content-Type-Options':'nosniff'}});
    }
    try {
      const asset = await servePublicAsset(request,env.PUBLIC_ASSETS);
      if (asset) return asset;
      const container = getContainer(env.WEB,productionInstance);
      await container.ensureD1Runtime(Reflect.get(env,'ENABLE_SIGNUP_PAYMENT_REMINDERS') === 'true',garminRuntime(env));
      const uploaded = await privateAssets(request,env.PUBLIC_ASSETS,async () => {
        const authorization = request.headers.get('authorization');
        if (!authorization?.startsWith('Bearer ')) return null;
        const identity = await container.fetch(new Request(new URL('/api/auth/identity',request.url),{headers:{authorization}}));
        if (!identity.ok) { await identity.body?.cancel(); return null; }
        const data: {id?:number} = await identity.json();
        return Number.isSafeInteger(data.id) && data.id!>0 ? data.id! : null;
      },true,async userId => (await env.UPLOAD_LIMITER.limit({key:String(userId)})).success);
      if (uploaded) return uploaded;
      if (request.method === 'POST' && ['/api/stripe/create-guest-checkout-session', '/api/stripe/resend-guest-checkout-link'].includes(url.pathname)) {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (!(await env.UPLOAD_LIMITER.limit({ key: `guest-checkout:${ip}` })).success) {
          return Response.json({ message: 'Too many checkout requests. Please try again shortly.' }, { status: 429 });
        }
      }
      // One stable application instance preserves the existing process-local caches and SSE streams.
      // The database leadership lock prevents overlapping deployments from running timers twice.
      const upstream = await container.fetch(request);
      if (url.pathname.startsWith('/api/stripe/webhook/') && upstream.status >= 400) {
        let responseClass = 'other';
        const length = Number(upstream.headers.get('content-length'));
        if (length > 0 && length < 2048 && upstream.headers.get('content-type')?.includes('application/json')) {
          try {
            const body = await upstream.clone().json() as {error?:unknown};
            if (body.error === 'Missing stripe-signature') responseClass = 'signature_header_missing';
            else if (body.error === 'Webhook processing error') responseClass = 'handler_error';
          } catch { /* Never log upstream response contents. */ }
        }
        console.error(JSON.stringify({event:'stripe_callback_rejected',status:upstream.status,
          signaturePresent:request.headers.has('stripe-signature'),responseClass}));
      }
      const failure = upstream.headers.get('X-AITracker-Webhook-Failure');
      if (failure) {
        const allowed = ['managed_webhook_missing','signature_rejected','database_tls','database_connection',
          'database_42P01','database_42703','database_42501','database_25006','stripe_account_read','processing_failed'];
        console.error(JSON.stringify({event:'stripe_webhook_failed',failure:allowed.includes(failure) ? failure : 'processing_failed'}));
        const response = new Response(upstream.body,upstream);
        response.headers.delete('X-AITracker-Webhook-Failure');
        return response;
      }
      return upstream;
    } catch {
      console.error(JSON.stringify({event:'production_request_failed'}));
      return Response.json({error:'Service temporarily unavailable'},{status:503,headers:{'Retry-After':'10'}});
    }
  },
  async scheduled(_event,env): Promise<void> {
    // Keeps the single scheduler process alive without exposing a public execution endpoint.
    const container = getContainer(env.WEB,productionInstance);
    await container.ensureD1Runtime(Reflect.get(env,'ENABLE_SIGNUP_PAYMENT_REMINDERS') === 'true',garminRuntime(env));
    const response = await container.fetch('http://container/health');
    await response.body?.cancel();
    if (!response.ok) throw new Error('Production scheduler health failed');
    if (Reflect.get(env,'GARMIN_SYNC_ENABLED') === 'true') {
      await new GarminStore(env.DB as unknown as AtomicSqlDatabase,'').process(3);
      const secret = Reflect.get(env,'GARMIN_WEBHOOK_SECRET');
      if (typeof secret === 'string' && secret.length >= 32) {
        const result = await container.fetch('http://container/internal/garmin/maintenance',{method:'POST',headers:{'X-RunAnalytics-Garmin-Internal':secret}});
        await result.body?.cancel();
        if (!result.ok) console.error(JSON.stringify({event:'garmin_maintenance_deferred'}));
      }
    }
  },
} satisfies ExportedHandler<ProductionEnv>;

import { Container, ContainerProxy, getContainer } from '@cloudflare/containers';
import { privateDatabaseHandler } from '../../../server/d1/transport';
import { nativeD1Transport } from './d1-database';
export { ContainerProxy };
import { servePublicAsset } from './public-assets';
import { privateAssets } from './private-assets';
import { productionEnvironment } from './production-environment';
import {consentPage} from '../../../shared/mcpConsentPage';
import {privateCoachNotifications} from './coach-notification-bridge';

// Promoted after Replit was paused. The old preflight instance has APP_ROLE=web.
// Keep this identity stable across subsequent deployments for caches and SSE.
const productionInstance = 'production-live';

export class RunAnalyticsProduction extends Container<ProductionEnv> {
  defaultPort = 5000;
  sleepAfter = '10m';
  entrypoint = ['node', 'dist/d1-index.mjs'];
  envVars = productionEnvironment(this.env);
  async ensureD1Runtime(): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      if (await this.ctx.storage.get('shoe-guides-d1cf74b-image-ready')) return;
      // An image rollout can retain an already-running process and its old env.
      // Stop it once before accepting D1 traffic; external database data is untouched.
      await this.destroy();
      await this.ctx.storage.put('shoe-guides-d1cf74b-image-ready', true);
    });
  }
}

RunAnalyticsProduction.outboundByHost = {
  'aitracker.coach.internal': async(request,env:ProductionEnv)=>privateCoachNotifications(env.D1_TRANSPORT_SECRET,env.COACH_NOTIFICATIONS as unknown as Parameters<typeof privateCoachNotifications>[1])(request),
  'aitracker.database.internal': async (request, env: ProductionEnv) =>
    privateDatabaseHandler(nativeD1Transport(env.DB), env.D1_TRANSPORT_SECRET)(request),
};

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!['aitracker.run','www.aitracker.run'].includes(url.hostname)) return new Response('Not found',{status:404});
    if (url.hostname === 'www.aitracker.run') { url.hostname='aitracker.run'; return Response.redirect(url.toString(),308); }
    if (url.pathname.startsWith('/internal/')) return new Response('Not found',{status:404});
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
      await container.ensureD1Runtime();
      const uploaded = await privateAssets(request,env.PUBLIC_ASSETS,async () => {
        const authorization = request.headers.get('authorization');
        if (!authorization?.startsWith('Bearer ')) return null;
        const identity = await container.fetch(new Request(new URL('/api/auth/identity',request.url),{headers:{authorization}}));
        if (!identity.ok) { await identity.body?.cancel(); return null; }
        const data: {id?:number} = await identity.json();
        return Number.isSafeInteger(data.id) && data.id!>0 ? data.id! : null;
      },true,async userId => (await env.UPLOAD_LIMITER.limit({key:String(userId)})).success);
      if (uploaded) return uploaded;
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
    await container.ensureD1Runtime();
    const response = await container.fetch('http://container/health');
    await response.body?.cancel();
    if (!response.ok) throw new Error('Production scheduler health failed');
  },
} satisfies ExportedHandler<ProductionEnv>;

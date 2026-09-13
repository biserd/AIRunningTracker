import { Container, getContainer } from '@cloudflare/containers';
import { servePublicAsset } from './public-assets';
import { privateAssets } from './private-assets';
import { productionEnvironment } from './production-environment';

// Promoted after Replit was paused. The old preflight instance has APP_ROLE=web.
// Keep this identity stable across subsequent deployments for caches and SSE.
const productionInstance = 'production-live';

export class RunAnalyticsProduction extends Container<ProductionEnv> {
  defaultPort = 5000;
  sleepAfter = '10m';
  envVars = productionEnvironment(this.env);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!['aitracker.run','www.aitracker.run'].includes(url.hostname)) return new Response('Not found',{status:404});
    if (url.hostname === 'www.aitracker.run') { url.hostname='aitracker.run'; return Response.redirect(url.toString(),308); }
    if (url.pathname.startsWith('/internal/')) return new Response('Not found',{status:404});
    try {
      const asset = await servePublicAsset(request,env.PUBLIC_ASSETS);
      if (asset) return asset;
      const container = getContainer(env.WEB,productionInstance);
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
      return await container.fetch(request);
    } catch {
      console.error(JSON.stringify({event:'production_request_failed'}));
      return Response.json({error:'Service temporarily unavailable'},{status:503,headers:{'Retry-After':'10'}});
    }
  },
  async scheduled(_event,env): Promise<void> {
    // Keeps the single scheduler process alive without exposing a public execution endpoint.
    const response = await getContainer(env.WEB,productionInstance).fetch('http://container/health');
    await response.body?.cancel();
    if (!response.ok) throw new Error('Production scheduler health failed');
  },
} satisfies ExportedHandler<ProductionEnv>;

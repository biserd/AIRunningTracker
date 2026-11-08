import type { Express, RequestHandler } from 'express';
import { GARMIN_CALLBACK_PATH, type GarminStatus } from '../../shared/garmin';
import { GarminClient, garminConfig } from './client';
import { garminEqual } from './crypto';
import { GarminStore } from './store';
import {registerGarminHealthRoutes} from './healthRoutes';
import {GarminSignin,garminSigninHtml} from './signin';
import {randomBytes} from 'node:crypto';
const cookie = '__Secure-garmin_oauth';
const signinCookie='__Secure-garmin_signin';
const readCookie=(req:{headers:{cookie?:string}},name:string)=>req.headers.cookie?.split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='))?.slice(name.length+1);
export interface GarminRouteDependencies {
  authenticate: RequestHandler;
  store: () => Promise<GarminStore>;
  config?: typeof garminConfig;
  client?: (config: ReturnType<typeof garminConfig>) => GarminClient;
  session?: (userId:number)=>Promise<string>;
  onConnected?: (userId: number) => Promise<void>;
}
const unavailable: GarminStatus = { available: false, connected: false, status: 'not_connected', connectedAt: null, lastSyncAt: null, activityCount: 0 };
export function registerGarminRoutes(app: Express, deps: GarminRouteDependencies) {
  registerGarminHealthRoutes(app,deps);
  const config = deps.config ?? garminConfig;
  const provider = () => (deps.client ?? (value => new GarminClient(value)))(config());
  app.post('/api/auth/garmin-login',async(req,res)=>{
    res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
    if(req.body?.activityConsent!==true)return res.status(400).json({message:'Please review Garmin activity sharing before continuing.'});
    try {
      const settings=config();
      if(req.get('origin')!==settings.origin)return res.sendStatus(403);
      if(!deps.session)throw new Error('GARMIN_SIGNIN_UNAVAILABLE');
      const flow=await new GarminSignin(await deps.store(),settings.encryptionKey).start(req.body?.returnTo);
      res.cookie(signinCookie,flow.state,{httpOnly:true,secure:true,sameSite:'lax',path:GARMIN_CALLBACK_PATH,maxAge:600_000});
      return res.json({url:provider().authorize(flow.state,flow.verifier)});
    }catch(error){return res.status(error instanceof Error&&error.message==='GARMIN_SIGNIN_RATE_LIMIT'?429:503).json({message:'Garmin sign-in is temporarily unavailable. Please try again shortly.'});}
  });
  app.get('/api/garmin/status', deps.authenticate, async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try { config(); } catch { return res.json(unavailable); }
    try { return res.json(await (await deps.store()).status((req as any).user.id, true)); }
    catch { return res.status(503).json({ message: 'Garmin sync status is temporarily unavailable.' }); }
  });
  app.post('/api/garmin/authorize', deps.authenticate, async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    if (req.body?.activityConsent !== true) return res.status(400).json({ message: 'Please review and agree to Garmin activity sharing.' });
    try {
      const client = provider(), store = await deps.store();
      const flow = await store.start((req as any).user.id);
      res.cookie(cookie, flow.state, { httpOnly: true, secure: true, sameSite: 'lax', path: GARMIN_CALLBACK_PATH, maxAge: 600_000 });
      return res.json({ url: client.authorize(flow.state, flow.verifier) });
    } catch { return res.status(503).json({ message: 'Garmin connection is temporarily unavailable.' }); }
  });
  app.get(GARMIN_CALLBACK_PATH, async (req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    const state = req.query.state;
    const signinState=readCookie(req,signinCookie);
    if(typeof state==='string'&&/^[A-Za-z0-9_-]{43}$/.test(state)&&signinState&&garminEqual(state,signinState)) {
      res.clearCookie(signinCookie,{httpOnly:true,secure:true,sameSite:'lax',path:GARMIN_CALLBACK_PATH});
      try {
        const settings=config(),signin=new GarminSignin(await deps.store(),settings.encryptionKey);
        const flow=await signin.consume(state);
        if(req.query.error||typeof req.query.code!=='string'||!req.query.code||req.query.code.length>4096)return res.redirect('/auth?error=garmin_denied');
        const client=provider(),tokens=await client.exchange(req.query.code,flow.verifier),identity=await client.identity(tokens.access_token);
        if(!deps.session)throw new Error('GARMIN_SIGNIN_UNAVAILABLE');
        const owner=await signin.resolve(identity,tokens,flow.consentStartedAt),token=await deps.session(owner.userId);
        if(owner.status==='connected'&&deps.onConnected){
          try{await deps.onConnected(owner.userId);}catch{console.error(JSON.stringify({event:'garmin_admin_notification_failed'}));}
        }
        const nonce=randomBytes(16).toString('base64');
        res.set({'X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`});
        return res.type('html').send(garminSigninHtml(token,flow.returnTo||(owner.isNew?'/settings?garmin=connected#garmin':'/dashboard'),nonce));
      }catch{console.error(JSON.stringify({event:'garmin_signin_failed'}));return res.redirect('/auth?error=garmin_failed');}
    }
    const browserState = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(cookie + '='))?.slice(cookie.length + 1);
    if (typeof state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(state) || !browserState || !garminEqual(state, browserState)) return res.redirect(signinState?'/auth?error=garmin_invalid_state':'/settings?garmin=invalid_state');
    res.clearCookie(cookie, { secure: true, sameSite: 'lax', path: GARMIN_CALLBACK_PATH });
    try {
      const client = provider(), store = await deps.store(), flow = await store.consume(state);
      if (req.query.error || typeof req.query.code !== 'string' || !req.query.code || req.query.code.length > 4096) return res.redirect('/settings?garmin=denied');
      const tokens = await client.exchange(req.query.code, flow.verifier), identity = await client.identity(tokens.access_token);
      const status = await store.save(flow.userId, identity, tokens, flow.consentStartedAt);
      if (status === 'connected' && deps.onConnected) {
        // The single-use OAuth state prevents callback replay notifications.
        // An admin-email outage must never undo a saved Garmin connection.
        try { await deps.onConnected(flow.userId); }
        catch { console.error(JSON.stringify({ event: 'garmin_admin_notification_failed' })); }
      }
      return res.redirect('/settings?garmin=' + (status === 'connected' ? 'connected' : 'permission_required'));
    } catch {
      console.error(JSON.stringify({ event: 'garmin_connection_failed' }));
      return res.redirect('/settings?garmin=failed');
    }
  });
  app.get('/api/garmin/activities', deps.authenticate, async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try { config(); } catch { return res.json({ activities: [] }); }
    try { return res.json({ activities: await (await deps.store()).activities((req as any).user.id) }); }
    catch { return res.status(503).json({ message: 'Garmin activities are temporarily unavailable.' }); }
  });
  app.get('/api/garmin/export', deps.authenticate, async (req, res) => {
    res.set({ 'Cache-Control': 'private, no-store', 'Content-Disposition': 'attachment; filename="runanalytics-garmin-activities.json"' });
    try { config(); const store = await deps.store(); return res.json({ source: 'Garmin Connect', activities: await store.activities((req as any).user.id, 1000), exportedAt: new Date().toISOString(), limit: 1000 }); }
    catch { return res.status(503).json({ message: 'Garmin export is temporarily unavailable.' }); }
  });
  app.delete('/api/garmin/activities/:id', deps.authenticate, async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    if (!/^[\w-]{1,128}$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid activity.' });
    try { config(); await (await deps.store()).deleteActivity((req as any).user.id, req.params.id); return res.json({ deleted: true }); }
    catch { return res.status(503).json({ message: 'Garmin activity could not be deleted. Please try again.' }); }
  });
  app.post('/api/garmin/disconnect', deps.authenticate, async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try {
      const client = provider(), store = await deps.store(), userId = (req as any).user.id;
      await store.disconnect(userId);
      try { await maintainGarminConnection(store, client, userId); } catch { /* Locally disabled; durable state schedules remote revocation retry. */ }
      return res.json(await store.status(userId, true));
    } catch { return res.status(503).json({ message: 'Garmin could not be disconnected. Please try again.' }); }
  });
  // Only the production Worker scheduler can invoke this path. The public edge rejects /internal/.
  app.post('/internal/garmin/maintenance', async (req, res) => {
    const secret = process.env.GARMIN_WEBHOOK_SECRET || '';
    if (secret.length < 32 || !garminEqual(req.get('X-RunAnalytics-Garmin-Internal') || '', secret)) return res.sendStatus(404);
    try {
      const client = provider(), store = await deps.store();
      const rows = await store.db.prepare(`SELECT user_id FROM garmin_connections WHERE status='disconnect_pending' OR
        (status IN ('connected','permission_required') AND refresh_expires_at<?) LIMIT 5`)
        .bind(new Date(Date.now() + 7 * 86400_000).toISOString()).all<{ user_id: number }>();
      for (const row of rows.results) { try { await maintainGarminConnection(store, client, row.user_id); } catch { /* retry next minute */ } }
      return res.json({ ok: true });
    } catch { return res.status(503).json({ message: 'Garmin maintenance unavailable.' }); }
  });
}
export async function maintainGarminConnection(store: GarminStore, client: GarminClient, userId: number) {
  const owner = await store.claimOperation(userId);
  if (!owner) return;
  try {
  const row = await store.connection(userId);
  if (!row?.tokens) return;
  let tokens = store.tokenValue(row);
  if (Date.parse(row.access_expires_at) <= Date.now()) {
    try { tokens = await client.refresh(tokens.refresh_token); await store.rotate(row, tokens); }
    catch (error) {
      if (error instanceof Error && error.message === 'GARMIN_REAUTHORIZE') {
        await store.db.prepare("UPDATE garmin_connections SET status=CASE WHEN status='disconnect_pending' THEN 'not_connected' ELSE 'reconnect_required' END,tokens=NULL,permissions='[]' WHERE user_id=? AND tokens=?")
          .bind(userId, row.tokens).run();
        return;
      }
      throw error;
    }
  }
  const current = await store.connection(userId);
  if (current?.status === 'disconnect_pending') {
    await client.revoke(tokens.access_token);
    await store.finishDisconnect(userId, current.tokens);
  }
  } finally { await store.releaseOperation(userId, owner); }
}

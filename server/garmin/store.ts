import type { AtomicSqlDatabase } from '../d1/jobStore';
import type { GarminPush, GarminRun, GarminStatus } from '../../shared/garmin';
import { normalizeGarminRun } from '../../shared/garmin';
import { garminHash, garminRandom, openGarmin, sealGarmin } from './crypto';
import {GARMIN_HEALTH_TYPES} from '../../shared/garminHealth';
import {GarminHealthStore} from './healthStore';
import type { GarminTokens } from './client';
export interface GarminConnection {
  user_id: number; garmin_user_id: string; tokens: string | null; access_expires_at: string; refresh_expires_at: string;
  permissions: string; status: GarminStatus['status']; connected_at: string; last_push_at: string | null;
}
const iso = (ms: number) => new Date(ms).toISOString();
export class GarminStore {
  constructor(readonly db: AtomicSqlDatabase, private key: string, private clock = () => Date.now()) {}
  async start(userId: number) {
    const state = garminRandom(), verifier = garminRandom();
    // Bound abandoned flows and keep the verifier encrypted, never in a browser URL.
    await this.db.batch([
      this.db.prepare('DELETE FROM garmin_oauth_sessions WHERE user_id=? OR expires_at<=?').bind(userId, iso(this.clock())),
      this.db.prepare('INSERT INTO garmin_oauth_sessions(state_hash,user_id,verifier,expires_at) VALUES(?,?,?,?)')
        .bind(garminHash(state), userId, sealGarmin(verifier, this.key, `garmin:oauth:${userId}`), iso(this.clock() + 600_000)),
    ]);
    return { state, verifier };
  }
  async consume(state: string) {
    const row = await this.db.prepare('DELETE FROM garmin_oauth_sessions WHERE state_hash=? AND expires_at>? RETURNING user_id,verifier,expires_at')
      .bind(garminHash(state), iso(this.clock())).first<{ user_id: number; verifier: string; expires_at: string }>();
    if (!row) throw new Error('GARMIN_INVALID_STATE');
    return { userId: row.user_id, verifier: openGarmin(row.verifier, this.key, `garmin:oauth:${row.user_id}`), consentStartedAt: Date.parse(row.expires_at)-600_000 };
  }
  connection(userId: number) {
    return this.db.prepare('SELECT * FROM garmin_connections WHERE user_id=?').bind(userId).first<GarminConnection>();
  }
  async claimOperation(userId: number) {
    const owner = garminRandom();
    const row = await this.db.prepare('UPDATE garmin_connections SET operation_owner=?,operation_until=? WHERE user_id=? AND (operation_until IS NULL OR operation_until<=?) RETURNING user_id')
      .bind(owner,iso(this.clock()+120_000),userId,iso(this.clock())).first();
    return row ? owner : null;
  }
  async releaseOperation(userId: number, owner: string) {
    await this.db.prepare('UPDATE garmin_connections SET operation_owner=NULL,operation_until=NULL WHERE user_id=? AND operation_owner=?').bind(userId,owner).run();
  }
  async save(userId: number, identity: { userId: string; permissions: string[] }, tokens: GarminTokens, consentStartedAt = this.clock()) {
    const previous = await this.connection(userId);
    // An explicit disconnect is required before changing the source Garmin account.
    const switchingAccount = previous && previous.garmin_user_id !== identity.userId;
    if (switchingAccount && previous.status !== 'not_connected') throw new Error('GARMIN_DISCONNECT_FIRST');
    if (previous?.status === 'disconnect_pending') throw new Error('GARMIN_DISCONNECT_PENDING');
    const now = this.clock(), status = identity.permissions.includes('ACTIVITY_EXPORT') ? 'connected' : 'permission_required';
    if(!Number.isFinite(consentStartedAt)||consentStartedAt>now||consentStartedAt<now-600_000)throw new Error('GARMIN_INVALID_CONSENT_TIME');
    const write = this.db.prepare(`INSERT INTO garmin_connections(user_id,garmin_user_id,tokens,access_expires_at,refresh_expires_at,permissions,status,connected_at,permission_changed_at)
      VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET garmin_user_id=excluded.garmin_user_id,tokens=excluded.tokens,access_expires_at=excluded.access_expires_at,
      refresh_expires_at=excluded.refresh_expires_at,permissions=excluded.permissions,status=excluded.status,connected_at=excluded.connected_at,permission_changed_at=excluded.permission_changed_at
      WHERE garmin_connections.operation_until IS NULL OR garmin_connections.operation_until<=excluded.connected_at`)
      .bind(userId, identity.userId, sealGarmin(JSON.stringify(tokens), this.key, `garmin:tokens:${userId}`),
        iso(now + Math.max(0, tokens.expires_in - 600) * 1000), iso(now + tokens.refresh_token_expires_in * 1000), JSON.stringify(identity.permissions), status, iso(consentStartedAt), now / 1000);
    const [result] = await this.db.batch([write, ...(switchingAccount ? [this.db.prepare('DELETE FROM garmin_deleted_activities WHERE user_id=?').bind(userId)] : [])]);
    if (result.meta.changes !== 1) throw new Error('GARMIN_CONNECTION_BUSY');
    await new GarminHealthStore(this.db,this.clock).clearIfUnauthorized(userId);
    return status;
  }
  tokenValue(row: GarminConnection): GarminTokens {
    if (!row.tokens) throw new Error('GARMIN_REAUTHORIZE');
    return JSON.parse(openGarmin(row.tokens, this.key, `garmin:tokens:${row.user_id}`));
  }
  async rotate(row: GarminConnection, tokens: GarminTokens) {
    const result = await this.db.prepare(`UPDATE garmin_connections SET tokens=?,access_expires_at=?,refresh_expires_at=? WHERE user_id=? AND tokens=?`)
      .bind(sealGarmin(JSON.stringify(tokens), this.key, `garmin:tokens:${row.user_id}`), iso(this.clock() + Math.max(0, tokens.expires_in - 600) * 1000),
        iso(this.clock() + tokens.refresh_token_expires_in * 1000), row.user_id, row.tokens).run();
    if (result.meta.changes !== 1) throw new Error('GARMIN_CONNECTION_CHANGED');
  }
  async status(userId: number, available: boolean): Promise<GarminStatus> {
    const row = await this.connection(userId);
    const count = await this.db.prepare('SELECT count(*) AS count FROM garmin_activity_summaries WHERE user_id=?').bind(userId).first<{ count: number }>();
    return { available, connected: row?.status === 'connected', status: row?.status ?? 'not_connected', connectedAt: row?.connected_at ?? null, lastSyncAt: row?.last_push_at ?? null, activityCount: count?.count ?? 0 };
  }
  async activities(userId: number, limit = 30): Promise<GarminRun[]> {
    const rows = await this.db.prepare('SELECT summary FROM garmin_activity_summaries WHERE user_id=? ORDER BY start_date DESC,activity_id DESC LIMIT ?')
      .bind(userId, Math.min(1000, Math.max(1, limit))).all<{ summary: string }>();
    return rows.results.map(row => JSON.parse(row.summary));
  }
  async deleteActivity(userId: number, id: string) {
    await this.db.batch([
      this.db.prepare('INSERT INTO garmin_deleted_activities(user_id,activity_id) SELECT user_id,activity_id FROM garmin_activity_summaries WHERE user_id=? AND activity_id=? ON CONFLICT DO NOTHING').bind(userId, id),
      this.db.prepare('DELETE FROM garmin_activity_summaries WHERE user_id=? AND activity_id=?').bind(userId, id),
    ]);
  }
  async disconnect(userId: number) {
    // Local consent withdrawal takes effect before any remote network operation.
    await this.db.batch([
      this.db.prepare("UPDATE garmin_connections SET status=CASE WHEN tokens IS NULL THEN 'not_connected' ELSE 'disconnect_pending' END,permissions='[]' WHERE user_id=?").bind(userId),
      this.db.prepare('DELETE FROM garmin_activity_summaries WHERE user_id=?').bind(userId),
      this.db.prepare('DELETE FROM garmin_oauth_sessions WHERE user_id=?').bind(userId),
      this.db.prepare('UPDATE garmin_connections SET health_consented_at=NULL,health_last_push_at=NULL WHERE user_id=?').bind(userId),
      this.db.prepare('DELETE FROM garmin_health_summaries WHERE user_id=?').bind(userId),
      this.db.prepare('DELETE FROM garmin_health_inbox WHERE user_id=?').bind(userId),
    ]);
  }
  async finishDisconnect(userId: number, tokens: string | null) {
    // Keep the disabled identity as a tombstone so late pushes cannot re-create data.
    await this.db.prepare("UPDATE garmin_connections SET tokens=NULL,status='not_connected',permissions='[]' WHERE user_id=? AND status='disconnect_pending' AND tokens=?")
      .bind(userId, tokens).run();
  }
  async receive(push: GarminPush) {
    const entries = Object.entries(push).filter(([type])=>!(GARMIN_HEALTH_TYPES as readonly string[]).includes(type)).flatMap(([type,values])=>values!.map(value=>({type,value})));
    const now=this.clock(),statements=[];
    // Small durable work items keep post-response processing within Worker limits.
    for(let at=0;at<entries.length;at+=20){
      const chunk:Record<string,unknown[]>={};
      for(const {type,value} of entries.slice(at,at+20))(chunk[type]??=[]).push(value);
      const payload=JSON.stringify(chunk);
      statements.push(this.db.prepare('INSERT INTO garmin_push_inbox(id,payload,received_at,retry_at,expires_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING')
        .bind(garminHash(payload),payload,iso(now),iso(now),iso(now+7*86400_000)));
    }
    // One notification is accepted atomically, including all of its work items.
    if(statements.length>32)throw new Error('GARMIN_PUSH_LIMIT');
    if(statements.length)await this.db.batch(statements);
  }
  async process(limit = 5) {
    const now = iso(this.clock());
    // Expiring retained receipts also bounds data for unknown/unconnected users.
    await this.db.prepare('DELETE FROM garmin_push_inbox WHERE expires_at<=?').bind(now).run();
    for (let i = 0; i < limit; i++) {
      const item = await this.db.prepare(`UPDATE garmin_push_inbox SET lease_until=?,attempts=attempts+1 WHERE id=(
        SELECT id FROM garmin_push_inbox WHERE completed_at IS NULL AND retry_at<=? AND (lease_until IS NULL OR lease_until<=?) ORDER BY received_at,id LIMIT 1
      ) RETURNING id,payload,received_at,lease_until`).bind(iso(this.clock() + 120_000), now, now)
        .first<{ id: string; payload: string; received_at: string; lease_until: string }>();
      if (!item) return;
      try {
        const push = JSON.parse(item.payload) as GarminPush;
        for (const [type, entries] of Object.entries(push)) for (const entry of entries) {
          const connection = await this.db.prepare('SELECT * FROM garmin_connections WHERE garmin_user_id=?').bind(String(entry.userId)).first<GarminConnection>();
          // A first push can race with the OAuth callback; retain and retry it.
          if (!connection) throw new Error('GARMIN_REGISTRATION_PENDING');
          const userId = connection.user_id;
          if (item.received_at < connection.connected_at || ['not_connected', 'disconnect_pending', 'reconnect_required'].includes(connection.status)) continue;
          if (type === 'deregistrations') {
            await this.db.batch([
              this.db.prepare("UPDATE garmin_connections SET status='not_connected',tokens=NULL,permissions='[]' WHERE user_id=? AND connected_at<=?").bind(userId, item.received_at),
              this.db.prepare('DELETE FROM garmin_activity_summaries WHERE user_id=? AND EXISTS(SELECT 1 FROM garmin_connections WHERE user_id=? AND status=\'not_connected\')').bind(userId, userId),
            ]);
            await new GarminHealthStore(this.db,this.clock).clearIfUnauthorized(userId);
          } else if (type === 'userPermissionsChange') {
            const permissions = entry.permissions as string[], changed = typeof entry.changeTimeInSeconds === 'number' ? entry.changeTimeInSeconds : Date.parse(item.received_at) / 1000;
            await this.db.prepare('UPDATE garmin_connections SET permissions=?,status=?,permission_changed_at=? WHERE user_id=? AND permission_changed_at<=? AND connected_at<=?')
              .bind(JSON.stringify(permissions), permissions.includes('ACTIVITY_EXPORT') ? 'connected' : 'permission_required', changed, userId, changed, item.received_at).run();
            await new GarminHealthStore(this.db,this.clock).clearIfUnauthorized(userId);
          } else {
            const run = normalizeGarminRun(entry);
            if (!run) continue;
            await this.db.batch([
              this.db.prepare(`INSERT INTO garmin_activity_summaries(user_id,activity_id,start_date,summary,received_at)
                SELECT user_id,?,?,?,? FROM garmin_connections WHERE user_id=? AND status='connected' AND connected_at<=?
                AND EXISTS(SELECT 1 FROM json_each(permissions) WHERE value='ACTIVITY_EXPORT')
                AND NOT EXISTS(SELECT 1 FROM garmin_deleted_activities WHERE user_id=? AND activity_id=?)
                ON CONFLICT(user_id,activity_id) DO UPDATE SET summary=excluded.summary,start_date=excluded.start_date,received_at=excluded.received_at
                WHERE garmin_activity_summaries.received_at<=excluded.received_at`)
                .bind(run.id, run.startDate, JSON.stringify(run), item.received_at, userId, item.received_at, userId, run.id),
              this.db.prepare("UPDATE garmin_connections SET last_push_at=CASE WHEN last_push_at IS NULL OR last_push_at<? THEN ? ELSE last_push_at END WHERE user_id=? AND status='connected'")
                .bind(item.received_at, item.received_at, userId),
            ]);
          }
        }
        await this.db.prepare("UPDATE garmin_push_inbox SET payload='{}',completed_at=?,lease_until=NULL WHERE id=? AND lease_until=?")
          .bind(now, item.id, item.lease_until).run();
      } catch {
        // No runner identifiers, activity bodies, callback URLs or credentials in logs.
        await this.db.prepare('UPDATE garmin_push_inbox SET retry_at=?,lease_until=NULL WHERE id=? AND lease_until=?')
          .bind(iso(this.clock() + 60_000), item.id, item.lease_until).run();
      }
    }
  }
}

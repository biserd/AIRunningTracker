import { verifyRunnerSession, type RunnerSession } from '../src/session';

type State = { queueTable: boolean; pushKeys: boolean; campaignsEnabled: boolean };
type Dependencies = { signingSecret: string; inspect: (session: RunnerSession) => Promise<State>; limit: (key: string) => Promise<boolean> };

/** No provider calls, secrets or raw records. This is evidence, not a cutover authorization. */
export async function migrationReadiness(request: Request, deps: Dependencies): Promise<Response | null> {
  if (new URL(request.url).pathname !== '/api/admin/migration/readiness') return null;
  const reply = (data: unknown, status = 200) => Response.json(data, { status,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Vary': 'Authorization' } });
  if (request.method !== 'GET') return reply({ error: 'Method not allowed' }, 405);
  let session: RunnerSession;
  try { session = await verifyRunnerSession(request.headers.get('authorization')?.replace(/^Bearer /, '') || '', deps.signingSecret); }
  catch { return reply({ error: 'Sign in required' }, 401); }
  if (!await deps.limit(`readiness:${session.userId}`)) return reply({ error: 'Try again in a minute' }, 429);
  try {
    const state = await deps.inspect(session);
    return reply({ checkedAt: new Date().toISOString(), environment: 'staging', cutoverReady: false, database: state,
      remaining: ['Live provider round trips', 'Production queue schema and scheduler failover validation',
        'Replit queue drain and scheduler shutdown', 'Production deployment, traffic switch and live smoke tests'] });
  } catch (error) {
    return reply({ error: error instanceof Error && error.message === 'FORBIDDEN' ? 'Admin access required' : 'Readiness check unavailable' },
      error instanceof Error && error.message === 'FORBIDDEN' ? 403 : 503);
  }
}

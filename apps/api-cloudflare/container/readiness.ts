import { verifyRunnerSession, type RunnerSession } from '../src/session';
import type { ProviderCheck } from './provider-checks';

type State = { queueTable: boolean; pushKeys: boolean; campaignsEnabled: boolean };
type Dependencies = { signingSecret: string; inspect: (session: RunnerSession) => Promise<State>; limit: (key: string) => Promise<boolean>; providers?: () => Promise<ProviderCheck[]>; testEmail?: () => Promise<boolean> };

/** Provider reads run only after fresh database admin authorization. No credentials or runner records are returned. */
export async function migrationReadiness(request: Request, deps: Dependencies): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const emailTest = path === '/api/admin/migration/test-email';
  if (path !== '/api/admin/migration/readiness' && !emailTest) return null;
  const reply = (data: unknown, status = 200) => Response.json(data, { status,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Vary': 'Authorization' } });
  if (request.method !== (emailTest ? 'POST' : 'GET')) return reply({ error: 'Method not allowed' }, 405);
  if (emailTest && request.headers.get('origin') !== 'https://aitracker-api-staging.biser-d.workers.dev') return reply({error:'Origin not allowed'},403);
  let session: RunnerSession;
  try { session = await verifyRunnerSession(request.headers.get('authorization')?.replace(/^Bearer /, '') || '', deps.signingSecret); }
  catch { return reply({ error: 'Sign in required' }, 401); }
  if (!await deps.limit(`readiness:${session.userId}`)) return reply({ error: 'Try again in a minute' }, 429);
  try {
    const state = await deps.inspect(session);
    if (emailTest) {
      if (!deps.testEmail || Date.now() >= Date.parse('2026-09-14T00:00:00Z')) return reply({error:'Controlled test window closed'},410);
      const accepted = await deps.testEmail();
      return reply({accepted, message:accepted ? 'Resend accepted the test email to biserd@gmail.com. Confirm inbox receipt.' : 'Resend did not accept the test email.'},accepted?200:502);
    }
    const providers = deps.providers ? await deps.providers() : [];
    return reply({ checkedAt: new Date().toISOString(), environment: 'staging', cutoverReady: false, database: state,
      providers, remaining: ['Controlled Stripe billing and Hermes delivery round trips', 'Production scheduler failover rehearsal',
        'Observation window and backup restore rehearsal before permanently retiring Replit'] });
  } catch (error) {
    return reply({ error: error instanceof Error && error.message === 'FORBIDDEN' ? 'Admin access required' : 'Readiness check unavailable' },
      error instanceof Error && error.message === 'FORBIDDEN' ? 403 : 503);
  }
}

import { RunnerReads } from './runner-reads';
import { verifyRunnerSession } from './session';

const headers = {
  'Content-Type': 'application/json', 'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers }); }

async function credentials(request: Request): Promise<{ email: string; password: string }> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('INVALID_REQUEST');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_REQUEST');
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) throw new Error('INVALID_REQUEST');
      parts.push(value);
    }
  } finally { await reader.cancel(); }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { joined.set(part, offset); offset += part.byteLength; }
  const body = JSON.parse(new TextDecoder().decode(joined));
  if (typeof body?.email !== 'string' || body.email.length > 254 || !body.email.includes('@') ||
      typeof body?.password !== 'string' || body.password.length < 1 || body.password.length > 256) {
    throw new Error('INVALID_REQUEST');
  }
  return { email: body.email.trim(), password: body.password };
}

export async function handleApi(request: Request, env: Env,
  store: Pick<RunnerReads, 'login' | 'profile' | 'activity' | 'activities'> = new RunnerReads(env.HYPERDRIVE)): Promise<Response> {
  const url = new URL(request.url);
  const login = url.pathname === '/api/auth/login' && request.method === 'POST';
  const profile = ['/api/user', '/api/auth/user'].includes(url.pathname);
  const detail = /^\/api\/activities\/([1-9]\d*)$/.exec(url.pathname);
  const list = url.pathname === '/api/activities';
  if (!login && !(request.method === 'GET' && (profile || detail || list))) {
    return json({ error: 'MIGRATION_NOT_READY', message: 'This capability has not been migrated yet.' }, 503);
  }
  if (!env.JWT_SIGNING_SECRET || env.JWT_SIGNING_SECRET.length < 32 || !env.AUTH_LIMITER || !env.READ_LIMITER) {
    return json({ error: 'MIGRATION_NOT_READY' }, 503);
  }
  // No permissive CORS, cookie auth, or caller-provided runner IDs.
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return json({ error: 'FORBIDDEN_ORIGIN' }, 403);
  try {
    if (login) {
      const allowed = await env.AUTH_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
      if (!allowed.success) return json({ error: 'RATE_LIMITED' }, 429);
      let body;
      try { body = await credentials(request); } catch { return json({ error: 'INVALID_REQUEST' }, 400); }
      return json(await store.login(body.email, body.password, env.JWT_SIGNING_SECRET));
    }
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({ error: 'UNAUTHORIZED' }, 401);
    const session = await verifyRunnerSession(authorization.slice(7), env.JWT_SIGNING_SECRET);
    if (!(await env.READ_LIMITER.limit({ key: String(session.userId) })).success) return json({ error: 'RATE_LIMITED' }, 429);
    const runner = await store.profile(session);
    if (!runner) return json({ error: 'UNAUTHORIZED' }, 401);
    if (profile) return json(runner);
    if (detail) {
      const data = await store.activity(session, Number(detail[1]));
      return data ? json(data) : json({ error: 'NOT_FOUND' }, 404);
    }
    const allowedParams = new Set(['limit', 'beforeId']);
    if ([...url.searchParams.keys()].some(key => !allowedParams.has(key))) return json({ error: 'INVALID_REQUEST' }, 400);
    return json(await store.activities(session, Number(url.searchParams.get('limit') ?? 20),
      url.searchParams.has('beforeId') ? Number(url.searchParams.get('beforeId')) : undefined));
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'UNAUTHORIZED' || code === 'INVALID_CREDENTIALS') return json({ error: code }, 401);
    if (code.startsWith('INVALID_')) return json({ error: 'INVALID_REQUEST' }, 400);
    // Do not log errors: provider messages can contain SQL, credentials or private data.
    return json({ error: 'SERVICE_UNAVAILABLE' }, 503);
  }
}

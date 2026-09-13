import { SignJWT } from 'jose';

export type LoginUser = { id: number; email: string; firstName: string | null;
  lastName: string | null; subscriptionPlan: string | null; subscriptionStatus: string | null };
export type MagicLinkDependencies = {
  database: Pick<D1Database, 'prepare'>;
  signingSecret: string;
  origin: string;
  findUser: (key: { email: string } | { id: number }) => Promise<LoginUser | null>;
  send: (email: string, link: string) => Promise<void>;
  limit: (key: string) => Promise<boolean>;
};
const message = 'If an account exists with that email, a sign-in link has been sent.';
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' };
const reply = (status: number, body: object) => Response.json(body, { status, headers });
const invalid = () => reply(401, { code: 'INVALID_TOKEN', message: 'This link has expired or was already used. Request a new one.' });
const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const digest = async (text: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
// Keyed hashes keep email addresses out of the authentication store and rate-limit keys.
async function emailHash(email: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`magic-link-email:${email.toLowerCase()}`)));
}
async function readBody(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_BODY');
  let body = ''; let size = 0; const decoder = new TextDecoder();
  try {
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new Error('INVALID_BODY'); }
      body += decoder.decode(chunk.value, { stream: true });
    }
  } finally { reader.releaseLock(); }
  const parsed: unknown = JSON.parse(body + decoder.decode());
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('INVALID_BODY');
  return parsed as Record<string, unknown>;
}

/** Existing-account sign-in only. Never registers, reactivates or changes a runner. */
export async function magicLinks(request: Request, deps: MagicLinkDependencies): Promise<Response | null> {
  const url = new URL(request.url);
  if (!['/api/auth/magic-link/request', '/api/auth/magic-link/verify'].includes(url.pathname)) return null;
  if (request.method !== 'POST') return reply(405, { message: 'Use POST.' });
  if (url.origin !== deps.origin || request.headers.get('origin') !== deps.origin) return reply(403, { message: 'Invalid origin.' });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply(415, { message: 'Use JSON.' });
  if (deps.signingSecret.length < 32) return reply(503, { message: 'Sign-in is temporarily unavailable.' });
  try {
    if (!await deps.limit(`ip:${request.headers.get('cf-connecting-ip') || 'unknown'}`)) return reply(429, { message: 'Please wait a minute before trying again.' });
    let body: Record<string, unknown>;
    try { body = await readBody(request); } catch { return reply(400, { message: 'Invalid request.' }); }
    const now = Math.floor(Date.now() / 1000);
    if (url.pathname.endsWith('/request')) {
      if (typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return reply(400, { message: 'Enter a valid email address.' });
      const email = body.email.trim().toLowerCase();
      const emailKey = await emailHash(email, deps.signingSecret);
      if (!await deps.limit(`email:${emailKey}`)) return reply(200, { message });
      const user = await deps.findUser({ email });
      if (!user) return reply(200, { message });
      const token = hex(crypto.getRandomValues(new Uint8Array(32)));
      const tokenHash = await digest(token);
      // Atomic cooldown across regions and instances. Resending invalidates the previous link.
      const issued = await deps.database.prepare(`INSERT INTO magic_links(email_hash, token_hash, user_id, issued_at, expires_at)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT(email_hash) DO UPDATE SET token_hash=excluded.token_hash,
        user_id=excluded.user_id, issued_at=excluded.issued_at, expires_at=excluded.expires_at
        WHERE magic_links.issued_at <= ? RETURNING user_id`).bind(emailKey, tokenHash, user.id, now, now + 900, now - 60).first();
      if (!issued) return reply(200, { message });
      const redirect = typeof body.redirect === 'string' && /^\/(?!\/)/.test(body.redirect) &&
        !/[\\\x00-\x20]/.test(body.redirect) && body.redirect.length <= 300 ? body.redirect : '/dashboard';
      // Fragment is not sent to HTTP access logs or referrers. Client requires a confirmation click.
      const link = `${deps.origin}/auth/magic-link#${new URLSearchParams({ token, redirect })}`;
      try { await deps.send(user.email, link); }
      catch {
        await deps.database.prepare('DELETE FROM magic_links WHERE token_hash = ?').bind(tokenHash).run();
        // Keep account enumeration responses identical; alert operations without recipient or provider payload.
        console.error(JSON.stringify({ event: 'magic_link_delivery_failed' }));
      }
      await deps.database.prepare('DELETE FROM magic_links WHERE expires_at < ?').bind(now - 86400).run();
      return reply(200, { message });
    }
    if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/.test(body.token)) return invalid();
    const tokenHash = await digest(body.token);
    const record = await deps.database.prepare('SELECT user_id, email_hash FROM magic_links WHERE token_hash = ? AND expires_at > ?')
      .bind(tokenHash, now).first<{ user_id: number; email_hash: string }>();
    if (!record) return invalid();
    const user = await deps.findUser({ id: record.user_id });
    if (!user || await emailHash(user.email, deps.signingSecret) !== record.email_hash) return invalid();
    const token = await new SignJWT({ userId: user.id, email: user.email }).setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt().setExpirationTime('7d').sign(new TextEncoder().encode(deps.signingSecret));
    // Only one concurrent caller can consume the challenge and receive a session.
    const consumed = await deps.database.prepare('DELETE FROM magic_links WHERE token_hash = ? AND expires_at > ? RETURNING user_id')
      .bind(tokenHash, Math.floor(Date.now() / 1000)).first();
    if (!consumed) return invalid();
    return reply(200, { token, user, accountReactivated: false });
  } catch {
    console.error(JSON.stringify({ event: 'magic_link_unavailable' }));
    return reply(503, { message: 'Sign-in is temporarily unavailable. Please try again shortly.' });
  }
}

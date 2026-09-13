import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { jwtVerify } from 'jose';
import { magicLinks, type MagicLinkDependencies } from '../container/magic-links';

test('Cloudflare magic links use real D1 single-use claims without modifying the runner database', async () => {
  const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default {fetch(){return new Response("ok")}}',
    compatibilityDate: '2026-09-13', d1Databases: ['AUTH'] }));
  try {
    const database = await mf.getD1Database('AUTH');
    const sql = await readFile(new URL('../container/auth-migrations/0001_magic_links.sql', import.meta.url), 'utf8');
    for (const statement of sql.replace(/--[^\n]*/g, '').split(';').filter(s => s.trim())) await database.prepare(statement).run();
    const user = { id: 123, email: 'runner@example.com', firstName: 'Runner', lastName: null, subscriptionPlan: 'free', subscriptionStatus: 'free' };
    let link = ''; let sends = 0;
    const deps: MagicLinkDependencies = { database, origin: 'https://stage.example.com', signingSecret: 'test-only-signing-secret-32-characters',
      findUser: async key => ('email' in key ? key.email === user.email : key.id === user.id) ? { ...user } : null,
      send: async (_email, value) => { link = value; sends++; }, limit: async () => true };
    const request = (path: string, data: object, origin = deps.origin) => new Request(`${deps.origin}/api/auth/magic-link/${path}`, {
      method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const first = await magicLinks(request('request', { email: user.email, redirect: '//evil.example.com' }), deps);
    assert.equal(first?.status, 200); assert.equal(sends, 1);
    assert.equal(new URL(link).search, '');
    const token = new URLSearchParams(new URL(link).hash.slice(1)).get('token')!;
    assert.equal(new URLSearchParams(new URL(link).hash.slice(1)).get('redirect'), '/dashboard');
    const stored = await database.prepare('SELECT * FROM magic_links').first();
    assert.ok(stored); assert.ok(!JSON.stringify(stored).includes(token)); assert.ok(!JSON.stringify(stored).includes(user.email));
    const unknown = await magicLinks(request('request', { email: 'unknown@example.com' }), deps);
    assert.equal(await unknown?.text(), await first?.text()); assert.equal(sends, 1);
    await magicLinks(request('request', { email: user.email }), deps); assert.equal(sends, 1, 'global cooldown');
    const concurrent = await Promise.all([magicLinks(request('verify', { token, userId: 999 }), deps), magicLinks(request('verify', { token }), deps)]);
    assert.deepEqual(concurrent.map(r => r!.status).sort(), [200, 401]);
    const result = await concurrent.find(r => r?.status === 200)!.json() as { token: string; user: typeof user };
    const { payload } = await jwtVerify(result.token, new TextEncoder().encode(deps.signingSecret));
    assert.equal(payload.userId, 123); assert.equal(payload.purpose, undefined); assert.equal(result.user.id, 123);
    assert.equal((await magicLinks(request('verify', { token }), deps))?.status, 401);
    await magicLinks(request('request', { email: user.email }), deps);
    const expired = new URLSearchParams(new URL(link).hash.slice(1)).get('token')!;
    await database.prepare('UPDATE magic_links SET expires_at = 0').run();
    assert.equal((await magicLinks(request('verify', { token: expired }), deps))?.status, 401);
    assert.equal((await magicLinks(request('request', { email: user.email }, 'https://evil.example'), deps))?.status, 403);
    assert.equal((await magicLinks(request('verify', { token: 'jwt-not-a-challenge' }), deps))?.status, 401);
    assert.equal((await magicLinks(request('request', { email: user.email }), { ...deps, limit: async () => false }))?.status, 429);
    assert.equal((await magicLinks(request('request', { email: 'x'.repeat(3000) }), deps))?.status, 400);
    assert.equal((await magicLinks(new Request(`${deps.origin}/api/auth/magic-link/request`), deps))?.status, 405);
  } finally { await mf.dispose(); }
});

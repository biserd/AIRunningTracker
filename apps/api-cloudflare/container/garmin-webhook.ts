import type { AtomicSqlDatabase } from '../../../server/d1/jobStore';
import { GarminStore } from '../../../server/garmin/store';
import { parseGarminPush } from '../../../shared/garmin';
const cidrs: [string, number][] = [['204.77.162.0',23], ['204.77.163.0',24], ['98.199.124.0',23], ['185.132.79.0',24], ['208.65.206.0',23], ['185.207.94.0',23], ['198.233.176.0',24]];
function ipv4(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null;
  return parts.reduce((value, part) => (value * 256 + Number(part)) >>> 0, 0);
}
export function isGarminSource(ip: string) {
  const value = ipv4(ip);
  return value !== null && cidrs.some(([address, bits]) => {
    const mask = (0xffffffff << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4(address)! & mask);
  });
}
export async function receiveGarminWebhook(request: Request, database: AtomicSqlDatabase, clientId: string, waitUntil: (work: Promise<unknown>) => void): Promise<Response> {
  // CF-Connecting-IP is set by Cloudflare. Never trust a caller-supplied X-Forwarded-For.
  if (!clientId || !isGarminSource(request.headers.get('CF-Connecting-IP') || '') || request.headers.get('garmin-client-id') !== clientId) return new Response('Forbidden', { status: 403 });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return new Response('JSON required', { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) return new Response('Invalid payload', { status: 400 });
  let bytes = 0, text = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1_048_576) { await reader.cancel(); return new Response('Payload too large', { status: 413 }); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const push = parseGarminPush(JSON.parse(text));
    const store = new GarminStore(database, '');
    // Acknowledge only after durable receipt. Processing runs after the response,
    // with a scheduled retry if this Worker is interrupted.
    await store.receive(push);
    waitUntil(store.process(1).catch(() => { console.error(JSON.stringify({ event: 'garmin_push_processing_deferred' })); }));
    return new Response('OK', { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    // Invalid payloads are retried by Garmin; storage outages must not be acknowledged.
    return new Response('Unable to accept notification', { status: 503 });
  }
}

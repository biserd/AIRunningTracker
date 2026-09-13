export type ProviderCheck = { name: string; status: 'pass' | 'fail' | 'unverified'; detail: string; subscriptionId?: number };
type Credentials = { stripe: string; resend: string; openai: string; stravaClientId: string; stravaSecret: string };
type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
const rows = (value: unknown): JsonRecord[] => Array.isArray(value) ? value.map(record) : [];

/** Fixed GET-only provider reads. Never return response bodies, credentials or upstream errors. */
export async function providerChecks(credentials: Credentials, send: typeof fetch = (input, init) => fetch(input, init)): Promise<ProviderCheck[]> {
  async function read(url: URL | string, bearer?: string): Promise<unknown> {
    const response = await send(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(10_000),
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} });
    if (!response.body) throw new Error('FAILED');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        length += value.byteLength;
        if (length > 512_000) throw new Error('LIMIT');
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const data = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
    if (!response.ok) {
      if (new URL(url).hostname === 'api.resend.com' && response.status === 401) {
        try {
          if (record(JSON.parse(new TextDecoder().decode(data))).name === 'restricted_api_key') throw new Error('SENDING_ONLY');
        } catch (error) { if (error instanceof Error && error.message === 'SENDING_ONLY') throw error; }
      }
      throw new Error(`HTTP_${response.status}`);
    }
    return JSON.parse(new TextDecoder().decode(data));
  }
  async function check(name: string, configured: boolean, operation: () => Promise<ProviderCheck>): Promise<ProviderCheck> {
    if (!configured) return { name, status: 'fail', detail: 'Required production credential missing or wrong mode' };
    try { return await operation(); }
    catch (error) {
      // Only allowlisted classifications can leave the Worker. Never expose upstream error text or URLs.
      const message = error instanceof Error ? error.message : '';
      const detail = message === 'SENDING_ONLY' ? 'Sending-only key accepted; domain listing is not permitted. Verify delivery with a controlled test, not broader key permissions'
        : /^HTTP_[1-5][0-9]{2}$/.test(message) ? `Provider returned HTTP ${message.slice(5)}; verify credential permissions and provider availability`
        : message === 'LIMIT' ? 'Provider response exceeded the bounded read limit'
        : error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'Provider read timed out'
        : error instanceof TypeError ? 'Provider transport or runtime rejected the request'
        : 'Read failed or returned an unexpected response';
      return { name, status: 'unverified', detail };
    }
  }
  return Promise.all([
    check('Stripe prices', credentials.stripe?.startsWith('sk_live_'), async () => {
      const prices = await Promise.all(['price_1SbtcfRwvWaTf8xfSEO4iKnc','price_1SbtcfRwvWaTf8xfwcVnrRf8'].map(id => read(`https://api.stripe.com/v1/prices/${id}`, credentials.stripe)));
      const valid = prices.every(p => { const r = record(p); return r.active === true && r.livemode === true && r.type === 'recurring'; });
      return { name: 'Stripe prices', status: valid ? 'pass' : 'fail', detail: valid ? 'Both configured recurring prices are active in live mode' : 'Configured prices are not active live recurring prices' };
    }),
    check('Stripe webhook', credentials.stripe?.startsWith('sk_live_'), async () => {
      const result = record(await read('https://api.stripe.com/v1/webhook_endpoints?limit=100', credentials.stripe));
      const valid = rows(result.data).some(r => r.status === 'enabled' && r.livemode === true && typeof r.url === 'string' && /^https:\/\/aitracker\.run\/api\/stripe\/webhook\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.url));
      return { name: 'Stripe webhook', status: valid ? 'pass' : 'unverified', detail: valid ? 'Enabled live webhook targets the main domain; signed delivery still needs a round trip' : 'No matching enabled webhook found in the first 100 endpoints' };
    }),
    check('Strava subscription', Boolean(credentials.stravaClientId && credentials.stravaSecret), async () => {
      // Strava requires these query parameters. Deployment MUST redact query strings from logs/traces.
      const url = new URL('https://www.strava.com/api/v3/push_subscriptions');
      url.searchParams.set('client_id', credentials.stravaClientId); url.searchParams.set('client_secret', credentials.stravaSecret);
      const subscriptions = rows(await read(url));
      const match = subscriptions.find(r => r.callback_url === 'https://aitracker.run/api/strava/webhook' && Number.isSafeInteger(r.id));
      return match ? { name: 'Strava subscription', status: 'pass', detail: 'Existing subscription targets the main domain', subscriptionId: Number(match.id) }
        : { name: 'Strava subscription', status: 'fail', detail: 'No subscription matches the production callback' };
    }),
    check('Resend domain', Boolean(credentials.resend), async () => {
      const result = record(await read('https://api.resend.com/domains?limit=100', credentials.resend));
      const valid = rows(result.data).some(r => r.name === 'aitracker.run' && r.status === 'verified');
      return { name: 'Resend domain', status: valid ? 'pass' : 'unverified', detail: valid ? 'Sender domain verified; this check sends no email' : 'Verified sender domain not found with this key' };
    }),
    check('OpenAI access', Boolean(credentials.openai), async () => {
      const result = record(await read('https://api.openai.com/v1/models', credentials.openai));
      const valid = result.object === 'list' && rows(result.data).length > 0;
      return { name: 'OpenAI access', status: valid ? 'pass' : 'unverified', detail: valid ? 'API key accepted for model discovery; inference quota not tested' : 'Unexpected model discovery response' };
    }),
  ]);
}

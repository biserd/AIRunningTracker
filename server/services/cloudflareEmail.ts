export interface CloudflareEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  replyTo?: string;
}

export interface CloudflareEmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export type CloudflareSuppressionReason = 'manual' | 'complaint' | 'hard_bounce' | 'soft_bounce' | 'policy';
export type CloudflareSuppressionCheck =
  | { status: 'clear' }
  | { status: 'suppressed'; reason: CloudflareSuppressionReason }
  | { status: 'unavailable' };

// Keep credentials and message contents out of errors and request logs.
export class CloudflareEmailTransport {
  constructor(
    private config: { accountId?: string; token?: string; from: string },
    private request: typeof fetch = fetch,
    private wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)),
  ) {}

  isConfigured() {
    return /^[a-f0-9]{32}$/i.test(this.config.accountId || '') && Boolean(this.config.token);
  }

  // Cloudflare automatically records eligible bounces and complaints. Check
  // its current suppression list before a consented Checkout follow-up; fail
  // closed if the API cannot be read with the production sending token.
  async checkSuppression(email: string): Promise<CloudflareSuppressionCheck> {
    if (!this.isConfigured() || !email || email.includes('\r') || email.includes('\n')) return { status: 'unavailable' };
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/email/sending/suppressions?email=${encodeURIComponent(email)}&per_page=100`;
      const response = await this.request(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.config.token}` },
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) { await response.body?.cancel(); return { status: 'unavailable' }; }
      const body = await response.json() as { success?: boolean; result?: Array<{
        email?: string; reason?: CloudflareSuppressionReason;
        scope?: { type?: string; value?: string };
      }>; result_info?: { next_cursor?: string | null } };
      if (body.success !== true || !Array.isArray(body.result) ||
        !body.result_info || body.result_info.next_cursor !== null) return { status: 'unavailable' };
      // The suppression scope is based on Cloudflare's envelope MAIL FROM,
      // which need not match the visible From address. Conservatively avoid
      // sending to an address suppressed anywhere on this account.
      const matching = body.result.find(entry =>
        entry.email?.toLowerCase() === email.toLowerCase()
      );
      return matching ? { status: 'suppressed', reason: matching.reason || 'policy' } : { status: 'clear' };
    } catch { return { status: 'unavailable' }; }
  }

  async send(options: CloudflareEmailOptions, retries = 3): Promise<CloudflareEmailResult> {
    if (!this.isConfigured()) return { success: false, error: 'cloudflare_email_not_configured' };
    const named = this.config.from.match(/^([^<>\r\n]+)\s*<([^<>\r\n]+)>$/);
    const from = named ? { address: named[2].trim(), name: named[1].trim() } : this.config.from;
    const attempts = Number.isFinite(retries) ? Math.max(1, Math.min(3, Math.floor(retries))) : 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await this.request(
          `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/email/sending/send`,
          { method: 'POST', headers: { Authorization: `Bearer ${this.config.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: options.to, subject: options.subject, html: options.html,
              text: options.text, headers: options.headers, reply_to: options.replyTo, from }),
            redirect: 'error', signal: AbortSignal.timeout(15000) },
        );
        if (response.status === 429 && attempt < attempts) {
          await response.body?.cancel();
          await this.wait(1000 * attempt);
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          return { success: false, error: `cloudflare_email_http_${response.status}` };
        }
        const body = await response.json() as { success?: boolean; result?: {
          delivered?: string[]; queued?: string[]; permanent_bounces?: string[];
          suppressed_recipients?: string[]; message_id?: string;
        } };
        const result = body.result;
        if (result?.permanent_bounces?.length) return { success: false, error: 'cloudflare_email_permanent_bounce' };
        if (result?.suppressed_recipients?.length) return { success: false, error: 'cloudflare_email_suppressed' };
        const accepted = [...(result?.delivered || []), ...(result?.queued || [])];
        if (body.success !== true || !accepted.some(address => address.toLowerCase() === options.to.toLowerCase())) {
          return { success: false, error: 'cloudflare_email_not_accepted' };
        }
        // Accepted or queued is not the same as delivered. Keep the provider's
        // message ID for correlation with Cloudflare's email lifecycle logs.
        return { success: true, ...(result?.message_id ? { providerMessageId: result.message_id } : {}) };
      } catch {
        // A timeout can follow acceptance. Retrying blindly can send duplicates.
        return { success: false, error: 'cloudflare_email_outcome_unknown' };
      }
    }
    return { success: false, error: 'cloudflare_email_rate_limited' };
  }
}

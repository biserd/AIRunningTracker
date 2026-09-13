/** Bounded operational classifications. Never return provider messages or payloads. */
export function stripeWebhookFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (/No managed webhook found/.test(message)) return 'managed_webhook_missing';
  if (/signature|timestamp outside/i.test(message)) return 'signature_rejected';
  if (/SSL|TLS|certificate|insecure connection/i.test(message)) return 'database_tls';
  if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'].includes(code)) return 'database_connection';
  if (['42P01', '42703', '42501', '25006'].includes(code)) return `database_${code}`;
  if (/Failed to retrieve Stripe account/.test(message)) return 'stripe_account_read';
  return 'processing_failed';
}

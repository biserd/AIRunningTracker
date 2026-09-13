/** Explicit allowlist: no Replit connector identity or development keys enter production. */
export function productionEnvironment(values: object): Record<string, string> {
  const required = ['DATABASE_URL','JWT_SIGNING_SECRET','EMAIL_UNSUBSCRIBE_SIGNING_SECRET_V2',
    'MARKETING_LINK_SIGNING_SECRET','MCP_TOKEN_HASH_SECRET','CHANNEL_IDENTITY_HASH_SECRET',
    'COACH_BINDING_CALLBACK_SECRET','COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2','COACH_AGENT_WEBHOOK_URL',
    'OPENAI_API_KEY','RESEND_API_KEY','RESEND_FROM_EMAIL','RESEND_WEBHOOK_SECRET','STRAVA_CLIENT_SECRET',
    'VITE_STRAVA_CLIENT_ID','STRIPE_SECRET_KEY','VITE_STRIPE_PUBLIC_KEY','HERMES_MCP_CLIENT_ID',
    'TELEGRAM_BOT_USERNAME','ALLOWED_PRICE_IDS','STRAVA_SUBSCRIPTION_ID'];
  const output: Record<string,string> = { NODE_ENV:'production',APP_PLATFORM:'cloudflare',APP_ENV:'production',
    APP_ROLE:'jobs',PORT:'5000',PUBLIC_APP_URL:'https://aitracker.run',APP_URL:'https://aitracker.run',
    COACH_MULTI_RUNNER_PILOT_ENABLED:'true',MCP_ISSUER:'https://aitracker.run',
    MCP_ALLOWED_HOSTS:'aitracker.run,www.aitracker.run',MCP_ALLOWED_ORIGINS:'https://aitracker.run,https://www.aitracker.run' };
  for (const name of required) {
    const value: unknown = Reflect.get(values, name);
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing production configuration: ${name}`);
    output[name] = value;
  }
  if (!output.STRIPE_SECRET_KEY.startsWith('sk_live_') || !output.VITE_STRIPE_PUBLIC_KEY.startsWith('pk_live_')) {
    throw new Error('Production requires live Stripe keys');
  }
  for (const name of ['STRAVA_VERIFY_TOKEN','VAPID_PRIVATE_KEY','VAPID_PUBLIC_KEY','VAPID_SUBJECT',
    'ENABLE_PROACTIVE_COACH_WORKER','ENABLE_NOTIFICATION_DELIVERY']) {
    const value: unknown = Reflect.get(values, name);
    if (typeof value === 'string') output[name] = value;
  }
  return output;
}

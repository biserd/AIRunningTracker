import crypto from "node:crypto";

const MIN_SECRET_LENGTH = 32;
const KNOWN_UNSAFE_SECRETS = new Set([
  "your-secret-key-change-in-production",
  "runanalytics_unsub_secret_2024",
  "changeme",
]);

const developmentSecrets = new Map<string, string>();

export function isStrongApplicationSecret(value: string | undefined): value is string {
  return Boolean(
    value &&
    value.length >= MIN_SECRET_LENGTH &&
    !KNOWN_UNSAFE_SECRETS.has(value.trim().toLowerCase()),
  );
}

function developmentSecret(name: string): string {
  const existing = developmentSecrets.get(name);
  if (existing) return existing;
  const generated = crypto.randomBytes(48).toString("base64url");
  developmentSecrets.set(name, generated);
  console.warn(`[SecurityConfig] ${name} is not configured; using an ephemeral non-production secret.`);
  return generated;
}

export function requireApplicationSecret(name: string): string {
  const value = process.env[name];
  if (isStrongApplicationSecret(value)) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`[SecurityConfig] ${name} must be configured with at least ${MIN_SECRET_LENGTH} characters in production.`);
  }
  return developmentSecret(name);
}

export function getJwtSecret(): string {
  return requireApplicationSecret("JWT_SIGNING_SECRET");
}

export function getUnsubscribeTokenSecret(): string {
  return requireApplicationSecret("UNSUBSCRIBE_TOKEN_SECRET");
}

export function assertProductionSecurityConfiguration(): void {
  if (process.env.NODE_ENV !== "production") return;
  requireApplicationSecret("JWT_SIGNING_SECRET");
  requireApplicationSecret("UNSUBSCRIBE_TOKEN_SECRET");

  const multiRunnerPilot = process.env.COACH_MULTI_RUNNER_PILOT_ENABLED === "true";
  if (multiRunnerPilot) {
    requireApplicationSecret("COACH_AGENT_WEBHOOK_SECRET");
    requireApplicationSecret("COACH_BINDING_CALLBACK_SECRET");
    requireApplicationSecret("CHANNEL_IDENTITY_HASH_SECRET");
    requireApplicationSecret("MCP_TOKEN_HASH_SECRET");
    const requiredValues = ["COACH_AGENT_WEBHOOK_URL", "HERMES_MCP_CLIENT_ID", "TELEGRAM_BOT_USERNAME"] as const;
    for (const name of requiredValues) {
      if (!process.env[name]?.trim()) throw new Error(`[SecurityConfig] ${name} is required for the multi-runner coach pilot.`);
    }
    let webhookUrl: URL;
    try {
      webhookUrl = new URL(process.env.COACH_AGENT_WEBHOOK_URL!);
    } catch {
      throw new Error("[SecurityConfig] COACH_AGENT_WEBHOOK_URL must be an absolute HTTPS URL.");
    }
    if (webhookUrl.protocol !== "https:") {
      throw new Error("[SecurityConfig] COACH_AGENT_WEBHOOK_URL must use HTTPS in production.");
    }
  } else if (process.env.COACH_AGENT_WEBHOOK_URL) {
    requireApplicationSecret("COACH_AGENT_WEBHOOK_SECRET");
    const pilotUserId = Number(process.env.COACH_AGENT_PILOT_USER_ID);
    if (!Number.isSafeInteger(pilotUserId) || pilotUserId <= 0) {
      throw new Error("[SecurityConfig] COACH_AGENT_PILOT_USER_ID is required while the single-runner Hermes webhook is enabled.");
    }
  }
}

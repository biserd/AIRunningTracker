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
  return requireApplicationSecret("JWT_SECRET");
}

export function getUnsubscribeTokenSecret(): string {
  return requireApplicationSecret("UNSUBSCRIBE_TOKEN_SECRET");
}

export function assertProductionSecurityConfiguration(): void {
  if (process.env.NODE_ENV !== "production") return;
  requireApplicationSecret("JWT_SECRET");
  requireApplicationSecret("UNSUBSCRIBE_TOKEN_SECRET");

  if (process.env.COACH_AGENT_WEBHOOK_URL) {
    requireApplicationSecret("COACH_AGENT_WEBHOOK_SECRET");
    const pilotUserId = Number(process.env.COACH_AGENT_PILOT_USER_ID);
    if (!Number.isSafeInteger(pilotUserId) || pilotUserId <= 0) {
      throw new Error("[SecurityConfig] COACH_AGENT_PILOT_USER_ID is required while the single-runner Hermes webhook is enabled.");
    }
  }
}

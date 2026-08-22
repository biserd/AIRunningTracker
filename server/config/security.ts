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

export function requireIndependentApplicationSecrets(names: readonly string[]): void {
  const values = names.map((name) => ({ name, value: requireApplicationSecret(name) }));
  const firstNameByValue = new Map<string, string>();
  for (const { name, value } of values) {
    const firstName = firstNameByValue.get(value);
    if (firstName) {
      throw new Error(`[SecurityConfig] ${firstName} and ${name} must use independent values.`);
    }
    firstNameByValue.set(value, name);
  }
}

export function getJwtSecret(): string {
  return requireApplicationSecret("JWT_SIGNING_SECRET");
}

export function getUnsubscribeTokenSecret(): string {
  return requireApplicationSecret("EMAIL_UNSUBSCRIBE_SIGNING_SECRET_V2");
}

export function assertProductionSecurityConfiguration(): void {
  if (process.env.NODE_ENV !== "production") return;
  const multiRunnerPilot = process.env.COACH_MULTI_RUNNER_PILOT_ENABLED === "true";
  const requiredSecrets = ["JWT_SIGNING_SECRET", "EMAIL_UNSUBSCRIBE_SIGNING_SECRET_V2"];
  if (multiRunnerPilot) {
    requiredSecrets.push(
      "COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2",
      "COACH_BINDING_CALLBACK_SECRET",
      "CHANNEL_IDENTITY_HASH_SECRET",
      "MCP_TOKEN_HASH_SECRET",
    );
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
    requiredSecrets.push("COACH_AGENT_WEBHOOK_SIGNING_SECRET_V2");
    const pilotUserId = Number(process.env.COACH_AGENT_PILOT_USER_ID);
    if (!Number.isSafeInteger(pilotUserId) || pilotUserId <= 0) {
      throw new Error("[SecurityConfig] COACH_AGENT_PILOT_USER_ID is required while the single-runner Hermes webhook is enabled.");
    }
  }
  requireIndependentApplicationSecrets(requiredSecrets);
}

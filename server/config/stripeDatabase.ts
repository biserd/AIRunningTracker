import type { PoolConfig } from 'pg';

/** StripeSync owns a separate pool and must use the same verified TLS as the app. */
export function stripeDatabaseConfig(connectionString: string, cloudflare: boolean): PoolConfig {
  if (!cloudflare) return { connectionString, max: 2 };
  const url = new URL(connectionString);
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return {
    connectionString: url.toString(), max: 2,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000,
  };
}

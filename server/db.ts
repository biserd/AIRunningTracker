import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { isCloudflareRuntime, isMigrationStaging } from './config/runtime';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Containers use native Node/Postgres, not Worker-local Hyperdrive sockets.
// Do not allow URL SSL options to override certificate verification on Cloudflare.
const connectionUrl = new URL(process.env.DATABASE_URL);
if (isCloudflareRuntime()) {
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) connectionUrl.searchParams.delete(key);
}
export const pool = new Pool({
  connectionString: connectionUrl.toString(),
  ssl: { rejectUnauthorized: isCloudflareRuntime() },
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  ...(isMigrationStaging() ? { options: '-c default_transaction_read_only=on' } : {}),
});
export const db = drizzle({ client: pool, schema });

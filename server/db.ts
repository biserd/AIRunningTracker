import { neon, types } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

types.setTypeParser(types.builtins.TIMESTAMP, (val: string) => new Date(val));
types.setTypeParser(types.builtins.TIMESTAMPTZ, (val: string) => new Date(val));

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle({ client: sql, schema });

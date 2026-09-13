import { buildApplicationSchema,quote,type TableSpec } from './schema';

// User-approved inventory from the immutable isolated import. Any drift stops work.
export const expectedQuarantine:Record<string,number>={activities:364,agent_runs:123,ai_insights:18,
  athlete_profiles:29,coach_recaps:121,deletion_feedback:49,email_jobs:45,funnel_events:74,
  notification_outbox:141,performance_logs:299,routes:10,similar_runs_cache:24,training_plans:13,user_campaigns:35};
export const quarantineTables=()=>buildApplicationSchema().filter(t=>t.name in expectedQuarantine);
export const archiveName=(name:string)=>`migration_quarantine_${name}`;
export const missingOwner=(alias:string)=>`${alias}.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE users.id=${alias}.user_id)`;
export function quarantineDDL(table:TableSpec):string[]{
  const name=quote(table.name),archive=quote(archiveName(table.name));
  const columns=table.columns.map(c=>quote(c.name)).join(',');
  if(!table.columns.some(c=>c.name==='id'))throw new Error('QUARANTINE_ID_REQUIRED');
  return [
    `CREATE TABLE IF NOT EXISTS ${archive} AS SELECT ${columns} FROM ${name} WHERE 0`,
    `CREATE UNIQUE INDEX IF NOT EXISTS ${quote(archiveName(table.name)+'_id')} ON ${archive}(id)`,
    // The INSERT and DELETE are one SQLite statement/transaction. No serialization,
    // payload logs, network copies, or non-atomic copy-then-delete operation.
    `CREATE TRIGGER IF NOT EXISTS ${quote('quarantine_'+table.name)} BEFORE DELETE ON ${name}
      WHEN ${missingOwner('OLD')} BEGIN
      INSERT INTO ${archive}(${columns}) VALUES(${table.columns.map(c=>`OLD.${quote(c.name)}`).join(',')});
      END`,
  ];
}

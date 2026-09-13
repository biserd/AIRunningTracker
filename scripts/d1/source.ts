import pg from 'pg';
import { buildApplicationSchema, quote } from './schema';
import { validateExclusions, type ActivityExclusion } from '../../server/d1/activityPolicy';

export async function openReadOnlySource() {
  const raw = process.env.D1_SOURCE_DATABASE_URL;
  if (!raw) throw new Error('D1_SOURCE_DATABASE_URL_REQUIRED');
  const url = new URL(raw);
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') throw new Error('INVALID_SOURCE_PROTOCOL');
  if (!url.hostname.endsWith('.neon.tech')) throw new Error('SOURCE_MUST_BE_NEON');
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'options']) url.searchParams.delete(key);
  // Timestamp-without-time-zone fields in the existing app represent UTC.
  pg.types.setTypeParser(1114, value => new Date(value.replace(' ', 'T') + 'Z'));
  const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL timezone='UTC'");
    await client.query("SET LOCAL statement_timeout='30s'");
  } catch(error) {await client.end().catch(()=>{});throw error;}
  return client;
}

export async function inspectSource(client: pg.Client) {
  const { rows: settings } = await client.query('SHOW transaction_read_only');
  if (settings[0].transaction_read_only !== 'on') throw new Error('SOURCE_NOT_READ_ONLY');
  const { rows: columns } = await client.query<{ table_name: string; column_name: string }>(
    "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
  const tables = buildApplicationSchema();
  const differences: { table: string; sourceOnly: string[]; targetOnly: string[] }[] = [];
  for (const table of tables) {
    const source = columns.filter(c => c.table_name === table.name).map(c => c.column_name);
    const target = table.columns.map(c => c.name);
    const sourceOnly = source.filter(c => !target.includes(c));
    const targetOnly = target.filter(c => !source.includes(c));
    if (sourceOnly.length || targetOnly.length) differences.push({ table: table.name, sourceOnly, targetOnly });
  }
  const { rows } = await client.query<ActivityExclusion>(`SELECT id AS "activityId",user_id AS "userId",strava_id AS "stravaId",
    (coalesce(octet_length(streams_data),0)+coalesce(octet_length(laps_data),0)+
     coalesce(octet_length(detailed_polyline),0)+coalesce(octet_length(polyline),0)) AS "payloadBytes"
    FROM public.activities WHERE coalesce(octet_length(streams_data),0)+coalesce(octet_length(laps_data),0)+
    coalesce(octet_length(detailed_polyline),0)+coalesce(octet_length(polyline),0)>2000000 ORDER BY id`);
  const exclusions = validateExclusions(rows);
  const activity=tables.find(table=>table.name==='activities')!;
  const sizeSql=String(64+activity.columns.length*9)+' + '+activity.columns.map(column=>{
    if(['integer','real','boolean'].includes(column.kind))return `CASE WHEN ${quote(column.name)} IS NULL THEN 0 ELSE 8 END`;
    if(column.kind==='timestamp')return `CASE WHEN ${quote(column.name)} IS NULL THEN 0 ELSE 24 END`;
    return `coalesce(octet_length(${quote(column.name)}::text),0)`;
  }).join(' + ');
  const {rows:sizeRows}=await client.query(`SELECT max(${sizeSql}) AS max_retained_record_bytes FROM public.activities WHERE id<>ALL($1::int[])`,[exclusions.map(row=>row.activityId)]);
  const maxRetainedBytes=Number(sizeRows[0].max_retained_record_bytes);
  if(maxRetainedBytes>1_998_000)throw new Error('RETAINED_ACTIVITY_REQUIRES_REVIEW');
  const { rows: counts } = await client.query("SELECT schemaname,count(*)::int AS tables FROM pg_stat_user_tables GROUP BY schemaname ORDER BY schemaname");
  return { tables, differences, exclusions, counts, maxRetainedBytes };
}

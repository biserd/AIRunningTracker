import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { openReadOnlySource, inspectSource } from './source';
import { encodeRow, quote, insertStatement, type TableSpec, type ColumnSpec } from './schema';
import { migrationTarget } from './target';
import { bulkStatement } from './bulk';
import { assertActivityFits, transformActivityReferences, recordBytes } from '../../server/d1/activityPolicy';

// Deliberately no production switch, no source UPDATE/DELETE, and no provider requests.
if (process.argv[2] !== '--execute-isolated-target') throw new Error('EXPLICIT_IMPORT_MODE_REQUIRED');
const target = migrationTarget();
const runId = randomUUID();
type TableReport = { source: number; inserted: number; omitted: number; transformed: number; sha256: string; reasons: Record<string,number> };
const manifest: {tables:Record<string,TableReport>; stripe:Record<string,number>; exclusions:number; stage:string} = {
  tables:{},stripe:{},exclusions:0,stage:'starting',
};
let nextRequestAt = 0;
const pendingWrites=new Set<Promise<void>>();
let writeFailure:unknown;
async function query(sql:string,params:(string|number|null)[] = []) {
  // Administrative API budget. Runtime code must use bindings, not this helper.
  const slot=Math.max(Date.now(),nextRequestAt);
  nextRequestAt=slot+300;
  const remaining=slot-Date.now();
  if (remaining>0) await new Promise(resolve=>setTimeout(resolve,remaining));
  return (await target.query([{sql,params}]))[0].results;
}
const extraColumn = (name:string,kind:ColumnSpec['kind'],nullable=true):ColumnSpec=>({name,kind,nullable});
const extras:TableSpec[] = [
  {name:'coach_message_feedback',ddl:'',indexes:[],columns:[extraColumn('id','integer',false),extraColumn('user_id','integer',false),extraColumn('notification_id','integer',false),extraColumn('rating','text',false),extraColumn('reason','text'),extraColumn('created_at','timestamp')]},
  {name:'cloudflare_jobs',ddl:'',indexes:[],columns:[extraColumn('id','text',false),extraColumn('user_id','integer',false),extraColumn('type','text',false),extraColumn('data','json',false),extraColumn('priority','integer',false),extraColumn('created_at','timestamp',false),extraColumn('scheduled_at','timestamp',false),extraColumn('attempts','integer',false),extraColumn('max_attempts','integer',false),extraColumn('status','text',false),extraColumn('lease_owner','text'),extraColumn('lease_until','timestamp'),extraColumn('finished_at','timestamp'),extraColumn('error_code','text')]},
];

let runCreated = false;
try {
  const client=await openReadOnlySource();
  try {
    const inspected=await inspectSource(client);
    if(inspected.differences.length) throw new Error('SOURCE_SCHEMA_DRIFT');
    const specs=[...inspected.tables,...extras];
    const allPublic=await client.query<{tablename:string}>("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    if(allPublic.rows.some(t=>!specs.some(s=>s.name===t.tablename)) || allPublic.rows.length!==specs.length) throw new Error('UNMAPPED_SOURCE_TABLE');
    // A partial earlier run is never silently overwritten or resumed from a different snapshot.
    for(const table of [...specs,{name:'migration_runs'},{name:'migration_stripe_snapshot'},{name:'migration_activity_exclusions'}]) {
      const result=await query(`SELECT count(*) AS n FROM ${quote(table.name)}`);
      if(Number(result[0].n)!==0) throw new Error('TARGET_NOT_EMPTY');
    }
    const excluded=new Set(inspected.exclusions.map(r=>r.activityId));
    const affected=new Set(inspected.exclusions.map(r=>r.userId));
    manifest.exclusions=excluded.size;
    const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
    await query('INSERT INTO migration_runs(id,source_commit,status,started_at,manifest_json) VALUES(?,?,?,?,?)',[runId,commit,'importing',new Date().toISOString(),JSON.stringify(manifest)]);
    runCreated=true;
    // Topological ordering based on actual source foreign keys, not guessed table order.
    const {rows:edges}=await client.query<{child:string;parent:string}>(`SELECT child.relname child,parent.relname parent FROM pg_constraint f
      JOIN pg_class child ON child.oid=f.conrelid JOIN pg_class parent ON parent.oid=f.confrelid
      JOIN pg_namespace n ON n.oid=child.relnamespace WHERE f.contype='f' AND n.nspname='public'`);
    const pending=[...specs],ordered:TableSpec[]=[];
    while(pending.length) {
      const index=pending.findIndex(t=>edges.filter(e=>e.child===t.name).every(e=>ordered.some(o=>o.name===e.parent)));
      if(index<0) throw new Error('SOURCE_FOREIGN_KEY_CYCLE');
      ordered.push(pending.splice(index,1)[0]);
    }
    for(const table of ordered) {
      manifest.stage=table.name;
      const report:TableReport={source:0,inserted:0,omitted:0,transformed:0,sha256:'',reasons:{}};
      manifest.tables[table.name]=report;
      const hash=createHash('sha256');
      let batch:Record<string,unknown>[]=[],batchBytes=2;
      let nextProgress=5000;
      const flush=async()=>{
        if(writeFailure)throw writeFailure;
        if(!batch.length)return;
        const statement=bulkStatement(table,batch);
        const count=batch.length;
        batch=[];batchBytes=2;
        const pending=query(statement.sql,statement.params).then(()=>{
          report.inserted+=count;
          if(report.inserted>=nextProgress){
            console.log(JSON.stringify({table:table.name,importedSoFar:report.inserted}));
            nextProgress=report.inserted+5000;
          }
        },error=>{writeFailure=error;}).finally(()=>pendingWrites.delete(pending));
        pendingWrites.add(pending);
        if(pendingWrites.size>=3)await Promise.race(pendingWrites);
        if(writeFailure)throw writeFailure;
      };
      // Parameterized array prevents transferring the oversized streams to this process.
      if(table.name==='activities') {
        await client.query(`DECLARE source_rows NO SCROLL CURSOR FOR SELECT * FROM public.activities WHERE id<>ALL($1::int[]) ORDER BY id`,[[...excluded]]);
        report.source=excluded.size; report.omitted=excluded.size;
        report.reasons.oversized_activity_left_in_neon=excluded.size;
      } else await client.query(`DECLARE source_rows NO SCROLL CURSOR FOR SELECT * FROM public.${quote(table.name)}`);
      while(true) {
        const result=await client.query('FETCH FORWARD 100 FROM source_rows');
        if(!result.rows.length)break;
        for(const source of result.rows) {
          report.source++;
          const transformed=transformActivityReferences(table.name,source,excluded,affected);
          if(transformed.reason)report.reasons[transformed.reason]=(report.reasons[transformed.reason]||0)+1;
          if(!transformed.row){report.omitted++;continue;}
          if(transformed.reason)report.transformed++;
          const encoded=encodeRow(table,transformed.row);
          if(table.name==='activities')assertActivityFits(encoded);
          if(recordBytes(encoded)>1_998_000)throw new Error('UNEXPECTED_OVERSIZED_ROW');
          const text=JSON.stringify(encoded),bytes=Buffer.byteLength(text)+1;
          if(bytes>1_750_000){
            await flush();
            const statement=insertStatement(table,[encoded]);
            await query(statement.sql,statement.params);
            report.inserted++;hash.update(text+'\n');
            continue;
          }
          if(batchBytes+bytes>1_750_000 || batch.length>=1000)await flush();
          batch.push(encoded);batchBytes+=bytes;hash.update(text+'\n');
        }
      }
      await flush();await Promise.all(pendingWrites);
      if(writeFailure)throw writeFailure;
      await client.query('CLOSE source_rows');
      const actual=await query(`SELECT count(*) AS n FROM ${quote(table.name)}`);
      if(Number(actual[0].n)!==report.inserted)throw new Error('TARGET_COUNT_MISMATCH');
      report.sha256=hash.digest('hex');
      if(table.name==='users') {
        for(const row of inspected.exclusions)await query('INSERT INTO migration_activity_exclusions(activity_id,user_id,strava_id,payload_bytes) VALUES(?,?,?,?)',[row.activityId,row.userId,row.stravaId,row.payloadBytes]);
      }
      await query('UPDATE migration_runs SET manifest_json=? WHERE id=?',[JSON.stringify(manifest),runId]);
      console.log(JSON.stringify({table:table.name,source:report.source,inserted:report.inserted,omitted:report.omitted,transformed:report.transformed}));
    }
    manifest.stage='stripe_archive';
    const stripeTables=await client.query<{schemaname:string;tablename:string}>("SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('stripe','_system') ORDER BY schemaname,tablename");
    for(const {schemaname,tablename} of stripeTables.rows) {
      let ordinal=0;
      const label=`${schemaname}.${tablename}`;
      await client.query(`DECLARE source_rows NO SCROLL CURSOR FOR SELECT row_to_json(t)::text AS payload FROM ${quote(schemaname)}.${quote(tablename)} t`);
      const table={name:'migration_stripe_snapshot',columns:[extraColumn('source_table','text'),extraColumn('source_ordinal','integer'),extraColumn('payload_json','text')]};
      while(true) {
        const result=await client.query<{payload:string}>('FETCH FORWARD 100 FROM source_rows');
        if(!result.rows.length)break;
        let batch:Record<string,unknown>[]=[],bytes=2;
        const flush=async()=>{
          if(!batch.length)return;
          const statement=bulkStatement(table,batch);
          await query(statement.sql,statement.params);batch=[];bytes=2;
        };
        for(const row of result.rows) {
          const encoded={source_table:label,source_ordinal:++ordinal,payload_json:row.payload};
          const size=Buffer.byteLength(JSON.stringify(encoded))+1;
          if(bytes+size>1_750_000)await flush();
          if(size>1_750_000)throw new Error('BILLING_ARCHIVE_ROW_REQUIRES_REVIEW');
          batch.push(encoded);bytes+=size;
        }
        await flush();
      }
      await client.query('CLOSE source_rows');manifest.stripe[label]=ordinal;
      const copied=await query('SELECT count(*) n FROM migration_stripe_snapshot WHERE source_table=?',[label]);
      if(Number(copied[0].n)!==ordinal)throw new Error('BILLING_ARCHIVE_COUNT_MISMATCH');
      console.log(JSON.stringify({archivedTable:label,rows:ordinal}));
    }
    // Preserve allocation high-water marks, including omitted/deleted source IDs.
    const sequences=await client.query<{table_name:string;last_value:string|null}>(`SELECT c.table_name,s.last_value::text
      FROM information_schema.columns c JOIN pg_sequences s
      ON pg_get_serial_sequence(format('%I.%I',c.table_schema,c.table_name),c.column_name)=format('%I.%I',s.schemaname,s.sequencename)
      WHERE c.table_schema='public' AND c.column_name='id' AND c.column_default LIKE 'nextval%'`);
    for(const sequence of sequences.rows){
      const value=Number(sequence.last_value||0);
      if(!Number.isSafeInteger(value))throw new Error('UNSAFE_SOURCE_SEQUENCE');
      await query('UPDATE sqlite_sequence SET seq=max(seq,?) WHERE name=?',[value,sequence.table_name]);
      await query('INSERT INTO sqlite_sequence(name,seq) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM sqlite_sequence WHERE name=?)',[sequence.table_name,value,sequence.table_name]);
    }
    // Full FK check, plus application-level references absent from the legacy FK schema.
    manifest.stage='integrity_checks';
    const violations=await query('PRAGMA foreign_key_check');
    if(violations.length)throw new Error('FOREIGN_KEY_CHECK_FAILED');
    const orphans=await query('SELECT count(*) AS n FROM activities a LEFT JOIN users u ON u.id=a.user_id WHERE u.id IS NULL');
    if(Number(orphans[0].n))throw new Error('ACTIVITY_OWNER_MISSING');
    manifest.stage='snapshot_imported_runtime_not_ready';
    await query('UPDATE migration_runs SET status=?,completed_at=?,manifest_json=? WHERE id=?',['verifying',new Date().toISOString(),JSON.stringify(manifest),runId]);
    console.log('SNAPSHOT_IMPORTED_RUNTIME_NOT_READY');
  } finally {await client.query('ROLLBACK');await client.end();}
} catch(error) {
  await Promise.all(pendingWrites);
  if(runCreated)await query('UPDATE migration_runs SET status=?,manifest_json=? WHERE id=?',['failed',JSON.stringify(manifest),runId]).catch(()=>{});
  console.error(error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)?error.message:'MIGRATION_FAILED_DETAILS_REDACTED');
  process.exitCode=1;
}

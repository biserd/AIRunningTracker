import { migrationTarget } from './target';
import { quote } from './schema';
import { archiveName,expectedQuarantine,missingOwner,quarantineDDL,quarantineTables } from './quarantine-policy';

if(!process.argv.includes('--execute-approved-quarantine'))throw new Error('EXPLICIT_QUARANTINE_MODE_REQUIRED');
const target=migrationTarget();
async function rows(sql:string,params:(string|number|null)[]=[]){return (await target.query([{sql,params}]))[0].results;}
async function count(sql:string){return Number((await rows(sql))[0].n);}
try {
  const runs=await rows('SELECT id,status,manifest_json FROM migration_runs');
  if(runs.length!==1||!['failed','verifying'].includes(String(runs[0].status)))throw new Error('ISOLATED_SNAPSHOT_REQUIRED');
  const manifest=JSON.parse(String(runs[0].manifest_json));
  if(!['integrity_checks','snapshot_imported_runtime_not_ready'].includes(manifest.stage))throw new Error('WRONG_MIGRATION_STAGE');
  const tables=quarantineTables();
  if(tables.length!==14)throw new Error('QUARANTINE_SCHEMA_DRIFT');
  // Create empty archives and atomic preservation triggers before any row removal.
  for(const table of tables)for(const sql of quarantineDDL(table))await rows(sql);
  for(const table of tables){
    for(const name of [table.name,archiveName(table.name)]){
      const columns=(await rows(`PRAGMA table_info(${quote(name)})`)).map(c=>c.name);
      if(JSON.stringify(columns)!==JSON.stringify(table.columns.map(c=>c.name)))throw new Error('QUARANTINE_COLUMNS_CHANGED');
    }
    const archived=await count(`SELECT count(*) n FROM ${quote(archiveName(table.name))}`);
    const missing=await count(`SELECT count(*) n FROM ${quote(table.name)} a WHERE ${missingOwner('a')}`);
    const active=await count(`SELECT count(*) n FROM ${quote(table.name)}`);
    if(missing+archived!==expectedQuarantine[table.name]||active+archived!==manifest.tables[table.name]?.inserted)throw new Error('QUARANTINE_INVENTORY_CHANGED');
  }
  for(const table of tables){
    // Fixed target, fixed table inventory, exact missing-owner predicate. The archive
    // INSERT must succeed before SQLite can remove a row from the active table.
    await rows(`DELETE FROM ${quote(table.name)} WHERE ${missingOwner(quote(table.name))}`);
    const archived=await count(`SELECT count(*) n FROM ${quote(archiveName(table.name))}`);
    const active=await count(`SELECT count(*) n FROM ${quote(table.name)}`);
    if(archived!==expectedQuarantine[table.name]||active+archived!==manifest.tables[table.name].inserted)throw new Error('QUARANTINE_RECONCILIATION_FAILED');
    console.log(JSON.stringify({table:table.name,quarantined:archived,active,preserved:true}));
  }
  if((await rows('PRAGMA foreign_key_check')).length)throw new Error('QUARANTINE_FOREIGN_KEY_CHECK_FAILED');
  manifest.quarantine={reason:'missing_account',tables:expectedQuarantine,total:1345,completedAt:new Date().toISOString()};
  manifest.stage='snapshot_imported_runtime_not_ready';
  await rows('UPDATE migration_runs SET status=?,completed_at=?,manifest_json=? WHERE id=?',
    ['verifying',new Date().toISOString(),JSON.stringify(manifest),String(runs[0].id)]);
  console.log('QUARANTINE_COMPLETE_RUNTIME_NOT_READY');
} catch(error){
  console.error(error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:'QUARANTINE_FAILED_DETAILS_REDACTED');
  process.exitCode=1;
}

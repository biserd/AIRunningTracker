import { migrationTarget } from './target';
import { buildApplicationSchema, quote } from './schema';

// Recovery only for this isolated target's initial failed activity import.
// Never reads or writes Neon. Refuses any other stage or already imported account data.
const target=migrationTarget();
const results=await target.query([{sql:'SELECT id,status,manifest_json FROM migration_runs'}]);
const runs=results[0].results;
if(runs.length!==1)throw new Error('NOT_SINGLE_FAILED_IMPORT');
const manifest=JSON.parse(String(runs[0].manifest_json));
const stoppedAuthFailure=process.argv[2]==='--stopped-import-auth-failure' && runs[0].status==='importing'
  && manifest.stage==='starting' && Object.keys(manifest.tables).length===0;
if(stoppedAuthFailure)manifest.stage='activities';
else if(runs[0].status!=='failed')throw new Error('NOT_SINGLE_FAILED_IMPORT');
if(manifest.stage!=='activities'||Object.keys(manifest.tables).some(table=>table!=='activities'))throw new Error('NOT_INITIAL_ACTIVITY_FAILURE');
for(const name of [...buildApplicationSchema().filter(t=>t.name!=='activities').map(t=>t.name),'cloudflare_jobs','coach_message_feedback','migration_activity_exclusions','migration_stripe_snapshot']){
  const result=await target.query([{sql:`SELECT count(*) AS n FROM ${quote(name)}`}]);
  if(Number(result[0].results[0].n))throw new Error('OTHER_TARGET_DATA_EXISTS');
}
const count=await target.query([{sql:'SELECT count(*) AS n FROM activities'}]);
if(stoppedAuthFailure)await target.query([{sql:'UPDATE migration_runs SET status=?,manifest_json=? WHERE id=?',params:['failed',JSON.stringify(manifest),String(runs[0].id)]}]);
await target.query([{sql:'DELETE FROM activities'}]);
await target.query([{sql:'DELETE FROM migration_runs WHERE id=? AND status=?',params:[String(runs[0].id),'failed']}]);
console.log(JSON.stringify({discardedPartialActivityCopies:count[0].results[0].n,sourceUnchanged:true}));

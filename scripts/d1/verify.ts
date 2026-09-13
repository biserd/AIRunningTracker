import { migrationTarget } from './target';
import { buildApplicationSchema, quote } from './schema';

// Independent read-only target checks. This does not certify runtime readiness,
// compare complete payload hashes, mutate status, or connect to the source.
const target=migrationTarget();
async function rows(sql:string,params:(string|number|null)[]=[]){
  return (await target.query([{sql,params}]))[0].results;
}
async function count(sql:string,params:(string|number|null)[]=[]){
  return Number((await rows(sql,params))[0].n);
}
try {
  const runs=await rows('SELECT status,manifest_json FROM migration_runs');
  const inspectFailure=process.argv.includes('--inspect-failed-integrity');
  if(runs.length!==1||(runs[0].status!=='verifying'&&!(inspectFailure&&runs[0].status==='failed')))throw new Error('COMPLETED_SNAPSHOT_REQUIRED');
  const manifest=JSON.parse(String(runs[0].manifest_json));
  if(manifest.stage!=='snapshot_imported_runtime_not_ready'&&!(inspectFailure&&manifest.stage==='integrity_checks'))throw new Error('INCOMPLETE_SNAPSHOT');
  const names=[...buildApplicationSchema().map(t=>t.name),'coach_message_feedback','cloudflare_jobs'];
  let total=0;
  for(const name of names){
    const expected=manifest.tables[name];
    if(!expected||!Number.isSafeInteger(expected.inserted))throw new Error('INVALID_MANIFEST');
    const actual=await count(`SELECT count(*) n FROM ${quote(name)}`);
    if(actual!==expected.inserted||expected.source!==expected.inserted+expected.omitted)throw new Error('COUNT_MISMATCH');
    total+=actual;
    console.log(JSON.stringify({table:name,rows:actual,countVerified:true}));
  }
  for(const [table,expected] of Object.entries(manifest.stripe)){
    if(await count('SELECT count(*) n FROM migration_stripe_snapshot WHERE source_table=?',[table])!==expected)throw new Error('ARCHIVE_COUNT_MISMATCH');
  }
  if(await count('SELECT count(*) n FROM migration_activity_exclusions')!==33)throw new Error('EXCLUSION_COUNT_MISMATCH');
  const checks:Record<string,string>={
    excluded_activity_present:'SELECT count(*) n FROM activities a JOIN migration_activity_exclusions e ON a.id=e.activity_id OR (a.user_id=e.user_id AND a.strava_id=e.strava_id)',
    activity_owner_missing:'SELECT count(*) n FROM activities a LEFT JOIN users u ON u.id=a.user_id WHERE u.id IS NULL',
    excluded_plan_link:'SELECT count(*) n FROM plan_days d JOIN migration_activity_exclusions e ON d.linked_activity_id=e.activity_id',
    excluded_agent_link:'SELECT count(*) n FROM agent_runs a JOIN migration_activity_exclusions e ON a.activity_id=e.activity_id',
  };
  for(const table of ['activity_features','activity_route_map','similar_runs_cache','coach_recaps']){
    checks[`${table}_excluded_link`]=`SELECT count(*) n FROM ${quote(table)} a JOIN migration_activity_exclusions e ON a.activity_id=e.activity_id`;
  }
  let referencesValid=true;
  for(const [name,sql] of Object.entries(checks)){
    const violations=await count(sql);
    if(violations)referencesValid=false;
    console.log(JSON.stringify({check:name,passed:violations===0,violations}));
  }
  if((await rows('PRAGMA foreign_key_check')).length)throw new Error('FOREIGN_KEY_CHECK_FAILED');
  console.log(JSON.stringify({applicationTables:names.length,applicationRows:total,excludedActivities:33,
    result:referencesValid?'COUNTS_AND_REFERENCES_VERIFIED':'COUNTS_VERIFIED_REFERENCES_REQUIRE_REVIEW',fullPayloadHashesVerified:false,runtimeReady:false}));
  if(!referencesValid)process.exitCode=1;
} catch(error){
  console.error(error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:'VERIFICATION_FAILED_DETAILS_REDACTED');
  process.exitCode=1;
}

import { migrationTarget } from './target';
import { buildApplicationSchema,quote } from './schema';
const target=migrationTarget();
try {
  for(const [check,sql] of Object.entries({
    state:"SELECT status,json_extract(manifest_json,'$.stage') stage FROM migration_runs",
    orphan_activities:'SELECT count(*) count,count(DISTINCT a.user_id) missing_owners FROM activities a LEFT JOIN users u ON u.id=a.user_id WHERE u.id IS NULL',
    users:'SELECT count(*) count FROM users',
    activities:'SELECT count(*) count FROM activities',
  })){
    const result=(await target.query([{sql}]))[0].results;
    console.log(JSON.stringify({check,result}));
  }
  for(const table of buildApplicationSchema().filter(t=>t.columns.some(c=>c.name==='user_id'))){
    const sql=`SELECT count(*) count FROM ${quote(table.name)} a LEFT JOIN users u ON u.id=a.user_id WHERE a.user_id IS NOT NULL AND u.id IS NULL`;
    const result=(await target.query([{sql}]))[0].results;
    if(Number(result[0].count)>0)console.log(JSON.stringify({check:'missing_user_reference',table:table.name,count:Number(result[0].count)}));
  }
} catch {console.error('INTEGRITY_DIAGNOSTIC_FAILED');process.exitCode=1;}

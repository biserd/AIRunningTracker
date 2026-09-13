import { migrationTarget } from './target';
try {
  const results = await migrationTarget().query([{sql:'SELECT count(*) AS application_tables FROM sqlite_master WHERE type=\'table\''}]);
  console.log(JSON.stringify({connected:true, results:results.map(r => r.results)}));
} catch(error) { console.error(error instanceof Error && /^[A-Z_0-9]+$/.test(error.message) ? error.message : 'TARGET_PROBE_FAILED'); process.exitCode=1; }

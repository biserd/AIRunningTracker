import { openReadOnlySource, inspectSource } from './source';
try {
  const client = await openReadOnlySource();
  try {
    const result = await inspectSource(client);
    // Never print runner rows, tokens or connection strings.
    console.log(JSON.stringify({ readOnly: true, schemas: result.counts,
      exclusions: result.exclusions.length, maxRetainedBytes:result.maxRetainedBytes, schemaDifferences: result.differences }, null, 2));
  } finally { await client.query('ROLLBACK'); await client.end(); }
} catch (error) {
  const safe = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'SOURCE_INSPECTION_FAILED';
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    && /^[A-Z0-9_]+$/.test(error.code) ? error.code : 'UNKNOWN';
  console.error(`${safe}:${code}`);
  process.exitCode = 1;
}

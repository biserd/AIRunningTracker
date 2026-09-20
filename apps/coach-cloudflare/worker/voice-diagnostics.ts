import { AIError } from './openai';

export type VoiceStage = 'account_context' | 'training_context' | 'dispatch' | 'job_lookup' | 'job_claim' | 'burst_limit' | 'state_decode' | 'lease_rpc' | 'lease_storage' | 'job_complete' | 'job_cleanup' | 'provider_session' | 'provider_response' | 'control_attach' | 'ready';

// Never serialize errors, messages, request bodies or identifiers.
export function voiceDiagnostic(stage: VoiceStage, started: number, error?: unknown) {
  const upstreamStatus = error instanceof AIError && Number.isInteger(error.upstreamStatus)
    && error.upstreamStatus! >= 100 && error.upstreamStatus! <= 599 ? error.upstreamStatus : undefined;
  const reason = error === undefined ? 'success'
    : upstreamStatus ? 'upstream_http'
    : error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout_or_abort'
    : error instanceof SyntaxError ? 'invalid_json'
    : error instanceof TypeError ? 'transport_or_type_error'
    : 'setup_failed';
  const failureClass = error instanceof Error && /D1_ERROR|SQLITE_ERROR|no such (table|column)/i.test(error.message) ? 'database'
    : error instanceof Error && /RPC|serializ|clone/i.test(error.message) ? 'rpc_or_serialization'
    : error instanceof Error && /getByName|binding/i.test(error.message) ? 'binding'
    : 'unclassified';
  const record = { event: 'voice_setup', stage, reason, ...(error === undefined ? {} : {failureClass}), ...(error instanceof AIError ? {httpStatus:error.status} : {}), elapsedMs: Math.max(0, Date.now() - started), ...(upstreamStatus ? { upstreamStatus } : {}), ...(error instanceof AIError && error.providerCode ? {providerCode:error.providerCode} : {}) };
  if (error === undefined) console.info(JSON.stringify(record));
  else console.error(JSON.stringify(record));
  return record;
}

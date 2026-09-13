import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const account = '73d71a2bef58f7469ecb48e2b8e84c0e';
export const targetDatabase = '5ee1a1a5-44a5-42c9-aa74-d12fe63b08f2';

export type Statement = { sql: string; params?: (string | number | null)[] };
type Result = { success: boolean; results: Record<string, unknown>[]; meta?: { changes?: number } };

/** Administrative migration process only. Never import into a deployed Worker. */
export function migrationTarget() {
  const appData = process.env.APPDATA;
  const readToken=()=>process.env.CLOUDFLARE_API_TOKEN || (appData
    ? readFileSync(join(appData,'xdg.config','.wrangler','config','default.toml'),'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)?.[1]
    : undefined);
  if (!readToken()) throw new Error('CLOUDFLARE_CREDENTIAL_REQUIRED');
  async function query(statements: Statement[]): Promise<Result[]> {
    if (!statements.length) return [];
    if (statements.length !== 1) throw new Error('ONE_REST_STATEMENT_REQUIRED');
    let token=readToken();
    const send=()=>fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${targetDatabase}/query`, {
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
      body:JSON.stringify(statements[0]), signal:AbortSignal.timeout(35000),
    });
    let response=await send();
    // A definite authorization rejection did not execute SQL. Refresh the existing
    // Wrangler login once; never retry timeouts or uncertain write failures.
    if((response.status===401||response.status===403)&&!process.env.CLOUDFLARE_API_TOKEN){
      if(readToken()===token){
        execFileSync(process.execPath,['apps/api-cloudflare/node_modules/wrangler/bin/wrangler.js','whoami'],{stdio:'ignore',timeout:30000});
      }
      token=readToken();response=await send();
    }
    // Fail closed on uncertain writes. Never log the response body or SQL bindings.
    if (!response.ok) throw new Error(`TARGET_HTTP_${response.status}`);
    const payload = await response.json() as { success: boolean; result: Result[] };
    if (!payload.success || !Array.isArray(payload.result) || payload.result.some(result => !result.success)) {
      throw new Error('TARGET_QUERY_FAILED');
    }
    return payload.result;
  }
  return {query};
}

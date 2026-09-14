import { boundedJSON, AIError } from "./openai";
import type { State } from "../shared/coach";

const origin = "https://aitracker.run";
const cookie = "__Host-coach_account";
export type AccountSnapshot = {
  runner: { id: number; name: string; timezone: string; unitPreference: string };
  canUseAI: boolean;
  state: State;
};
export function accountToken(request: Request) {
  const token = request.headers.get("Cookie")?.split(";").map(x=>x.trim())
    .find(x=>x.startsWith(cookie+"="))?.slice(cookie.length+1);
  return token && token.length < 8000 && /^[A-Za-z0-9_.-]+$/.test(token) ? token : null;
}
function sessionCookie(token: string, maxAge = 604800) {
  return `${cookie}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}
async function backend(env: Env, path: string, body?: unknown, token?: string) {
  let response: Response;
  try { response = await env.BACKEND.fetch(origin+path, {
    // Workers supports manual/follow only. Reject non-2xx below instead of
    // following redirects, which could forward credentials to another origin.
    method: body === undefined ? "GET" : "POST", redirect: "manual",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
    signal: AbortSignal.timeout(15000),
  }); } catch(e) {
    const name=e instanceof Error ? e.name : 'unknown';
    console.error(JSON.stringify({event:'coach_auth_transport_failed',errorType:['TypeError','TimeoutError','AbortError'].includes(name)?name:'other'}));
    throw new AIError('AITracker sign-in could not connect. Please retry.',503);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new AIError(response.status === 401 || response.status === 400 ? "Sign-in failed. Check your details or request a new email link." : "AITracker is temporarily unavailable. Please retry.",
      response.status === 401 || response.status === 400 ? 401 : 503);
  }
  try {return await boundedJSON(response, 300000);} catch {
    console.error(JSON.stringify({event:'coach_auth_response_invalid',status:response.status,json:response.headers.get('content-type')?.includes('application/json')===true,encoded:response.headers.has('content-encoding')}));
    throw new AIError('AITracker returned an invalid sign-in response. Please retry.',503);
  }
}
export async function loadAccount(env: Env, token: string): Promise<AccountSnapshot> {
  const data = await backend(env, "/api/coach/experience", undefined, token) as AccountSnapshot;
  if (!Number.isSafeInteger(data.runner?.id) || data.runner.id < 1 ||
      data.state?.source !== "production_account" || !Array.isArray(data.state.activities) || !Array.isArray(data.state.days))
    throw new AIError("Running data is unavailable. Please retry.");
  return data;
}
export async function accountAction(env: Env, path: string, input: Record<string, unknown>) {
  if (path === "/api/account/logout") return new Response(JSON.stringify({ok:true}), {
    headers: {"Content-Type":"application/json","Set-Cookie":sessionCookie("",0),"Cache-Control":"no-store"},
  });
  if (path === "/api/account/email") {
    if (typeof input.email !== "string" || input.email.length > 254) throw new AIError("Enter your account email.",400);
    await backend(env, "/api/auth/magic-link/request", {email:input.email,client:"coach"});
    return Response.json({ok:true}, {headers:{"Cache-Control":"no-store"}});
  }
  let result: {token?: string};
  if (path === "/api/account/login") {
    if (typeof input.email !== "string" || typeof input.password !== "string" || input.email.length > 254 || input.password.length > 1024)
      throw new AIError("Enter your email and password.",400);
    result = await backend(env, "/api/auth/login", {email:input.email,password:input.password}) as typeof result;
  } else if (path === "/api/account/verify") {
    if (typeof input.token !== "string" || input.token.length > 4000) throw new AIError("Invalid sign-in link.",400);
    result = await backend(env, "/api/auth/magic-link/verify", {token:input.token}) as typeof result;
  } else throw new AIError("Not found",404);
  if (!result.token || !/^[A-Za-z0-9_.-]+$/.test(result.token) || result.token.length > 8000)
    throw new AIError("Sign-in could not finish.");
  // Validate with the primary backend; do not trust a browser-supplied runner ID.
  await loadAccount(env,result.token);
  return Response.json({ok:true}, {headers:{"Set-Cookie":sessionCookie(result.token),"Cache-Control":"no-store"}});
}

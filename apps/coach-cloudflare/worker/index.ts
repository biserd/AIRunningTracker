import { changePlan, type State, type Change } from "../shared/coach";
import { aiRoute, history } from "./ai";
import { accountAction, accountToken, loadAccount } from "./account";
import {trainingContext} from './training-context';
import {confirmPlan} from './plan-actions';
import {startAuthorization,finishAuthorization} from './whatsapp-oauth';
import { whatsappWebhook, whatsappStatus, whatsappAction, consumeWhatsApp, recoverWhatsApp } from './whatsapp';
import { AIError, boundedJSON } from "./openai";
import { waitlistInput, joinWaitlist, leaveWaitlist, deliverLaunch } from "./waitlist";
import {
  reminderAction,
  reminderStatus,
  ReminderError,
  unsubscribe,
  deliverReminders,
} from "./reminders";
export { VoiceLease } from "./voice";
type Row = {
  id: string;
  state: string;
  version: number;
  last_action: string | null;
};
type ProposalRow = {
  id: string;
  before_state: string;
  after_state: string;
  expected_version: number;
  description: string;
};
const lifetime = 60 * 60 * 24 * 7;
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function digest(value: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function limit(env: Env, key: string, max: number, seconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    "INSERT INTO request_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at < ? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at < ? THEN excluded.expires_at ELSE expires_at END RETURNING count",
  )
    .bind(key, now + seconds, now, now)
    .first<{ count: number }>();
  return !!row && row.count <= max;
}
async function api(request: Request, env: Env, ctx:ExecutionContext): Promise<Response> {
  const url = new URL(request.url),
    now = Math.floor(Date.now() / 1000);
  if (['/api/whatsapp/inbound','/api/whatsapp/status'].includes(url.pathname)) return whatsappWebhook(request,env,ctx);
  if (!["GET", "POST"].includes(request.method))
    return json({ error: "Method not allowed" }, 405);
  if (request.method === "POST" && request.headers.get("Origin") !== url.origin)
    return json({ error: "Origin not allowed" }, 403);
  if (url.pathname.startsWith("/api/account/")) {
    if (request.method !== "POST") return json({error:"Method not allowed"},405);
    if (!request.headers.get("Content-Type")?.startsWith("application/json")) return json({error:"JSON required"},415);
    if (!await limit(env, "account:"+await digest(request.headers.get("CF-Connecting-IP") || "local"),20,600)) return json({error:"Please try again later."},429);
    try {
      const input = await boundedJSON(new Response(request.body), 8000);
      if (!input || typeof input !== "object" || Array.isArray(input)) return json({error:"Invalid request"},400);
      return await accountAction(env,url.pathname,input as Record<string,unknown>);
    } catch(e) { return json({error:e instanceof AIError ? e.message : "Sign-in is temporarily unavailable."}, e instanceof AIError ? e.status : 503); }
  }
  if (["/api/waitlist", "/api/waitlist/unsubscribe"].includes(url.pathname)) {
    if (request.method !== "POST") return json({error:"Method not allowed"},405);
    if (!request.headers.get("Content-Type")?.startsWith("application/json")) return json({error:"JSON required"},415);
    if (!(await limit(env, `waitlist:${await digest(request.headers.get("CF-Connecting-IP") || "local")}`, 10, 3600))) return json({error:"Please try again later."},429);
    let input: unknown;
    try { input = await boundedJSON(new Response(request.body), 1024); }
    catch { return json({error:"Invalid request."},400); }
    if (url.pathname.endsWith("/unsubscribe")) {
      const token = input && typeof input === "object" && "token" in input ? input.token : null;
      if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return json({error:"Invalid unsubscribe link."},400);
      await leaveWaitlist(env,token);
    } else {
      let email: string | null;
      try { email = waitlistInput(input); }
      catch { return json({error:"Enter a valid email and agree to the launch email."},400); }
      if (email) await joinWaitlist(env,email);
    }
    return json({ok:true});
  }
  if (
    url.pathname === "/api/reminders/unsubscribe" &&
    request.method === "POST"
  ) {
    if (!request.headers.get("Content-Type")?.startsWith("application/json"))
      return json({ error: "JSON required" }, 415);
    if (
      !(await limit(
        env,
        `optout:${await digest(request.headers.get("CF-Connecting-IP") || "local")}`,
        30,
        60,
      ))
    )
      return json({ error: "Please try later." }, 429);
    try {
      const input = (await boundedJSON(new Response(request.body), 512)) as {
        token?: unknown;
      };
      return json(await unsubscribe(env, input?.token));
    } catch {
      return json({ error: "Invalid unsubscribe request." }, 400);
    }
  }
  if (url.pathname === "/api/session") return json({error:"Sign in with your AITracker account."},401);
  const token = accountToken(request);
  if (!token) return json({error:"Sign in with your AITracker account."},401);
  if (!await limit(env,"account-read:"+await digest(token),120,60)) return json({error:"Please wait before trying again."},429);
  let account;
  try { account = await loadAccount(env,token); }
  catch(e) { return json({error:e instanceof AIError ? e.message : "Your running data could not load."},e instanceof AIError ? e.status : 503); }
  const id = await digest("production-runner:"+account.runner.id);
  if (['/api/ai/chat','/api/ai/voice','/api/ai/plan-confirm','/api/ai/context'].includes(url.pathname) && account.canUseAI) {
    if(!await limit(env,'coach-context:'+id,10,60))return json({error:'Please wait a minute before asking again.'},429);
    account.state.trainingContext=await trainingContext(env,token,account);
  }
  if(url.pathname==='/api/ai/context' && request.method==='GET')return account.canUseAI?json(account.state.trainingContext):json({error:'An active trial or subscription is required.'},403);
  await env.DB.prepare("INSERT INTO sessions(id,state,expires_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state,expires_at=MAX(sessions.expires_at,excluded.expires_at)")
    .bind(id,JSON.stringify(account.state),now+lifetime).run();
  const row = await env.DB.prepare(
    "SELECT id,state,version,last_action FROM sessions WHERE id=? AND expires_at>?",
  )
    .bind(id, now)
    .first<Row>();
  if (!row)
    return json({ error: "Your preview expired. Start a new one." }, 401);
  if (!(await limit(env, `session:${id}`, 120, 60)))
    return json({ error: "Please wait a moment before trying again." }, 429);
  if (url.pathname === "/api/reminders" && request.method === "GET")
    return json(await reminderStatus(env, id));
  if (url.pathname === '/api/whatsapp' && request.method === 'GET') return json(await whatsappStatus(env,id));
  if (url.pathname === "/api/ai/status" && request.method === "GET")
    return json({
      configured: !!env.OPENAI_API_KEY,
      history: await history(env, id),
      models: {
        text: "gpt-6-astra",
        voice: "gpt-live-1",
        image: "gpt-image-2.5-sunburst",
      },
      source: "production_account",
      canUseAI: account.canUseAI,
    });
  if (url.pathname === "/api/state" && request.method === "GET")
    return json({
      state: JSON.parse(row.state),
      version: row.version,
      lastAction: row.last_action,
      runner: account.runner,
      canUseAI: account.canUseAI,
    });
  if (request.method !== "POST") return json({ error: "Not found" }, 404);
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    return json({ error: "JSON required" }, 415);
  const reader = request.body?.getReader();
  let size = 0,
    body = "";
  if (reader) {
    const decoder = new TextDecoder();
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (
        size >
        (url.pathname === "/api/ai/voice"
          ? 26000
          : url.pathname === "/api/ai/chat"
            ? 12000
            : 2048)
      ) {
        await reader.cancel();
        return json({ error: "Request too large" }, 413);
      }
      body += decoder.decode(part.value, { stream: true });
    }
    body += decoder.decode();
  }
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(body);
    if (!input || Array.isArray(input) || typeof input !== "object")
      throw new Error();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const state = JSON.parse(row.state) as State;
  if (["/api/proposals","/api/confirm","/api/undo-proposal"].includes(url.pathname))
    return json({error:"Manage your training plan on aitracker.run/training-plans. No changes were made here."},403);
  if (url.pathname.startsWith("/api/ai/") && url.pathname !== "/api/ai/voice/stop" && !account.canUseAI)
    return json({error:"AI coaching requires an active trial or subscription. Your running data remains available."},403);
  if(url.pathname==='/api/ai/plan-confirm'){
    try {return json(await confirmPlan(env,token,id,account,account.state.trainingContext!,input));}
    catch(e){return json({error:e instanceof AIError?e.message:'Plan action could not be completed.'},e instanceof AIError?e.status:503);}
  }
  if (url.pathname.startsWith('/api/whatsapp/')) {
    try {
      if(url.pathname!=='/api/whatsapp/disconnect'&&!account.canUseAI)return json({error:'An active trial or subscription is required for WhatsApp coaching.'},403);
      if(url.pathname==='/api/whatsapp/authorize'&&input.confirm===true)return json(await startAuthorization(env,id,token));
      if(url.pathname==='/api/whatsapp/finish')return json(await finishAuthorization(env,id,input));
      return json(await whatsappAction(env,id,url.pathname.slice('/api/whatsapp/'.length),input)); }
    catch(e) { return json({error:e instanceof ReminderError?e.message:'WhatsApp unavailable.'},e instanceof ReminderError?e.status:503); }
  }
  if (url.pathname.startsWith("/api/reminders/")) {
    try {
      return json(
        await reminderAction(
          env,
          id,
          url.pathname.slice("/api/reminders/".length),
          input,
          request.headers.get("CF-Connecting-IP") || "local",
        ),
      );
    } catch (e) {
      return json(
        {
          error:
            e instanceof ReminderError
              ? e.message
              : "Reminder request failed. Please try again later.",
        },
        e instanceof ReminderError ? e.status : 503,
      );
    }
  }
  if (url.pathname.startsWith("/api/ai/")) {
    try {
      return json(await aiRoute(request, env, row, input, limit));
    } catch (e) {
      return json(
        {
          error:
            e instanceof AIError ? e.message : "AI is temporarily unavailable.",
        },
        e instanceof AIError ? e.status : 503,
      );
    }
  }
  if (url.pathname === "/api/proposals") {
    if (
      Object.keys(input).some(
        (k) => !["dayId", "kind", "minutes", "date"].includes(k),
      ) ||
      typeof input.dayId !== "string"
    )
      return json({ error: "Invalid adjustment" }, 400);
    try {
      const result = changePlan(state, input as Change),
        proposalId = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO proposals(id,session_id,expected_version,before_state,after_state,description,expires_at) VALUES (?,?,?,?,?,?,?)",
      )
        .bind(
          proposalId,
          id,
          row.version,
          row.state,
          JSON.stringify(result.state),
          result.description,
          now + 600,
        )
        .run();
      return json({
        id: proposalId,
        description: result.description,
        before: state.days,
        after: result.state.days,
      });
    } catch (e) {
      return json(
        { error: e instanceof Error ? e.message : "Invalid adjustment" },
        400,
      );
    }
  }
  if (url.pathname === "/api/undo-proposal") {
    if (input.actionId !== row.last_action)
      return json({ error: "Only your latest change can be undone." }, 409);
    const previous = await env.DB.prepare(
      "SELECT before_state,after_state FROM proposals WHERE id=? AND session_id=?",
    )
      .bind(row.last_action, id)
      .first<ProposalRow>();
    if (!previous || previous.after_state !== row.state)
      return json(
        { error: "The week has changed. Reload before trying again." },
        409,
      );
    const proposalId = crypto.randomUUID(),
      description =
        "Undo your latest adjustment and restore the previous week.";
    await env.DB.prepare(
      "INSERT INTO proposals(id,session_id,expected_version,before_state,after_state,description,expires_at) VALUES (?,?,?,?,?,?,?)",
    )
      .bind(
        proposalId,
        id,
        row.version,
        row.state,
        previous.before_state,
        description,
        now + 600,
      )
      .run();
    return json({
      id: proposalId,
      description,
      before: state.days,
      after: (JSON.parse(previous.before_state) as State).days,
    });
  }
  if (url.pathname === "/api/confirm") {
    if (
      input.confirm !== true ||
      typeof input.proposalId !== "string" ||
      Object.keys(input).some((k) => !["confirm", "proposalId"].includes(k))
    )
      return json({ error: "Explicit confirmation is required." }, 400);
    if (row.last_action === input.proposalId) return json({ ok: true });
    // One atomic compare-and-swap. A duplicate/stale proposal cannot overwrite newer data.
    const result = await env.DB.prepare(
      "UPDATE sessions SET state=(SELECT after_state FROM proposals WHERE id=? AND session_id=?), version=version+1, last_action=? WHERE id=? AND version=(SELECT expected_version FROM proposals WHERE id=? AND session_id=? AND expires_at>?)",
    )
      .bind(
        input.proposalId,
        id,
        input.proposalId,
        id,
        input.proposalId,
        id,
        now,
      )
      .run();
    return result.meta.changes === 1
      ? json({ ok: true })
      : json(
          {
            error:
              "Your week changed or this proposal expired. Reload and review a fresh adjustment.",
          },
          409,
        );
  }
  return json({ error: "Not found" }, 404);
}
export {WhatsAppDispatch} from './whatsapp-dispatch';
export default {
  async fetch(request, env, ctx) {
    let response: Response;
    try {
      response = new URL(request.url).pathname.startsWith("/api/")
        ? await api(request, env, ctx)
        : await env.ASSETS.fetch(request);
    } catch {
      response = json(
        { error: "We could not save or load your preview. Please try again." },
        503,
      );
    }
    const safe = new Response(response.body, response);
    safe.headers.set("X-Robots-Tag", "noindex, nofollow");
    safe.headers.set("X-Content-Type-Options", "nosniff");
    safe.headers.set("Referrer-Policy", "no-referrer");
    safe.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    safe.headers.set(
      "Permissions-Policy",
      "microphone=(self), camera=(), geolocation=()",
    );
    return safe;
  },
  async scheduled(_event, env) {
    await recoverWhatsApp(env);
    await deliverReminders(env);
    await deliverLaunch(env);
    const now = Math.floor(Date.now() / 1000);
    // Retention cleanup runs daily; delivery polling runs every minute.
    if (
      new Date(_event.scheduledTime).getUTCHours() !== 4 ||
      new Date(_event.scheduledTime).getUTCMinutes() !== 0
    )
      return;
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(now),
      env.DB.prepare("DELETE FROM request_limits WHERE expires_at<?").bind(now),
    ]);
  },
  async queue(batch,env) {
    await consumeWhatsApp(batch,env);
  },
} satisfies ExportedHandler<Env>;

import { changePlan, seed, type State, type Change } from "../shared/coach";
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
const cookieName = "coach_preview";
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
async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url),
    now = Math.floor(Date.now() / 1000);
  if (!["GET", "POST"].includes(request.method))
    return json({ error: "Method not allowed" }, 405);
  if (request.method === "POST" && request.headers.get("Origin") !== url.origin)
    return json({ error: "Origin not allowed" }, 403);
  if (url.pathname === "/api/session" && request.method === "POST") {
    const address = request.headers.get("CF-Connecting-IP") || "local";
    if (!(await limit(env, `signup:${await digest(address)}`, 20, 3600)))
      return json(
        { error: "Too many preview sessions. Try again later." },
        429,
      );
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
      x.toString(16).padStart(2, "0"),
    ).join("");
    await env.DB.prepare(
      "INSERT INTO sessions(id,state,expires_at) VALUES (?,?,?)",
    )
      .bind(await digest(token), JSON.stringify(seed()), now + lifetime)
      .run();
    const response = json({ ok: true });
    response.headers.set(
      "Set-Cookie",
      `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${lifetime}${url.protocol === "https:" ? "; Secure" : ""}`,
    );
    return response;
  }
  const token = request.headers
    .get("Cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return json({ error: "Start your private preview first." }, 401);
  const id = await digest(token);
  const row = await env.DB.prepare(
    "SELECT id,state,version,last_action FROM sessions WHERE id=? AND expires_at>?",
  )
    .bind(id, now)
    .first<Row>();
  if (!row)
    return json({ error: "Your preview expired. Start a new one." }, 401);
  if (!(await limit(env, `session:${id}`, 120, 60)))
    return json({ error: "Please wait a moment before trying again." }, 429);
  if (url.pathname === "/api/state" && request.method === "GET")
    return json({
      state: JSON.parse(row.state),
      version: row.version,
      lastAction: row.last_action,
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
      if (size > 2048) {
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
export default {
  async fetch(request, env) {
    let response: Response;
    try {
      response = new URL(request.url).pathname.startsWith("/api/")
        ? await api(request, env)
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
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    safe.headers.set(
      "Permissions-Policy",
      "microphone=(), camera=(), geolocation=()",
    );
    return safe;
  },
  async scheduled(_event, env) {
    const now = Math.floor(Date.now() / 1000);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(now),
      env.DB.prepare("DELETE FROM request_limits WHERE expires_at<?").bind(now),
    ]);
  },
} satisfies ExportedHandler<Env>;

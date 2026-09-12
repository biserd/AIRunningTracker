import { changePlan, evidence, type State } from "../shared/coach";
import { AIError, coach, openai } from "./openai";
import { reminderContext, validateReminder, draftReminder } from "./reminders";
type RunnerRow = { id: string; state: string; version: number };
type Limit = (
  env: Env,
  key: string,
  max: number,
  seconds: number,
) => Promise<boolean>;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function history(env: Env, id: string) {
  const rows = await env.DB.prepare(
    "SELECT role,content FROM coach_messages WHERE session_id=? ORDER BY sequence DESC LIMIT 12",
  )
    .bind(id)
    .all<{ role: string; content: string }>();
  return rows.results.reverse();
}
export async function aiRoute(
  request: Request,
  env: Env,
  row: RunnerRow,
  input: Record<string, unknown>,
  limit: Limit,
) {
  const path = new URL(request.url).pathname;
  if (path === "/api/ai/voice/stop") {
    if (Object.keys(input).length) throw new AIError("Invalid request", 400);
    return env.VOICE_LEASE.getByName(row.id).stop();
  }
  const kind =
    path === "/api/ai/chat"
      ? "chat"
      : path === "/api/ai/image"
        ? "image"
        : path === "/api/ai/voice"
          ? "voice"
          : null;
  if (!kind) throw new AIError("Not found", 404);
  const allowed =
    kind === "chat"
      ? ["id", "message"]
      : kind === "voice"
        ? ["id", "sdp"]
        : ["id"];
  if (
    Object.keys(input).some((k) => !allowed.includes(k)) ||
    typeof input.id !== "string" ||
    !uuid.test(input.id)
  )
    throw new AIError("Invalid AI request", 400);
  if (
    kind === "chat" &&
    (typeof input.message !== "string" ||
      !input.message.trim() ||
      input.message.length > 2000)
  )
    throw new AIError("Please use a message of 1 to 2,000 characters.", 400);
  if (
    kind === "voice" &&
    (typeof input.sdp !== "string" ||
      !input.sdp.startsWith("v=0") ||
      input.sdp.length > 24000)
  )
    throw new AIError("Invalid voice connection", 400);
  if (!env.OPENAI_API_KEY)
    throw new AIError(
      "AI is waiting for the server API key. Your saved week is unchanged.",
    );
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify({ kind, message: input.message, sdp: input.sdp }),
    ),
  );
  const fingerprint = Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const prior = await env.DB.prepare(
    "SELECT status,result,fingerprint FROM ai_jobs WHERE session_id=? AND id=?",
  )
    .bind(row.id, input.id)
    .first<{ status: string; result: string; fingerprint: string }>();
  if (prior) {
    if (prior.fingerprint !== fingerprint)
      throw new AIError("Use a new request ID for a different request.", 409);
    if (prior.status === "done" && kind === "chat")
      return JSON.parse(prior.result);
    throw new AIError(
      prior.status === "running"
        ? "This request is already running. Wait before trying again."
        : "This request has already finished. Send a new request if needed.",
      409,
    );
  }
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "UPDATE ai_jobs SET status='failed' WHERE session_id=? AND status='running' AND created_at<?",
  )
    .bind(row.id, now - 180)
    .run();
  const claimed = await env.DB.prepare(
    "INSERT OR IGNORE INTO ai_jobs(session_id,id,kind,fingerprint,status,created_at) VALUES (?,?,?,?,'running',?)",
  )
    .bind(row.id, input.id, kind, fingerprint, now)
    .run();
  if (!claimed.meta.changes)
    throw new AIError("This request is already running.", 409);
  try {
    const day = Math.floor(now / 86400);
    // Global cap cannot be bypassed by recreating a browser session. Reserve before charging.
    if (
      !(await limit(
        env,
        `ai:${kind}:${row.id}:${day}`,
        kind === "chat" ? 20 : 2,
        86400,
      )) ||
      !(await limit(
        env,
        `ai:${kind}:global:${day}`,
        kind === "chat" ? 100 : 10,
        86400,
      ))
    )
      throw new AIError(
        "Today’s preview AI limit has been reached. Come back tomorrow.",
        429,
      );
    const signal = AbortSignal.timeout(kind === "image" ? 110_000 : 80_000);
    const state = JSON.parse(row.state) as State;
    let result: unknown;
    if (kind === "chat") {
      const message = (input.message as string).trim();
      const generated = await coach(
        env.OPENAI_API_KEY,
        state,
        await history(env, row.id),
        message,
        signal,
        {
          context: await reminderContext(env, row.id),
          validate: (intent) => validateReminder(env, row.id, intent),
        },
      );
      let proposal;
      if (generated.change) {
        const preview = changePlan(state, generated.change),
          id = crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO proposals(id,session_id,expected_version,before_state,after_state,description,expires_at) VALUES (?,?,?,?,?,?,?)",
        )
          .bind(
            id,
            row.id,
            row.version,
            row.state,
            JSON.stringify(preview.state),
            preview.description,
            Math.floor(Date.now() / 1000) + 600,
          )
          .run();
        proposal = {
          id,
          description: preview.description,
          before: state.days,
          after: preview.state.days,
        };
      }
      result = {
        message: generated.message,
        ...(proposal ? { proposal } : {}),
        ...(generated.reminder
          ? {
              reminderProposal: await draftReminder(
                env,
                row.id,
                generated.reminder,
              ),
            }
          : {}),
        source: "fictional_sample",
      };
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO coach_messages(session_id,role,content,created_at) VALUES (?,'user',?,?)",
        ).bind(row.id, message, now),
        env.DB.prepare(
          "INSERT INTO coach_messages(session_id,role,content,created_at) VALUES (?,'assistant',?,?)",
        ).bind(row.id, generated.message, now),
      ]);
    } else if (kind === "voice") {
      result = await env.VOICE_LEASE.getByName(row.id).start(
        input.sdp as string,
      );
    } else {
      const raw = (await openai(
        env.OPENAI_API_KEY,
        "images/generations",
        {
          model: "gpt-image-2.5-flare",
          n: 1,
          size: "1024x1024",
          quality: "low",
          output_format: "webp",
          prompt:
            "Create a polished editorial illustration for a running consistency celebration. Quiet olive green, warm ivory and orange accents. A runner on an inviting park path at sunrise. Flat print-inspired artwork, tasteful texture. NO TEXT, NO NUMBERS, no logos. Leave lower quarter visually quiet for an application-rendered statistics caption. This is illustration, not a real athlete photograph.",
        },
        signal,
        8_000_000,
      )) as { data?: { b64_json?: string }[] };
      const image = raw.data?.[0]?.b64_json;
      if (
        !image ||
        image.length > 7_000_000 ||
        !/^[A-Za-z0-9+/=]+$/.test(image)
      )
        throw new AIError("The image could not be generated.");
      result = {
        image: `data:image/webp;base64,${image}`,
        evidence: evidence(state),
        source: "fictional_sample",
      };
    }
    // Images are intentionally ephemeral, never multi-megabyte D1 blobs. A replay cannot bill twice.
    await env.DB.prepare(
      "UPDATE ai_jobs SET status='done',result=? WHERE session_id=? AND id=?",
    )
      .bind(
        JSON.stringify(kind === "chat" ? result : { completed: true }),
        row.id,
        input.id,
      )
      .run();
    return result;
  } catch (error) {
    await env.DB.prepare(
      "UPDATE ai_jobs SET status='failed' WHERE session_id=? AND id=?",
    )
      .bind(row.id, input.id)
      .run();
    if (error instanceof AIError) throw error;
    throw new AIError(
      "The AI request did not finish. Your saved week is unchanged.",
    );
  }
}

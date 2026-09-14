import { changePlan, evidence, type State } from "../shared/coach";
import { AIError, coach, openai } from "./openai";
import { reminderContext, validateReminder, draftReminder } from "./reminders";
import {draftPlan,validatePlanIntent} from './plan-actions';
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
    // Testing preview has no daily budget. Retain short burst protection.
    if (
      !(await limit(
        env,
        `ai-burst:${kind}:${row.id}`,
        kind === "chat" ? 20 : 5,
        60,
      )) ||
      !(await limit(
        env,
        `ai-burst:${kind}:global`,
        kind === "chat" ? 100 : 30,
        60,
      ))
    )
      throw new AIError(
        "Too many AI requests at once. Please wait a minute and try again.",
        429,
      );
    const signal = AbortSignal.timeout(kind === "image" ? 150_000 : 80_000);
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
        state.trainingContext?.canWritePlans ? {validate:intent=>validatePlanIntent(intent,state.trainingContext!)} : undefined,
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
        ...(generated.planIntent && state.trainingContext ? {planReview:await draftPlan(env,row.id,state.trainingContext,generated.planIntent)} : {}),
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
        source: state.source || "fictional_sample",
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
        state,
      );
    } else {
      const raw = (await openai(
        env.OPENAI_API_KEY,
        "images/generations",
        {
          model: "gpt-image-2.5-sunburst",
          n: 1,
          size: "1440x1808",
          quality: "high",
          output_format: "webp",
          prompt:
            "Art-direct a collectible premium endurance-running campaign poster, portrait 4:5 composition. Full-bleed cinematic landscape with a tiny anonymous runner at the right-hand middle third, on a sweeping terracotta running track that curves into a misty forest. Rich photographic detail, tactile fine-grain print finish, dramatic golden rim light, deep pine-green shadows, warm copper highlights, sophisticated restrained color grading. Strong sculptural curves, subtle atmospheric depth, beautiful negative space. The runner and track should dominate the middle 25-55% of the canvas. Keep the top 22% and bottom 45% very dark pine green and low-detail for ivory editorial typography and numerical statistics added by the application. The entire image is a unified art print, not a website, infographic, card layout or stock vector illustration. NO TEXT, NO NUMBERS, NO LOGOS, NO fake route maps, graphs or achievement badges. This is fictional conceptual artwork, not a photograph of the user's run.",
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
        source: state.source || "fictional_sample",
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

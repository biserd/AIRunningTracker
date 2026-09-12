import {
  reminderTime,
  reminderTitle,
  validTimezone,
  type ReminderIntent,
  type ReminderProposal,
} from "../shared/reminders";
export class ReminderError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const seconds = () => Math.floor(Date.now() / 1000);
export async function hash(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
const random = (n = 32) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
export async function budget(env: Env, key: string, max: number, ttl: number) {
  const now = seconds();
  const row = await env.DB.prepare(
    "INSERT INTO request_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count",
  )
    .bind(key, now + ttl, now, now)
    .first<{ count: number }>();
  return !!row && row.count <= max;
}
type Contact = {
  session_id: string;
  email: string;
  timezone: string;
  generation: string;
  verified_at: number | null;
  disabled: number;
  expires_at: number;
};
type Reminder = {
  id: string;
  session_id: string;
  generation: string;
  title: string;
  local_time: string;
  timezone: string;
  due_at: number;
  status: string;
  attempts: number;
};
const configured = (env: Env) => !!env.REMINDER_EMAIL && !!env.REMINDER_FROM;
async function contact(env: Env, id: string) {
  return env.DB.prepare(
    "SELECT c.*,s.expires_at FROM reminder_contacts c JOIN sessions s ON s.id=c.session_id WHERE c.session_id=? AND s.expires_at>?",
  )
    .bind(id, seconds())
    .first<Contact>();
}
async function ready(env: Env, id: string) {
  const c = await contact(env, id);
  if (!configured(env))
    throw new ReminderError("Email sending is not configured yet.", 503);
  if (!c?.verified_at || c.disabled)
    throw new ReminderError(
      "Verify your email in the reminders panel first.",
      409,
    );
  return c;
}
export async function reminderStatus(env: Env, id: string) {
  const c = await contact(env, id);
  const items = await env.DB.prepare(
    "SELECT id,title,local_time,timezone,due_at,status,error_code FROM email_reminders WHERE session_id=? ORDER BY CASE WHEN status IN ('draft','scheduled','sending') THEN 0 ELSE 1 END,created_at DESC LIMIT 20",
  )
    .bind(id)
    .all();
  return {
    configured: configured(env),
    verified: !!c?.verified_at && !c.disabled,
    email: c?.email || "",
    timezone: c?.timezone || "",
    expiresAt: c?.expires_at,
    reminders: items.results,
  };
}
export async function reminderContext(env: Env, id: string) {
  const status = await reminderStatus(env, id);
  return {
    verified: status.verified,
    timezone: status.timezone || null,
    currentTimeUTC: new Date().toISOString(),
    previewExpiresAt: status.expiresAt
      ? new Date(status.expiresAt * 1000).toISOString()
      : null,
    reminders: status.reminders,
  };
}
export async function validateReminder(
  env: Env,
  id: string,
  raw: unknown,
): Promise<ReminderIntent> {
  const c = await ready(env, id);
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new ReminderError("Invalid reminder.");
  const value = raw as Record<string, unknown>;
  if (value.kind === "cancel") {
    if (
      Object.keys(value).some((k) => !["kind", "reminderId"].includes(k)) ||
      typeof value.reminderId !== "string"
    )
      throw new ReminderError("Invalid reminder.");
    const item = await env.DB.prepare(
      "SELECT id FROM email_reminders WHERE id=? AND session_id=? AND generation=? AND status IN ('draft','scheduled')",
    )
      .bind(value.reminderId, id, c.generation)
      .first();
    if (!item)
      throw new ReminderError(
        "That reminder is no longer available to cancel.",
        409,
      );
    return { kind: "cancel", reminderId: value.reminderId };
  }
  if (
    value.kind !== "create" ||
    Object.keys(value).some(
      (k) => !["kind", "title", "localTime"].includes(k),
    ) ||
    typeof value.localTime !== "string"
  )
    throw new ReminderError("Invalid reminder.");
  let title: string;
  try {
    title = reminderTitle(value.title);
    reminderTime(value.localTime, c.timezone, seconds(), c.expires_at);
  } catch (e) {
    throw new ReminderError(
      e instanceof Error ? e.message : "Invalid reminder time.",
    );
  }
  return { kind: "create", title, localTime: value.localTime };
}
export async function draftReminder(
  env: Env,
  id: string,
  raw: unknown,
): Promise<ReminderProposal> {
  const intent = await validateReminder(env, id, raw),
    c = await ready(env, id);
  if (intent.kind === "cancel") {
    const item = await env.DB.prepare(
      "SELECT title,local_time,timezone FROM email_reminders WHERE id=? AND session_id=?",
    )
      .bind(intent.reminderId, id)
      .first<Reminder>();
    if (!item) throw new ReminderError("Reminder not found.", 404);
    return {
      kind: "cancel",
      id: intent.reminderId,
      title: item.title,
      localTime: item.local_time,
      timezone: item.timezone,
    };
  }
  const due = reminderTime(
      intent.localTime,
      c.timezone,
      seconds(),
      c.expires_at,
    ),
    reminderId = crypto.randomUUID(),
    now = seconds();
  const result = await env.DB.prepare(
    "INSERT INTO email_reminders(id,session_id,generation,title,local_time,timezone,due_at,status,draft_expires,next_attempt_at,created_at) SELECT ?,?,?,?,?,?,?,'draft',?,?,? WHERE (SELECT COUNT(*) FROM email_reminders WHERE session_id=? AND (status='scheduled' OR (status='draft' AND draft_expires>?)))<10",
  )
    .bind(
      reminderId,
      id,
      c.generation,
      intent.title,
      intent.localTime,
      c.timezone,
      due,
      now + 600,
      due,
      now,
      id,
      now,
    )
    .run();
  if (!result.meta.changes)
    throw new ReminderError(
      "You can have up to ten pending reminders in this preview.",
      429,
    );
  return {
    kind: "create",
    id: reminderId,
    title: intent.title,
    localTime: intent.localTime,
    timezone: c.timezone,
  };
}
function exact(input: Record<string, unknown>, keys: string[]) {
  if (Object.keys(input).some((k) => !keys.includes(k)))
    throw new ReminderError("Invalid request.");
}
function emailAddress(raw: unknown) {
  if (
    typeof raw !== "string" ||
    raw.length > 254 ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(
      raw.trim(),
    )
  )
    throw new ReminderError("Enter a valid email address.");
  return raw.trim().toLowerCase();
}
function codeOf(error: unknown) {
  return error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : "UNKNOWN";
}
async function send(env: Env, to: string, subject: string, text: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      env.REMINDER_EMAIL.send({ from: env.REMINDER_FROM, to, subject, text }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Email outcome unknown")),
          20_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function reminderAction(
  env: Env,
  id: string,
  path: string,
  input: Record<string, unknown>,
  ip: string,
) {
  const now = seconds();
  if (path === "verify/start") {
    exact(input, ["email", "timezone"]);
    const email = emailAddress(input.email);
    if (!validTimezone(input.timezone))
      throw new ReminderError("Choose a valid timezone.");
    if (!configured(env))
      throw new ReminderError("Email sending is not configured yet.", 503);
    const previous = await contact(env, id);
    if (previous?.verified_at && !previous.disabled)
      throw new ReminderError(
        "Disconnect your current email before changing it.",
        409,
      );
    if (
      !(await budget(env, `verify:session:${id}`, 3, 3600)) ||
      !(await budget(env, `verify:ip:${await hash(ip)}`, 5, 3600)) ||
      !(await budget(env, `verify:email:${await hash(email)}`, 3, 86400)) ||
      !(await budget(
        env,
        `verify:global:${Math.floor(now / 86400)}`,
        50,
        86400,
      ))
    )
      throw new ReminderError(
        "Too many verification requests. Try again later.",
        429,
      );
    const generation = crypto.randomUUID(),
      code = random(6).toUpperCase(),
      digest = await hash(id + generation + code);
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE email_reminders SET status='cancelled' WHERE session_id=? AND status IN ('draft','scheduled')",
      ).bind(id),
      env.DB.prepare(
        "INSERT INTO reminder_contacts(session_id,generation,email,timezone,code_hash,code_expires) VALUES (?,?,?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET generation=excluded.generation,email=excluded.email,timezone=excluded.timezone,code_hash=excluded.code_hash,code_expires=excluded.code_expires,verified_at=NULL,attempts=0,disabled=0",
      ).bind(id, generation, email, input.timezone, digest, now + 600),
    ]);
    try {
      await send(
        env,
        email,
        "Verify your AITracker reminder email",
        `Your verification code is ${code}.\n\nEnter it in the same AITracker preview browser within 10 minutes. This connects only your reminder inbox; it does not import your running account.\n\nIf you did not request this, ignore this email. No reminders will be sent without verification and confirmation.\n\nAITracker Coach Preview`,
      );
    } catch (e) {
      await env.DB.prepare(
        "UPDATE reminder_contacts SET code_hash=NULL,code_expires=0 WHERE session_id=? AND generation=?",
      )
        .bind(id, generation)
        .run();
      const code = codeOf(e);
      throw new ReminderError(
        [
          "E_SENDER_NOT_VERIFIED",
          "E_SENDER_DOMAIN_NOT_AVAILABLE",
          "E_RECIPIENT_NOT_ALLOWED",
        ].includes(code)
          ? "The sending domain is not ready in Cloudflare Email Service. Contact the site owner."
          : "The verification email could not be sent. Please try later.",
        503,
      );
    }
    return { ok: true, message: "Check your inbox and enter the code here." };
  }
  if (path === "verify/finish") {
    exact(input, ["code"]);
    const c = await contact(env, id);
    if (
      !c ||
      typeof input.code !== "string" ||
      !/^[a-fA-F0-9]{12}$/.test(input.code)
    )
      throw new ReminderError("Enter the 12-character code from your email.");
    const digest = await hash(id + c.generation + input.code.toUpperCase());
    const result = await env.DB.prepare(
      "UPDATE reminder_contacts SET attempts=attempts+1,verified_at=CASE WHEN code_hash=? THEN ? ELSE verified_at END,code_hash=CASE WHEN code_hash=? THEN NULL ELSE code_hash END WHERE session_id=? AND generation=? AND code_expires>? AND attempts<5 AND verified_at IS NULL AND disabled=0 RETURNING verified_at",
    )
      .bind(digest, now, digest, id, c.generation, now)
      .first<{ verified_at: number | null }>();
    if (!result?.verified_at)
      throw new ReminderError(
        "That code is invalid or expired. Request a new code.",
      );
    return { ok: true };
  }
  if (path === "disconnect") {
    exact(input, ["confirm"]);
    if (input.confirm !== true)
      throw new ReminderError("Confirmation required.");
    await disconnect(env, id);
    return { ok: true };
  }
  if (path === "draft") {
    return draftReminder(env, id, input);
  }
  if (path === "confirm") {
    exact(input, ["id", "kind", "confirm"]);
    if (
      input.confirm !== true ||
      typeof input.id !== "string" ||
      !["create", "cancel"].includes(String(input.kind))
    )
      throw new ReminderError("Explicit confirmation is required.");
    const c = await ready(env, id);
    if (input.kind === "cancel") {
      const result = await env.DB.prepare(
        "UPDATE email_reminders SET status='cancelled' WHERE id=? AND session_id=? AND generation=? AND status IN ('draft','scheduled','cancelled')",
      )
        .bind(input.id, id, c.generation)
        .run();
      if (!result.meta.changes)
        throw new ReminderError(
          "This reminder is already being sent or has finished. It cannot be cancelled.",
          409,
        );
      return { ok: true };
    }
    const result = await env.DB.prepare(
      "UPDATE email_reminders SET status='scheduled' WHERE id=? AND session_id=? AND generation=? AND due_at>? AND due_at<? AND (status='scheduled' OR (status='draft' AND draft_expires>?)) AND EXISTS(SELECT 1 FROM reminder_contacts WHERE session_id=? AND generation=? AND disabled=0 AND verified_at IS NOT NULL)",
    )
      .bind(
        input.id,
        id,
        c.generation,
        now,
        c.expires_at - 60,
        now,
        id,
        c.generation,
      )
      .run();
    if (!result.meta.changes)
      throw new ReminderError(
        "This reminder expired or changed. Review a new reminder.",
        409,
      );
    return { ok: true };
  }
  throw new ReminderError("Not found.", 404);
}
async function disconnect(env: Env, id: string, generation?: string) {
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE reminder_contacts SET disabled=1,code_hash=NULL WHERE session_id=? AND (? IS NULL OR generation=?)",
    ).bind(id, generation ?? null, generation ?? null),
    env.DB.prepare(
      "UPDATE email_reminders SET status='cancelled' WHERE session_id=? AND (? IS NULL OR generation=?) AND status IN ('draft','scheduled')",
    ).bind(id, generation ?? null, generation ?? null),
  ]);
}
export async function unsubscribe(env: Env, token: unknown) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    throw new ReminderError("Invalid unsubscribe link.");
  const row = await env.DB.prepare(
    "SELECT session_id,generation FROM reminder_optouts WHERE token_hash=?",
  )
    .bind(await hash(token))
    .first<{ session_id: string; generation: string }>();
  if (row) await disconnect(env, row.session_id, row.generation);
  return { ok: true };
}
export async function deliverReminders(env: Env) {
  const now = seconds();
  // A crash after provider acceptance is not safe to retry without provider idempotency.
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE email_reminders SET status='unknown',error_code='OUTCOME_UNKNOWN' WHERE status='sending' AND claimed_at<?",
    ).bind(now - 120),
    env.DB.prepare(
      "UPDATE email_reminders SET status='expired' WHERE (status='draft' AND draft_expires<?) OR (status='scheduled' AND due_at<?)",
    ).bind(now, now - 3600),
    env.DB.prepare(
      "UPDATE email_reminders SET status='cancelled' WHERE status='scheduled' AND NOT EXISTS(SELECT 1 FROM reminder_contacts c JOIN sessions s ON s.id=c.session_id WHERE c.session_id=email_reminders.session_id AND c.generation=email_reminders.generation AND c.verified_at IS NOT NULL AND c.disabled=0 AND s.expires_at>?)",
    ).bind(now),
  ]);
  if (!configured(env)) return;
  const items = await env.DB.prepare(
    "SELECT id,session_id FROM email_reminders WHERE status='scheduled' AND next_attempt_at<=? ORDER BY next_attempt_at LIMIT 20",
  )
    .bind(now)
    .all<{ id: string; session_id: string }>();
  for (const item of items.results) {
    const claimed = await env.DB.prepare(
      "UPDATE email_reminders SET status='sending',claimed_at=?,attempts=attempts+1 WHERE id=? AND status='scheduled' AND next_attempt_at<=? AND EXISTS(SELECT 1 FROM reminder_contacts c JOIN sessions s ON s.id=c.session_id WHERE c.session_id=email_reminders.session_id AND c.generation=email_reminders.generation AND c.verified_at IS NOT NULL AND c.disabled=0 AND s.expires_at>?) RETURNING *",
    )
      .bind(now, item.id, now, now)
      .first<Reminder>();
    if (!claimed) continue;
    if (
      !(await budget(
        env,
        `reminders:global:${Math.floor(now / 86400)}`,
        200,
        86400,
      ))
    ) {
      await env.DB.prepare(
        "UPDATE email_reminders SET status='failed',error_code='PREVIEW_DAILY_LIMIT' WHERE id=? AND status='sending'",
      )
        .bind(item.id)
        .run();
      continue;
    }
    const c = await contact(env, item.session_id);
    if (!c?.verified_at || c.disabled || c.generation !== claimed.generation) {
      await env.DB.prepare(
        "UPDATE email_reminders SET status='cancelled' WHERE id=? AND status='sending'",
      )
        .bind(item.id)
        .run();
      continue;
    }
    const token = random();
    await env.DB.prepare(
      "INSERT INTO reminder_optouts(token_hash,session_id,generation) VALUES (?,?,?)",
    )
      .bind(await hash(token), item.session_id, claimed.generation)
      .run();
    try {
      const result = await send(
        env,
        c.email,
        "Your AITracker running reminder",
        `A little nudge from your coach:\n\n${claimed.title}\n\nYou requested this for ${claimed.local_time.replace("T", " ")} (${claimed.timezone}).\n\nOpen your running space: ${env.PUBLIC_ORIGIN}\n\nStop all reminders for this preview: ${env.PUBLIC_ORIGIN}/#stop-reminders=${token}\n\nThis is your confirmed reminder, not an automatic assessment of your health or training. AITracker Coach Preview.`,
      );
      await env.DB.prepare(
        "UPDATE email_reminders SET status='sent',sent_at=?,provider_id=? WHERE id=? AND status='sending'",
      )
        .bind(seconds(), result.messageId, item.id)
        .run();
    } catch (error) {
      const code = codeOf(error),
        retry =
          ["E_RATE_LIMIT_EXCEEDED", "E_DAILY_LIMIT_EXCEEDED"].includes(code) &&
          claimed.attempts < 3;
      const rejected = [
        "E_SENDER_NOT_VERIFIED",
        "E_SENDER_DOMAIN_NOT_AVAILABLE",
        "E_RECIPIENT_NOT_ALLOWED",
        "E_RECIPIENT_SUPPRESSED",
        "E_VALIDATION_ERROR",
        "E_DELIVERY_FAILED",
        "E_RATE_LIMIT_EXCEEDED",
        "E_DAILY_LIMIT_EXCEEDED",
      ].includes(code);
      await env.DB.prepare(
        "UPDATE email_reminders SET status=?,next_attempt_at=?,error_code=? WHERE id=? AND status='sending'",
      )
        .bind(
          retry ? "scheduled" : rejected ? "failed" : "unknown",
          seconds() + 60 * claimed.attempts,
          rejected ? code : "OUTCOME_UNKNOWN",
          item.id,
        )
        .run();
      if (code === "E_RECIPIENT_SUPPRESSED")
        await disconnect(env, item.session_id);
    }
  }
}

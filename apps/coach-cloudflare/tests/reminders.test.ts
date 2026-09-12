import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { reminderTime } from "../shared/reminders";
import {
  reminderAction,
  draftReminder,
  deliverReminders,
  reminderStatus,
  unsubscribe,
} from "../worker/reminders";
import { fixture } from './reminder-fixture';
test("inbox verification is session-bound, expiring, single-use and blocks reminders until verified", async (t) => {
  const f = fixture();
  t.after(() => f.db.close());
  await assert.rejects(
    draftReminder(f.env, "a", {
      kind: "create",
      title: "Run",
      localTime: f.future(),
    }),
    /Verify your email/,
  );
  await reminderAction(
    f.env,
    "a",
    "verify/start",
    { email: "runner@example.test", timezone: "UTC" },
    "a",
  );
  const code = f.emails[0].text.match(/code is ([A-F0-9]{12})/)![1];
  assert.notEqual(
    f.db.prepare("SELECT code_hash FROM reminder_contacts").get()?.code_hash,
    code,
  );
  await assert.rejects(
    reminderAction(f.env, "b", "verify/finish", { code }, "b"),
  );
  await reminderAction(f.env, "a", "verify/finish", { code }, "a");
  await assert.rejects(
    reminderAction(f.env, "a", "verify/finish", { code }, "a"),
  );
  assert.equal((await reminderStatus(f.env, "a")).verified, true);
  assert.equal((await reminderStatus(f.env, "b")).verified, false);
  await reminderAction(
    f.env,
    "b",
    "verify/start",
    { email: "b@example.test", timezone: "UTC" },
    "b",
  );
  const otherCode = f.emails.at(-1)!.text.match(/code is ([A-F0-9]{12})/)![1];
  f.db
    .prepare("UPDATE reminder_contacts SET code_expires=0 WHERE session_id='b'")
    .run();
  await assert.rejects(
    reminderAction(f.env, "b", "verify/finish", { code: otherCode }, "b"),
  );
});
test("draft, explicit confirmation, cross-session isolation and concurrent scheduler deduplication", async (t) => {
  const f = fixture();
  t.after(() => f.db.close());
  await f.verify();
  await f.verify("b");
  const p = await draftReminder(f.env, "a", {
    kind: "create",
    title: "Lay out running kit",
    localTime: f.future(),
  });
  const initial = f.emails.length;
  await deliverReminders(f.env);
  assert.equal(f.emails.length, initial);
  await assert.rejects(
    reminderAction(f.env, "a", "confirm", { id: p.id, kind: "create" }, "a"),
    /confirmation/,
  );
  await assert.rejects(
    reminderAction(
      f.env,
      "b",
      "confirm",
      { id: p.id, kind: "create", confirm: true },
      "b",
    ),
  );
  await reminderAction(
    f.env,
    "a",
    "confirm",
    { id: p.id, kind: "create", confirm: true },
    "a",
  );
  await reminderAction(
    f.env,
    "a",
    "confirm",
    { id: p.id, kind: "create", confirm: true },
    "a",
  );
  f.due(p.id);
  await Promise.all([deliverReminders(f.env), deliverReminders(f.env)]);
  await deliverReminders(f.env);
  assert.equal(f.emails.length, initial + 1);
  assert.equal(f.emails.at(-1)?.to, "a@example.test");
  assert.equal(
    f.db.prepare("SELECT status FROM email_reminders WHERE id=?").get(p.id)
      ?.status,
    "sent",
  );
  assert.equal((await reminderStatus(f.env, "b")).reminders.length, 0);
  await assert.rejects(
    draftReminder(f.env, "a", {
      kind: "create",
      title: "Run",
      localTime: f.future(),
      to: "victim@example.test",
    }),
    /Invalid/,
  );
});
test("unsubscribe cancels pending reminders without a session and without exposing token plaintext in storage", async (t) => {
  const f = fixture();
  t.after(() => f.db.close());
  await f.verify();
  const p = await draftReminder(f.env, "a", {
    kind: "create",
    title: "Run",
    localTime: f.future(),
  });
  await reminderAction(
    f.env,
    "a",
    "confirm",
    { id: p.id, kind: "create", confirm: true },
    "a",
  );
  f.due(p.id);
  await deliverReminders(f.env);
  const token = f.emails
    .at(-1)!
    .text.match(/stop-reminders=([a-f0-9]{64})/)![1];
  assert.notEqual(
    f.db.prepare("SELECT token_hash FROM reminder_optouts").get()?.token_hash,
    token,
  );
  const next = await draftReminder(f.env, "a", {
    kind: "create",
    title: "Second run",
    localTime: f.future(),
  });
  await reminderAction(
    f.env,
    "a",
    "confirm",
    { id: next.id, kind: "create", confirm: true },
    "a",
  );
  await unsubscribe(f.env, token);
  await unsubscribe(f.env, token);
  f.due(next.id);
  const count = f.emails.length;
  await deliverReminders(f.env);
  assert.equal(f.emails.length, count);
  assert.equal(
    f.db.prepare("SELECT status FROM email_reminders WHERE id=?").get(next.id)
      ?.status,
    "cancelled",
  );
  await f.verify();
  await unsubscribe(f.env, token);
  assert.equal((await reminderStatus(f.env, "a")).verified, true);
});
test("verification guesses are limited and stale drafts cannot be confirmed", async (t) => {
  const f = fixture();
  t.after(() => f.db.close());
  await reminderAction(
    f.env,
    "a",
    "verify/start",
    { email: "a@example.test", timezone: "UTC" },
    "a",
  );
  const code = f.emails[0].text.match(/code is ([A-F0-9]{12})/)![1];
  for (let i = 0; i < 5; i++)
    await assert.rejects(
      reminderAction(
        f.env,
        "a",
        "verify/finish",
        { code: "000000000000" },
        "a",
      ),
    );
  await assert.rejects(
    reminderAction(f.env, "a", "verify/finish", { code }, "a"),
  );
  await f.verify();
  const p = await draftReminder(f.env, "a", {
    kind: "create",
    title: "Run",
    localTime: f.future(),
  });
  f.db
    .prepare("UPDATE email_reminders SET draft_expires=0 WHERE id=?")
    .run(p.id);
  await assert.rejects(
    reminderAction(
      f.env,
      "a",
      "confirm",
      { id: p.id, kind: "create", confirm: true },
      "a",
    ),
    /expired/,
  );
});
test("uncertain email outcomes are not retried; explicit rate-limit rejection has bounded retries", async (t) => {
  const f = fixture();
  t.after(() => f.db.close());
  await f.verify();
  const p = await draftReminder(f.env, "a", {
    kind: "create",
    title: "Run",
    localTime: f.future(),
  });
  await reminderAction(
    f.env,
    "a",
    "confirm",
    { id: p.id, kind: "create", confirm: true },
    "a",
  );
  f.due(p.id);
  let calls = 0;
  f.email.send = async () => {
    calls++;
    throw new Error("Unknown provider outcome");
  };
  await deliverReminders(f.env);
  await deliverReminders(f.env);
  assert.equal(calls, 1);
  assert.equal(
    f.db.prepare("SELECT status FROM email_reminders WHERE id=?").get(p.id)
      ?.status,
    "unknown",
  );
  const next = await draftReminder(f.env, "a", {
    kind: "create",
    title: "Run again",
    localTime: f.future(),
  });
  await reminderAction(
    f.env,
    "a",
    "confirm",
    { id: next.id, kind: "create", confirm: true },
    "a",
  );
  f.email.send = async () => {
    throw Object.assign(new Error("Limited"), {
      code: "E_RATE_LIMIT_EXCEEDED",
    });
  };
  for (let i = 0; i < 4; i++) {
    f.due(next.id);
    await deliverReminders(f.env);
  }
  const item = f.db
    .prepare("SELECT status,attempts FROM email_reminders WHERE id=?")
    .get(next.id);
  assert.equal(item?.status, "failed");
  assert.equal(item?.attempts, 3);
});
test("timezone conversion handles offsets and rejects daylight-saving gaps, ambiguity and expired horizons", () => {
  const now = Date.parse("2026-09-12T00:00:00Z") / 1000;
  assert.equal(
    reminderTime("2026-09-13T07:00", "America/New_York", now, now + 7 * 86400),
    Date.parse("2026-09-13T11:00:00Z") / 1000,
  );
  const spring = Date.parse("2026-03-07T00:00:00Z") / 1000;
  assert.throws(
    () =>
      reminderTime(
        "2026-03-08T02:30",
        "America/New_York",
        spring,
        spring + 7 * 86400,
      ),
    /ambiguous/,
  );
  const autumn = Date.parse("2026-10-31T00:00:00Z") / 1000;
  assert.throws(
    () =>
      reminderTime(
        "2026-11-01T01:30",
        "America/New_York",
        autumn,
        autumn + 7 * 86400,
      ),
    /ambiguous/,
  );
  assert.throws(
    () => reminderTime("2026-09-20T07:00", "UTC", now, now + 7 * 86400),
    /expires/,
  );
});

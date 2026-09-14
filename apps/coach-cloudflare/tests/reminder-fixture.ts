import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { reminderAction } from '../worker/reminders';
export function fixture() {
  const db = new DatabaseSync(":memory:");
  for (const file of ["0001_preview.sql", "0003_reminders.sql", "0005_whatsapp.sql", "0006_whatsapp_oauth.sql", "0007_whatsapp_realtime.sql"])
    db.exec(
      readFileSync(new URL("../migrations/" + file, import.meta.url), "utf8"),
    );
  const now = Math.floor(Date.now() / 1000);
  for (const id of ["a", "b"])
    db.prepare(
      "INSERT INTO sessions(id,state,expires_at) VALUES (?,'{}',?)",
    ).run(id, now + 7 * 86400);
  const emails: { to: string; subject: string; text: string }[] = [];
  const adapter = {
    prepare(sql: string) {
      const stmt = db.prepare(sql);
      let values: (string | number | null)[] = [];
      return {
        bind(...args: (string | number | null)[]) {
          values = args;
          return this;
        },
        async first() {
          return stmt.get(...values) || null;
        },
        async all() {
          return { results: stmt.all(...values) };
        },
        async run() {
          return { meta: { changes: Number(stmt.run(...values).changes) } };
        },
      };
    },
    async batch(items: { run: () => Promise<unknown> }[]) {
      const result = [];
      for (const i of items) result.push(await i.run());
      return result;
    },
  };
  const email = {
    async send(value: { to: string; subject: string; text: string }) {
      emails.push(value);
      return { messageId: "message-" + emails.length };
    },
  };
  const env = Object.assign({} as Env, {
    DB: adapter,
    REMINDER_EMAIL: email,
    REMINDER_FROM: "reminders@aitracker.run",
    PUBLIC_ORIGIN: "https://new.aitracker.run",
  });
  const queued: unknown[]=[];
  Object.assign(env,{WHATSAPP_QUEUE:{async send(body:unknown){queued.push(body);},async sendBatch(items:{body:unknown}[]){queued.push(...items.map(x=>x.body));}}});
  async function verify(id = "a") {
    await reminderAction(
      env,
      id,
      "verify/start",
      { email: id + "@example.test", timezone: "UTC" },
      id,
    );
    const code = emails.at(-1)!.text.match(/code is ([A-F0-9]{12})/)![1];
    await reminderAction(env, id, "verify/finish", { code }, id);
  }
  const future = () =>
    new Date(Date.now() + 300_000).toISOString().slice(0, 16);
  const due = (id: string) =>
    db
      .prepare(
        "UPDATE email_reminders SET due_at=?,next_attempt_at=? WHERE id=?",
      )
      .run(now - 1, now - 1, id);
  return { db, env, emails, email, verify, future, due, queued };
}

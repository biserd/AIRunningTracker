import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import type { SQL } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { freeCoachMessagesRemaining, refundFreeCoachMessage, reserveFreeCoachMessage } from "../../server/services/coachChatAllowance";

test("free chat slots are limited per account and a failed reply restores exactly one slot", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys = ON; CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users(id) VALUES (1), (2);");
    db.exec(readFileSync("apps/d1-migration/migrations/0044_free_coach_chat.sql", "utf8"));
    const dialect = new SQLiteSyncDialect();
    async function execute(query: SQL) {
      const { sql, params } = dialect.sqlToQuery(query);
      return { rows: db.prepare(sql).all(...params as number[]) };
    }

    assert.equal(await freeCoachMessagesRemaining(execute, 1), 10);
    const reservations = await Promise.all(Array.from({ length: 15 }, () => reserveFreeCoachMessage(execute, 1)));
    assert.equal(reservations.filter(Boolean).length, 10);
    assert.equal(await freeCoachMessagesRemaining(execute, 1), 0);
    await refundFreeCoachMessage(execute, 1);
    assert.equal(await reserveFreeCoachMessage(execute, 1), true);
    assert.equal(await reserveFreeCoachMessage(execute, 1), false);
    await refundFreeCoachMessage(execute, 2);
    assert.equal(await reserveFreeCoachMessage(execute, 2), true);
    assert.equal(await freeCoachMessagesRemaining(execute, 2), 9);
    db.exec("DELETE FROM users WHERE id = 2");
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM free_coach_chat_usage WHERE user_id = 2").get()?.count, 0);
  } finally {
    db.close();
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
test("reviewed specification corrections preserve identities, unrelated records and repeat safely", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE running_shoes (id INTEGER PRIMARY KEY, slug TEXT, weight REAL, heel_stack_height REAL, forefoot_stack_height REAL, heel_to_toe_drop REAL, source_url TEXT, data_source TEXT, last_verified TEXT, description TEXT)");
  db.exec("INSERT INTO running_shoes VALUES (249,'nike-vaporfly-4',6.7,32,26,6,NULL,'curated',NULL,NULL),(702,'saucony-endorphin-pro-4',7.7,40,32,8,NULL,'curated',NULL,NULL),(999,'leave-me',9,30,22,8,NULL,'curated',NULL,'Original')");
  const sql = readFileSync(new URL("../../data/shoes/2026-11-07-comparison-audit.sql", import.meta.url), "utf8");
  db.exec(sql); db.exec(sql);
  const nike = db.prepare("SELECT * FROM running_shoes WHERE id=249").get() as any;
  assert.deepEqual([nike.weight, nike.heel_stack_height, nike.forefoot_stack_height, nike.heel_to_toe_drop], [5.9, 36, 30, 6]);
  assert.equal(nike.data_source, "running_warehouse");
  assert.equal((db.prepare("SELECT last_verified FROM running_shoes WHERE id=702").get() as any).last_verified, "2026-11-07T00:00:00.000Z");
  assert.equal((db.prepare("SELECT description FROM running_shoes WHERE id=999").get() as any).description, "Original");
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM running_shoes").get() as any).n, 3);
  db.close();
});

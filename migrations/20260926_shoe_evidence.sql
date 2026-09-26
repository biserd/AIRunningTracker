-- Run once, as one D1 execute --file transaction, before importing unrated shoes.
-- Rebuild only the public shoe catalog. Existing IDs, links, comparisons and sequence survive.
-- Reviewed inbound FK: shoe_comparisons uses NO ACTION (no cascading deletions).
PRAGMA defer_foreign_keys = ON;
CREATE TABLE "_shoe_catalog_sequence" ("seq" INTEGER);
INSERT INTO "_shoe_catalog_sequence" SELECT seq FROM sqlite_sequence WHERE name='running_shoes';
CREATE TABLE "_running_shoes_evidence" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "slug" TEXT UNIQUE,
  "series_name" TEXT,
  "version_number" INTEGER,
  "category" TEXT NOT NULL,
  "weight" REAL,
  "availability" TEXT DEFAULT 'unknown',
  "available_from" TEXT,
  "heel_stack_height" REAL,
  "forefoot_stack_height" REAL,
  "heel_to_toe_drop" REAL NOT NULL,
  "cushioning_level" TEXT NOT NULL,
  "stability" TEXT NOT NULL,
  "has_carbon_plate" INTEGER DEFAULT 0 CHECK ("has_carbon_plate" IN (0,1)),
  "has_super_foam" INTEGER DEFAULT 0 CHECK ("has_super_foam" IN (0,1)),
  "price" REAL NOT NULL,
  "best_for" TEXT NOT NULL CHECK ("best_for" IS NULL OR json_valid("best_for")),
  "min_runner_weight" INTEGER,
  "max_runner_weight" INTEGER,
  "durability_rating" REAL,
  "responsiveness_rating" REAL,
  "comfort_rating" REAL,
  "release_year" INTEGER,
  "image_url" TEXT,
  "description" TEXT,
  "ai_resilience_score" REAL,
  "ai_mileage_estimate" TEXT,
  "ai_target_usage" TEXT,
  "ai_narrative" TEXT,
  "ai_faq" TEXT,
  "source_url" TEXT,
  "data_source" TEXT DEFAULT 'curated',
  "last_verified" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO "_running_shoes_evidence" ("id","brand","model","slug","series_name","version_number","category","weight","heel_stack_height","forefoot_stack_height","heel_to_toe_drop","cushioning_level","stability","has_carbon_plate","has_super_foam","price","best_for","min_runner_weight","max_runner_weight","durability_rating","responsiveness_rating","comfort_rating","release_year","image_url","description","ai_resilience_score","ai_mileage_estimate","ai_target_usage","ai_narrative","ai_faq","source_url","data_source","last_verified","created_at") SELECT "id","brand","model","slug","series_name","version_number","category","weight","heel_stack_height","forefoot_stack_height","heel_to_toe_drop","cushioning_level","stability","has_carbon_plate","has_super_foam","price","best_for","min_runner_weight","max_runner_weight","durability_rating","responsiveness_rating","comfort_rating","release_year","image_url","description","ai_resilience_score","ai_mileage_estimate","ai_target_usage","ai_narrative","ai_faq","source_url","data_source","last_verified","created_at" FROM "running_shoes";
DROP TABLE "running_shoes";
ALTER TABLE "_running_shoes_evidence" RENAME TO "running_shoes";
UPDATE sqlite_sequence SET seq=MAX(seq,COALESCE((SELECT MAX(seq) FROM "_shoe_catalog_sequence"),0)) WHERE name='running_shoes';
DROP TABLE "_shoe_catalog_sequence";
CREATE INDEX "running_shoes_brand_idx" ON "running_shoes" ("brand");
CREATE INDEX "running_shoes_category_idx" ON "running_shoes" ("category");
CREATE INDEX "running_shoes_slug_idx" ON "running_shoes" ("slug");
CREATE INDEX "running_shoes_series_idx" ON "running_shoes" ("series_name");
PRAGMA foreign_key_check;
PRAGMA defer_foreign_keys = OFF;

ALTER TABLE phone_runs ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata));

-- Lossless migration baseline, not the production billing projection.
-- No payment credentials or provider calls are needed by this database.
CREATE TABLE migration_stripe_snapshot (
  source_table TEXT NOT NULL,
  source_ordinal INTEGER NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  PRIMARY KEY(source_table,source_ordinal)
);

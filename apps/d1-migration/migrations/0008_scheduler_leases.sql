CREATE TABLE scheduler_leases (
  name TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL
);

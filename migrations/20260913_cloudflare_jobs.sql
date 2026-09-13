-- Additive migration. Run before enabling Cloudflare production processing.
-- Does not modify existing runner data or enable any worker.
BEGIN;
CREATE TABLE IF NOT EXISTS cloudflare_jobs (
  id text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('LIST_ACTIVITIES','HYDRATE_ACTIVITY','GENERATE_COACH_RECAP','FINALIZE_SYNC','STRAVA_WEBHOOK')),
  data jsonb NOT NULL,
  priority integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  scheduled_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL CHECK (max_attempts BETWEEN 1 AND 20),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  lease_owner text,
  lease_until timestamptz,
  finished_at timestamptz,
  error_code text
);
CREATE INDEX IF NOT EXISTS cloudflare_jobs_due_idx ON cloudflare_jobs (status, scheduled_at, priority);
CREATE INDEX IF NOT EXISTS cloudflare_jobs_user_idx ON cloudflare_jobs (user_id, status, created_at DESC);
COMMIT;

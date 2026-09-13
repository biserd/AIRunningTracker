-- Request-scoped D1 batch coordination. No scheduler is enabled here.
CREATE TRIGGER d1_job_id_owner_guard BEFORE INSERT ON cloudflare_jobs
WHEN EXISTS(SELECT 1 FROM cloudflare_jobs WHERE id=NEW.id AND user_id<>NEW.user_id)
BEGIN SELECT RAISE(ABORT,'JOB_OWNER_MISMATCH'); END;
CREATE TABLE d1_job_completions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES cloudflare_jobs(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  lease_owner TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  processed_count INTEGER NOT NULL CHECK(processed_count BETWEEN 0 AND 1000000),
  activities_count INTEGER NOT NULL CHECK(activities_count BETWEEN 0 AND 1000000)
);
CREATE TRIGGER d1_job_completion_guard BEFORE INSERT ON d1_job_completions
WHEN NOT EXISTS(SELECT 1 FROM cloudflare_jobs j WHERE j.id=NEW.job_id AND j.user_id=NEW.user_id
  AND j.status='processing' AND j.lease_owner=NEW.lease_owner AND j.lease_until>NEW.completed_at)
BEGIN SELECT RAISE(ABORT,'JOB_LEASE_LOST'); END;
CREATE TRIGGER d1_job_completion_apply AFTER INSERT ON d1_job_completions BEGIN
  UPDATE users SET sync_progress=coalesce(sync_progress,0)+NEW.processed_count,
    sync_total=coalesce(sync_total,0)+NEW.activities_count
    WHERE id=NEW.user_id AND EXISTS(SELECT 1 FROM cloudflare_jobs WHERE id=NEW.job_id AND type='LIST_ACTIVITIES');
  UPDATE cloudflare_jobs SET status='completed',finished_at=NEW.completed_at,lease_owner=NULL,lease_until=NULL
    WHERE id=NEW.job_id;
END;
CREATE TRIGGER d1_job_initial_sync AFTER INSERT ON cloudflare_jobs
WHEN NEW.type='LIST_ACTIVITIES' AND json_extract(NEW.data,'$.page')=1
BEGIN UPDATE users SET sync_status='running',sync_progress=0,sync_total=0,sync_error=NULL WHERE id=NEW.user_id; END;

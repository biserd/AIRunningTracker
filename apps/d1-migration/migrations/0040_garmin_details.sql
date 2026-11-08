-- Optional detailed activity and wellness data. Existing summary consents stay intact.
CREATE TABLE garmin_detail_consents (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 category TEXT NOT NULL CHECK(category IN ('activity','recovery','additional')),
 consented_at TEXT NOT NULL,
 PRIMARY KEY(user_id,category)
);
CREATE TABLE garmin_detail_records (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL,
 record_id TEXT NOT NULL,
 calendar_date TEXT NOT NULL,
 consented_at TEXT NOT NULL,
 received_at TEXT NOT NULL,
 generation TEXT NOT NULL,
 summary TEXT NOT NULL CHECK(json_valid(summary)),
 PRIMARY KEY(user_id,kind,record_id)
);
CREATE INDEX garmin_detail_retention ON garmin_detail_records(kind,calendar_date);
CREATE TABLE garmin_detail_chunks (
 user_id INTEGER NOT NULL,
 kind TEXT NOT NULL,
 record_id TEXT NOT NULL,
 generation TEXT NOT NULL,
 chunk INTEGER NOT NULL,
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 PRIMARY KEY(user_id,kind,record_id,generation,chunk),
 FOREIGN KEY(user_id,kind,record_id) REFERENCES garmin_detail_records(user_id,kind,record_id) ON DELETE CASCADE
);
CREATE TABLE garmin_file_jobs (
 id TEXT PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 activity_id TEXT NOT NULL,
 consented_at TEXT NOT NULL,
 metadata TEXT NOT NULL CHECK(json_valid(metadata)),
 callback TEXT,
 state TEXT NOT NULL DEFAULT 'pending',
 received_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 retry_at TEXT NOT NULL,
 lease_until TEXT,
 attempts INTEGER NOT NULL DEFAULT 0,
 failure TEXT
);
CREATE INDEX garmin_files_due ON garmin_file_jobs(state,retry_at);
CREATE TABLE garmin_file_blobs (
 job_id TEXT NOT NULL REFERENCES garmin_file_jobs(id) ON DELETE CASCADE,
 chunk INTEGER NOT NULL,
 payload TEXT NOT NULL,
 PRIMARY KEY(job_id,chunk)
);

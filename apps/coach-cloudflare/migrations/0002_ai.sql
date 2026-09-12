CREATE TABLE ai_jobs (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running','done','failed')),
  result TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(session_id,id)
);
CREATE INDEX ai_jobs_created ON ai_jobs(created_at);
CREATE UNIQUE INDEX ai_one_chat ON ai_jobs(session_id) WHERE kind='chat' AND status='running';
CREATE TABLE coach_messages (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX coach_messages_session ON coach_messages(session_id,sequence);

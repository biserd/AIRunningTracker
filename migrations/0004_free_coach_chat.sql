CREATE TABLE IF NOT EXISTS free_coach_chat_usage (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  messages_used INTEGER NOT NULL CHECK (messages_used >= 0)
);

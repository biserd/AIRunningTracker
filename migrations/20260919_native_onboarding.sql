-- Additive only. No existing subscriptions or runner records are modified.
CREATE TABLE IF NOT EXISTS native_signup_challenges (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS native_signup_expiry ON native_signup_challenges(expires_at);
CREATE TABLE IF NOT EXISTS apple_purchase_accounts (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  app_account_token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS apple_subscription_events (
  notification_id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK(environment IN ('Sandbox','Production')),
  received_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS apple_subscriptions (
  original_transaction_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK(environment IN ('Sandbox','Production')),
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  signed_at INTEGER NOT NULL,
  PRIMARY KEY(original_transaction_id,environment)
);
CREATE INDEX IF NOT EXISTS apple_subscription_runner ON apple_subscriptions(user_id,environment,expires_at);
CREATE TABLE IF NOT EXISTS native_strava_connections (
  state_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

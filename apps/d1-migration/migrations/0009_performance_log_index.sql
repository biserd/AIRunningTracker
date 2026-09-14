-- Additive covering index for bounded admin telemetry reads and date-sorted logs.
-- No log rows are modified or removed. Safe to execute again.
CREATE INDEX IF NOT EXISTS performance_logs_timestamp_metrics_idx
ON performance_logs(timestamp, elapsed_time, status_code);

// Report at the delivery grain so repeats, multiple devices and multiple
// distinct subscriptions attached to one delivery cannot increase a stage.
// SQL is shared by the admin API and SQLite/D1 compatibility tests.
export const signupEmailFunnelQuery = `
  WITH sent AS (
    SELECT id, step,
      CASE step WHEN 'DAY1' THEN 'signup_day1' WHEN 'DAY7' THEN 'signup_day7' ELSE 'signup_day14' END AS source,
      CASE WHEN metadata->>'signupEmailTracking' = '1' THEN 1 ELSE 0 END AS trackable
    FROM email_jobs
    WHERE job_type = 'drip' AND campaign = 'signup_unpaid' AND campaign_version = 3
      AND status = 'sent' AND step IN ('DAY1', 'DAY7', 'DAY14')
  ), clicked AS (
    SELECT DISTINCT job_id FROM email_clicks
    WHERE campaign = 'signup_unpaid' AND source = 'signup_direct' AND job_id IS NOT NULL
  ), finished AS (
    SELECT DISTINCT properties->>'signupEmailJobId' AS job_id, source, event
    FROM funnel_events
    WHERE event IN ('tool_completed', 'signup_email_trial_started') AND properties->>'signupEmailJobId' IS NOT NULL
  )
  SELECT s.step,
    CAST(COUNT(*) AS INTEGER) AS sent,
    CAST(SUM(s.trackable) AS INTEGER) AS trackable,
    CAST(COUNT(c.job_id) AS INTEGER) AS clicked,
    CAST(COUNT(r.job_id) AS INTEGER) AS results,
    CAST(COUNT(t.job_id) AS INTEGER) AS trials
  FROM sent s
  LEFT JOIN clicked c ON c.job_id = s.id
  LEFT JOIN finished r ON r.job_id = CAST(c.job_id AS TEXT) AND r.source = s.source AND r.event = 'tool_completed'
  LEFT JOIN finished t ON t.job_id = CAST(c.job_id AS TEXT) AND t.source = s.source AND t.event = 'signup_email_trial_started'
  GROUP BY s.step
`;

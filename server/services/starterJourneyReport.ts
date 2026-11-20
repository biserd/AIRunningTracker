// Rows are at runner grain. The first dashboard session is selected across
// all recorded history, before applying the 30-day presentation window.
export const starterJourneyReportSql = `
WITH first_visits AS (
  SELECT f.user_id, f.occurred_at, f.properties->>'session' AS sid,
    ROW_NUMBER() OVER (PARTITION BY f.user_id ORDER BY f.occurred_at, f.id) AS seq
  FROM funnel_events f JOIN users u ON u.id=f.user_id
  WHERE f.event='starter_journey' AND f.properties->>'action'='dashboard_started'
    AND COALESCE(u.is_admin,0)=0
    AND julianday(f.occurred_at)-julianday(u.created_at) BETWEEN 0 AND 7
), cohort AS (
  SELECT user_id, occurred_at, sid FROM first_visits
  WHERE seq=1 AND julianday(occurred_at) >= julianday(?) - 30 AND julianday(occurred_at) <= julianday(?)
), runner AS (
  SELECT c.user_id,
    CASE WHEN julianday(c.occurred_at) <= julianday(?) - 7 THEN 1 ELSE 0 END mature,
    MAX(CASE WHEN f.properties->>'session'=c.sid AND f.properties->>'action'='run_opened' THEN 1 ELSE 0 END) run_opened,
    MAX(CASE WHEN f.properties->>'session'=c.sid AND f.properties->>'action'='prediction_completed' THEN 1 ELSE 0 END) prediction_completed,
    MAX(CASE WHEN f.properties->>'session'=c.sid AND f.properties->>'action'='week_previewed' THEN 1 ELSE 0 END) week_previewed,
    MAX(CASE WHEN f.properties->>'session'=c.sid AND f.properties->>'action'='week_saved' THEN 1 ELSE 0 END) week_saved,
    MAX(CASE WHEN f.properties->>'session'=c.sid AND f.properties->>'action'='coach_replied' THEN 1 ELSE 0 END) coach_replied,
    MAX(CASE WHEN f.properties->>'session'<>c.sid AND f.properties->>'action' IN ('dashboard_started','dashboard_return')
      AND julianday(f.occurred_at)-julianday(c.occurred_at) BETWEEN 1 AND 7 THEN 1 ELSE 0 END) returned
  FROM cohort c LEFT JOIN funnel_events f ON f.user_id=c.user_id AND f.event='starter_journey'
    AND julianday(f.occurred_at) BETWEEN julianday(c.occurred_at) AND julianday(c.occurred_at)+7
  GROUP BY c.user_id,c.occurred_at
)
SELECT COUNT(*) AS starters, COALESCE(SUM(run_opened),0) AS runs_opened,
  COALESCE(SUM(prediction_completed),0) AS predictions,
  COALESCE(SUM(week_previewed),0) AS weeks_previewed, COALESCE(SUM(week_saved),0) AS weeks_saved,
  COALESCE(SUM(coach_replied),0) AS coach_replies,
  COALESCE(SUM(CASE WHEN (CASE WHEN run_opened+prediction_completed>0 THEN 1 ELSE 0 END)
    +(CASE WHEN week_previewed+week_saved>0 THEN 1 ELSE 0 END)+coach_replied>=2 THEN 1 ELSE 0 END),0) AS two_actions,
  COALESCE(SUM(mature),0) AS return_eligible, COALESCE(SUM(mature*returned),0) AS returned
FROM runner
`;

# Admin API repair, 2026-09-14

## Verified causes

- `/api/admin/performance` failed with `DATABASE_PARAMETER_TYPE`: a raw SQL
  WHERE expression interpolated a JavaScript Date without a column encoder.
  It now uses the typed timestamp comparison, preserving the D1 ISO date codec.
- `/api/admin/stats` ran five sequential queries and returned ten full user and
  activity records even though the UI uses only three counts. It now executes
  one counts-only query, with no credentials, streams, laps or GPS payloads.
- The admin page fetched and polled unrelated hidden sections. Queries now run
  only for their consuming sections, with short freshness windows. Overview
  retains campaign, coach and system health dependencies. Explicit Refresh and
  successful mutations still invalidate admin data.
- Independent campaign analytics/segment queries now run concurrently. Segment
  signal aggregation skips event types that do not contribute to segmentation.

## Baseline

Production logs in the hour before this repair (small observational sample):

| Endpoint | Requests | Average ms | Maximum ms | Status |
| --- | ---: | ---: | ---: | --- |
| stats | 3 | 7596 | 12656 | 200 |
| campaigns/analytics | 4 | 3371 | 6148 | 200 |
| campaigns/segment-stats | 4 | 3404 | 6161 | 200 |
| performance | 4 | 2197 | 6040 | 500 |

## Tests

The full D1 application smoke test covers admin denial, counts-only response,
large hydrated activity histories, performance error/slow-request rows, six
trend buckets and campaign read endpoints. All pass. The 32-test D1, admin
telemetry and lifecycle segmentation suite also passes. Campaign sending-state
settings are unchanged.

## Database follow-up

The telemetry table had 295,944 rows and no indexes. The planner reported
`SCAN performance_logs`. Applied the additive, idempotent migration
`0009_performance_log_index.sql` to production. The covering timestamp index
now produces `SEARCH performance_logs USING COVERING INDEX ... (timestamp>?)`.
No log rows were changed or removed. The local application smoke test also
passes with this migration installed.

Application commit: `5af2248`.
Cloudflare build: `cf1eb3df-d829-43ec-806e-b6dadfce2969`.
Production image: `sha256:f43f625019e38c561067a488ff3608069fcdad54add610b4ed6907dc381fa1cb`.
Final Worker version: `ff5bac43-8a9f-4cb7-a91f-eac2a70bed30`.
The one-time restart marker was advanced only after image rollout completion.

Live signed-in System and Campaigns panels render. Post-index checks beginning
11:28 UTC: stats averaged 135 ms (2 requests, 91-178 ms), performance averaged
245 ms (3 requests, 201-310 ms), campaign analytics 93 ms (1 request), segment
stats 210 ms (1 request). All HTTP 200. These are small observational samples,
not a load-test SLA. Historic errors remain visible in the measured one-hour
and 24-hour windows.

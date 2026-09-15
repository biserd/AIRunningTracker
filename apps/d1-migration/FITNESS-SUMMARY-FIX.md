# Fitness summary repair, 2026-09-15

The fitness route now opts into summaryOnly, excluding streams, laps and both
polylines before D1 transport. Calculation, row bounds, ownership and caching
are unchanged. No database migration or data deletion.

Application commit: 53f0e87.
Cloudflare build: b4cfbaee-c2c2-4c97-920f-f9b949e2d412.
Promoted image: 6e0ae8e29997e545a7bea40d2b76fdd0fd34a9f9aec5745c7bd821395e2d4e08.
Final production Worker: 83ab12ec-9103-4440-aced-7d27ede7c946.

Verified production image rollout before advancing the one-time restart marker.
Health and public platform statistics returned HTTP 200 after restart.
Production typecheck, 30 D1 tests, application build and synthetic application
smoke passed. Regression exercises uncached 30/180-day fitness reads with over
12 MB of hydrated payloads, finite metrics, ownership and invalid periods.
Direct signed-in browser API navigation was blocked by the browser; live private
fitness response was not verified during this deployment.

# Production D1 cutover

Cut over on 2026-09-14 UTC, using the existing imported snapshot at the user's
explicit request. No fresh source transfer or additional feature-test gate was
required by the user. The 33 oversized activities remain in Neon and are excluded
from D1; missing-account records remain quarantined.

Production Worker: `aitracker-main`

Worker version: `6905f5f0-359f-46ac-bb80-ee0c6705bf2c`

Container image:
`registry.cloudflare.com/73d71a2bef58f7469ecb48e2b8e84c0e/aitracker-api-staging-runanalyticsweb@sha256:f0cbcde988e7acf898d16939943bbfb06a4aa9709f3db60d997f692fb1d44ffe`

Runtime: `node dist/d1-index.mjs`

Database: `aitracker-d1-migration`, binding `DB`, ID
`5ee1a1a5-44a5-42c9-aa74-d12fe63b08f2`.

Verified after restart:

- `/health`: HTTP 200.
- `/api/platform-stats`: HTTP 200, 570 users, 79,559 activities, 5,172 insights.
- D1 scheduler lease `application`: generation 1, active.

Production no longer passes `DATABASE_URL` into the application container. The
private outbound handler accesses D1 using the native binding. Its transport secret
and the existing production Stripe endpoint signing secret are encrypted Worker
secrets. No secret values are stored in this document.

The first cutover attempt selected a previous image while Cloudflare's image rollout
was unfinished. Startup failed with a missing D1 bundle. Service was restored to the
PostgreSQL entrypoint, then the completed image was promoted and D1 startup succeeded.

Rollback resources remain available. Neon was not modified or deleted. A rollback
after new D1 writes needs data reconciliation; do not blindly discard those writes.
Worker-only rollback is insufficient after introducing ContainerProxy: the compatible
proxy export must remain, and the container must be restarted with the PostgreSQL
entrypoint and DATABASE_URL. The old pre-migration image is
`sha256:577da0c8c95bea75f6cbce8bb2dc6022de6fc56c65fb1369ef3139970beccf66`.

This records infrastructure cutover, not full feature certification. The unported
Telegram transactions and other unverified workflows remain as documented in
APPLICATION-STATUS.md. The separate existing staging deployment still uses Neon.

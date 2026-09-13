# Cloudflare production API migration

This is the isolated staging entry point, not the sample coach and not production.
Use Node 24 LTS (Wrangler requires Node 22 or newer).

Run `npm ci`, `npm run check`, `npm test`, then `npm run build` (a deployment dry run).
`npm run dev` serves port 8792. GET/HEAD `/health` reports liveness, not readiness.
POST `/api/auth/login` verifies existing bcrypt passwords and issues a staging-only
session. GET `/api/user`, `/api/auth/user`, `/api/activities` and
`/api/activities/:id` require that session. Other routes return 503.

`npm run deploy:staging` deploys only the staging Worker. There is no production
deploy command or route. The approved Neon connection is available through
`env.HYPERDRIVE`, using Hyperdrive `aitracker-neon-staging` with caching disabled.
Credentials live in Hyperdrive, not in this repository. The health handler
does not query the database or expose records. Hyperdrive validated connectivity
and credentials when the connection was created on 2026-09-13.

The supplied database is not verified to be a sanitized development copy. Do not
run migrations, writes or background jobs against it. Its current database-owner
role is not least privilege; the initial adapters enforce read-only transactions.
For local development, provide a separate local PostgreSQL connection via
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` in your local environment.

See [the migration plan](../../docs/CLOUDFLARE_MIGRATION.md) for readiness gates and
the Neon-first database strategy. Do not import the root server's boot entrypoint.

The initial `session.ts` and `runner-reads.ts` adapters are registered through
`http-api.ts`. They verify web-session signatures with a separate staging key,
reject magic-link tokens as sessions, scope queries to the verified runner, select
explicit fields, bound pagination and use request-scoped read-only transactions.
They are not full authentication, analytics or existing API response parity.
The user declined the optional Access gate. Login has IP rate limiting and reads
have runner rate limiting. The Cloudflare rate-limit binding is location-local,
not a globally exact account lockout. Successful real-runner login still needs
end-to-end verification; the live invalid-login path has been verified.
Pagination uses `limit` (1..50) and an optional `beforeId`, ordered by descending
record ID; this is not yet the main frontend's date-based activity contract.
See `docs/CLOUDFLARE_SECRET_HANDOVER.md` at the
repository root for credential continuity and shutdown gates.

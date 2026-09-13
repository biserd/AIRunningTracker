# Cloudflare production API migration

This is the isolated staging entry point, not the sample coach and not production.
Use Node 24 LTS (Wrangler requires Node 22 or newer).

Run `npm ci`, `npm run check`, `npm test`, then `npm run build` (a deployment dry run).
`npm run dev` serves port 8792. Only GET/HEAD `/health` succeeds. All other requests
return 503 until the relevant production modules are safely ported.

`npm run deploy:staging` deploys only the staging Worker. There is no production
deploy command or route, and no credentials/resource bindings are configured.

See [the migration plan](../../docs/CLOUDFLARE_MIGRATION.md) for readiness gates and
the Neon-first database strategy. Do not import the root server's boot entrypoint.

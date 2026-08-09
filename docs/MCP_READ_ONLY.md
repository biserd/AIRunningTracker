# RunAnalytics read-only MCP server

RunAnalytics exposes two standards-based Model Context Protocol Streamable HTTP endpoints:

- Private runner data: `https://aitracker.run/mcp`
- Anonymous public catalog: `https://aitracker.run/mcp/public`

The private endpoint uses a dedicated OAuth authorization-code flow with PKCE S256. It does not accept RunAnalytics web-session JWTs, email magic-link tokens, Strava tokens, or Stripe credentials. The public endpoint contains only approved shoe and RunAnalytics tool catalog reads and cannot reach private account data.

## Discovery and client registration

- OAuth authorization-server metadata: `https://aitracker.run/.well-known/oauth-authorization-server`
- OAuth protected-resource metadata: `https://aitracker.run/.well-known/oauth-protected-resource/mcp`
- Human-readable service documentation: `https://aitracker.run/docs/mcp`
- Dynamic client registration: `POST https://aitracker.run/mcp/oauth/register`

Clients are public OAuth clients. They must register one to five exact redirect URIs, use authorization code plus PKCE S256, and send the resource indicator `https://aitracker.run/mcp` to both the authorization and token endpoints. HTTPS redirects are required except for HTTP loopback redirects such as `http://127.0.0.1:<port>/callback`.

Example registration:

```http
POST /mcp/oauth/register HTTP/1.1
Host: aitracker.run
Content-Type: application/json

{
  "client_name": "Example MCP client",
  "redirect_uris": ["https://client.example/oauth/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

The authorization endpoint is `/mcp/oauth/authorize`, the token endpoint is `/mcp/oauth/token`, and revocation is `/mcp/oauth/revoke`. Access tokens are opaque, expire after 15 minutes, and are bound to the exact MCP resource. Refresh tokens expire after 30 days and rotate on every use. Authorization codes are single-use, expire after five minutes, and are bound to the client, redirect URI, resource, and PKCE challenge.

## Scopes and tools

| Scope | Private tools |
|---|---|
| `mcp:profile.read` | `get_runner_profile` |
| `mcp:activities.read` | `list_activities`, `get_activity` |
| `mcp:analytics.read` | `get_dashboard_trends`, `get_fitness_metrics`, `get_recovery_status`, `get_runner_score` |
| `mcp:goals.read` | `list_goals` |
| `mcp:plans.read` | `list_training_plans`, `get_training_plan` |

The anonymous public endpoint exposes only `search_running_shoes`, `get_running_shoe`, and `list_runanalytics_tools`.

Two analysis-ready coaching tools reduce agent latency without expanding access. `get_runner_coach_snapshot` requires all five private read scopes because it composes profile, activities, analytics, goals, and the current plan week. `get_post_run_brief` requires profile, activities, analytics, and plans. Both remain bounded, ownership-scoped, and read-only; they are not registered when any required scope is absent.

No MCP resources or prompts are registered. No tool creates, edits, deletes, enriches, imports, syncs, sends email, starts background processing, changes billing, executes SQL, or invokes an arbitrary application route. Private tool inputs contain no user ID; the user is always derived from the validated OAuth token subject. Foreign and missing object IDs produce the same `not_found` response.

## Bounds and operational behavior

- Activity pages contain at most 100 records and date ranges at most 365 days.
- Dashboard comparisons contain at most 180 days per period; fitness history contains at most 180 days.
- Activity detail omits raw GPS, full streams, Strava identifiers, credentials, and internal fields. Laps are capped at 100.
- Plan detail is capped at 32 weeks and seven days per week; goals, plans, shoes, and public tools have fixed result limits.
- Tool execution is capped at eight seconds.
- Private traffic is limited per OAuth client and runner; public traffic is limited per source address. Counters live in PostgreSQL so limits apply across autoscaled instances.
- OAuth endpoints and private MCP responses use `Cache-Control: no-store`.
- MCP request/response bodies and Authorization headers are excluded from application performance logs. Audit rows store only event type, runner/client IDs, tool name, success/error category, duration, and timestamp—not bearer tokens, arguments, or response bodies.

## Production configuration

Set these deployment secrets before enabling private access:

- `MCP_TOKEN_HASH_SECRET`: a randomly generated value of at least 32 characters, separate from every web-session, magic-link, Stripe, Strava, and provider secret. Rotating or removing it invalidates all outstanding MCP authorization artifacts and tokens.
- `MCP_ISSUER`: normally `https://aitracker.run`. The issuer determines the advertised endpoints and the exact accepted resource/audience.
- `MCP_ALLOWED_ORIGINS`: optional comma-separated additional trusted browser origins. Do not use `*`.
- `MCP_ALLOWED_HOSTS`: optional comma-separated additional exact host names for preview environments. Production should normally need only `aitracker.run`; do not use `*`.

Startup creates only dedicated `mcp_*` authorization, audit, and rate-limit tables with idempotent statements. It does not modify runner, activity, goal, plan, subscription, or catalog rows. The production database role therefore needs permission to create these tables and indexes during the first deployment; afterwards normal read/write access to the `mcp_*` operational tables is sufficient.

## Verification checklist

1. Fetch both metadata documents and confirm every URL uses the production HTTPS issuer.
2. Register a test public client and complete consent with each scope independently.
3. Confirm a web JWT, magic-link token, expired access token, revoked token, wrong resource, wrong redirect URI, reused code, and wrong PKCE verifier all fail.
4. Query two controlled runner accounts and confirm cross-account activity and plan IDs both return the same `not_found` result as missing IDs.
5. Inspect production logs to confirm Authorization values, tool arguments, and response bodies are absent.
6. Exercise page, date-range, timeout, and rate limits from two autoscale instances.
7. Confirm the public endpoint works without OAuth and never advertises private tools.
8. Run `npm run test:mcp` plus the normal release test suite.

## Disable and rollback

To disable private MCP access immediately, remove or rotate `MCP_TOKEN_HASH_SECRET` and redeploy. Private authorization and bearer validation then return a temporary-unavailable response while the public catalog remains available. To disable both endpoints, remove the `registerMcpRoutes` call and redeploy. Existing `mcp_*` tables may remain safely in place for audit retention; dropping them is not required for rollback.

This server is request-scoped and creates no scheduler, worker, persistent MCP session, AI-generation job, sync, or email operation.

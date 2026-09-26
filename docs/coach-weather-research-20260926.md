# Shared coach weather and public research

## Conversational WhatsApp weather — 2026-09-26

- Coach version: `e977a65a-1950-47d7-ad00-ca651e2d6702`.
- Weather follows an explicitly named city across a recent conversation (up to
  12 server-loaded turns, two hours). New explicit cities take precedence. No
  city is inferred from run coordinates, assistant guesses or private profiles;
  no new account preference or schema is written. History remains session-scoped.
- WhatsApp receives the resolved conversational city and instructions to answer
  naturally, fetch the new forecast date, and give at most one useful running
  suggestion. Weather continuity is also available to the shared chat lookup.
- WhatsApp research answers no longer append source blocks or URLs. Plain-text
  normalization removes malformed Markdown and legacy citation footers while
  preserving ordinary account/help action links. Web citation rendering is unchanged.
- Weather web research is domain-filtered to official meteorological services;
  unofficial citations invalidate the result. Active-alert claims are rejected
  because this tool does not verify a live alert feed. General research cannot
  bypass the weather checks. Public cache key v2 avoids reusing older forecasts
  that were retrieved under the previous sourcing policy.
- TypeScript, production build, dry run and 104 unit tests passed (one skipped).
  Workers-runtime tests passed for forecast caching, city aliases, follow-up
  dates and isolation from another runner without conversation context.
- Production deployment confirmed at 100%; preview and main health returned 200.
  Mocked provider/model tests cover the reported two-turn exchange; physical
  WhatsApp/provider delivery still needs a fresh runner test after deployment.
- Main backend, iOS, database, secrets and consent settings are unchanged.
  Rollback coach version: `b801a7fa-98cd-40de-b421-93828db2498e`.

## NYC alias hotfix — 2026-09-26

- Coach Worker deployed at 100%: `b801a7fa-98cd-40de-b421-93828db2498e`.
- Explicit `NYc`, `NYC` and `N.Y.C.` now match `New York City`, including normal
  NY/state/country qualifiers. The outbound forecast uses canonical New York City.
- This is a fixed public alias mapping, not permission to infer location from
  runs or profiles. Bare `NY`, different cities and unmentioned neighborhoods
  remain rejected. Other cities require the supplied place phrase.
- Structured failure logs now include an allowlisted reason, never raw queries,
  locations, private context or upstream errors.
- Regression suite: 98 passed, one skipped. Workers-runtime cache/alias test,
  TypeScript, frontend build, deployment dry run and diff checks passed.
- Mocked WhatsApp tool loop verifies `What's the weather in NYc` can invoke the
  shared lookup and return sourced output. Cache tests verify aliases share a
  forecast but cannot bypass explicit-location validation.
- Cloudflare confirmed the new version at 100%; preview and main health checks
  returned 200. A fresh physical WhatsApp request is still needed to verify real
  provider retrieval and delivery. No successful live forecast is claimed here.
- Main site, database, secrets and iOS build were not changed. Rollback coach
  version: `9d82b02b-9751-46b9-99a8-a6e13b341e4d`.

## Production release — 2026-09-26

- Application commit: `51e8ed41762bef475757acca580b41f1a2705370`.
- Coach Worker: `9d82b02b-9751-46b9-99a8-a6e13b341e4d` on `new.aitracker.run`, including the existing WhatsApp queue consumer.
- Main backend build: `b2a2c3e3-edc4-45c4-bc26-7606fb2740f5`, verified successful in Cloudflare Builds.
- Promoted immutable container image: `aitracker-api-staging-runanalyticsweb:664dfc57`.
- Main Worker: `b861103f-bdad-4570-8288-5c5cb9c79e1a`. Advanced the existing one-time restart marker so the updated profile contract loads.
- No schema migrations, new provider secrets, consent changes, subscription changes or iOS build. Unrelated native source-link changes remain local.
- `OPENMETEO_API_KEY` is not configured on the coach Worker. Named-city forecasts use cited web research through the existing OpenAI credential; dedicated hourly Open-Meteo service is not activated.
- Coach typecheck, production frontend build and Worker dry run passed. Coach tests: 95 passed, one skipped. Workers-runtime forecast cache test passed. MCP tests: 14 passed, one PostgreSQL-only lifecycle test skipped. D1 application bundle and container typecheck/dry run passed.
- Live checks: main `/health` and `/api/shoes/brands` returned 200; unauthenticated `/api/auth/user` remained 401. Coach landing and preview returned 200 with the new asset bundle.
- Authenticated live forecast/provider access, a physical voice request and WhatsApp delivery still require a signed-in runner test. The browser test session was signed out at release time; no successful end-to-end provider result is claimed.
- Rollback references: coach `43bb40a6-0dfc-4f97-8db7-9ce106eee4c4`; main `49e31d83-7ae5-4f69-a11b-f5569022cc01`, image `c34bd208`. For a main rollback, restore the old image as well as Worker code and advance the one-time restart marker again if needed.

## Channel coverage

- Web and native iOS chat: existing `/api/ai/chat`, shared knowledge tools.
- Web and native iOS voice: existing client delegation to the same chat route;
  the startup instructions explicitly require delegation for weather/research.
- WhatsApp: the same tool schemas and execution, with a bounded two-lookup loop.
  Normal coaching still uses one model request with preloaded running context.
- The classic dashboard's legacy AI analysis and Telegram service are unchanged.

## Weather

Ask `What is the weather in Brooklyn tomorrow for a run?` in any coach channel.
Supplying a city authorizes that lookup only; it does not save location or opt in
to proactive notifications. Missing location prompts for a city instead of reading
coordinates from runs. Dates are validated against the current clock and runner
timezone, not a stale stored plan date. Forecast range is today plus six days.

Without a commercial weather key, named cities use cited web forecasts. The
answer must not invent hourly detail. If an opted-in saved location has a usable
city label, that label can also be used; raw coordinates never enter web search.

Optional encrypted Worker secret: `OPENMETEO_API_KEY` for a licensed Open-Meteo
subscription. The existing opted-in saved coordinates then use
`customer-api.open-meteo.com` for hourly temperature, feels-like temperature,
humidity, rain chance, wind and weather codes. Coordinates are rounded to two
decimal places. The non-commercial free forecast endpoint is not used by this
new shared coach tool. Existing legacy proactive weather code is not migrated by
this change and should be reviewed separately for provider licensing.

Forecasts are cached for 15 minutes through Workers Cache API. Cache keys are
hashed; no runner IDs, credentials, conversations or profiles are cached with
forecasts. Cached results retain their original checkedAt timestamp. Cache is
best-effort, regional and not a source of account authorization.

WhatsApp reads weather preferences through its existing authorized, read-only
MCP profile scope. The primary backend change is additive profile fields only;
it returns coordinates only for an explicit weather opt-in, rounded to two
decimal places. No new database tables, migrations, scopes or R2 objects.

## Public research

Try `Compare Nike Pegasus and Brooks Ghost specifications and current prices`.
The personalized coach stays on its existing model. The isolated research
request uses `gpt-4.1` with Responses API `web_search`, `store:false`, at most two
search calls and a 20-second timeout. Production model/tool access must be
verified before declaring live readiness. Uses the existing server OpenAI key
and AI Gateway if configured; no provider credentials reach clients.

Only validated public keywords from the current user message and generic running
terms can enter search. Hidden context, names, email addresses, account links,
credentials and common personal metric formats are blocked. The separate
research request receives no runner state/history or action tools. On follow-up
questions, the coach may ask for exact public names again rather than copying
private context into a query. This is intentionally conservative.

Sources must come from provider citation annotations, not model-invented links.
Known tracking parameters are removed; unsafe/private/login URLs are rejected.
Source links are appended server-side for web/iOS; WhatsApp now retains evidence
inside the lookup only and presents concise plain text without citation blocks.
Web renders clickable source links. The iOS source-link view requires a new
native build; older builds still receive the plain-text URLs and lookup answers.

After any external lookup, action tools are disabled for the rest of that turn
and rejected server-side even if requested anyway. The runner can ask for a plan
or reminder change in a separate message. Webpages cannot authorize writes.
Failures return an explicit unavailable result, never a guessed fallback.

## Validation and rollout

1. Run coach TypeScript checks, unit tests, Vite build and Worker dry run.
2. Run primary-backend MCP tests/types for the additive weather preferences.
3. Compile native source links/tests using the existing iPhone/iPad CI workflow.
4. Deploy the primary MCP profile addition and coach Worker through their normal
   separate release processes. No DNS/auth/billing changes are required.
5. Test from the authorized test account: named-city weather, saved opt-in
   weather, shoes with sources, invalid date, missing location, and failed lookup.
6. Test voice on a real device and send one WhatsApp question; verify source
   links, typing feedback, and unchanged reminders/plan approval behavior.

Logs expose only lookup name, duration and a fixed failure category (`coach_lookup`,
`coach_lookup_failed`), never queries, locations, URLs, tokens or provider bodies.

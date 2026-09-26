# Shared coach weather and public research

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
Source links are appended server-side and retained inside WhatsApp's text limit.
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

Logs expose only lookup name, duration and failure state (`coach_lookup`,
`coach_lookup_failed`), never queries, locations, URLs, tokens or provider bodies.

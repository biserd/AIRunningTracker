# Monthly Shoe Database Auto-Refresh

The running-shoe catalog at `/tools/shoes` is kept evergreen by a monthly
job that re-imports the curated dataset, runs AI enrichment for any new
rows, optionally backfills product images, and emails an admin summary.

## What runs

Entry point: `scripts/refresh-shoe-database.ts`

The script is a thin orchestrator that spawns:

1. `scripts/import-latest-shoes.ts <CURATED_SHOES_JSON>` — upserts shoes
   from the curated JSON (`onConflictDoUpdate` preserves existing
   `aiNarrative`, `aiFaq`, and image URLs).
2. `scripts/generate-shoe-insights.ts` — fills `aiNarrative`, `aiFaq`,
   `aiResilienceScore`, `aiMileageEstimate`, `aiTargetUsage` for every
   shoe still missing them (uses OpenAI `gpt-4o-mini`).
3. `scripts/backfill-shoe-images.ts <IMAGE_MAP_JSON>` — only runs if
   `attached_assets/shoe-image-urls.json` is present.

After running, an HTML + plain-text summary email is sent via the
existing Resend service (`server/services/email.ts`). The subject is
either `[RunAnalytics] Shoe DB refresh ✓ X new, Y enriched` on success
or `[RunAnalytics] Shoe DB refresh FAILED — see details` on any
non-zero step. Crashes are caught and a separate
`[RunAnalytics] Shoe DB refresh CRASHED` email is sent before the
process exits with code `1`.

## Required environment / secrets

| Variable                   | Required | Purpose                                                        |
| -------------------------- | -------- | -------------------------------------------------------------- |
| `DATABASE_URL`             | yes      | Postgres connection (same as web app)                          |
| `OPENAI_API_KEY`           | yes      | AI enrichment in `generate-shoe-insights.ts`                   |
| `RESEND_API_KEY`           | yes      | Admin summary email                                            |
| `RESEND_FROM_EMAIL`        | no       | Defaults to the value already set in `.replit` `[userenv]`     |
| `SHOE_REFRESH_ADMIN_EMAIL` | no       | Override admin recipient (defaults to `hello@bigappledigital.nyc`) |
| `CURATED_SHOES_JSON`       | no       | Override the curated JSON path (default `attached_assets/shoes-2026-curated.json`) |

Replit Scheduled Deployments inherit the repl's secrets, so the keys
already configured for the web app are reused — no extra setup
required.

## Manual run (testing)

```bash
npx tsx scripts/refresh-shoe-database.ts
```

To preview without sending an email, temporarily unset `RESEND_API_KEY`
— the email service will log the would-send instead.

## Setting up the monthly schedule (one-time, UI action)

Replit's `.replit` file supports a single `[deployment]` block, which
this repl already uses for the autoscale web app. The monthly refresh
must therefore be published as a **separate** Scheduled Deployment from
the Replit Publishing UI:

1. Open **Tools → Publishing** in the Replit workspace.
2. Click **New deployment** and choose **Scheduled**.
3. Configure:
   - **Run command:** `npx tsx scripts/refresh-shoe-database.ts`
   - **Schedule:** monthly — recommended cron `0 9 1 * *`
     (09:00 UTC on the 1st of every month).
   - **Machine:** the smallest tier is sufficient; the job typically
     finishes in well under 10 minutes when there are only a handful
     of new shoes.
4. Confirm the deployment inherits all repl secrets
   (`DATABASE_URL`, `OPENAI_API_KEY`, `RESEND_API_KEY`).
5. Click **Deploy** and trigger one manual run from the Publishing UI
   to confirm the admin email arrives.

The autoscale web deployment in `.replit` is unaffected; the two
deployments are independent.

## Failure surfacing

- Per-step failures: each spawned script's stdout/stderr is captured
  (last 4 KB) and embedded in the summary email under its step heading.
- Exit code: any failed step makes the orchestrator exit non-zero,
  which marks the Scheduled Deployment run as failed in the Replit
  dashboard.
- Crashes: an uncaught exception still triggers a CRASHED email before
  the process exits.

## Updating the curated source

When new shoes (e.g. Brooks Ghost 19, Saucony Triumph 25) land
mid-cycle, drop a fresh JSON at
`attached_assets/shoes-2026-curated.json` (or set `CURATED_SHOES_JSON`
to a different path on the Scheduled Deployment) — the next monthly
run picks it up automatically.

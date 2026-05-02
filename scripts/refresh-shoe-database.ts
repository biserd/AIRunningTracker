/**
 * Monthly automatic refresh of the running-shoes database.
 *
 * Designed to run as a Replit Scheduled Deployment (cron). Steps:
 *   1. Run the typed importer against the curated JSON
 *      (attached_assets/shoes-2026-curated.json by default — override
 *       with CURATED_SHOES_JSON env var to point at a fresher feed).
 *   2. Run AI enrichment to fill aiNarrative / aiFaq / etc. for any
 *      newly-inserted rows.
 *   3. Optionally run the image backfill if attached_assets/shoe-image-urls.json
 *      exists.
 *   4. Email an admin summary (counts of inserted / enriched / image-filled
 *      rows, plus any errors) via the existing Resend service.
 *
 * The script is intentionally a thin orchestrator: each underlying script
 * stays usable on its own, and this file just wires them together.
 *
 * Usage (manual): npx tsx scripts/refresh-shoe-database.ts
 * Usage (cron):   configured via Replit Scheduled Deployments
 *                 (run command: "npx tsx scripts/refresh-shoe-database.ts")
 */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db } from '../server/db';
import { runningShoes } from '../shared/schema';
import { sql } from 'drizzle-orm';
import { emailService } from '../server/services/email';

interface StepResult {
  name: string;
  ok: boolean;
  output: string;
  durationMs: number;
}

const ADMIN_EMAIL =
  process.env.SHOE_REFRESH_ADMIN_EMAIL ||
  process.env.ADMIN_EMAIL ||
  'hello@bigappledigital.nyc';

const CURATED_JSON =
  process.env.CURATED_SHOES_JSON ||
  path.resolve(process.cwd(), 'attached_assets', 'shoes-2026-curated.json');

const IMAGE_MAP_JSON = path.resolve(
  process.cwd(),
  'attached_assets',
  'shoe-image-urls.json',
);

function runStep(name: string, args: string[]): Promise<StepResult> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn('npx', ['tsx', ...args], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => {
      const chunk = d.toString();
      out += chunk;
      process.stdout.write(`[${name}] ${chunk}`);
    });
    child.stderr.on('data', (d) => {
      const chunk = d.toString();
      out += chunk;
      process.stderr.write(`[${name}] ${chunk}`);
    });
    child.on('close', (code) => {
      resolve({
        name,
        ok: code === 0,
        output: out.slice(-4000),
        durationMs: Date.now() - t0,
      });
    });
    child.on('error', (err) => {
      resolve({
        name,
        ok: false,
        output: `Failed to spawn: ${err.message}`,
        durationMs: Date.now() - t0,
      });
    });
  });
}

async function getCounts() {
  const rows = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      withNarrative: sql<number>`COUNT(*) FILTER (WHERE ${runningShoes.aiNarrative} IS NOT NULL)::int`,
      withFaq: sql<number>`COUNT(*) FILTER (WHERE ${runningShoes.aiFaq} IS NOT NULL)::int`,
      withImage: sql<number>`COUNT(*) FILTER (WHERE ${runningShoes.imageUrl} IS NOT NULL)::int`,
      missingNarrative: sql<number>`COUNT(*) FILTER (WHERE ${runningShoes.aiNarrative} IS NULL)::int`,
      missingFaq: sql<number>`COUNT(*) FILTER (WHERE ${runningShoes.aiFaq} IS NULL)::int`,
      missingImage: sql<number>`COUNT(*) FILTER (WHERE ${runningShoes.imageUrl} IS NULL)::int`,
    })
    .from(runningShoes);
  return rows[0];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function refresh() {
  const startedAt = new Date();
  console.log(`\n=== Shoe DB monthly refresh — ${startedAt.toISOString()} ===\n`);

  const before = await getCounts();
  console.log('Before:', before);

  const steps: StepResult[] = [];

  if (!fs.existsSync(CURATED_JSON)) {
    steps.push({
      name: 'import',
      ok: false,
      output: `Curated JSON not found at ${CURATED_JSON}`,
      durationMs: 0,
    });
  } else {
    steps.push(await runStep('import', ['scripts/import-latest-shoes.ts', CURATED_JSON]));
  }

  steps.push(await runStep('enrich', ['scripts/generate-shoe-insights.ts']));

  if (fs.existsSync(IMAGE_MAP_JSON)) {
    steps.push(await runStep('images', ['scripts/backfill-shoe-images.ts', IMAGE_MAP_JSON]));
  } else {
    console.log(`(skipping image backfill — no ${path.relative(process.cwd(), IMAGE_MAP_JSON)})`);
  }

  const after = await getCounts();
  console.log('After:', after);

  const allOk = steps.every((s) => s.ok);
  const subject = allOk
    ? `[RunAnalytics] Shoe DB refresh ✓ ${after.total - before.total} new, ${after.withNarrative - before.withNarrative} enriched`
    : `[RunAnalytics] Shoe DB refresh FAILED — see details`;

  const stepRows = steps
    .map(
      (s) => `<tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.ok ? '✓' : '✗'}</td>
        <td>${(s.durationMs / 1000).toFixed(1)}s</td>
      </tr>`,
    )
    .join('');

  const stepLogs = steps
    .map(
      (s) => `<h3>${s.name} ${s.ok ? '✓' : '✗'}</h3>
        <pre style="background:#f6f6f6;padding:8px;font-size:11px;overflow:auto">${escapeHtml(s.output || '(no output)')}</pre>`,
    )
    .join('');

  const html = `
<h2>RunAnalytics — Monthly shoe-DB refresh</h2>
<p><em>Started ${startedAt.toISOString()} — finished ${new Date().toISOString()}</em></p>

<h3>Summary</h3>
<table border="1" cellpadding="4" cellspacing="0">
  <tr><th></th><th>Before</th><th>After</th><th>Δ</th></tr>
  <tr><td>Total shoes</td><td>${before.total}</td><td>${after.total}</td><td>${after.total - before.total}</td></tr>
  <tr><td>With AI narrative</td><td>${before.withNarrative}</td><td>${after.withNarrative}</td><td>${after.withNarrative - before.withNarrative}</td></tr>
  <tr><td>With AI FAQ</td><td>${before.withFaq}</td><td>${after.withFaq}</td><td>${after.withFaq - before.withFaq}</td></tr>
  <tr><td>With image</td><td>${before.withImage}</td><td>${after.withImage}</td><td>${after.withImage - before.withImage}</td></tr>
  <tr><td>Missing narrative</td><td colspan="2"></td><td>${after.missingNarrative}</td></tr>
  <tr><td>Missing FAQ</td><td colspan="2"></td><td>${after.missingFaq}</td></tr>
  <tr><td>Missing image</td><td colspan="2"></td><td>${after.missingImage}</td></tr>
</table>

<h3>Steps</h3>
<table border="1" cellpadding="4" cellspacing="0">
  <tr><th>Step</th><th>OK</th><th>Duration</th></tr>
  ${stepRows}
</table>

${stepLogs}
`;

  const text = [
    `RunAnalytics — Monthly shoe-DB refresh`,
    `Started ${startedAt.toISOString()}`,
    ``,
    `Total: ${before.total} → ${after.total} (Δ ${after.total - before.total})`,
    `AI narrative: ${before.withNarrative} → ${after.withNarrative}`,
    `AI FAQ: ${before.withFaq} → ${after.withFaq}`,
    `Image: ${before.withImage} → ${after.withImage}`,
    ``,
    ...steps.map((s) => `${s.name}: ${s.ok ? 'OK' : 'FAIL'} (${(s.durationMs / 1000).toFixed(1)}s)`),
  ].join('\n');

  await emailService.sendEmail({ to: ADMIN_EMAIL, subject, html, text });

  if (!allOk) {
    process.exit(1);
  }
}

refresh()
  .then(() => {
    console.log('\nRefresh complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Refresh crashed:', err);
    emailService
      .sendEmail({
        to: ADMIN_EMAIL,
        subject: '[RunAnalytics] Shoe DB refresh CRASHED',
        html: `<pre>${String(err?.stack ?? err)}</pre>`,
        text: String(err?.stack ?? err),
      })
      .finally(() => process.exit(1));
  });

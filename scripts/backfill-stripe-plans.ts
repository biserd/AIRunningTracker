// Backfill `users.subscription_plan` and `users.stripe_subscription_id` for
// users who paid in Stripe but never got correctly upgraded by the broken
// webhook (test-mode price IDs hardcoded in production). One-off, idempotent.
//
// Run with:
//   npx tsx scripts/backfill-stripe-plans.ts            # dry run, prints diff
//   npx tsx scripts/backfill-stripe-plans.ts --apply    # actually writes to DB

import { db } from '../server/db';
import { users } from '../shared/schema';
import { isNotNull } from 'drizzle-orm';
import { storage } from '../server/storage';
import { getUncachableStripeClient } from '../server/stripeClient';
import { resolvePlan } from '../server/webhookHandlers';

const APPLY = process.argv.includes('--apply');
const TERMINAL = new Set(['canceled', 'incomplete_expired', 'unpaid']);

interface RowReport {
  userId: number;
  email: string | null;
  customerId: string;
  before: { plan: string | null; status: string | null; subId: string | null; email: string | null };
  after: { plan: string; status: string; subId: string; source: string } | null;
  note?: string;
}

async function main() {
  console.log(`[backfill] mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  const stripe = await getUncachableStripeClient();

  const candidates = await db
    .select({
      id: users.id,
      email: users.email,
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      subscriptionPlan: users.subscriptionPlan,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(users)
    .where(isNotNull(users.stripeCustomerId));

  console.log(`[backfill] ${candidates.length} users with stripe_customer_id`);

  const reports: RowReport[] = [];
  let changed = 0;

  for (const u of candidates) {
    const customerId = u.stripeCustomerId!;
    const before = {
      plan: u.subscriptionPlan ?? null,
      status: u.subscriptionStatus ?? null,
      subId: u.stripeSubscriptionId ?? null,
      email: u.email ?? null,
    };

    let subs;
    try {
      subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 5,
      });
    } catch (err: any) {
      reports.push({
        userId: u.id,
        email: u.email,
        customerId,
        before,
        after: null,
        note: `Stripe list failed: ${err?.message || err}`,
      });
      continue;
    }

    const sorted = [...subs.data].sort((a, b) => (b.created || 0) - (a.created || 0));
    const chosen = sorted.find(s => !TERMINAL.has(s.status)) || sorted[0];

    if (!chosen) {
      reports.push({
        userId: u.id,
        email: u.email,
        customerId,
        before,
        after: null,
        note: 'no subscriptions in Stripe',
      });
      continue;
    }

    const resolved = await resolvePlan(chosen);
    let planToWrite = resolved.plan;
    if (before.plan === 'premium' && planToWrite === 'free' && !TERMINAL.has(chosen.status)) {
      planToWrite = 'premium';
    }

    const needsPlanChange = before.plan !== planToWrite;
    const needsStatusChange = before.status !== chosen.status;
    const needsSubIdChange = before.subId !== chosen.id;

    let emailToBackfill: string | null = null;
    if (!u.email) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        const stripeEmail =
          (customer && !('deleted' in customer && (customer as any).deleted) && (customer as any).email) || null;
        if (stripeEmail) {
          const existing = await storage.getUserByEmail(stripeEmail);
          if (!existing || existing.id === u.id) {
            emailToBackfill = stripeEmail;
          }
        }
      } catch {
        /* ignore email lookup errors */
      }
    }

    const after = {
      plan: planToWrite,
      status: chosen.status,
      subId: chosen.id,
      source: resolved.source,
    };

    const willChange = needsPlanChange || needsStatusChange || needsSubIdChange || !!emailToBackfill;
    reports.push({
      userId: u.id,
      email: u.email,
      customerId,
      before,
      after,
      note: emailToBackfill ? `will backfill email=${emailToBackfill}` : undefined,
    });
    if (willChange) changed++;

    if (APPLY && willChange) {
      if (needsSubIdChange) {
        await storage.updateStripeSubscriptionId(u.id, chosen.id);
      }
      if (needsPlanChange || needsStatusChange) {
        await storage.updateSubscriptionStatus(u.id, chosen.status, planToWrite);
      }
      if (emailToBackfill) {
        await storage.updateUser(u.id, { email: emailToBackfill });
      }
    }
  }

  console.log('\n========== Backfill report ==========');
  for (const r of reports) {
    const a = r.after;
    const tag = !a
      ? 'SKIP'
      : (r.before.plan !== a.plan || r.before.status !== a.status || r.before.subId !== a.subId)
        ? (APPLY ? 'UPDATED' : 'WOULD UPDATE')
        : 'OK';
    console.log(
      `[${tag}] user=${r.userId} email=${r.email ?? '-'} customer=${r.customerId}` +
        `  before(plan=${r.before.plan ?? '-'} status=${r.before.status ?? '-'} sub=${r.before.subId ?? '-'})` +
        (a ? `  after(plan=${a.plan} status=${a.status} sub=${a.subId} via=${a.source})` : '') +
        (r.note ? `  note: ${r.note}` : ''),
    );
  }
  console.log('=====================================');
  console.log(`[backfill] ${changed} user(s) ${APPLY ? 'updated' : 'would be updated'} of ${candidates.length}.`);
  if (!APPLY) {
    console.log('[backfill] Re-run with --apply to actually write to the DB.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[backfill] FATAL:', err);
    process.exit(1);
  });

// Lightweight standalone tests for resolvePlan() — no test framework needed.
// Run with: npx tsx scripts/test-resolve-plan.ts
//
// Covers the contract from replit.md "Stripe Subscription Resolver":
//   - price.metadata.plan wins
//   - product.metadata.plan is used when price metadata is missing
//   - env-var override is third
//   - status fallback: active/trialing/past_due => 'premium'
//   - terminal status (canceled/incomplete_expired/unpaid) => 'free'
//   - unknown status with no signal => 'free' (downgrade-safety lives in
//     the webhook handler, not the resolver)

// Set env BEFORE the module loads — webhookHandlers.ts builds its
// ENV_PRICE_TO_PLAN map at module-load time.
process.env.STRIPE_PRICE_PREMIUM_MONTHLY = 'price_ENV_MONTHLY';
process.env.STRIPE_PRICE_PREMIUM_ANNUAL = 'price_ENV_ANNUAL';

const { resolvePlan } = await import('../server/webhookHandlers');

interface Case {
  name: string;
  sub: any;
  env?: Record<string, string | undefined>;
  expectPlan: string;
  expectSource: string;
}

const cases: Case[] = [
  {
    name: 'price.metadata.plan=premium wins over status',
    sub: {
      status: 'canceled', // would otherwise go to 'free' via terminal-status
      items: { data: [{ price: { id: 'price_X', metadata: { plan: 'premium' } } }] },
    },
    expectPlan: 'premium',
    expectSource: 'price-metadata',
  },
  {
    name: 'price.metadata.plan=free wins over active status',
    sub: {
      status: 'active',
      items: { data: [{ price: { id: 'price_Y', metadata: { plan: 'free' } } }] },
    },
    expectPlan: 'free',
    expectSource: 'price-metadata',
  },
  {
    name: 'product.metadata.plan=premium used when price metadata absent',
    sub: {
      status: 'incomplete', // unknown status; resolver must use product metadata
      items: {
        data: [{
          price: {
            id: 'price_PM1',
            metadata: {},
            product: { id: 'prod_PREMIUM', metadata: { plan: 'premium' } },
          },
        }],
      },
    },
    expectPlan: 'premium',
    expectSource: 'product-metadata',
  },
  {
    name: 'product.metadata.plan=free used when price metadata absent',
    sub: {
      status: 'active', // would otherwise go premium via status-fallback
      items: {
        data: [{
          price: {
            id: 'price_PM2',
            metadata: {},
            product: { id: 'prod_FREE', metadata: { plan: 'free' } },
          },
        }],
      },
    },
    expectPlan: 'free',
    expectSource: 'product-metadata',
  },
  {
    name: 'env override -> premium when no price/product metadata',
    sub: {
      status: 'incomplete', // unknown status, should not auto-decide
      items: { data: [{ price: { id: 'price_ENV_MONTHLY', metadata: {} } }] },
    },
    env: { STRIPE_PRICE_PREMIUM_MONTHLY: 'price_ENV_MONTHLY' },
    expectPlan: 'premium',
    expectSource: 'env-override',
  },
  {
    name: 'active status with no metadata => premium via status-fallback',
    sub: {
      status: 'active',
      items: { data: [{ price: { id: 'price_NEW', metadata: {} } }] },
    },
    expectPlan: 'premium',
    expectSource: 'status-fallback',
  },
  {
    name: 'trialing status => premium via status-fallback',
    sub: {
      status: 'trialing',
      items: { data: [{ price: { id: 'price_NEW2', metadata: {} } }] },
    },
    expectPlan: 'premium',
    expectSource: 'status-fallback',
  },
  {
    name: 'past_due status => premium via status-fallback',
    sub: {
      status: 'past_due',
      items: { data: [{ price: { id: 'price_NEW3', metadata: {} } }] },
    },
    expectPlan: 'premium',
    expectSource: 'status-fallback',
  },
  {
    name: 'canceled status with no metadata => free via terminal-status',
    sub: {
      status: 'canceled',
      items: { data: [{ price: { id: 'price_NEW4', metadata: {} } }] },
    },
    expectPlan: 'free',
    expectSource: 'terminal-status',
  },
  {
    name: 'incomplete_expired status => free via terminal-status',
    sub: {
      status: 'incomplete_expired',
      items: { data: [{ price: { id: 'price_NEW5', metadata: {} } }] },
    },
    expectPlan: 'free',
    expectSource: 'terminal-status',
  },
  {
    name: 'unpaid status => free via terminal-status',
    sub: {
      status: 'unpaid',
      items: { data: [{ price: { id: 'price_NEW6', metadata: {} } }] },
    },
    expectPlan: 'free',
    expectSource: 'terminal-status',
  },
  {
    name: 'incomplete (unknown) status with no signal => free via unknown-status',
    sub: {
      status: 'incomplete',
      items: { data: [{ price: { id: 'price_NEW7', metadata: {} } }] },
    },
    expectPlan: 'free',
    expectSource: 'unknown-status',
  },
];

async function main() {
  let pass = 0, fail = 0;
  for (const c of cases) {
    const savedEnv: Record<string, string | undefined> = {};
    if (c.env) {
      for (const [k, v] of Object.entries(c.env)) {
        savedEnv[k] = process.env[k];
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
    let result;
    try {
      result = await resolvePlan(c.sub);
    } finally {
      if (c.env) {
        for (const [k, v] of Object.entries(savedEnv)) {
          if (v === undefined) delete process.env[k];
          else process.env[k] = v;
        }
      }
    }
    const ok = result.plan === c.expectPlan && result.source === c.expectSource;
    if (ok) {
      pass++;
      console.log(`  ✓ ${c.name}`);
    } else {
      fail++;
      console.log(`  ✗ ${c.name}`);
      console.log(`      expected plan=${c.expectPlan} source=${c.expectSource}`);
      console.log(`      actual   plan=${result.plan} source=${result.source}`);
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

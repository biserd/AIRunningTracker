import { db } from '../server/db';
import { runningShoes } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

interface BrandFix {
  oldBrand: string;
  newBrand: string;
  modelPrefix?: string;
  newModelStrip?: string;
}

const SIMPLE_BRAND_MERGES: Array<{ from: string; to: string }> = [
  { from: 'Asics', to: 'ASICS' },
  { from: 'Hoka', to: 'HOKA' },
  { from: 'Inov8', to: 'Inov-8' },
];

const COMPOUND_BRAND_FIXES: BrandFix[] = [
  { oldBrand: 'The', newBrand: 'The North Face', modelPrefix: 'North Face ', newModelStrip: 'North Face ' },
  { oldBrand: 'Mount', newBrand: 'Mount to Coast', modelPrefix: 'to Coast ', newModelStrip: 'to Coast ' },
];

function rebuildSlug(brand: string, model: string): string {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function applyBrandFix(oldBrand: string, newBrand: string, modelTransform?: (m: string) => string) {
  const rows = await db
    .select({ id: runningShoes.id, brand: runningShoes.brand, model: runningShoes.model })
    .from(runningShoes)
    .where(eq(runningShoes.brand, oldBrand));

  if (rows.length === 0) {
    console.log(`  (no rows for "${oldBrand}")`);
    return 0;
  }

  let updated = 0;
  for (const row of rows) {
    const newModel = modelTransform ? modelTransform(row.model) : row.model;
    const newSlug = rebuildSlug(newBrand, newModel);

    // Check for slug conflict (would-be duplicate after rename)
    const existing = await db
      .select({ id: runningShoes.id })
      .from(runningShoes)
      .where(eq(runningShoes.slug, newSlug));

    if (existing.length > 0 && existing[0].id !== row.id) {
      console.log(`  ⚠ Skip ${oldBrand} ${row.model} → would collide with existing slug ${newSlug}; deleting old row`);
      await db.delete(runningShoes).where(eq(runningShoes.id, row.id));
      continue;
    }

    await db
      .update(runningShoes)
      .set({ brand: newBrand, model: newModel, slug: newSlug })
      .where(eq(runningShoes.id, row.id));
    updated++;
    console.log(`  ✓ ${oldBrand} ${row.model} → ${newBrand} ${newModel} (slug: ${newSlug})`);
  }
  return updated;
}

async function normalize() {
  console.log('=== Brand normalization ===\n');

  let totalUpdated = 0;

  console.log('1) Casing merges (Asics→ASICS, Hoka→HOKA, Inov8→Inov-8):');
  for (const m of SIMPLE_BRAND_MERGES) {
    const n = await applyBrandFix(m.from, m.to);
    totalUpdated += n;
  }

  console.log('\n2) Compound brand fixes ("The North Face", "Mount to Coast"):');
  for (const fix of COMPOUND_BRAND_FIXES) {
    const n = await applyBrandFix(
      fix.oldBrand,
      fix.newBrand,
      fix.newModelStrip
        ? (m) => (m.startsWith(fix.newModelStrip!) ? m.slice(fix.newModelStrip!.length) : m)
        : undefined
    );
    totalUpdated += n;
  }

  console.log('\n3) Final brand counts:');
  const counts = await db.execute<{ brand: string; count: number }>(
    sql`SELECT brand, COUNT(*)::int AS count FROM running_shoes GROUP BY brand ORDER BY brand`
  );
  for (const row of counts.rows as any[]) {
    console.log(`  ${row.brand}: ${row.count}`);
  }

  console.log(`\nDone. Updated ${totalUpdated} rows.`);
}

normalize()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });

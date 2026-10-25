export interface CanonicalShoeCandidate {
  id: number;
  brand: string;
  model: string;
  slug: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  lastVerified?: Date | string | null;
  imageUrl?: string | null;
  aiNarrative?: string | null;
}

export function normalizedShoeModelKey(shoe: Pick<CanonicalShoeCandidate, "brand" | "model">): string {
  return `${shoe.brand} ${shoe.model}`
    .normalize("NFKD")
    .toLowerCase()
    // Gender-specific variants can have different recorded weights/geometry.
    .replace(/\b(men|women)'?s\b/g, "$1s")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    // Explicit naming aliases only: keep model version and variant suffixes.
    .replace(/^asics (?:gel )?nimbus /, "asics gel nimbus ")
    .replace(/^nike (?:air zoom )?pegasus /, "nike pegasus ")
    .replace(/^new balance (?:fresh foam x )?1080\s*v?\s*(\d+)/, "new balance 1080 v$1");
}

function qualityScore(shoe: CanonicalShoeCandidate): number {
  return (shoe.lastVerified ? 8 : 0)
    + (shoe.sourceUrl ? 4 : 0)
    + (shoe.aiNarrative ? 3 : 0)
    + (shoe.description ? 2 : 0)
    + (shoe.imageUrl ? 1 : 0);
}

export function chooseCanonicalShoe<T extends CanonicalShoeCandidate>(shoes: T[]): T {
  if (shoes.length === 0) throw new Error("Cannot choose a canonical shoe from an empty list");
  return [...shoes].sort((a, b) => qualityScore(b) - qualityScore(a) || a.id - b.id)[0];
}

export function canonicalizeShoeCatalog<T extends CanonicalShoeCandidate>(shoes: T[]) {
  const groups = new Map<string, T[]>();
  for (const shoe of shoes) {
    if (!shoe.slug) continue;
    const key = normalizedShoeModelKey(shoe);
    groups.set(key, [...(groups.get(key) || []), shoe]);
  }

  const canonicalShoes: T[] = [];
  const aliasToCanonical = new Map<string, string>();
  for (const group of Array.from(groups.values())) {
    const canonical = chooseCanonicalShoe<T>(group);
    canonicalShoes.push(canonical);
    for (const shoe of group) {
      if (shoe.slug && canonical.slug && shoe.slug !== canonical.slug) {
        aliasToCanonical.set(shoe.slug, canonical.slug);
      }
    }
  }
  return { canonicalShoes, aliasToCanonical };
}

export function canonicalizeComparisons<T extends { id: number; slug: string; shoe1Id: number; shoe2Id: number }>(comparisons: T[], shoes: CanonicalShoeCandidate[]) {
  const { canonicalShoes } = canonicalizeShoeCatalog(shoes);
  const canonicalByKey = new Map(canonicalShoes.map(s => [normalizedShoeModelKey(s), s]));
  const byId = new Map(shoes.map(s => [s.id, canonicalByKey.get(normalizedShoeModelKey(s))]));
  const groups = new Map<string, T[]>();
  const aliasToCanonical = new Map<string, string>();
  const collapsedToShoe = new Map<string, string>();
  for (const comparison of comparisons) {
    const a = byId.get(comparison.shoe1Id), b = byId.get(comparison.shoe2Id);
    if (!a?.slug || !b?.slug || !comparison.slug) continue;
    if (a.id === b.id) { collapsedToShoe.set(comparison.slug, a.slug); continue; }
    const pair = [a.id, b.id].sort((x, y) => x - y).join(':');
    groups.set(pair, [...(groups.get(pair) || []), comparison]);
  }
  const canonicalComparisons: T[] = [];
  for (const group of Array.from(groups.values())) {
    // Prefer the comparison already referring to both canonical model records.
    const score = (c: T) => Number(byId.get(c.shoe1Id)?.id === c.shoe1Id) + Number(byId.get(c.shoe2Id)?.id === c.shoe2Id);
    const canonical = [...group].sort((a,b) => score(b) - score(a) || a.id - b.id)[0];
    canonicalComparisons.push(canonical);
    for (const c of group) if (c.slug !== canonical.slug) aliasToCanonical.set(c.slug, canonical.slug);
  }
  return { canonicalComparisons, aliasToCanonical, collapsedToShoe };
}

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
    .replace(/\b(men'?s|women'?s|unisex)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
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

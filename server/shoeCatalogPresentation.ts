import type { IStorage } from "./storage";
import type { RunningShoe, ShoeComparison } from "../shared/schema";
import type { ShoePickerModel, ShoeComparisonLink } from "../shared/searchPageCopy";
import {
  publicShoe,
  buildComparisonGuide,
  buildShoeGuide,
} from "../shared/shoeEditorial";
import {
  canonicalizeShoeCatalog,
  canonicalizeComparisons,
  normalizedShoeModelKey,
} from "../shared/shoeCanonicalization";

const reviewedComparisonSource = "Source-checked catalogue editorial; not a wear test.";

export type ShoeStore = Pick<
  IStorage,
  | "getShoes"
  | "getShoeBySlug"
  | "getShoeById"
  | "getShoeComparisons"
  | "getShoeComparisonBySlug"
  | "getShoeComparisonsByShoeId"
>;
export async function comparisonDirectory(store: Pick<ShoeStore, "getShoes" | "getShoeComparisons">) {
  const [comparisons, shoes] = await Promise.all([store.getShoeComparisons({}), store.getShoes({})]);
  const byId = new Map(shoes.map(shoe => [shoe.id, shoe]));
  const models: ShoePickerModel[] = canonicalizeShoeCatalog(shoes).canonicalShoes.flatMap(shoe =>
    shoe.slug ? [{ slug: shoe.slug, label: `${shoe.brand} ${shoe.model}` }] : [],
  );
  const links: ShoeComparisonLink[] = canonicalizeComparisons(comparisons, shoes).canonicalComparisons.flatMap(comparison => {
    const a = byId.get(comparison.shoe1Id), b = byId.get(comparison.shoe2Id);
    if (!comparison.slug || !a || !b) return [];
    return [{ slug: comparison.slug, type: comparison.comparisonType, title: `${a.brand} ${a.model} vs ${b.brand} ${b.model}` }];
  });
  return { models, links };
}
export function publicComparison(
  c: ShoeComparison,
  a: RunningShoe,
  b: RunningShoe,
) {
  const base = buildComparisonGuide(a, b);
  // Opt in only explicitly reviewed copy, not stored legacy/generated winners.
  const guide = (() => {
    if (c.verdictReason !== reviewedComparisonSource || !c.verdict?.trim() ||
      [a, b].some(s => s.availability === "upcoming")) return base;
    try {
      const notes: unknown = JSON.parse(c.keyDifferences ?? "null");
      if (!Array.isArray(notes) || notes.length === 0 || notes.length > 6 ||
        notes.some(note => typeof note !== "string" || !note.trim() || note.length > 400)) return base;
      return {
        ...base,
        verdict: c.verdict,
        sections: [
          ...notes.map((text, i) => ({ title: `Buying consideration ${i + 1}`, text })),
          ...base.sections,
        ],
        questions: [{ ...base.questions[0], answer: c.verdict }, ...base.questions.slice(1)],
      };
    } catch { return base; }
  })();
  return {
    ...c,
    title: guide.title,
    metaDescription: guide.description,
    verdict: guide.verdict,
    verdictWinner: null,
    verdictReason: guide.methodology,
    keyDifferences: JSON.stringify(
      guide.differences.map((d) => `${d.title}: ${d.text}`),
    ),
    bestFor: null,
    shoe1: publicShoe(a),
    shoe2: publicShoe(b),
    editorial: guide,
  };
}
export async function comparisonList(
  store: ShoeStore,
  filters?: { type?: string; limit?: number },
) {
  const [comparisons, shoes] = await Promise.all([
    store.getShoeComparisons(filters),
    store.getShoes({}),
  ]);
  const byId = new Map(shoes.map((s) => [s.id, s]));
  return canonicalizeComparisons(comparisons, shoes).canonicalComparisons.flatMap((c) => {
    const a = byId.get(c.shoe1Id),
      b = byId.get(c.shoe2Id);
    if (!a || !b) return [];
    const result = publicComparison(c, a, b);
    const { editorial, ...summary } = result;
    return [summary];
  });
}
export async function shoePayload(store: ShoeStore, slug: string) {
  const shoe = await store.getShoeBySlug(slug);
  if (!shoe) return null;
  const [allShoes, comparisons] = await Promise.all([
    store.getShoes({}),
    store.getShoeComparisonsByShoeId(shoe.id),
  ]);
  const canonicalSlug =
    canonicalizeShoeCatalog(
      allShoes.filter(
        (s) => normalizedShoeModelKey(s) === normalizedShoeModelKey(shoe),
      ),
    ).canonicalShoes[0]?.slug || shoe.slug;
  const seriesShoes = allShoes
    .filter(
      (s) =>
        !!shoe.seriesName &&
        s.brand === shoe.brand &&
        s.seriesName === shoe.seriesName &&
        s.slug,
    )
    .sort(
      (a, b) =>
        (a.versionNumber || a.releaseYear || 0) -
        (b.versionNumber || b.releaseYear || 0),
    )
    .map(publicShoe);
  const similarShoes = allShoes
    .filter(
      (s) =>
        s.id !== shoe.id &&
        s.slug &&
        s.category === shoe.category &&
        s.availability !== "upcoming",
    )
    .sort(
      (a, b) =>
        Number(b.dataSource === "running_warehouse") -
          Number(a.dataSource === "running_warehouse") ||
        a.brand.localeCompare(b.brand),
    )
    .slice(0, 4)
    .map(publicShoe);
  return {
    shoe: publicShoe(shoe),
    canonicalSlug,
    seriesShoes,
    hasSeriesData: seriesShoes.length > 1,
    similarShoes,
    comparisons: comparisons
      .filter((c) => c.slug)
      .map((c) => ({ slug: c.slug, title: c.title })),
    editorial: buildShoeGuide(shoe),
  };
}
export async function comparisonPayload(store: ShoeStore, slug: string) {
  const comparison = await store.getShoeComparisonBySlug(slug);
  if (!comparison) return null;
  const [a, b] = await Promise.all([
    store.getShoeById(comparison.shoe1Id),
    store.getShoeById(comparison.shoe2Id),
  ]);
  if (!a || !b) return null;
  const related = await store.getShoeComparisonsByShoeId(a.id);
  return {
    ...publicComparison(comparison, a, b),
    relatedComparisons: related
      .filter((c) => c.slug !== slug)
      .slice(0, 6)
      .map((c) => ({ slug: c.slug, title: c.title })),
  };
}

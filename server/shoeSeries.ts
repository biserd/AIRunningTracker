import type { RunningShoe } from "../shared/schema";
import { canonicalizeShoeCatalog } from "../shared/shoeCanonicalization";

// Reviewed catalog aliases. Keep model identities, canonical URLs and specifications
// unchanged. Do not infer a shared history from similar names (e.g. Fast-R vs Fast-RB).
const familyAliases: Readonly<Record<string, string>> = {
  "adidas/adizero boston": "adidas/boston",
  "adidas/ultraboost light": "adidas/ultraboost",
  "new balance/fresh foam 1080 v": "new balance/1080",
  "new balance/fresh foam x 1080v": "new balance/1080",
  "new balance/fuelcell rebel v": "new balance/rebel v",
  "puma/fast-r 2 nitro elite": "puma/fast-r nitro elite",
};

// Only collapse a reviewed same-generation alias in the chart/table, not in the
// catalog or comparison directory. Prefer the full model name already on file.
const sameModelForHistory: Readonly<Record<string, string>> = {
  "new-balance-fresh-foam-1080-v14": "new-balance-fresh-foam-x-1080v14",
};

// A catalog version label does not always indicate chronological order. These
// overrides are for ordering the chart only, never for displaying specifications.
const historyOrder: Readonly<Record<string, number>> = {
  "adidas-supernova-rise": 1,
  "adidas-ultraboost-light": 4, // Immediately before the 5; not a displayed version.
  "on-cloudsurfer-7": 1, // The prior Cloudsurfer in the CloudTec Phase line.
  "puma-fast-r-2-nitro-elite": 2,
};

function seriesKey(shoe: RunningShoe): string | undefined {
  const series = shoe.seriesName?.trim().toLowerCase();
  if (!series) return;
  const base = `${shoe.brand.trim().toLowerCase()}/${series}`;
  return familyAliases[base] ?? base;
}

export function shoeSeriesHistory(shoe: RunningShoe, catalog: RunningShoe[]): RunningShoe[] {
  const key = seriesKey(shoe);
  if (!key) return [];
  const family = canonicalizeShoeCatalog(catalog.filter(s => seriesKey(s) === key)).canonicalShoes;
  const slugs = new Set(family.map(s => s.slug));
  const canonical = family.filter(s => {
    const preferred = sameModelForHistory[s.slug ?? ""];
    return !preferred || !slugs.has(preferred);
  });
  const order = (s: RunningShoe) => historyOrder[s.slug ?? ""] ?? s.versionNumber;
  const allNumbered = canonical.every(s => order(s) != null);
  return canonical.sort((a, b) => {
    const version = (order(a) ?? Infinity) - (order(b) ?? Infinity);
    const year = (a.releaseYear ?? Infinity) - (b.releaseYear ?? Infinity);
    return (allNumbered ? version || year : year || version) || a.id - b.id;
  });
}

import type { RunningShoe } from "../../shared/schema";
import {
  publicShoe,
  shoeEvidence,
  shoeUrl,
  SHOE_EDITORIAL_VERSION,
} from "../../shared/shoeEditorial";

/** Public allowlist only: no account, authentication or runner properties. */
export function sanitizeShoeRecord(record: RunningShoe) {
  const s = publicShoe(record);
  return {
    slug: s.slug,
    url: shoeUrl(s),
    brand: s.brand,
    model: s.model,
    seriesName: s.seriesName,
    versionNumber: s.versionNumber,
    category: s.category,
    weightOunces: s.weight,
    heelStackHeightMm: s.heelStackHeight,
    forefootStackHeightMm: s.forefootStackHeight,
    heelToToeDropMm: s.heelToToeDrop,
    cushioningLevel: s.cushioningLevel,
    stability: s.stability,
    hasCarbonPlate: s.hasCarbonPlate,
    hasSuperFoam: s.hasSuperFoam,
    priceUsd: s.price,
    bestFor: s.bestFor,
    releaseYear: s.releaseYear,
    description: s.description,
    availability: s.availability,
    availableFrom: s.availableFrom,
    sourceUrl: s.sourceUrl,
    lastVerified: s.lastVerified,
    dataSource: s.dataSource,
    comfortRating: null,
    durabilityRating: null,
    responsivenessRating: null,
    mileageEstimate: null,
    targetUsage: null,
    evidence: shoeEvidence(s),
    editorialVersion: SHOE_EDITORIAL_VERSION,
  };
}

import type { InsertRunningShoe } from "@shared/schema";
import { shoeData } from "./shoe-data";

type DataSource = "manufacturer" | "runrepeat" | "doctors_of_running" | "running_warehouse" | "user_submitted" | "curated";

interface ShoeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

type ShoeDataWithMetadata = Omit<InsertRunningShoe, 'lastVerified'> & {
  sourceUrl?: string | null;
  dataSource?: DataSource;
  lastVerified?: string | Date | null; // Supports both ISO string and Date
};

interface PipelineStats {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  byBrand: Record<string, number>;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
}

const VALID_CATEGORIES = ["daily_trainer", "racing", "long_run", "recovery", "speed_training", "trail"] as const;
const VALID_CUSHIONING = ["soft", "medium", "firm"] as const;
const VALID_STABILITY = ["neutral", "mild_stability", "motion_control"] as const;
const VALID_BEST_FOR = ["speed_work", "racing", "long_runs", "easy_runs", "tempo", "recovery", "trails"] as const;

type ShoeForValidation = Partial<Omit<InsertRunningShoe, 'lastVerified'> & { lastVerified?: string | Date | null }>;

export function validateShoeData(shoe: ShoeForValidation): ShoeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!shoe.brand || shoe.brand.trim().length === 0) {
    errors.push("Brand is required");
  }
  if (!shoe.model || shoe.model.trim().length === 0) {
    errors.push("Model is required");
  }

  if (!shoe.category || !VALID_CATEGORIES.includes(shoe.category as typeof VALID_CATEGORIES[number])) {
    errors.push(`Invalid category: ${shoe.category}. Must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }

  if (typeof shoe.weight !== "number" || shoe.weight <= 0 || shoe.weight > 20) {
    errors.push(`Invalid weight: ${shoe.weight}. Must be between 0 and 20 oz`);
  }

  if (typeof shoe.heelStackHeight !== "number" || shoe.heelStackHeight < 0 || shoe.heelStackHeight > 60) {
    errors.push(`Invalid heel stack height: ${shoe.heelStackHeight}. Must be between 0 and 60mm`);
  }

  if (typeof shoe.forefootStackHeight !== "number" || shoe.forefootStackHeight < 0 || shoe.forefootStackHeight > 50) {
    errors.push(`Invalid forefoot stack height: ${shoe.forefootStackHeight}. Must be between 0 and 50mm`);
  }

  if (typeof shoe.heelToToeDrop !== "number" || shoe.heelToToeDrop < -5 || shoe.heelToToeDrop > 15) {
    errors.push(`Invalid heel-to-toe drop: ${shoe.heelToToeDrop}. Must be between -5 and 15mm`);
  }

  if (!shoe.cushioningLevel || !VALID_CUSHIONING.includes(shoe.cushioningLevel as typeof VALID_CUSHIONING[number])) {
    errors.push(`Invalid cushioning level: ${shoe.cushioningLevel}`);
  }

  if (!shoe.stability || !VALID_STABILITY.includes(shoe.stability as typeof VALID_STABILITY[number])) {
    errors.push(`Invalid stability: ${shoe.stability}`);
  }

  if (typeof shoe.price !== "number" || shoe.price <= 0 || shoe.price > 500) {
    errors.push(`Invalid price: ${shoe.price}. Must be between $1 and $500`);
  }

  if (!Array.isArray(shoe.bestFor) || shoe.bestFor.length === 0) {
    errors.push("bestFor must be a non-empty array");
  }

  const validateRating = (name: string, value: number | undefined) => {
    if (typeof value !== "number" || value < 1 || value > 5) {
      errors.push(`Invalid ${name}: ${value}. Must be between 1 and 5`);
    }
  };

  validateRating("durability rating", shoe.durabilityRating);
  validateRating("responsiveness rating", shoe.responsivenessRating);
  validateRating("comfort rating", shoe.comfortRating);

  if (typeof shoe.releaseYear !== "number" || shoe.releaseYear < 2018 || shoe.releaseYear > 2030) {
    errors.push(`Invalid release year: ${shoe.releaseYear}. Must be between 2018 and 2030`);
  }

  if (shoe.minRunnerWeight && shoe.maxRunnerWeight) {
    if (shoe.minRunnerWeight >= shoe.maxRunnerWeight) {
      errors.push("Min runner weight must be less than max runner weight");
    }
  }

  if (shoe.heelStackHeight !== undefined && shoe.forefootStackHeight !== undefined) {
    const calculatedDrop = shoe.heelStackHeight - shoe.forefootStackHeight;
    if (shoe.heelToToeDrop !== undefined && Math.abs(calculatedDrop - shoe.heelToToeDrop) > 1) {
      warnings.push(`Drop (${shoe.heelToToeDrop}mm) doesn't match stack difference (${calculatedDrop}mm)`);
    }
  }

  if (shoe.category === "racing" && !shoe.hasCarbonPlate && !shoe.hasSuperFoam) {
    warnings.push("Racing shoe without carbon plate or super foam - verify this is intentional");
  }

  if (shoe.category === "recovery" && shoe.cushioningLevel !== "soft") {
    warnings.push("Recovery shoe with non-soft cushioning - verify this is intentional");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function normalizeShoeData(shoe: Partial<InsertRunningShoe>): InsertRunningShoe {
  return {
    brand: shoe.brand?.trim() || "",
    model: shoe.model?.trim() || "",
    category: shoe.category || "daily_trainer",
    weight: Math.round((shoe.weight || 0) * 10) / 10,
    heelStackHeight: Math.round((shoe.heelStackHeight || 0) * 10) / 10,
    forefootStackHeight: Math.round((shoe.forefootStackHeight || 0) * 10) / 10,
    heelToToeDrop: Math.round((shoe.heelToToeDrop || 0) * 10) / 10,
    cushioningLevel: shoe.cushioningLevel || "medium",
    stability: shoe.stability || "neutral",
    hasCarbonPlate: shoe.hasCarbonPlate ?? false,
    hasSuperFoam: shoe.hasSuperFoam ?? false,
    price: Math.round(shoe.price || 0),
    bestFor: shoe.bestFor || [],
    minRunnerWeight: shoe.minRunnerWeight || null,
    maxRunnerWeight: shoe.maxRunnerWeight || null,
    durabilityRating: Math.round((shoe.durabilityRating || 3) * 10) / 10,
    responsivenessRating: Math.round((shoe.responsivenessRating || 3) * 10) / 10,
    comfortRating: Math.round((shoe.comfortRating || 3) * 10) / 10,
    releaseYear: shoe.releaseYear || new Date().getFullYear(),
    imageUrl: shoe.imageUrl || null,
    description: shoe.description?.trim() || null
  };
}

export function getPipelineStats(shoes: ShoeDataWithMetadata[]): PipelineStats {
  const stats: PipelineStats = {
    total: shoes.length,
    valid: 0,
    invalid: 0,
    warnings: 0,
    byBrand: {},
    byCategory: {},
    bySource: {}
  };

  shoes.forEach(shoe => {
    const validation = validateShoeData(shoe);
    if (validation.valid) {
      stats.valid++;
    } else {
      stats.invalid++;
    }
    if (validation.warnings.length > 0) {
      stats.warnings++;
    }

    stats.byBrand[shoe.brand] = (stats.byBrand[shoe.brand] || 0) + 1;
    stats.byCategory[shoe.category] = (stats.byCategory[shoe.category] || 0) + 1;
    
    const source = shoe.dataSource || "curated";
    stats.bySource[source] = (stats.bySource[source] || 0) + 1;
  });

  return stats;
}

export function getShoeDataWithMetadata(): ShoeDataWithMetadata[] {
  return shoeData.map(shoe => ({
    ...shoe,
    dataSource: "curated" as DataSource,
    lastVerified: "2025-11-28T00:00:00.000Z" // ISO date string
  }));
}

export function getShoesWithMetadataFromStorage(shoes: InsertRunningShoe[]): ShoeDataWithMetadata[] {
  return shoes.map(shoe => ({
    ...shoe,
    dataSource: (shoe as any).dataSource || "curated",
    sourceUrl: (shoe as any).sourceUrl || null,
    lastVerified: (shoe as any).lastVerified || null
  }));
}

export function validateAllShoes(): { 
  valid: ShoeDataWithMetadata[]; 
  invalid: { shoe: ShoeDataWithMetadata; errors: string[] }[];
  stats: PipelineStats;
} {
  const shoes = getShoeDataWithMetadata();
  const valid: ShoeDataWithMetadata[] = [];
  const invalid: { shoe: ShoeDataWithMetadata; errors: string[] }[] = [];

  shoes.forEach(shoe => {
    const validation = validateShoeData(shoe);
    if (validation.valid) {
      valid.push(shoe);
    } else {
      invalid.push({ shoe, errors: validation.errors });
    }
  });

  return {
    valid,
    invalid,
    stats: getPipelineStats(shoes)
  };
}

export function findDuplicates(shoes: InsertRunningShoe[]): { brand: string; model: string; count: number }[] {
  const counts: Record<string, number> = {};
  
  shoes.forEach(shoe => {
    const key = `${shoe.brand}|${shoe.model}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const [brand, model] = key.split("|");
      return { brand, model, count };
    });
}

export function mergeShoeData(
  existing: InsertRunningShoe,
  update: Partial<InsertRunningShoe>,
  preferUpdate: boolean = false
): InsertRunningShoe {
  if (preferUpdate) {
    return {
      ...existing,
      ...Object.fromEntries(
        Object.entries(update).filter(([, v]) => v !== undefined && v !== null)
      )
    } as InsertRunningShoe;
  }
  
  return {
    ...update,
    ...Object.fromEntries(
      Object.entries(existing).filter(([, v]) => v !== undefined && v !== null)
    )
  } as InsertRunningShoe;
}

export function filterShoesBySource(
  shoes: ShoeDataWithMetadata[],
  sources: DataSource[]
): ShoeDataWithMetadata[] {
  return shoes.filter(shoe => sources.includes(shoe.dataSource || "curated"));
}

export function categorizeByTrust(shoes: ShoeDataWithMetadata[]): {
  high: ShoeDataWithMetadata[];
  medium: ShoeDataWithMetadata[];
  low: ShoeDataWithMetadata[];
} {
  const high: ShoeDataWithMetadata[] = [];
  const medium: ShoeDataWithMetadata[] = [];
  const low: ShoeDataWithMetadata[] = [];

  shoes.forEach(shoe => {
    switch (shoe.dataSource) {
      case "manufacturer":
        high.push(shoe);
        break;
      case "runrepeat":
      case "doctors_of_running":
        medium.push(shoe);
        break;
      case "running_warehouse":
      case "curated":
      case "user_submitted":
      default:
        low.push(shoe);
        break;
    }
  });

  return { high, medium, low };
}

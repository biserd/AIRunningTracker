import type { InsertRunningShoe, RunningShoe } from "@shared/schema";
import { shoeData } from "./shoe-data";

type DataSource = "manufacturer" | "runrepeat" | "doctors_of_running" | "running_warehouse" | "user_submitted" | "curated";

// Helper to generate URL-friendly slug from brand and model
export function generateSlug(brand: string, model: string): string {
  return `${brand}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Parse series name and version number from model name
// e.g., "Pegasus 41" -> { seriesName: "Pegasus", versionNumber: 41 }
// e.g., "Alphafly 3" -> { seriesName: "Alphafly", versionNumber: 3 }
// e.g., "Alphafly NEXT%" -> { seriesName: "Alphafly", versionNumber: 1 }
// e.g., "Vaporfly Next% 2" -> { seriesName: "Vaporfly", versionNumber: 2 }
// e.g., "Metaspeed Sky+" -> { seriesName: "Metaspeed Sky", versionNumber: 2 }
// e.g., "Metaspeed Sky Paris" -> { seriesName: "Metaspeed Sky", versionNumber: 3 }
// e.g., "Ultraboost Light" -> { seriesName: "Ultraboost Light", versionNumber: null }
export function parseSeriesFromModel(model: string): { seriesName: string; versionNumber: number | null } {
  // Special handling for Nike NEXT% naming conventions
  // "Alphafly NEXT%" is version 1, "Vaporfly Next% 2" is version 2
  const nextPercentMatch = model.match(/^(.+?)\s*(?:NEXT%|Next%)\s*(\d*)$/i);
  if (nextPercentMatch) {
    const version = nextPercentMatch[2] ? parseInt(nextPercentMatch[2], 10) : 1;
    return {
      seriesName: nextPercentMatch[1].trim(),
      versionNumber: version
    };
  }
  
  // Special handling for Asics Metaspeed naming (Sky+, Sky Paris, Edge+, Edge Paris, Edge Tokyo)
  // Sky/Edge = 1, Sky+/Edge+ = 2, Sky Paris/Edge Paris = 3, Edge Tokyo = 4
  const metaspeedMatch = model.match(/^(Metaspeed\s+(?:Sky|Edge))(\+|\s+Paris|\s+Tokyo)?$/i);
  if (metaspeedMatch) {
    const baseName = metaspeedMatch[1].trim();
    const suffix = metaspeedMatch[2]?.trim();
    let version = 1;
    if (suffix === '+') version = 2;
    else if (suffix?.toLowerCase() === 'paris') version = 3;
    else if (suffix?.toLowerCase() === 'tokyo') version = 4;
    return {
      seriesName: baseName,
      versionNumber: version
    };
  }
  
  // Match trailing number at end of model name
  const match = model.match(/^(.+?)\s*(\d+)$/);
  if (match) {
    return {
      seriesName: match[1].trim(),
      versionNumber: parseInt(match[2], 10)
    };
  }
  
  // No version number found
  return {
    seriesName: model.trim(),
    versionNumber: null
  };
}

// Calculate AI resilience score (1-100) based on durability, materials, and construction
export function calculateResilienceScore(shoe: Partial<InsertRunningShoe>): number {
  let score = 0;
  
  // Base score from durability rating (1-5 scale, contributes up to 50 points)
  const durability = shoe.durabilityRating || 3;
  score += durability * 10;
  
  // Super foam typically reduces durability (-5 points)
  if (shoe.hasSuperFoam) {
    score -= 5;
  }
  
  // Higher stack heights generally mean more cushion to wear (-2 points per 10mm above 30mm)
  const avgStack = ((shoe.heelStackHeight || 30) + (shoe.forefootStackHeight || 20)) / 2;
  if (avgStack > 30) {
    score -= Math.floor((avgStack - 30) / 10) * 2;
  }
  
  // Recovery and daily trainer shoes typically last longer (+10 points)
  if (shoe.category === "recovery" || shoe.category === "daily_trainer") {
    score += 10;
  }
  
  // Racing shoes typically wear faster (-10 points)
  if (shoe.category === "racing") {
    score -= 10;
  }
  
  // Firm cushioning lasts longer than soft (+5 points for firm, -5 for soft)
  if (shoe.cushioningLevel === "firm") {
    score += 5;
  } else if (shoe.cushioningLevel === "soft") {
    score -= 5;
  }
  
  // Normalize to 1-100 range
  return Math.max(1, Math.min(100, Math.round(score + 50)));
}

// Generate AI mileage estimate based on durability and shoe type
export function generateMileageEstimate(shoe: Partial<InsertRunningShoe>): string {
  const durability = shoe.durabilityRating || 3;
  
  // Base mileage ranges by durability
  let minMiles: number;
  let maxMiles: number;
  
  if (durability >= 4.5) {
    minMiles = 450;
    maxMiles = 600;
  } else if (durability >= 4) {
    minMiles = 400;
    maxMiles = 500;
  } else if (durability >= 3.5) {
    minMiles = 350;
    maxMiles = 450;
  } else if (durability >= 3) {
    minMiles = 300;
    maxMiles = 400;
  } else {
    minMiles = 200;
    maxMiles = 300;
  }
  
  // Adjust for shoe category
  if (shoe.category === "racing") {
    minMiles = Math.round(minMiles * 0.6);
    maxMiles = Math.round(maxMiles * 0.6);
  } else if (shoe.category === "recovery" || shoe.category === "daily_trainer") {
    minMiles = Math.round(minMiles * 1.1);
    maxMiles = Math.round(maxMiles * 1.1);
  }
  
  // Round to nearest 25
  minMiles = Math.round(minMiles / 25) * 25;
  maxMiles = Math.round(maxMiles / 25) * 25;
  
  return `${minMiles}-${maxMiles} miles`;
}

// Generate AI target usage description
export function generateTargetUsage(shoe: Partial<InsertRunningShoe>): string {
  const bestFor = shoe.bestFor || [];
  const category = shoe.category || "daily_trainer";
  
  const usageMap: Record<string, string> = {
    "speed_work": "speed workouts",
    "racing": "race day",
    "long_runs": "long runs",
    "easy_runs": "easy runs",
    "tempo": "tempo runs",
    "recovery": "recovery runs",
    "trails": "trail running"
  };
  
  const categoryDescriptions: Record<string, string> = {
    "daily_trainer": "Ideal for daily training",
    "racing": "Built for race day performance",
    "long_run": "Designed for long distance runs",
    "recovery": "Perfect for recovery days",
    "speed_training": "Optimized for speed work",
    "trail": "Engineered for trail running"
  };
  
  const usages = bestFor.map(b => usageMap[b]).filter(Boolean);
  const categoryDesc = categoryDescriptions[category] || "Versatile running shoe";
  
  if (usages.length === 0) {
    return categoryDesc;
  }
  
  if (usages.length === 1) {
    return `${categoryDesc} and ${usages[0]}`;
  }
  
  const lastUsage = usages.pop();
  return `${categoryDesc}, ${usages.join(", ")}, and ${lastUsage}`;
}

// Generate detailed AI narrative for SEO
export function generateAINarrative(shoe: Partial<InsertRunningShoe>): string {
  const brand = shoe.brand || "This";
  const model = shoe.model || "shoe";
  const category = shoe.category || "daily_trainer";
  const weight = shoe.weight || 10;
  const drop = shoe.heelToToeDrop || 10;
  const cushioning = shoe.cushioningLevel || "medium";
  const stability = shoe.stability || "neutral";
  
  const categoryNames: Record<string, string> = {
    "daily_trainer": "daily trainer",
    "racing": "racing flat",
    "long_run": "long run shoe",
    "recovery": "recovery shoe",
    "speed_training": "speed trainer",
    "trail": "trail runner"
  };
  
  const cushioningDesc: Record<string, string> = {
    "soft": "plush, soft cushioning for maximum comfort",
    "medium": "balanced cushioning for versatility",
    "firm": "responsive, firm cushioning for efficient energy return"
  };
  
  const stabilityDesc: Record<string, string> = {
    "neutral": "neutral design for runners with normal pronation",
    "mild_stability": "mild stability features for light overpronators",
    "motion_control": "motion control technology for moderate to severe overpronators"
  };
  
  const catName = categoryNames[category];
  const cushDesc = cushioningDesc[cushioning];
  const stabDesc = stabilityDesc[stability];
  
  let narrative = `The ${brand} ${model} is a ${catName} featuring ${cushDesc}. `;
  narrative += `With a ${drop}mm heel-to-toe drop and ${stabDesc}, `;
  narrative += `it weighs ${weight} oz (${Math.round(weight * 28.35)}g) per shoe. `;
  
  if (shoe.hasCarbonPlate) {
    narrative += "It features a carbon fiber plate for enhanced propulsion. ";
  }
  if (shoe.hasSuperFoam) {
    narrative += "The midsole uses premium super foam technology for superior energy return. ";
  }
  
  const bestFor = shoe.bestFor || [];
  if (bestFor.length > 0) {
    const usageMap: Record<string, string> = {
      "speed_work": "speed sessions",
      "racing": "race day",
      "long_runs": "marathon training",
      "easy_runs": "daily easy miles",
      "tempo": "threshold workouts",
      "recovery": "recovery jogs",
      "trails": "off-road adventures"
    };
    const usages = bestFor.map(b => usageMap[b]).filter(Boolean);
    if (usages.length > 0) {
      narrative += `Best suited for ${usages.join(", ")}.`;
    }
  }
  
  return narrative;
}

// Generate FAQ Q&A pairs for SEO schema markup
export function generateFAQ(shoe: Partial<InsertRunningShoe>): string {
  const brand = shoe.brand || "This";
  const model = shoe.model || "shoe";
  const mileage = generateMileageEstimate(shoe);
  const weight = shoe.weight || 10;
  const drop = shoe.heelToToeDrop || 10;
  
  const faqs = [
    {
      question: `How long does the ${brand} ${model} last?`,
      answer: `The ${brand} ${model} typically lasts ${mileage} depending on running style, terrain, and runner weight. Heavier runners or those running on rough surfaces may experience faster wear.`
    },
    {
      question: `Is the ${brand} ${model} good for beginners?`,
      answer: shoe.category === "daily_trainer" || shoe.category === "recovery"
        ? `Yes, the ${brand} ${model} is excellent for beginners due to its forgiving cushioning and versatile design.`
        : `The ${brand} ${model} is designed for experienced runners. Beginners may want to start with a daily trainer before transitioning to this shoe.`
    },
    {
      question: `What is the weight of the ${brand} ${model}?`,
      answer: `The ${brand} ${model} weighs ${weight} ounces (${Math.round(weight * 28.35)} grams) per shoe in men's US size 9.`
    },
    {
      question: `What is the heel drop of the ${brand} ${model}?`,
      answer: `The ${brand} ${model} has a ${drop}mm heel-to-toe drop, which ${drop >= 10 ? "provides a traditional running feel" : drop >= 6 ? "offers a balanced running experience" : "promotes a more natural, forefoot-oriented stride"}.`
    }
  ];
  
  return JSON.stringify(faqs);
}

// Enrich shoe with all AI-generated fields
export function enrichShoeWithAIData(shoe: InsertRunningShoe): InsertRunningShoe & {
  slug: string;
  seriesName: string;
  versionNumber: number | null;
  aiResilienceScore: number;
  aiMileageEstimate: string;
  aiTargetUsage: string;
  aiNarrative: string;
  aiFaq: string;
} {
  const { seriesName, versionNumber } = parseSeriesFromModel(shoe.model);
  
  return {
    ...shoe,
    slug: generateSlug(shoe.brand, shoe.model),
    seriesName,
    versionNumber,
    aiResilienceScore: calculateResilienceScore(shoe),
    aiMileageEstimate: generateMileageEstimate(shoe),
    aiTargetUsage: generateTargetUsage(shoe),
    aiNarrative: generateAINarrative(shoe),
    aiFaq: generateFAQ(shoe)
  };
}

// Get all shoes enriched with AI data
export function getEnrichedShoeData(): ReturnType<typeof enrichShoeWithAIData>[] {
  return shoeData.map(shoe => enrichShoeWithAIData(shoe));
}

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

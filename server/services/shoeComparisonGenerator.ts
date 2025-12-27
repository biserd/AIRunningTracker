import { storage } from "../storage";
import type { RunningShoe, InsertShoeComparison } from "@shared/schema";

function createSlug(shoe1: RunningShoe, shoe2: RunningShoe): string {
  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${slugify(shoe1.brand)}-${slugify(shoe1.model)}-vs-${slugify(shoe2.brand)}-${slugify(shoe2.model)}`;
}

function createTitle(shoe1: RunningShoe, shoe2: RunningShoe): string {
  return `${shoe1.brand} ${shoe1.model} vs ${shoe2.brand} ${shoe2.model}`;
}

function createMetaDescription(shoe1: RunningShoe, shoe2: RunningShoe, type: string): string {
  const typeDescriptions: Record<string, string> = {
    evolution: `Compare the ${shoe1.brand} ${shoe1.model} with the ${shoe2.brand} ${shoe2.model}. See how the latest version stacks up against its predecessor with detailed specs, features, and our expert verdict.`,
    category_rival: `${shoe1.brand} ${shoe1.model} vs ${shoe2.brand} ${shoe2.model}: Head-to-head comparison of two top ${shoe1.category?.replace(/_/g, ' ')} shoes. Find out which one is right for you.`,
    popular: `Compare ${shoe1.brand} ${shoe1.model} and ${shoe2.brand} ${shoe2.model}. Detailed side-by-side specs, key differences, and our recommendation for your running needs.`
  };
  return typeDescriptions[type] || typeDescriptions.popular;
}

function generateKeyDifferences(shoe1: RunningShoe, shoe2: RunningShoe): string[] {
  const differences: string[] = [];
  
  const weightDiff = Math.abs(shoe1.weight - shoe2.weight);
  if (weightDiff >= 0.5) {
    const lighter = shoe1.weight < shoe2.weight ? shoe1 : shoe2;
    differences.push(`${lighter.brand} ${lighter.model} is ${weightDiff.toFixed(1)} oz lighter`);
  }
  
  const priceDiff = Math.abs(shoe1.price - shoe2.price);
  if (priceDiff >= 20) {
    const cheaper = shoe1.price < shoe2.price ? shoe1 : shoe2;
    differences.push(`${cheaper.brand} ${cheaper.model} is $${priceDiff.toFixed(0)} cheaper`);
  }
  
  const dropDiff = Math.abs(shoe1.heelToToeDrop - shoe2.heelToToeDrop);
  if (dropDiff >= 2) {
    differences.push(`Drop differs by ${dropDiff}mm (${shoe1.heelToToeDrop}mm vs ${shoe2.heelToToeDrop}mm)`);
  }
  
  const stackDiff = Math.abs(shoe1.heelStackHeight - shoe2.heelStackHeight);
  if (stackDiff >= 3) {
    const moreStack = shoe1.heelStackHeight > shoe2.heelStackHeight ? shoe1 : shoe2;
    differences.push(`${moreStack.brand} ${moreStack.model} has ${stackDiff.toFixed(0)}mm more stack height`);
  }
  
  if (shoe1.hasCarbonPlate !== shoe2.hasCarbonPlate) {
    const withPlate = shoe1.hasCarbonPlate ? shoe1 : shoe2;
    differences.push(`Only ${withPlate.brand} ${withPlate.model} has a carbon plate`);
  }
  
  if (shoe1.hasSuperFoam !== shoe2.hasSuperFoam) {
    const withFoam = shoe1.hasSuperFoam ? shoe1 : shoe2;
    differences.push(`${withFoam.brand} ${withFoam.model} uses super foam technology`);
  }
  
  if (shoe1.cushioningLevel !== shoe2.cushioningLevel) {
    differences.push(`${shoe1.brand} ${shoe1.model} is ${shoe1.cushioningLevel}, ${shoe2.brand} ${shoe2.model} is ${shoe2.cushioningLevel}`);
  }
  
  return differences.slice(0, 5);
}

function generateVerdict(shoe1: RunningShoe, shoe2: RunningShoe, type: string): { winner: string | null; reason: string; verdict: string } {
  let score1 = 0;
  let score2 = 0;
  
  if (shoe1.weight < shoe2.weight) score1 += 1; else if (shoe2.weight < shoe1.weight) score2 += 1;
  if (shoe1.durabilityRating > shoe2.durabilityRating) score1 += 1; else if (shoe2.durabilityRating > shoe1.durabilityRating) score2 += 1;
  if (shoe1.comfortRating > shoe2.comfortRating) score1 += 1; else if (shoe2.comfortRating > shoe1.comfortRating) score2 += 1;
  if (shoe1.responsivenessRating > shoe2.responsivenessRating) score1 += 1; else if (shoe2.responsivenessRating > shoe1.responsivenessRating) score2 += 1;
  if (shoe1.hasCarbonPlate && !shoe2.hasCarbonPlate) score1 += 1;
  if (shoe2.hasCarbonPlate && !shoe1.hasCarbonPlate) score2 += 1;
  if (shoe1.hasSuperFoam && !shoe2.hasSuperFoam) score1 += 0.5;
  if (shoe2.hasSuperFoam && !shoe1.hasSuperFoam) score2 += 0.5;
  
  let winner: string | null = null;
  let reason = "";
  
  if (score1 > score2 + 1) {
    winner = "shoe1";
    reason = `The ${shoe1.brand} ${shoe1.model} scores higher on key metrics including ${shoe1.weight < shoe2.weight ? 'weight, ' : ''}${shoe1.durabilityRating > shoe2.durabilityRating ? 'durability, ' : ''}${shoe1.comfortRating > shoe2.comfortRating ? 'comfort' : 'responsiveness'}.`.replace(/, $/, '');
  } else if (score2 > score1 + 1) {
    winner = "shoe2";
    reason = `The ${shoe2.brand} ${shoe2.model} outperforms in overall metrics${shoe2.hasCarbonPlate ? ', featuring a carbon plate' : ''}.`;
  } else {
    winner = "tie";
    reason = "Both shoes perform similarly overall - your choice depends on personal preference and specific use case.";
  }
  
  let verdict = "";
  if (type === "evolution") {
    const newer = (shoe1.versionNumber || shoe1.releaseYear) > (shoe2.versionNumber || shoe2.releaseYear) ? shoe1 : shoe2;
    const older = newer === shoe1 ? shoe2 : shoe1;
    verdict = `The ${newer.brand} ${newer.model} is the latest evolution of the ${older.model} line. ${winner === "tie" ? "Both versions are excellent choices." : `We recommend the ${winner === "shoe1" ? shoe1.model : shoe2.model} for most runners.`}`;
  } else if (type === "category_rival") {
    verdict = `Both are top contenders in the ${shoe1.category?.replace(/_/g, ' ')} category. ${winner === "tie" ? "Try both to find your preference." : `The ${winner === "shoe1" ? shoe1.brand + ' ' + shoe1.model : shoe2.brand + ' ' + shoe2.model} edges out as our pick.`}`;
  } else {
    verdict = `In this popular matchup, ${winner === "tie" ? "both shoes deliver excellent performance." : `the ${winner === "shoe1" ? shoe1.brand + ' ' + shoe1.model : shoe2.brand + ' ' + shoe2.model} is our recommended choice.`}`;
  }
  
  return { winner, reason, verdict };
}

function generateBestFor(shoe1: RunningShoe, shoe2: RunningShoe): Record<string, string> {
  const shoe1BestFor = shoe1.bestFor?.slice(0, 2).join(", ") || shoe1.category?.replace(/_/g, ' ') || "general running";
  const shoe2BestFor = shoe2.bestFor?.slice(0, 2).join(", ") || shoe2.category?.replace(/_/g, ' ') || "general running";
  return { shoe1: shoe1BestFor, shoe2: shoe2BestFor };
}

export async function generateEvolutionComparisons(shoes: RunningShoe[]): Promise<InsertShoeComparison[]> {
  const comparisons: InsertShoeComparison[] = [];
  const seen = new Set<string>();
  
  const shoesBySeries: Record<string, RunningShoe[]> = {};
  for (const shoe of shoes) {
    if (shoe.seriesName && shoe.versionNumber) {
      const key = `${shoe.brand}-${shoe.seriesName}`;
      if (!shoesBySeries[key]) {
        shoesBySeries[key] = [];
      }
      shoesBySeries[key].push(shoe);
    }
  }
  
  for (const seriesKey of Object.keys(shoesBySeries)) {
    const seriesShoes = shoesBySeries[seriesKey];
    if (seriesShoes.length < 2) continue;
    
    const sorted = seriesShoes.sort((a: RunningShoe, b: RunningShoe) => (a.versionNumber || 0) - (b.versionNumber || 0));
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const older = sorted[i];
      const newer = sorted[i + 1];
      const slug = createSlug(older, newer);
      
      if (seen.has(slug)) continue;
      seen.add(slug);
      
      const keyDifferences = generateKeyDifferences(older, newer);
      const { winner, reason, verdict } = generateVerdict(older, newer, "evolution");
      const bestFor = generateBestFor(older, newer);
      
      comparisons.push({
        slug,
        shoe1Id: older.id,
        shoe2Id: newer.id,
        comparisonType: "evolution",
        title: createTitle(older, newer),
        metaDescription: createMetaDescription(older, newer, "evolution"),
        verdict,
        verdictWinner: winner,
        verdictReason: reason,
        keyDifferences: JSON.stringify(keyDifferences),
        bestFor: JSON.stringify(bestFor)
      });
      
      if (comparisons.length >= 50) break;
    }
    if (comparisons.length >= 50) break;
  }
  
  return comparisons;
}

export async function generateCategoryRivalComparisons(shoes: RunningShoe[]): Promise<InsertShoeComparison[]> {
  const comparisons: InsertShoeComparison[] = [];
  const seen = new Set<string>();
  
  const shoesByCategory: Record<string, RunningShoe[]> = {};
  for (const shoe of shoes) {
    if (shoe.category) {
      if (!shoesByCategory[shoe.category]) {
        shoesByCategory[shoe.category] = [];
      }
      shoesByCategory[shoe.category].push(shoe);
    }
  }
  
  const topBrands = ["Nike", "Adidas", "ASICS", "Saucony", "Brooks", "New Balance", "Hoka", "On"];
  
  for (const category of Object.keys(shoesByCategory)) {
    const categoryShoes = shoesByCategory[category];
    const topShoes = categoryShoes
      .filter((s: RunningShoe) => topBrands.includes(s.brand))
      .sort((a: RunningShoe, b: RunningShoe) => (b.releaseYear || 0) - (a.releaseYear || 0))
      .slice(0, 8);
    
    for (let i = 0; i < topShoes.length; i++) {
      for (let j = i + 1; j < topShoes.length; j++) {
        if (topShoes[i].brand === topShoes[j].brand) continue;
        
        const shoe1 = topShoes[i];
        const shoe2 = topShoes[j];
        const slug = createSlug(shoe1, shoe2);
        
        if (seen.has(slug)) continue;
        seen.add(slug);
        
        const keyDifferences = generateKeyDifferences(shoe1, shoe2);
        const { winner, reason, verdict } = generateVerdict(shoe1, shoe2, "category_rival");
        const bestFor = generateBestFor(shoe1, shoe2);
        
        comparisons.push({
          slug,
          shoe1Id: shoe1.id,
          shoe2Id: shoe2.id,
          comparisonType: "category_rival",
          title: createTitle(shoe1, shoe2),
          metaDescription: createMetaDescription(shoe1, shoe2, "category_rival"),
          verdict,
          verdictWinner: winner,
          verdictReason: reason,
          keyDifferences: JSON.stringify(keyDifferences),
          bestFor: JSON.stringify(bestFor)
        });
        
        if (comparisons.length >= 100) break;
      }
      if (comparisons.length >= 100) break;
    }
    if (comparisons.length >= 100) break;
  }
  
  return comparisons;
}

export async function generatePopularComparisons(shoes: RunningShoe[]): Promise<InsertShoeComparison[]> {
  const comparisons: InsertShoeComparison[] = [];
  const seen = new Set<string>();
  
  const popularPairs = [
    ["Nike", "Adidas"], ["Nike", "ASICS"], ["Nike", "Saucony"],
    ["Adidas", "Saucony"], ["ASICS", "Saucony"], ["ASICS", "Brooks"],
    ["Hoka", "Brooks"], ["Hoka", "ASICS"], ["Hoka", "Saucony"],
    ["New Balance", "Nike"], ["New Balance", "ASICS"], ["On", "Hoka"]
  ];
  
  const getTopShoe = (brand: string, category: string): RunningShoe | undefined => {
    return shoes
      .filter(s => s.brand === brand && s.category === category)
      .sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0))[0];
  };
  
  const categories = ["racing", "daily_trainer", "long_run"];
  
  for (const [brand1, brand2] of popularPairs) {
    for (const category of categories) {
      const shoe1 = getTopShoe(brand1, category);
      const shoe2 = getTopShoe(brand2, category);
      
      if (!shoe1 || !shoe2) continue;
      
      const slug = createSlug(shoe1, shoe2);
      if (seen.has(slug)) continue;
      seen.add(slug);
      
      const keyDifferences = generateKeyDifferences(shoe1, shoe2);
      const { winner, reason, verdict } = generateVerdict(shoe1, shoe2, "popular");
      const bestFor = generateBestFor(shoe1, shoe2);
      
      comparisons.push({
        slug,
        shoe1Id: shoe1.id,
        shoe2Id: shoe2.id,
        comparisonType: "popular",
        title: createTitle(shoe1, shoe2),
        metaDescription: createMetaDescription(shoe1, shoe2, "popular"),
        verdict,
        verdictWinner: winner,
        verdictReason: reason,
        keyDifferences: JSON.stringify(keyDifferences),
        bestFor: JSON.stringify(bestFor)
      });
      
      if (comparisons.length >= 50) break;
    }
    if (comparisons.length >= 50) break;
  }
  
  return comparisons;
}

export async function generateAllComparisons(): Promise<{ evolution: number; categoryRival: number; popular: number; total: number }> {
  console.log("[ComparisonGenerator] Fetching all shoes...");
  const shoes = await storage.getShoes({});
  console.log(`[ComparisonGenerator] Found ${shoes.length} shoes`);
  
  console.log("[ComparisonGenerator] Clearing existing comparisons...");
  await storage.clearAllShoeComparisons();
  
  console.log("[ComparisonGenerator] Generating evolution comparisons...");
  const evolutionComparisons = await generateEvolutionComparisons(shoes);
  console.log(`[ComparisonGenerator] Generated ${evolutionComparisons.length} evolution comparisons`);
  
  console.log("[ComparisonGenerator] Generating category rival comparisons...");
  const categoryRivalComparisons = await generateCategoryRivalComparisons(shoes);
  console.log(`[ComparisonGenerator] Generated ${categoryRivalComparisons.length} category rival comparisons`);
  
  console.log("[ComparisonGenerator] Generating popular comparisons...");
  const popularComparisons = await generatePopularComparisons(shoes);
  console.log(`[ComparisonGenerator] Generated ${popularComparisons.length} popular comparisons`);
  
  const allComparisons = [...evolutionComparisons, ...categoryRivalComparisons, ...popularComparisons];
  console.log(`[ComparisonGenerator] Inserting ${allComparisons.length} comparisons...`);
  
  for (const comparison of allComparisons) {
    try {
      await storage.createShoeComparison(comparison);
    } catch (error: any) {
      console.error(`[ComparisonGenerator] Failed to insert comparison ${comparison.slug}:`, error.message);
    }
  }
  
  console.log("[ComparisonGenerator] Done!");
  
  return {
    evolution: evolutionComparisons.length,
    categoryRival: categoryRivalComparisons.length,
    popular: popularComparisons.length,
    total: allComparisons.length
  };
}

import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { runningShoes } from '../shared/schema';
import { eq, and, ilike } from 'drizzle-orm';

interface SimpleShoe {
  model_name: string;
  weight_grams: number | null;
  heel_to_toe_drop_mm: number | null;
  retail_price_usd: number | null;
}

interface DetailedShoe {
  brand: string;
  model: string;
  seriesName?: string;
  version?: string;
  category: string;
  weightOunces: number;
  stackHeights?: {
    heel: number;
    forefoot: number;
  };
  heelToToeDrop: number;
  cushioningLevel: string;
  stabilityType: string;
  carbonPlate: boolean;
  superFoam: boolean;
  price: number;
  durabilityRating: number;
  responsivenessRating: number;
  comfortRating: number;
  runnerWeightRange?: string | null;
  bestUseCases: Array<{ value: string }>;
}

const KNOWN_BRANDS = [
  'Nike', 'Adidas', 'ASICS', 'Brooks', 'Saucony', 'HOKA', 'Hoka', 'New Balance',
  'Mizuno', 'On', 'Altra', 'Puma', 'Reebok', 'Salomon', 'La Sportiva', 'Merrell',
  'Topo', 'Craft', 'Kiprun', 'Karhu', 'Nnormal', 'Under Armour', 'Diadora',
  'Newton', 'Inov-8', 'Scott', 'Norda', '361 Degrees', 'Scarpa', 'Dynafit'
];

function parseBrandAndModel(modelName: string): { brand: string; model: string } {
  for (const brand of KNOWN_BRANDS) {
    if (modelName.toLowerCase().startsWith(brand.toLowerCase())) {
      const model = modelName.substring(brand.length).trim();
      return { brand: brand.toUpperCase() === 'HOKA' ? 'HOKA' : brand, model };
    }
  }
  const parts = modelName.split(' ');
  return { brand: parts[0], model: parts.slice(1).join(' ') || parts[0] };
}

function extractVersionNumber(model: string): number | null {
  const match = model.match(/(\d+)(?:\.\d+)?$/);
  if (match) return parseInt(match[1], 10);
  const vMatch = model.match(/v(\d+)/i);
  if (vMatch) return parseInt(vMatch[1], 10);
  return null;
}

function extractSeriesName(model: string): string | null {
  const cleaned = model.replace(/\s*\d+(\.\d+)?$/, '').replace(/\s*v\d+$/i, '').trim();
  return cleaned || null;
}

function generateSlug(brand: string, model: string): string {
  return `${brand}-${model}`.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function gramsToOunces(grams: number): number {
  return Math.round((grams / 28.35) * 10) / 10;
}

function mapCategory(category: string): string {
  const map: Record<string, string> = {
    'road': 'daily_trainer',
    'racing': 'racing',
    'trail': 'trail',
    'recovery': 'recovery',
    'speed': 'speed_training',
    'long_run': 'long_run',
  };
  return map[category.toLowerCase()] || 'daily_trainer';
}

function mapCushioning(level: string): string {
  const map: Record<string, string> = {
    'max': 'soft',
    'moderate': 'medium',
    'minimal': 'firm',
    'firm': 'firm',
    'plush': 'soft',
  };
  return map[level.toLowerCase()] || 'medium';
}

function mapStability(type: string): string {
  const map: Record<string, string> = {
    'neutral': 'neutral',
    'stability': 'mild_stability',
    'motion_control': 'motion_control',
    'mild_stability': 'mild_stability',
  };
  return map[type.toLowerCase()] || 'neutral';
}

function mapBestFor(useCases: Array<{ value: string }>): string[] {
  const map: Record<string, string> = {
    'daily_training': 'easy_runs',
    'easy_runs': 'easy_runs',
    'long_runs': 'long_runs',
    'racing': 'racing',
    'marathon': 'racing',
    'half_marathon': 'racing',
    'tempo_runs': 'tempo',
    'speedwork': 'speed_work',
    'fast_training': 'speed_work',
    'recovery_runs': 'easy_runs',
  };
  const mapped = useCases.map(uc => map[uc.value] || 'easy_runs');
  return [...new Set(mapped)];
}

function inferShoeProperties(brandModel: string, drop: number, price: number, weight: number) {
  const lowerName = brandModel.toLowerCase();
  
  let category: string = 'daily_trainer';
  let cushioning: string = 'medium';
  let stability: string = 'neutral';
  let hasCarbonPlate = false;
  let hasSuperFoam = false;
  let bestFor: string[] = ['easy_runs'];
  
  if (lowerName.includes('pro') || lowerName.includes('elite') || lowerName.includes('adios')) {
    category = 'racing';
    hasCarbonPlate = true;
    hasSuperFoam = true;
    cushioning = 'firm';
    bestFor = ['racing', 'speed_work'];
  } else if (lowerName.includes('speedgoat') || lowerName.includes('peregrine') || 
             lowerName.includes('speedcross') || lowerName.includes('lone peak') ||
             lowerName.includes('cascadia') || lowerName.includes('trail') ||
             lowerName.includes('torrent') || lowerName.includes('bushido')) {
    category = 'trail';
    bestFor = ['easy_runs', 'long_runs'];
  } else if (lowerName.includes('vaporfly') || lowerName.includes('alphafly') || 
             lowerName.includes('metaspeed') || lowerName.includes('prime x')) {
    category = 'racing';
    hasCarbonPlate = true;
    hasSuperFoam = true;
    cushioning = 'soft';
    bestFor = ['racing'];
  } else if (lowerName.includes('tempo') || lowerName.includes('speed') || 
             lowerName.includes('boston') || lowerName.includes('rebel')) {
    category = 'speed_training';
    hasSuperFoam = true;
    bestFor = ['tempo', 'speed_work'];
  } else if (lowerName.includes('recovery') || lowerName.includes('bondi') ||
             lowerName.includes('triumph') || lowerName.includes('nimbus')) {
    category = 'long_run';
    cushioning = 'soft';
    bestFor = ['long_runs', 'easy_runs'];
  }
  
  if (drop === 0) {
    stability = 'neutral';
  }
  
  if (price >= 200) {
    hasSuperFoam = true;
    if (price >= 250) hasCarbonPlate = true;
  }
  
  let durability = 3.5;
  let responsiveness = 3.0;
  let comfort = 4.0;
  
  if (category === 'racing') {
    durability = 2.5;
    responsiveness = 4.5;
    comfort = 3.5;
  } else if (category === 'trail') {
    durability = 4.0;
    responsiveness = 3.0;
    comfort = 3.8;
  } else if (category === 'long_run') {
    durability = 4.0;
    responsiveness = 2.5;
    comfort = 4.5;
  }
  
  return { category, cushioning, stability, hasCarbonPlate, hasSuperFoam, bestFor, durability, responsiveness, comfort };
}

async function importShoes() {
  console.log('Starting shoe import...');
  
  const simpleFile = fs.readFileSync(
    path.join(process.cwd(), 'attached_assets/extract-data-2025-12-19_1766110813127.json'),
    'utf-8'
  );
  const simpleData = JSON.parse(simpleFile);
  const simpleShoes: SimpleShoe[] = simpleData.shoe_models;
  
  const detailedFile = fs.readFileSync(
    path.join(process.cwd(), 'attached_assets/extract-data-2025-12-19_(1)_1766111452879.json'),
    'utf-8'
  );
  const detailedData = JSON.parse(detailedFile);
  const detailedShoes: DetailedShoe[] = detailedData.runningShoes;
  
  console.log(`Found ${simpleShoes.length} shoes in simple format`);
  console.log(`Found ${detailedShoes.length} shoes in detailed format`);
  
  const existingShoes = await db.select({
    id: runningShoes.id,
    brand: runningShoes.brand,
    model: runningShoes.model,
    slug: runningShoes.slug,
  }).from(runningShoes);
  
  console.log(`Existing shoes in DB: ${existingShoes.length}`);
  
  const existingSlugs = new Set(existingShoes.map(s => s.slug?.toLowerCase()));
  const existingBrandModels = new Set(
    existingShoes.map(s => `${s.brand.toLowerCase()}:${s.model.toLowerCase()}`)
  );
  
  const detailedMap = new Map<string, DetailedShoe>();
  for (const shoe of detailedShoes) {
    const key = `${shoe.brand.toLowerCase()}:${shoe.model.toLowerCase()}`;
    detailedMap.set(key, shoe);
  }
  
  const toInsert: any[] = [];
  const skippedDuplicates: string[] = [];
  const skippedMissingData: string[] = [];
  
  for (const detailed of detailedShoes) {
    const slug = generateSlug(detailed.brand, detailed.model);
    const key = `${detailed.brand.toLowerCase()}:${detailed.model.toLowerCase()}`;
    
    if (existingSlugs.has(slug) || existingBrandModels.has(key)) {
      skippedDuplicates.push(`${detailed.brand} ${detailed.model}`);
      continue;
    }
    
    const versionNum = detailed.version ? parseInt(detailed.version.replace(/\D/g, ''), 10) || null : null;
    
    toInsert.push({
      brand: detailed.brand,
      model: detailed.model,
      slug,
      seriesName: detailed.seriesName || null,
      versionNumber: versionNum,
      category: mapCategory(detailed.category),
      weight: detailed.weightOunces,
      heelStackHeight: detailed.stackHeights?.heel || 30,
      forefootStackHeight: detailed.stackHeights?.forefoot || 22,
      heelToToeDrop: detailed.heelToToeDrop,
      cushioningLevel: mapCushioning(detailed.cushioningLevel),
      stability: mapStability(detailed.stabilityType),
      hasCarbonPlate: detailed.carbonPlate,
      hasSuperFoam: detailed.superFoam,
      price: detailed.price,
      bestFor: mapBestFor(detailed.bestUseCases),
      minRunnerWeight: null,
      maxRunnerWeight: null,
      durabilityRating: detailed.durabilityRating,
      responsivenessRating: detailed.responsivenessRating,
      comfortRating: detailed.comfortRating,
      releaseYear: 2025,
      imageUrl: null,
    });
    
    existingSlugs.add(slug);
    existingBrandModels.add(key);
  }
  
  for (const simple of simpleShoes) {
    const { brand, model } = parseBrandAndModel(simple.model_name);
    const slug = generateSlug(brand, model);
    const key = `${brand.toLowerCase()}:${model.toLowerCase()}`;
    
    if (existingSlugs.has(slug) || existingBrandModels.has(key)) {
      skippedDuplicates.push(simple.model_name);
      continue;
    }
    
    if (!simple.weight_grams || !simple.heel_to_toe_drop_mm || !simple.retail_price_usd) {
      skippedMissingData.push(simple.model_name);
      continue;
    }
    
    const weightOz = gramsToOunces(simple.weight_grams);
    const inferred = inferShoeProperties(
      simple.model_name,
      simple.heel_to_toe_drop_mm,
      simple.retail_price_usd,
      weightOz
    );
    
    const versionNum = extractVersionNumber(model);
    const seriesName = extractSeriesName(model);
    
    toInsert.push({
      brand,
      model,
      slug,
      seriesName,
      versionNumber: versionNum,
      category: inferred.category,
      weight: weightOz,
      heelStackHeight: 32,
      forefootStackHeight: 32 - simple.heel_to_toe_drop_mm,
      heelToToeDrop: simple.heel_to_toe_drop_mm,
      cushioningLevel: inferred.cushioning,
      stability: inferred.stability,
      hasCarbonPlate: inferred.hasCarbonPlate,
      hasSuperFoam: inferred.hasSuperFoam,
      price: simple.retail_price_usd,
      bestFor: inferred.bestFor,
      minRunnerWeight: null,
      maxRunnerWeight: null,
      durabilityRating: inferred.durability,
      responsivenessRating: inferred.responsiveness,
      comfortRating: inferred.comfort,
      releaseYear: 2025,
      imageUrl: null,
    });
    
    existingSlugs.add(slug);
    existingBrandModels.add(key);
  }
  
  console.log(`\nImport Summary:`);
  console.log(`- Shoes to insert: ${toInsert.length}`);
  console.log(`- Skipped (duplicates): ${skippedDuplicates.length}`);
  console.log(`- Skipped (missing data): ${skippedMissingData.length}`);
  
  if (toInsert.length > 0) {
    console.log(`\nInserting ${toInsert.length} new shoes...`);
    
    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50);
      await db.insert(runningShoes).values(batch);
      console.log(`  Inserted batch ${Math.floor(i / 50) + 1}/${Math.ceil(toInsert.length / 50)}`);
    }
    
    console.log(`\nSuccessfully inserted ${toInsert.length} new shoes!`);
  }
  
  const finalCount = await db.select({ count: runningShoes.id }).from(runningShoes);
  console.log(`\nTotal shoes in database: ${finalCount.length}`);
  
  console.log(`\nSample of skipped duplicates:`);
  skippedDuplicates.slice(0, 10).forEach(s => console.log(`  - ${s}`));
  
  if (skippedMissingData.length > 0) {
    console.log(`\nSkipped due to missing data:`);
    skippedMissingData.slice(0, 10).forEach(s => console.log(`  - ${s}`));
  }
}

importShoes()
  .then(() => {
    console.log('\nImport complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });

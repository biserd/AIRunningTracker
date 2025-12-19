import OpenAI from 'openai';
import { db } from '../server/db';
import { runningShoes } from '../shared/schema';
import { eq, isNull, and } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ShoeData {
  id: number;
  brand: string;
  model: string;
  category: string;
  weight: number;
  heelStackHeight: number;
  forefootStackHeight: number;
  heelToToeDrop: number;
  cushioningLevel: string;
  stability: string;
  hasCarbonPlate: boolean;
  hasSuperFoam: boolean;
  price: number;
  bestFor: string[];
  durabilityRating: number;
  responsivenessRating: number;
  comfortRating: number;
}

function calculateResilienceScore(shoe: ShoeData): number {
  let score = shoe.durabilityRating * 20;
  
  if (shoe.category === 'racing') {
    score -= 30;
  } else if (shoe.category === 'trail') {
    score += 5;
  } else if (shoe.category === 'daily_trainer' || shoe.category === 'long_run') {
    score += 10;
  }
  
  if (shoe.hasCarbonPlate) {
    score -= 15;
  }
  
  if (shoe.weight > 10) {
    score += 5;
  } else if (shoe.weight < 8) {
    score -= 10;
  }
  
  return Math.max(20, Math.min(100, Math.round(score)));
}

function estimateMileage(shoe: ShoeData): string {
  const durability = shoe.durabilityRating;
  const isRacing = shoe.category === 'racing';
  const hasCarbonPlate = shoe.hasCarbonPlate;
  
  if (isRacing && hasCarbonPlate) {
    if (durability >= 3.5) return '150-250 miles';
    if (durability >= 2.5) return '100-175 miles';
    return '75-125 miles';
  }
  
  if (isRacing) {
    if (durability >= 3.5) return '250-350 miles';
    return '150-250 miles';
  }
  
  if (shoe.category === 'trail') {
    if (durability >= 4) return '400-500 miles';
    if (durability >= 3) return '300-400 miles';
    return '200-300 miles';
  }
  
  if (durability >= 4.5) return '500-600 miles';
  if (durability >= 4) return '450-550 miles';
  if (durability >= 3.5) return '400-500 miles';
  if (durability >= 3) return '350-450 miles';
  return '300-400 miles';
}

function generateTargetUsage(shoe: ShoeData): string {
  const usages: string[] = [];
  
  if (shoe.category === 'racing') {
    usages.push('race day performance');
    if (shoe.hasCarbonPlate) usages.push('PR attempts');
    usages.push('speed workouts');
  } else if (shoe.category === 'trail') {
    usages.push('trail running');
    usages.push('off-road adventures');
    if (shoe.stability !== 'neutral') usages.push('technical terrain');
  } else if (shoe.category === 'speed_training') {
    usages.push('tempo runs');
    usages.push('interval training');
    usages.push('faster long runs');
  } else if (shoe.category === 'recovery') {
    usages.push('recovery runs');
    usages.push('easy days');
    usages.push('active recovery');
  } else if (shoe.category === 'long_run') {
    usages.push('long runs');
    usages.push('marathon training');
    usages.push('easy runs');
  } else {
    usages.push('daily training');
    if (shoe.bestFor.includes('easy_runs')) usages.push('easy runs');
    if (shoe.bestFor.includes('long_runs')) usages.push('long runs');
    if (shoe.bestFor.includes('tempo')) usages.push('tempo runs');
  }
  
  return `Ideal for ${usages.slice(0, 3).join(', ')}`;
}

async function generateNarrative(shoe: ShoeData): Promise<string> {
  const categoryLabels: Record<string, string> = {
    'daily_trainer': 'daily trainer',
    'racing': 'racing flat',
    'trail': 'trail runner',
    'speed_training': 'tempo shoe',
    'long_run': 'long-run shoe',
    'recovery': 'recovery shoe',
  };
  
  const cushionLabels: Record<string, string> = {
    'soft': 'plush, soft cushioning',
    'medium': 'balanced cushioning',
    'firm': 'responsive, firm cushioning',
  };
  
  const prompt = `Write a concise 2-sentence product description for a running shoe. 
Brand: ${shoe.brand}
Model: ${shoe.model}
Type: ${categoryLabels[shoe.category] || 'running shoe'}
Weight: ${shoe.weight} oz
Heel-to-toe drop: ${shoe.heelToToeDrop}mm
Cushioning: ${cushionLabels[shoe.cushioningLevel] || 'balanced cushioning'}
Carbon plate: ${shoe.hasCarbonPlate ? 'Yes' : 'No'}
Super foam: ${shoe.hasSuperFoam ? 'Yes' : 'No'}
Best for: ${shoe.bestFor.join(', ')}
Comfort rating: ${shoe.comfortRating}/5
Responsiveness: ${shoe.responsivenessRating}/5

Keep it factual, highlighting key features. Start with "The ${shoe.brand} ${shoe.model} is a..."`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });
    
    return response.choices[0]?.message?.content?.trim() || 
      `The ${shoe.brand} ${shoe.model} is a ${categoryLabels[shoe.category] || 'running shoe'} featuring ${cushionLabels[shoe.cushioningLevel] || 'balanced cushioning'} for versatility. With a ${shoe.heelToToeDrop}mm heel-to-toe drop and weighing ${shoe.weight} oz, it's designed for ${shoe.bestFor.slice(0, 2).join(' and ')}.`;
  } catch (error) {
    console.error(`Error generating narrative for ${shoe.brand} ${shoe.model}:`, error);
    return `The ${shoe.brand} ${shoe.model} is a ${categoryLabels[shoe.category] || 'running shoe'} featuring ${cushionLabels[shoe.cushioningLevel] || 'balanced cushioning'} for versatility. With a ${shoe.heelToToeDrop}mm heel-to-toe drop and weighing ${shoe.weight} oz, it's designed for ${shoe.bestFor.slice(0, 2).join(' and ')}.`;
  }
}

async function generateInsights() {
  console.log('Starting AI insights generation for 2025 shoes...');
  
  const shoesNeedingInsights = await db.select({
    id: runningShoes.id,
    brand: runningShoes.brand,
    model: runningShoes.model,
    category: runningShoes.category,
    weight: runningShoes.weight,
    heelStackHeight: runningShoes.heelStackHeight,
    forefootStackHeight: runningShoes.forefootStackHeight,
    heelToToeDrop: runningShoes.heelToToeDrop,
    cushioningLevel: runningShoes.cushioningLevel,
    stability: runningShoes.stability,
    hasCarbonPlate: runningShoes.hasCarbonPlate,
    hasSuperFoam: runningShoes.hasSuperFoam,
    price: runningShoes.price,
    bestFor: runningShoes.bestFor,
    durabilityRating: runningShoes.durabilityRating,
    responsivenessRating: runningShoes.responsivenessRating,
    comfortRating: runningShoes.comfortRating,
  })
  .from(runningShoes)
  .where(and(
    eq(runningShoes.releaseYear, 2025),
    isNull(runningShoes.aiNarrative)
  ));
  
  console.log(`Found ${shoesNeedingInsights.length} shoes needing AI insights`);
  
  if (shoesNeedingInsights.length === 0) {
    console.log('All 2025 shoes already have AI insights!');
    return;
  }
  
  let processed = 0;
  let errors = 0;
  
  for (const shoe of shoesNeedingInsights) {
    try {
      const resilienceScore = calculateResilienceScore(shoe as ShoeData);
      const mileageEstimate = estimateMileage(shoe as ShoeData);
      const targetUsage = generateTargetUsage(shoe as ShoeData);
      const narrative = await generateNarrative(shoe as ShoeData);
      
      await db.update(runningShoes)
        .set({
          aiResilienceScore: resilienceScore,
          aiMileageEstimate: mileageEstimate,
          aiTargetUsage: targetUsage,
          aiNarrative: narrative,
        })
        .where(eq(runningShoes.id, shoe.id));
      
      processed++;
      if (processed % 10 === 0) {
        console.log(`Processed ${processed}/${shoesNeedingInsights.length} shoes...`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error processing ${shoe.brand} ${shoe.model}:`, error);
      errors++;
    }
  }
  
  console.log(`\nAI Insights Generation Complete!`);
  console.log(`- Successfully processed: ${processed}`);
  console.log(`- Errors: ${errors}`);
}

generateInsights()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });

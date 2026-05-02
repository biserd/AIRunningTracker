import OpenAI from 'openai';
import { db } from '../server/db';
import { runningShoes } from '../shared/schema';
import { eq, isNull, or, and } from 'drizzle-orm';

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
  aiNarrative: string | null;
  aiFaq: string | null;
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

const CATEGORY_LABELS: Record<string, string> = {
  daily_trainer: 'daily trainer',
  racing: 'racing flat',
  trail: 'trail runner',
  speed_training: 'tempo shoe',
  long_run: 'long-run shoe',
  recovery: 'recovery shoe',
};

const CUSHION_LABELS: Record<string, string> = {
  soft: 'plush, soft cushioning',
  medium: 'balanced cushioning',
  firm: 'responsive, firm cushioning',
};

async function generateNarrative(shoe: ShoeData): Promise<string> {
  const cat = CATEGORY_LABELS[shoe.category] || 'running shoe';
  const cushion = CUSHION_LABELS[shoe.cushioningLevel] || 'balanced cushioning';
  const prompt = `You are an SEO copywriter for a running-shoe review site. Write a 3–4 sentence product overview (90–140 words) for the running shoe below.

Requirements:
- Naturally use the full name "${shoe.brand} ${shoe.model}" in the FIRST sentence and again later.
- Mention the shoe type ("${cat}"), key specs (weight ${shoe.weight} oz, ${shoe.heelToToeDrop}mm drop, ${shoe.heelStackHeight}/${shoe.forefootStackHeight}mm stack), and the cushioning feel ("${cushion}").
- Mention the carbon plate / super foam ONLY if present (carbon plate: ${shoe.hasCarbonPlate}, super foam: ${shoe.hasSuperFoam}).
- Tell the runner who it's best for (${shoe.bestFor.join(', ')}) and what kind of run it shines on.
- Friendly, confident, conversational tone — like a coach giving a quick verdict. No hype, no emojis, no markdown, no headings.
- Do NOT invent a price, release year, or colorway. Stick to the facts provided.
- Output ONLY the overview paragraph (plain text). Start with "The ${shoe.brand} ${shoe.model} is...".

Specs reference:
- Stability: ${shoe.stability}
- Comfort: ${shoe.comfortRating}/5, Responsiveness: ${shoe.responsivenessRating}/5, Durability: ${shoe.durabilityRating}/5
- Price tier: $${shoe.price}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 320,
      temperature: 0.7,
    });

    return (
      response.choices[0]?.message?.content?.trim() ||
      `The ${shoe.brand} ${shoe.model} is a ${CATEGORY_LABELS[shoe.category] || 'running shoe'} featuring ${CUSHION_LABELS[shoe.cushioningLevel] || 'balanced cushioning'} for versatility. With a ${shoe.heelToToeDrop}mm heel-to-toe drop and weighing ${shoe.weight} oz, it's designed for ${shoe.bestFor.slice(0, 2).join(' and ')}.`
    );
  } catch (error) {
    console.error(`Error generating narrative for ${shoe.brand} ${shoe.model}:`, error);
    return `The ${shoe.brand} ${shoe.model} is a ${CATEGORY_LABELS[shoe.category] || 'running shoe'} featuring ${CUSHION_LABELS[shoe.cushioningLevel] || 'balanced cushioning'} for versatility. With a ${shoe.heelToToeDrop}mm heel-to-toe drop and weighing ${shoe.weight} oz, it's designed for ${shoe.bestFor.slice(0, 2).join(' and ')}.`;
  }
}

interface FaqEntry {
  q: string;
  a: string;
}

function fallbackFaq(shoe: ShoeData): FaqEntry[] {
  const cat = CATEGORY_LABELS[shoe.category] || 'running shoe';
  return [
    {
      q: `Is the ${shoe.brand} ${shoe.model} a good ${cat}?`,
      a: `Yes — the ${shoe.brand} ${shoe.model} is designed as a ${cat} with ${CUSHION_LABELS[shoe.cushioningLevel] || 'balanced cushioning'} and a ${shoe.heelToToeDrop}mm heel-to-toe drop, weighing ${shoe.weight} oz.`,
    },
    {
      q: `How long does the ${shoe.brand} ${shoe.model} last?`,
      a: `Based on its build, expect roughly ${estimateMileage(shoe)} of useful life.`,
    },
    {
      q: `What is the ${shoe.brand} ${shoe.model} best for?`,
      a: `${generateTargetUsage(shoe)}.`,
    },
  ];
}

async function generateFaq(shoe: ShoeData): Promise<string> {
  const cat = CATEGORY_LABELS[shoe.category] || 'running shoe';
  const cushion = CUSHION_LABELS[shoe.cushioningLevel] || 'balanced cushioning';
  const prompt = `You are an SEO copywriter generating an FAQ section for a running-shoe product page (used for Google rich results / structured data).

Return STRICT JSON ONLY in this exact shape — no prose, no markdown, no code fences:
{"faq":[{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]}

Rules:
- EXACTLY 3 entries.
- Each "q" must be a natural-language question a runner would actually type into Google, and must include the full shoe name "${shoe.brand} ${shoe.model}" so the FAQ ranks for long-tail queries.
- Each "a" is 1–2 sentences, factual, friendly, conversational. Reference the spec when relevant (weight, drop, stack, cushioning, stability, carbon plate, super foam). Do NOT invent prices, release dates, or features not listed.
- Mix question types — pick 3 that genuinely fit this shoe from: best use case, comparison to previous version, durability/mileage, who it's for (beginners, heavier runners, racers), carbon plate / super foam questions, fit & sizing feel, daily-trainer vs. race-day suitability.
- No emojis, no markdown.

Shoe data:
- Name: ${shoe.brand} ${shoe.model}
- Type: ${cat}
- Weight: ${shoe.weight} oz
- Heel-to-toe drop: ${shoe.heelToToeDrop}mm
- Stack: ${shoe.heelStackHeight}mm heel / ${shoe.forefootStackHeight}mm forefoot
- Cushioning: ${cushion}
- Stability: ${shoe.stability}
- Carbon plate: ${shoe.hasCarbonPlate}
- Super foam: ${shoe.hasSuperFoam}
- Price: $${shoe.price}
- Best for: ${shoe.bestFor.join(', ')}
- Comfort ${shoe.comfortRating}/5, Responsiveness ${shoe.responsivenessRating}/5, Durability ${shoe.durabilityRating}/5`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.6,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) return JSON.stringify(fallbackFaq(shoe));

    const parsed: unknown = JSON.parse(raw);
    let entries: FaqEntry[] = [];
    if (Array.isArray(parsed)) {
      entries = parsed as FaqEntry[];
    } else if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const candidate = (obj.faq ?? obj.faqs ?? obj.entries ?? obj.items ?? Object.values(obj)[0]);
      if (Array.isArray(candidate)) entries = candidate as FaqEntry[];
    }

    const clean = entries
      .filter((e) => e && typeof e.q === 'string' && typeof e.a === 'string')
      .slice(0, 3);

    if (clean.length < 2) return JSON.stringify(fallbackFaq(shoe));
    return JSON.stringify(clean);
  } catch (error) {
    console.error(`Error generating FAQ for ${shoe.brand} ${shoe.model}:`, error);
    return JSON.stringify(fallbackFaq(shoe));
  }
}

async function generateInsights() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10) || 0) : 0;
  console.log(`Starting AI insights generation (any year, missing aiNarrative or aiFaq)${limit ? ` — limit ${limit}` : ''}...`);

  const shoesNeedingInsights = await db
    .select({
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
      aiNarrative: runningShoes.aiNarrative,
      aiFaq: runningShoes.aiFaq,
    })
    .from(runningShoes)
    .where(or(isNull(runningShoes.aiNarrative), isNull(runningShoes.aiFaq)));

  const allCount = shoesNeedingInsights.length;
  const batch = limit > 0 ? shoesNeedingInsights.slice(0, limit) : shoesNeedingInsights;
  console.log(`Found ${allCount} shoes needing AI insights${limit ? ` — processing first ${batch.length}` : ''}`);

  if (batch.length === 0) {
    console.log('All shoes already have AI insights!');
    return;
  }

  let processed = 0;
  let errors = 0;

  for (const shoe of batch) {
    try {
      const data = {
        ...shoe,
        hasCarbonPlate: !!shoe.hasCarbonPlate,
        hasSuperFoam: !!shoe.hasSuperFoam,
      } as ShoeData;

      const update: Partial<typeof runningShoes.$inferInsert> = {};

      if (!shoe.aiNarrative) {
        update.aiResilienceScore = calculateResilienceScore(data);
        update.aiMileageEstimate = estimateMileage(data);
        update.aiTargetUsage = generateTargetUsage(data);
        update.aiNarrative = await generateNarrative(data);
      }

      if (!shoe.aiFaq) {
        update.aiFaq = await generateFaq(data);
      }

      if (Object.keys(update).length > 0) {
        await db.update(runningShoes).set(update).where(eq(runningShoes.id, shoe.id));
      }

      processed++;
      console.log(`[${processed}/${batch.length}] ${shoe.brand} ${shoe.model}`);

      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Error processing ${shoe.brand} ${shoe.model}:`, error);
      errors++;
    }
  }

  console.log(`\nAI Insights Generation Complete!`);
  console.log(`- Successfully processed: ${processed}`);
  console.log(`- Errors: ${errors}`);
  console.log(`- Remaining: ${allCount - processed}`);
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

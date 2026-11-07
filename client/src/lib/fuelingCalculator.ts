// Marathon Fueling Calculator Logic

export interface GelProduct {
  id: string;
  brand: string;
  name: string;
  carbsPerGel: number;
  sodiumPerGel: number;
  caffeinePerGel: number;
  description?: string;
}

export interface FuelingInputs {
  finishTimeMinutes: number;
  feedingIntervalMinutes: number;
  firstGelMinutes: number;
  lastGelCutoffMinutes: number;
  preStartGel: boolean;
  carbTargetPerHour: number;
  sodiumTargetPerHour: number;
  drinkVolumePerHour: number;
  drinkSodiumPerLiter: number;
  drinkCarbsPerLiter: number;
}

export interface FeedingEvent {
  timeMinutes: number;
  timeDisplay: string;
  gelId: string;
  isPreStart: boolean;
}

export interface FuelingPlan {
  feedingEvents: FeedingEvent[];
  totalGels: number;
  inRaceGels: number;
  preStartCarbs: number;
  preStartSodium: number;
  totalCaffeine: number;
  carbsPerHour: number;
  sodiumPerHour: number;
  totalCarbs: number;
  totalSodium: number;
  carbShortfall: number;
  sodiumShortfall: number;
  gelBreakdown: { gel: GelProduct; count: number }[];
  warnings: string[];
}

// Preset gel catalog
export const GEL_CATALOG: GelProduct[] = [
  {
    id: 'maurten-160',
    brand: 'Maurten',
    name: 'GEL 160',
    carbsPerGel: 40,
    sodiumPerGel: 30,
    caffeinePerGel: 0,
    description: 'High-carb hydrogel, 40g carbs'
  },
  {
    id: 'maurten-100',
    brand: 'Maurten',
    name: 'GEL 100',
    carbsPerGel: 25,
    sodiumPerGel: 20,
    caffeinePerGel: 0,
    description: 'Standard hydrogel, 25g carbs'
  },
  {
    id: 'maurten-100-caf',
    brand: 'Maurten',
    name: 'GEL 100 CAF 100',
    carbsPerGel: 25,
    sodiumPerGel: 20,
    caffeinePerGel: 100,
    description: '25g carbs + 100mg caffeine'
  },
  {
    id: 'gu-roctane',
    brand: 'GU',
    name: 'Roctane Energy Gel',
    carbsPerGel: 21,
    sodiumPerGel: 125,
    caffeinePerGel: 35,
    description: 'High-sodium, 21g carbs + 35mg caffeine'
  },
  {
    id: 'gu-standard',
    brand: 'GU',
    name: 'Energy Gel',
    carbsPerGel: 22,
    sodiumPerGel: 60,
    caffeinePerGel: 20,
    description: 'Standard GU, 22g carbs'
  },
  {
    id: 'precision-fuel-60',
    brand: 'Precision Fuel & Hydration',
    name: 'PF 60 Gel',
    carbsPerGel: 60,
    sodiumPerGel: 200,
    caffeinePerGel: 0,
    description: 'Ultra high-carb, 60g carbs'
  },
  {
    id: 'sis-beta-fuel',
    brand: 'SiS',
    name: 'Beta Fuel',
    carbsPerGel: 40,
    sodiumPerGel: 40,
    caffeinePerGel: 0,
    description: 'High-carb dual-source, 40g carbs'
  },
  {
    id: 'sis-beta-fuel-caf',
    brand: 'SiS',
    name: 'Beta Fuel + Caffeine',
    carbsPerGel: 40,
    sodiumPerGel: 40,
    caffeinePerGel: 100,
    description: '40g carbs + 100mg caffeine'
  },
  {
    id: 'sis-isotonic',
    brand: 'SiS',
    name: 'GO Isotonic',
    carbsPerGel: 22,
    sodiumPerGel: 20,
    caffeinePerGel: 0,
    description: 'Easy-to-digest isotonic, 22g carbs'
  },
  {
    id: 'neversecond-c30',
    brand: 'Neversecond',
    name: 'C30 Energy Gel',
    carbsPerGel: 30,
    sodiumPerGel: 50,
    caffeinePerGel: 0,
    description: 'High-carb, 30g carbs'
  },
  {
    id: 'neversecond-c30-caf',
    brand: 'Neversecond',
    name: 'C30 + Caffeine',
    carbsPerGel: 30,
    sodiumPerGel: 50,
    caffeinePerGel: 100,
    description: '30g carbs + 100mg caffeine'
  },
  {
    id: 'spring-awesome',
    brand: 'Spring Energy',
    name: 'Awesome Sauce',
    carbsPerGel: 26,
    sodiumPerGel: 115,
    caffeinePerGel: 0,
    description: 'Real food ingredients, 26g carbs'
  },
  {
    id: 'honey-stinger',
    brand: 'Honey Stinger',
    name: 'Energy Gel',
    carbsPerGel: 27,
    sodiumPerGel: 50,
    caffeinePerGel: 0,
    description: 'Honey-based, 27g carbs'
  },
  {
    id: 'honey-stinger-caf',
    brand: 'Honey Stinger',
    name: 'Caffeinated Gel',
    carbsPerGel: 27,
    sodiumPerGel: 50,
    caffeinePerGel: 32,
    description: '27g carbs + 32mg caffeine'
  },
  {
    id: 'clif-shot',
    brand: 'Clif',
    name: 'Shot Energy Gel',
    carbsPerGel: 24,
    sodiumPerGel: 90,
    caffeinePerGel: 0,
    description: 'Organic ingredients, 24g carbs'
  },
  {
    id: 'clif-shot-caf',
    brand: 'Clif',
    name: 'Shot + Caffeine',
    carbsPerGel: 24,
    sodiumPerGel: 90,
    caffeinePerGel: 50,
    description: '24g carbs + 50mg caffeine'
  },
  {
    id: 'huma-original',
    brand: 'Huma',
    name: 'Original Gel',
    carbsPerGel: 21,
    sodiumPerGel: 60,
    caffeinePerGel: 0,
    description: 'Chia-based, 21g carbs'
  },
  {
    id: 'precision-fuel-30',
    brand: 'Precision Fuel & Hydration',
    name: 'PF 30 Gel',
    carbsPerGel: 30,
    sodiumPerGel: 100,
    caffeinePerGel: 0,
    description: 'Medium-carb, 30g carbs'
  }
];

// Gut training level presets
export const GUT_TRAINING_PRESETS = [
  { value: 60, label: 'Beginner (60 g/h)', description: 'New to fueling during runs' },
  { value: 80, label: 'Intermediate (80 g/h)', description: 'Some fueling experience' },
  { value: 100, label: 'Advanced (100 g/h)', description: 'Gut-trained athlete' },
  { value: 120, label: 'Elite (120 g/h)', description: 'Highly trained gut capacity' }
];

// Sweat rate / sodium presets
export const SODIUM_PRESETS = [
  { value: 300, label: '300 mg/h', description: 'A chosen planning target' },
  { value: 500, label: '500 mg/h', description: 'A chosen planning target' },
  { value: 700, label: '700 mg/h', description: 'A chosen planning target' },
  { value: 900, label: '900 mg/h', description: 'A chosen planning target' }
];

export function fuelingInputErrors(inputs: FuelingInputs): string[] {
  const limits: [keyof FuelingInputs, number, number, string][] = [
    ["finishTimeMinutes", 120, 480, "Finish time must be between 2 and 8 hours."],
    ["feedingIntervalMinutes", 5, 90, "Feeding interval must be between 5 and 90 minutes."],
    ["firstGelMinutes", 0, 120, "First gel must be between 0 and 120 minutes."],
    ["lastGelCutoffMinutes", 0, 90, "Last-gel cutoff must be between 0 and 90 minutes."],
    ["carbTargetPerHour", 1, 120, "Carbohydrate target must be between 1 and 120 g/h."],
    ["sodiumTargetPerHour", 1, 2000, "Sodium target must be between 1 and 2,000 mg/h."],
    ["drinkVolumePerHour", 0, 2000, "Drink volume must be between 0 and 2,000 ml/h."],
    ["drinkSodiumPerLiter", 0, 4000, "Drink sodium must be between 0 and 4,000 mg/L."],
    ["drinkCarbsPerLiter", 0, 250, "Drink carbohydrate must be between 0 and 250 g/L."],
  ];
  return limits.filter(([key, min, max]) => !Number.isFinite(inputs[key]) || Number(inputs[key]) < min || Number(inputs[key]) > max).map(([, , , message]) => message);
}

// Format minutes to HH:MM display
export function formatTimeDisplay(minutes: number): string {
  if (minutes < 0) {
    return `-${formatTimeDisplay(Math.abs(minutes))}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

// Calculate feeding events
export function calculateFeedingEvents(inputs: FuelingInputs): FeedingEvent[] {
  if (fuelingInputErrors(inputs).length) return [];
  const {
    finishTimeMinutes,
    feedingIntervalMinutes,
    firstGelMinutes,
    lastGelCutoffMinutes,
    preStartGel
  } = inputs;

  const events: FeedingEvent[] = [];

  // Pre-start gel if enabled
  if (preStartGel) {
    events.push({
      timeMinutes: -10,
      timeDisplay: formatTimeDisplay(-10),
      gelId: GEL_CATALOG[0].id,
      isPreStart: true
    });
  }

  // Calculate in-race feeding events
  const effectiveRaceTime = finishTimeMinutes - lastGelCutoffMinutes;
  
  if (effectiveRaceTime < firstGelMinutes) {
    // Race too short for any in-race gels
    return events;
  }

  // Generate feeding times
  let currentTime = firstGelMinutes;
  while (currentTime <= effectiveRaceTime) {
    events.push({
      timeMinutes: currentTime,
      timeDisplay: formatTimeDisplay(currentTime),
      gelId: GEL_CATALOG[0].id,
      isPreStart: false
    });
    currentTime += feedingIntervalMinutes;
  }

  return events;
}

// Calculate fueling plan metrics
export function calculateFuelingPlan(
  inputs: FuelingInputs,
  feedingEvents: FeedingEvent[]
): FuelingPlan {
  if (fuelingInputErrors(inputs).length) throw new Error("Invalid fueling inputs");
  const {
    finishTimeMinutes,
    carbTargetPerHour,
    sodiumTargetPerHour,
    drinkVolumePerHour,
    drinkSodiumPerLiter,
    drinkCarbsPerLiter
  } = inputs;

  const raceHours = finishTimeMinutes / 60;

  // Calculate carbs and sodium from gels
  let totalCarbsFromGels = 0;
  let totalSodiumFromGels = 0;
  let preStartCarbs = 0;
  let preStartSodium = 0;
  let totalCaffeine = 0;
  const gelCounts = new Map<string, number>();

  feedingEvents.forEach(event => {
    const gel = GEL_CATALOG.find(g => g.id === event.gelId);
    if (gel) {
      if (event.isPreStart) { preStartCarbs += gel.carbsPerGel; preStartSodium += gel.sodiumPerGel; }
      else { totalCarbsFromGels += gel.carbsPerGel; totalSodiumFromGels += gel.sodiumPerGel; }
      totalCaffeine += gel.caffeinePerGel;
      gelCounts.set(event.gelId, (gelCounts.get(event.gelId) || 0) + 1);
    }
  });

  // Calculate from drink
  const totalDrinkVolume = drinkVolumePerHour * raceHours;
  const totalCarbsFromDrink = (drinkCarbsPerLiter / 1000) * (drinkVolumePerHour * raceHours);
  const totalSodiumFromDrink = (drinkSodiumPerLiter / 1000) * (drinkVolumePerHour * raceHours);

  // Totals
  const totalCarbs = totalCarbsFromGels + totalCarbsFromDrink;
  const totalSodium = totalSodiumFromGels + totalSodiumFromDrink;

  // Per hour
  const carbsPerHour = totalCarbs / raceHours;
  const sodiumPerHour = totalSodium / raceHours;

  // Shortfalls
  const carbNeeded = carbTargetPerHour * raceHours;
  const sodiumNeeded = sodiumTargetPerHour * raceHours;
  const carbShortfall = Math.max(0, carbNeeded - totalCarbs);
  const sodiumShortfall = Math.max(0, sodiumNeeded - totalSodium);

  // Gel breakdown
  const gelBreakdown = Array.from(gelCounts.entries()).map(([gelId, count]) => ({
    gel: GEL_CATALOG.find(g => g.id === gelId)!,
    count
  }));

  // Generate warnings
  const warnings: string[] = [];
  
  if (carbShortfall > 10) {
    warnings.push(
      `You're ${Math.round(carbShortfall)}g short on carbs (${Math.round(carbShortfall / raceHours)}g/h under target). ` +
      `Consider using higher-carb gels (40-60g), shortening feeding interval, or adding drink carbs.`
    );
  }
  
  if (sodiumShortfall > 100) {
    warnings.push(
      `You're ${Math.round(sodiumShortfall)}mg short on sodium (${Math.round(sodiumShortfall / raceHours)}mg/h under target). ` +
      `Review your chosen target and practiced products before changing intake.`
    );
  }

  if (feedingEvents.length === 0) {
    warnings.push(
      `No feeding events scheduled. Your race is too short or cutoff settings prevent any fueling.`
    );
  }

  if (carbsPerHour > 120) {
    warnings.push(
      `Carb intake (${Math.round(carbsPerHour)}g/h) exceeds this calculator's planning range. Review tolerance and product choices before using the schedule.`
    );
  }

  return {
    feedingEvents,
    totalGels: feedingEvents.length,
    inRaceGels: feedingEvents.filter(e => !e.isPreStart).length,
    preStartCarbs,
    preStartSodium,
    totalCaffeine,
    carbsPerHour,
    sodiumPerHour,
    totalCarbs,
    totalSodium,
    carbShortfall,
    sodiumShortfall,
    gelBreakdown,
    warnings
  };
}

// Optimize gel selection
export function optimizeFuelingPlan(
  inputs: FuelingInputs,
  feedingEvents: FeedingEvent[]
): FeedingEvent[] {
  if (fuelingInputErrors(inputs).length) return [];
  const {
    carbTargetPerHour,
    sodiumTargetPerHour,
    finishTimeMinutes
  } = inputs;

  const raceHours = finishTimeMinutes / 60;
  const carbNeededTotal = carbTargetPerHour * raceHours;
  const sodiumNeededTotal = sodiumTargetPerHour * raceHours;

  // Account for drink contributions
  const carbsFromDrink = (inputs.drinkCarbsPerLiter / 1000) * (inputs.drinkVolumePerHour * raceHours);
  const sodiumFromDrink = (inputs.drinkSodiumPerLiter / 1000) * (inputs.drinkVolumePerHour * raceHours);

  const carbNeededFromGels = Math.max(0, carbNeededTotal - carbsFromDrink);
  const sodiumNeededFromGels = Math.max(0, sodiumNeededTotal - sodiumFromDrink);

  const inRaceCount = feedingEvents.filter(e => !e.isPreStart).length;
  if (inRaceCount === 0) return feedingEvents;

  // Target carbs per gel
  const targetCarbsPerGel = carbNeededFromGels / inRaceCount;
  const targetSodiumPerGel = sodiumNeededFromGels / inRaceCount;

  // Smart gel selection based on targets
  const ultraHighCarbGel = GEL_CATALOG.find(g => g.carbsPerGel === 60); // PF 60
  const highCarbGel = GEL_CATALOG.find(g => g.carbsPerGel === 40 && g.caffeinePerGel === 0); // Maurten 160 or SiS Beta Fuel
  const highSodiumGel = GEL_CATALOG.find(g => g.sodiumPerGel >= 100); // GU Roctane or PF

  const optimizedEvents = feedingEvents.map((event, index) => {
    // Pre-start gel: use medium carb (25-30g)
    if (event.isPreStart) {
      const preStartGel = GEL_CATALOG.find(g => g.carbsPerGel >= 25 && g.carbsPerGel <= 30 && g.caffeinePerGel === 0);
      return { ...event, gelId: preStartGel?.id || GEL_CATALOG[1].id };
    }

    // Caffeine is an explicit product choice, never introduced by optimization.

    // Very high carb targets (>50g per gel): use ultra high-carb gels
    if (targetCarbsPerGel >= 50 && ultraHighCarbGel) {
      return { ...event, gelId: ultraHighCarbGel.id };
    }

    // High carb targets (30-50g per gel): use 40g gels
    if (targetCarbsPerGel >= 30 && highCarbGel) {
      return { ...event, gelId: highCarbGel.id };
    }

    // High sodium needs: alternate with high-sodium gels
    if (targetSodiumPerGel >= 80 && index % 2 === 0 && highSodiumGel && highSodiumGel.caffeinePerGel === 0) {
      return { ...event, gelId: highSodiumGel.id };
    }

    // Default: use 40g gel for optimal carb delivery
    return { ...event, gelId: highCarbGel?.id || GEL_CATALOG[0].id };
  });

  return optimizedEvents;
}

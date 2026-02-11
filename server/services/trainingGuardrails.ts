import type { AthleteProfile } from "@shared/schema";

export interface PlanWeekInput {
  weekNumber: number;
  weekType: "base" | "build" | "build2_specific" | "peak" | "recovery" | "taper";
  plannedDistanceKm: number;
  days: PlanDayInput[];
}

export interface PlanDayInput {
  dayOfWeek: string;
  workoutType: "easy" | "tempo" | "intervals" | "long_run" | "recovery" | "rest" | "cross_training" | "race" | "fartlek" | "hills" | "progression" | "back_to_back_long" | "fueling_practice";
  title: string;
  description?: string;
  plannedDistanceKm?: number;
  plannedDurationMins?: number;
  targetPace?: string;
  targetHrZone?: string;
  intensity: "low" | "moderate" | "high";
  workoutStructure?: {
    warmup?: string;
    main?: string;
    cooldown?: string;
    intervals?: Array<{ reps: number; distance: string; pace: string; rest: string }>;
  };
}

export interface GeneratedPlan {
  weeks: PlanWeekInput[];
  coachNotes?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  corrections: CorrectionAction[];
}

export interface CorrectionAction {
  type: "reduce_mileage" | "add_recovery_week" | "reduce_long_run" | "add_rest_day" | "extend_plan";
  weekNumber?: number;
  originalValue?: number;
  correctedValue?: number;
  reason: string;
}

export interface GuardrailConfig {
  maxWeeklyMileageIncreasePercent: number; // Default 10-15%
  maxLongRunPercentOfWeekly: number; // Default 30-35%
  maxLongRunIncreasePercent: number; // Max long run increase per week
  recoveryWeekFrequency: number; // Every N weeks
  recoveryWeekReduction: number; // Reduce by X%
  taperWeeksMarathon: number;
  taperWeeksHalf: number;
  taperWeeks10k: number;
  minRestDaysPerWeek: number;
  maxHardWorkoutsPerWeek: number;
  peakLongRunPercentOfRace: number; // 90% of race distance
  maxEasyRunPercentOfRace: number; // Easy runs should not exceed this % of race distance
  minEasyRunKm: number; // Minimum easy run distance in km (floor)
}

// Race distances in km
const RACE_DISTANCES_KM = {
  marathon: 42.195,
  half_marathon: 21.0975,
  "10k": 10,
  "5k": 5,
};

const DEFAULT_CONFIG: GuardrailConfig = {
  maxWeeklyMileageIncreasePercent: 12, // Conservative 10-15%
  maxLongRunPercentOfWeekly: 32, // 30-35% of weekly mileage
  maxLongRunIncreasePercent: 15, // Max 15% long run increase per week
  recoveryWeekFrequency: 4, // Every 4 weeks
  recoveryWeekReduction: 25, // Reduce by 25%
  taperWeeksMarathon: 3,
  taperWeeksHalf: 2,
  taperWeeks10k: 1,
  minRestDaysPerWeek: 1,
  maxHardWorkoutsPerWeek: 3,
  peakLongRunPercentOfRace: 90, // Peak long run should be 90% of race distance
  maxEasyRunPercentOfRace: 50, // Easy runs should not exceed 50% of race distance
  minEasyRunKm: 5, // Minimum 5km (3.1 miles) for easy runs
};

export class TrainingGuardrails {
  private config: GuardrailConfig;
  
  constructor(config: Partial<GuardrailConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Validate and correct a generated training plan
   */
  validateAndCorrect(
    plan: GeneratedPlan,
    profile: AthleteProfile,
    goalType: string,
    raceDate?: Date
  ): { plan: GeneratedPlan; validation: ValidationResult } {
    const validation: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      corrections: [],
    };
    
    const correctedPlan = JSON.parse(JSON.stringify(plan)) as GeneratedPlan;
    
    // Get baseline from profile
    const baselineMileage = profile.baselineWeeklyMileageKm || 20;
    
    // 0. FIRST: Cap all workouts to sensible race-based limits and enforce hierarchy
    // This MUST run before other validations to prevent absurd values from propagating
    this.validateWorkoutCaps(correctedPlan, goalType, validation);
    
    // 1. Validate weekly mileage progression
    this.validateMileageProgression(correctedPlan, baselineMileage, validation);
    
    // 2. Validate long run percentages
    this.validateLongRunPercentages(correctedPlan, validation);
    
    // 3. Ensure recovery weeks exist
    this.ensureRecoveryWeeks(correctedPlan, validation);
    
    // 4. Validate taper for race plans
    if (raceDate && goalType !== "general_fitness") {
      this.validateTaper(correctedPlan, goalType, validation);
    }
    
    // 5. Validate rest days and hard workout limits
    this.validateIntensityDistribution(correctedPlan, validation);
    
    // 6. Check for unrealistic timeline
    this.validateTimeline(correctedPlan, profile, goalType, raceDate, validation);
    
    // 7. Validate peak long run reaches 90% of race distance (marathon/half marathon)
    if (goalType === "marathon" || goalType === "half_marathon") {
      this.validatePeakLongRun(correctedPlan, goalType, validation);
    }
    
    // 8. Validate gradual long run build-up
    this.validateLongRunProgression(correctedPlan, validation);
    
    // Set overall validity
    validation.valid = validation.errors.length === 0;
    
    return { plan: correctedPlan, validation };
  }
  
  /**
   * FIRST VALIDATION: Cap all workouts to sensible limits based on race type
   * This prevents absurd values like a 22-mile easy run for a half marathon
   */
  private validateWorkoutCaps(
    plan: GeneratedPlan,
    goalType: string,
    validation: ValidationResult
  ): void {
    const raceDistanceKm = RACE_DISTANCES_KM[goalType as keyof typeof RACE_DISTANCES_KM];
    
    // For non-race goals, use a reasonable default (e.g., 15km max easy run)
    const maxEasyRunKm = raceDistanceKm 
      ? raceDistanceKm * (this.config.maxEasyRunPercentOfRace / 100)
      : 15;
    
    // Peak long run target (90% of race distance, or 25km for non-race)
    const peakLongRunKm = raceDistanceKm 
      ? raceDistanceKm * (this.config.peakLongRunPercentOfRace / 100)
      : 25;
    
    for (const week of plan.weeks) {
      // Find the long run for this week
      const longRunDay = week.days.find(d => d.workoutType === "long_run");
      const longRunKm = longRunDay?.plannedDistanceKm || 0;
      
      // Process each day in the week
      for (const day of week.days) {
        if (!day.plannedDistanceKm || day.workoutType === "rest") continue;
        
        const originalDistance = day.plannedDistanceKm;
        
        // Rule 1: No non-long-run workout should exceed the long run distance
        if (day.workoutType !== "long_run" && longRunKm > 0 && day.plannedDistanceKm >= longRunKm) {
          // Cap at 70% of long run distance to maintain clear hierarchy
          const cappedDistance = Math.round(longRunKm * 0.7 * 10) / 10;
          day.plannedDistanceKm = cappedDistance;
          
          validation.corrections.push({
            type: "reduce_mileage",
            weekNumber: week.weekNumber,
            originalValue: originalDistance,
            correctedValue: cappedDistance,
            reason: `${day.workoutType} run (${originalDistance.toFixed(1)}km) exceeded long run (${longRunKm.toFixed(1)}km) - capped to 70% of long run`,
          });
        }
        
        // Rule 2: Easy runs should not exceed maxEasyRunKm (50% of race distance)
        if ((day.workoutType === "easy" || day.workoutType === "recovery") && day.plannedDistanceKm > maxEasyRunKm) {
          day.plannedDistanceKm = Math.round(maxEasyRunKm * 10) / 10;
          
          validation.corrections.push({
            type: "reduce_mileage",
            weekNumber: week.weekNumber,
            originalValue: originalDistance,
            correctedValue: maxEasyRunKm,
            reason: `${day.workoutType} run (${originalDistance.toFixed(1)}km) exceeded max for ${goalType.replace("_", " ")} (${maxEasyRunKm.toFixed(1)}km / 50% of race)`,
          });
        }
        
        // Rule 2b: Easy runs should not be below minimum (5km / 3.1mi floor)
        if ((day.workoutType === "easy" || day.workoutType === "recovery") && day.plannedDistanceKm < this.config.minEasyRunKm) {
          const correctedMin = this.config.minEasyRunKm;
          validation.corrections.push({
            type: "reduce_mileage",
            weekNumber: week.weekNumber,
            originalValue: originalDistance,
            correctedValue: correctedMin,
            reason: `${day.workoutType} run (${originalDistance.toFixed(1)}km) below minimum ${correctedMin}km floor - increased`,
          });
          day.plannedDistanceKm = correctedMin;
        }
        
        // Rule 3: No single workout should exceed the peak long run target (unless it's a race)
        if (day.workoutType !== "race" && day.plannedDistanceKm > peakLongRunKm * 1.1) {
          day.plannedDistanceKm = Math.round(peakLongRunKm * 10) / 10;
          
          validation.corrections.push({
            type: "reduce_mileage",
            weekNumber: week.weekNumber,
            originalValue: originalDistance,
            correctedValue: peakLongRunKm,
            reason: `${day.workoutType} run (${originalDistance.toFixed(1)}km) exceeded peak long run target (${peakLongRunKm.toFixed(1)}km)`,
          });
        }
      }
      
      // Rule 4: If no long run exists but other workouts are very long, something is wrong
      // Flag weeks where the longest workout is not marked as long_run
      const allWorkoutsWithDistance = week.days
        .filter(d => d.plannedDistanceKm && d.workoutType !== "rest")
        .sort((a, b) => (b.plannedDistanceKm || 0) - (a.plannedDistanceKm || 0));
      
      if (allWorkoutsWithDistance.length > 0 && !longRunDay) {
        const longestWorkout = allWorkoutsWithDistance[0];
        if (longestWorkout.plannedDistanceKm && longestWorkout.plannedDistanceKm > maxEasyRunKm) {
          // The longest workout should probably be marked as long_run
          validation.warnings.push(
            `Week ${week.weekNumber}: Longest workout is ${longestWorkout.workoutType} (${longestWorkout.plannedDistanceKm?.toFixed(1)}km) but no long_run scheduled`
          );
        }
      }
      
      // After capping, recalculate weekly total
      const recalculatedTotal = week.days.reduce((sum, d) => sum + (d.plannedDistanceKm || 0), 0);
      if (recalculatedTotal !== week.plannedDistanceKm) {
        week.plannedDistanceKm = Math.round(recalculatedTotal * 10) / 10;
      }
    }
  }
  
  /**
   * Validate weekly mileage doesn't increase more than allowed
   */
  private validateMileageProgression(
    plan: GeneratedPlan,
    baselineMileage: number,
    validation: ValidationResult
  ): void {
    let previousMileage = baselineMileage;
    
    for (const week of plan.weeks) {
      // Skip recovery weeks
      if (week.weekType === "recovery" || week.weekType === "taper") {
        previousMileage = week.plannedDistanceKm;
        continue;
      }
      
      const maxAllowed = previousMileage * (1 + this.config.maxWeeklyMileageIncreasePercent / 100);
      
      if (week.plannedDistanceKm > maxAllowed) {
        const correctedMileage = Math.round(maxAllowed * 10) / 10;
        
        validation.corrections.push({
          type: "reduce_mileage",
          weekNumber: week.weekNumber,
          originalValue: week.plannedDistanceKm,
          correctedValue: correctedMileage,
          reason: `Week ${week.weekNumber} exceeded ${this.config.maxWeeklyMileageIncreasePercent}% increase limit`,
        });
        
        // Apply correction - proportionally reduce all days
        const reduction = correctedMileage / week.plannedDistanceKm;
        week.plannedDistanceKm = correctedMileage;
        
        for (const day of week.days) {
          if (day.plannedDistanceKm) {
            day.plannedDistanceKm = Math.round(day.plannedDistanceKm * reduction * 10) / 10;
          }
        }
      }
      
      previousMileage = week.plannedDistanceKm;
    }
  }
  
  /**
   * Validate long runs don't exceed percentage of weekly mileage
   * AND ensure long runs are the longest workout of the week
   */
  private validateLongRunPercentages(
    plan: GeneratedPlan,
    validation: ValidationResult
  ): void {
    for (const week of plan.weeks) {
      const longRuns = week.days.filter(d => d.workoutType === "long_run");
      const nonLongRunWorkouts = week.days.filter(d => 
        d.workoutType !== "long_run" && 
        d.workoutType !== "rest" && 
        d.plannedDistanceKm
      );
      
      for (const longRun of longRuns) {
        if (!longRun.plannedDistanceKm) continue;
        
        const maxLongRun = week.plannedDistanceKm * (this.config.maxLongRunPercentOfWeekly / 100);
        
        if (longRun.plannedDistanceKm > maxLongRun) {
          validation.corrections.push({
            type: "reduce_long_run",
            weekNumber: week.weekNumber,
            originalValue: longRun.plannedDistanceKm,
            correctedValue: Math.round(maxLongRun * 10) / 10,
            reason: `Long run exceeded ${this.config.maxLongRunPercentOfWeekly}% of weekly mileage`,
          });
          
          const difference = longRun.plannedDistanceKm - maxLongRun;
          longRun.plannedDistanceKm = Math.round(maxLongRun * 10) / 10;
          
          // Redistribute to an easy run
          const easyRun = week.days.find(d => d.workoutType === "easy");
          if (easyRun && easyRun.plannedDistanceKm) {
            easyRun.plannedDistanceKm = Math.round((easyRun.plannedDistanceKm + difference * 0.5) * 10) / 10;
          }
        }
        
        // Ensure the long run is the longest workout of the week
        for (const workout of nonLongRunWorkouts) {
          if (workout.plannedDistanceKm && workout.plannedDistanceKm >= longRun.plannedDistanceKm) {
            // An easy/tempo/etc run is longer than the long run - fix this
            const originalEasyDistance = workout.plannedDistanceKm;
            // Reduce the easy run to 80% of long run distance
            workout.plannedDistanceKm = Math.round(longRun.plannedDistanceKm * 0.8 * 10) / 10;
            
            validation.corrections.push({
              type: "reduce_mileage",
              weekNumber: week.weekNumber,
              originalValue: originalEasyDistance,
              correctedValue: workout.plannedDistanceKm,
              reason: `${workout.workoutType} run was longer than long run - reduced to maintain proper workout hierarchy`,
            });
          }
        }
      }
    }
  }
  
  /**
   * Ensure recovery weeks exist at proper intervals
   */
  private ensureRecoveryWeeks(
    plan: GeneratedPlan,
    validation: ValidationResult
  ): void {
    let weeksSinceRecovery = 0;
    
    for (let i = 0; i < plan.weeks.length; i++) {
      const week = plan.weeks[i];
      
      if (week.weekType === "recovery" || week.weekType === "taper") {
        weeksSinceRecovery = 0;
        continue;
      }
      
      weeksSinceRecovery++;
      
      if (weeksSinceRecovery >= this.config.recoveryWeekFrequency) {
        // This week should be a recovery week - convert it
        validation.warnings.push(
          `Week ${week.weekNumber} should be a recovery week (${weeksSinceRecovery} weeks since last recovery)`
        );
        
        // Convert to recovery week
        (week as any).weekType = "recovery";
        const reductionFactor = 1 - (this.config.recoveryWeekReduction / 100);
        week.plannedDistanceKm = Math.round(week.plannedDistanceKm * reductionFactor * 10) / 10;
        
        // Reduce all workouts
        for (const day of week.days) {
          if (day.plannedDistanceKm) {
            day.plannedDistanceKm = Math.round(day.plannedDistanceKm * reductionFactor * 10) / 10;
          }
          // Convert hard workouts to easy
          if (day.intensity === "high") {
            day.intensity = "moderate";
          }
        }
        
        validation.corrections.push({
          type: "add_recovery_week",
          weekNumber: week.weekNumber,
          reason: "Added recovery week to prevent overtraining",
        });
        
        weeksSinceRecovery = 0;
      }
    }
  }
  
  /**
   * Validate proper taper for race plans
   */
  private validateTaper(
    plan: GeneratedPlan,
    goalType: string,
    validation: ValidationResult
  ): void {
    const requiredTaperWeeks = 
      goalType === "marathon" ? this.config.taperWeeksMarathon :
      goalType === "half_marathon" ? this.config.taperWeeksHalf :
      this.config.taperWeeks10k;
    
    const totalWeeks = plan.weeks.length;
    const taperStartWeek = totalWeeks - requiredTaperWeeks;
    
    // Check if last weeks are properly tapered
    let peakMileage = 0;
    for (let i = 0; i < taperStartWeek; i++) {
      peakMileage = Math.max(peakMileage, plan.weeks[i].plannedDistanceKm);
    }
    
    for (let i = taperStartWeek; i < totalWeeks; i++) {
      const week = plan.weeks[i];
      const weekInTaper = i - taperStartWeek + 1;
      const expectedReduction = weekInTaper * 0.2; // 20% reduction per taper week
      const maxTaperMileage = peakMileage * (1 - expectedReduction);
      
      if (week.weekType !== "taper") {
        week.weekType = "taper";
      }
      
      if (week.plannedDistanceKm > maxTaperMileage) {
        validation.corrections.push({
          type: "reduce_mileage",
          weekNumber: week.weekNumber,
          originalValue: week.plannedDistanceKm,
          correctedValue: Math.round(maxTaperMileage * 10) / 10,
          reason: `Taper week ${weekInTaper} should be reduced`,
        });
        
        const reduction = maxTaperMileage / week.plannedDistanceKm;
        week.plannedDistanceKm = Math.round(maxTaperMileage * 10) / 10;
        
        for (const day of week.days) {
          if (day.plannedDistanceKm) {
            day.plannedDistanceKm = Math.round(day.plannedDistanceKm * reduction * 10) / 10;
          }
        }
      }
    }
  }
  
  /**
   * Validate rest days and hard workout distribution
   */
  private validateIntensityDistribution(
    plan: GeneratedPlan,
    validation: ValidationResult
  ): void {
    for (const week of plan.weeks) {
      const restDays = week.days.filter(d => d.workoutType === "rest").length;
      const hardWorkouts = week.days.filter(d => d.intensity === "high").length;
      
      if (restDays < this.config.minRestDaysPerWeek) {
        validation.warnings.push(
          `Week ${week.weekNumber} has only ${restDays} rest day(s), recommend at least ${this.config.minRestDaysPerWeek}`
        );
      }
      
      if (hardWorkouts > this.config.maxHardWorkoutsPerWeek) {
        validation.warnings.push(
          `Week ${week.weekNumber} has ${hardWorkouts} hard workouts, recommend max ${this.config.maxHardWorkoutsPerWeek}`
        );
        
        // Convert excess hard workouts to moderate
        let converted = 0;
        for (const day of week.days) {
          if (day.intensity === "high" && converted < hardWorkouts - this.config.maxHardWorkoutsPerWeek) {
            if (day.workoutType !== "intervals" && day.workoutType !== "tempo") {
              day.intensity = "moderate";
              converted++;
            }
          }
        }
      }
    }
  }
  
  /**
   * Check for unrealistic timeline (e.g., 0 to marathon in 4 weeks)
   */
  private validateTimeline(
    plan: GeneratedPlan,
    profile: AthleteProfile,
    goalType: string,
    raceDate: Date | undefined,
    validation: ValidationResult
  ): void {
    const baseMileage = profile.baselineWeeklyMileageKm || 0;
    const totalWeeks = plan.weeks.length;
    
    // Minimum recommended weeks by goal
    const minWeeks: Record<string, number> = {
      "5k": 6,
      "10k": 8,
      "half_marathon": 12,
      "marathon": 16,
      "general_fitness": 4,
    };
    
    const recommendedMinWeeks = minWeeks[goalType] || 8;
    
    if (totalWeeks < recommendedMinWeeks) {
      validation.errors.push(
        `Plan is only ${totalWeeks} weeks for ${goalType}. Minimum recommended: ${recommendedMinWeeks} weeks.`
      );
    }
    
    // Check if starting mileage is too low for goal
    if (goalType === "marathon" && baseMileage < 20) {
      validation.errors.push(
        `Current baseline (${baseMileage}km/week) is too low for marathon training. Build base to 30+ km/week first.`
      );
    }
    
    if (goalType === "half_marathon" && baseMileage < 15) {
      validation.warnings.push(
        `Current baseline (${baseMileage}km/week) is low for half marathon training. Consider building base first.`
      );
    }
  }
  
  /**
   * Validate that peak long run reaches 90% of race distance for marathon/half marathon
   */
  private validatePeakLongRun(
    plan: GeneratedPlan,
    goalType: string,
    validation: ValidationResult
  ): void {
    const raceDistanceKm = RACE_DISTANCES_KM[goalType as keyof typeof RACE_DISTANCES_KM];
    if (!raceDistanceKm) return;
    
    const requiredPeakLongRunKm = raceDistanceKm * (this.config.peakLongRunPercentOfRace / 100);
    
    // Find the current max long run across all non-taper weeks
    let maxLongRunKm = 0;
    
    for (const week of plan.weeks) {
      if (week.weekType === "taper") continue;
      
      for (const day of week.days) {
        if (day.workoutType === "long_run" && day.plannedDistanceKm) {
          maxLongRunKm = Math.max(maxLongRunKm, day.plannedDistanceKm);
        }
      }
    }
    
    console.log(`[Guardrails] Peak long run check: current max=${maxLongRunKm.toFixed(1)}km, required=${requiredPeakLongRunKm.toFixed(1)}km`);
    
    if (maxLongRunKm < requiredPeakLongRunKm) {
      const shortfall = requiredPeakLongRunKm - maxLongRunKm;
      validation.errors.push(
        `Peak long run (${maxLongRunKm.toFixed(1)}km) is below the required ${this.config.peakLongRunPercentOfRace}% of ${goalType.replace("_", " ")} distance (${requiredPeakLongRunKm.toFixed(1)}km). Shortfall: ${shortfall.toFixed(1)}km.`
      );
      
      // Find the LAST non-taper week (the actual peak week before taper begins)
      // This is where the peak long run should occur
      const nonTaperWeeks = plan.weeks.filter(w => w.weekType !== "taper");
      const lastNonTaperWeek = nonTaperWeeks[nonTaperWeeks.length - 1];
      
      // Also check for explicitly marked "peak" week
      const peakWeek = plan.weeks.find(w => w.weekType === "peak") || lastNonTaperWeek;
      
      if (peakWeek) {
        let longRunDay = peakWeek.days.find(d => d.workoutType === "long_run");
        
        // If no long run exists in peak week, find the longest workout and convert it,
        // or add a long run on Sunday
        if (!longRunDay) {
          const sundayDay = peakWeek.days.find(d => d.dayOfWeek.toLowerCase() === "sunday");
          if (sundayDay && sundayDay.workoutType !== "rest") {
            sundayDay.workoutType = "long_run";
            sundayDay.title = "Peak Long Run";
            longRunDay = sundayDay;
          }
        }
        
        if (longRunDay) {
          const originalDistance = longRunDay.plannedDistanceKm || 0;
          longRunDay.plannedDistanceKm = Math.round(requiredPeakLongRunKm * 10) / 10;
          
          // Calculate minimum weekly total to keep long run at max 32% of weekly
          const minWeeklyForLongRun = requiredPeakLongRunKm / (this.config.maxLongRunPercentOfWeekly / 100);
          const newWeeklyTotal = Math.max(peakWeek.plannedDistanceKm, minWeeklyForLongRun);
          
          // Add the extra mileage to an easy run if needed
          const addedWeeklyDistance = newWeeklyTotal - peakWeek.plannedDistanceKm;
          if (addedWeeklyDistance > 0) {
            const easyRun = peakWeek.days.find(d => d.workoutType === "easy" && d.plannedDistanceKm);
            if (easyRun && easyRun.plannedDistanceKm) {
              easyRun.plannedDistanceKm = Math.round((easyRun.plannedDistanceKm + addedWeeklyDistance) * 10) / 10;
            }
          }
          
          peakWeek.plannedDistanceKm = Math.round(newWeeklyTotal * 10) / 10;
          
          validation.corrections.push({
            type: "extend_plan",
            weekNumber: peakWeek.weekNumber,
            originalValue: originalDistance,
            correctedValue: requiredPeakLongRunKm,
            reason: `Increased peak long run to ${requiredPeakLongRunKm.toFixed(1)}km (90% of race distance), weekly total adjusted to ${newWeeklyTotal.toFixed(1)}km`,
          });
          
          console.log(`[Guardrails] Boosted peak long run in week ${peakWeek.weekNumber} from ${originalDistance.toFixed(1)}km to ${requiredPeakLongRunKm.toFixed(1)}km`);
        }
      }
    }
  }
  
  /**
   * Validate gradual long run progression (max 10-15% increase per week)
   * Only compares build weeks to previous build weeks (skips recovery/taper)
   */
  private validateLongRunProgression(
    plan: GeneratedPlan,
    validation: ValidationResult
  ): void {
    let previousBuildLongRunKm: number | null = null;
    
    for (const week of plan.weeks) {
      // Skip recovery and taper weeks - don't use them as comparison baseline
      if (week.weekType === "recovery" || week.weekType === "taper") {
        continue;
      }
      
      const longRunDay = week.days.find(d => d.workoutType === "long_run");
      if (!longRunDay?.plannedDistanceKm) continue;
      
      const currentLongRunKm = longRunDay.plannedDistanceKm;
      
      // Only compare to previous build week's long run
      if (previousBuildLongRunKm !== null && previousBuildLongRunKm > 0) {
        const increasePercent = ((currentLongRunKm - previousBuildLongRunKm) / previousBuildLongRunKm) * 100;
        
        if (increasePercent > this.config.maxLongRunIncreasePercent) {
          const maxAllowedKm: number = previousBuildLongRunKm * (1 + this.config.maxLongRunIncreasePercent / 100);
          
          validation.corrections.push({
            type: "reduce_long_run",
            weekNumber: week.weekNumber,
            originalValue: currentLongRunKm,
            correctedValue: Math.round(maxAllowedKm * 10) / 10,
            reason: `Long run increase of ${increasePercent.toFixed(0)}% exceeds max ${this.config.maxLongRunIncreasePercent}%`,
          });
          
          // Apply correction
          const reduction = maxAllowedKm - currentLongRunKm;
          longRunDay.plannedDistanceKm = Math.round(maxAllowedKm * 10) / 10;
          week.plannedDistanceKm = Math.round((week.plannedDistanceKm + reduction) * 10) / 10;
        }
      }
      
      // Only update baseline from build weeks (not recovery/taper)
      previousBuildLongRunKm = longRunDay.plannedDistanceKm;
    }
  }
  
  /**
   * Calculate the minimum safe plan duration
   */
  static getMinimumPlanWeeks(goalType: string, currentWeeklyMileage: number): number {
    const targetMileages: Record<string, number> = {
      "5k": 25,
      "10k": 35,
      "half_marathon": 50,
      "marathon": 70,
      "general_fitness": 0,
    };
    
    const target = targetMileages[goalType] || 30;
    
    if (currentWeeklyMileage >= target) {
      // Already at target, just need race-specific work
      return goalType === "marathon" ? 12 : goalType === "half_marathon" ? 10 : 6;
    }
    
    // Calculate weeks needed with 10% weekly increase + taper
    const weeklyIncrease = 1.10;
    let weeks = 0;
    let mileage = Math.max(currentWeeklyMileage, 10);
    
    while (mileage < target && weeks < 52) {
      mileage *= weeklyIncrease;
      weeks++;
      // Add recovery week every 4 weeks
      if (weeks % 4 === 0) weeks++;
    }
    
    // Add taper
    const taperWeeks = goalType === "marathon" ? 3 : goalType === "half_marathon" ? 2 : 1;
    
    return weeks + taperWeeks;
  }
}

export const trainingGuardrails = new TrainingGuardrails();

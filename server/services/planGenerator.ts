import OpenAI from "openai";
import { storage } from "../storage";
import { athleteProfileService } from "./athleteProfile";
import { trainingGuardrails, type GeneratedPlan, type PlanWeekInput, type PlanDayInput } from "./trainingGuardrails";
import { generateSkeleton, type PlanSkeleton, type SkeletonWeek, type SkeletonDay } from "./skeletonGenerator";
import type { AthleteProfile, TrainingPlan, InsertTrainingPlan, InsertPlanWeek, InsertPlanDay } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PlanGenerationRequest {
  userId: number;
  goalType: "5k" | "10k" | "half_marathon" | "marathon" | "general_fitness";
  goalTimeTarget?: string; // e.g., "sub-4:00" for marathon
  raceDate?: string; // ISO date string
  raceName?: string;
  preferredRunDays?: string[]; // ["monday", "wednesday", "friday", "saturday", "sunday"]
  maxWeeklyHours?: number;
  constraints?: string; // User's free-form constraints/notes
  includeSpeedwork?: boolean;
  includeLongRuns?: boolean;
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  unitPreference?: "km" | "miles"; // User's preferred display unit
}

export interface PlanGenerationResult {
  success: boolean;
  plan?: TrainingPlan;
  validation?: {
    warnings: string[];
    corrections: string[];
  };
  error?: string;
}

export class PlanGeneratorService {
  /**
   * Generate a complete training plan for a user
   */
  async generatePlan(request: PlanGenerationRequest): Promise<PlanGenerationResult> {
    console.log(`[PlanGenerator] Generating ${request.goalType} plan for user ${request.userId}`);
    
    try {
      // 1. Get or compute athlete profile
      const profile = await athleteProfileService.getOrComputeProfile(request.userId);
      
      // 2. Calculate plan duration
      const raceDate = request.raceDate ? new Date(request.raceDate) : undefined;
      const planWeeks = this.calculatePlanWeeks(request, profile, raceDate);
      
      if (planWeeks < 4) {
        return {
          success: false,
          error: "Not enough time before race date. Please select a date at least 4 weeks away.",
        };
      }
      
      // Determine unit preference
      const useMiles = request.unitPreference === "miles";
      
      // 3. Generate skeleton with fixed structure (dates, distances, workout types)
      console.log(`[PlanGenerator] Generating skeleton for ${planWeeks} weeks`);
      const skeleton = generateSkeleton(request, profile, planWeeks);
      console.log(`[PlanGenerator] Skeleton generated with ${skeleton.weeks.length} weeks`);
      
      // Log skeleton distances for debugging
      for (const week of skeleton.weeks) {
        const longRun = week.days.find(d => d.workoutType === "long_run");
        console.log(`[PlanGenerator] Week ${week.weekNumber} (${week.weekType}): ${week.plannedDistanceKm}km total, long run: ${longRun?.plannedDistanceKm || 0}km`);
      }
      
      // 4. Call LLM to fill coaching content (titles, descriptions, paces, etc.)
      const filledPlan = await this.fillSkeletonWithLLM(skeleton, profile, request, useMiles);
      
      if (!filledPlan) {
        // Fallback: use skeleton with default coaching content
        console.log(`[PlanGenerator] LLM fill failed, using skeleton with defaults`);
        const fallbackPlan = this.skeletonToGeneratedPlan(skeleton);
        const savedPlan = await this.savePlanFromSkeleton(request, skeleton, fallbackPlan, profile);
        return {
          success: true,
          plan: savedPlan,
          validation: {
            warnings: ["Coaching content was auto-generated due to AI service issues."],
            corrections: [],
          },
        };
      }
      
      // 5. Save to database (use skeleton dates, but LLM-filled content)
      const savedPlan = await this.savePlanFromSkeleton(request, skeleton, filledPlan, profile);
      
      return {
        success: true,
        plan: savedPlan,
        validation: {
          warnings: [],
          corrections: [],
        },
      };
    } catch (error) {
      console.error(`[PlanGenerator] Error generating plan:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
  
  /**
   * Calculate number of weeks for the plan
   */
  private calculatePlanWeeks(
    request: PlanGenerationRequest,
    profile: AthleteProfile,
    raceDate?: Date
  ): number {
    if (raceDate) {
      const now = new Date();
      const weeksUntilRace = Math.floor((raceDate.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return Math.max(4, Math.min(24, weeksUntilRace));
    }
    
    // Default durations if no race date
    const defaultWeeks: Record<string, number> = {
      "5k": 8,
      "10k": 10,
      "half_marathon": 12,
      "marathon": 16,
      "general_fitness": 8,
    };
    
    return defaultWeeks[request.goalType] || 8;
  }
  
  /**
   * Get minimum acceptable weeks for a goal type
   */
  private getMinimumWeeks(goalType: string): number {
    const minimums: Record<string, number> = {
      "5k": 6,
      "10k": 8,
      "half_marathon": 10,
      "marathon": 12,
      "general_fitness": 4,
    };
    return minimums[goalType] || 4;
  }
  
  /**
   * Call LLM to generate the training plan structure
   */
  private async callLLMForPlan(
    request: PlanGenerationRequest,
    profile: AthleteProfile,
    totalWeeks: number,
    strictWeeks: boolean = false,
    useMiles: boolean = false
  ): Promise<GeneratedPlan | null> {
    const weekRequirement = strictWeeks 
      ? `CRITICAL: You MUST generate EXACTLY ${totalWeeks} weeks. Do not generate fewer weeks.`
      : '';
    
    // Unit conversion helpers
    const KM_TO_MILES = 0.621371;
    const distUnit = useMiles ? "miles" : "km";
    const paceUnit = useMiles ? "min/mile" : "min/km";
    
    // Convert profile values to display units for the prompt
    const weeklyMileage = useMiles 
      ? ((profile.baselineWeeklyMileageKm || 0) * KM_TO_MILES).toFixed(1)
      : (profile.baselineWeeklyMileageKm?.toFixed(1) || "0");
    const longestRun = useMiles
      ? ((profile.longestRecentRunKm || 0) * KM_TO_MILES).toFixed(1)
      : (profile.longestRecentRunKm?.toFixed(1) || "0");
    
    // Convert pace (min/km to min/mile if needed)
    let easyPaceStr = "not available";
    if (profile.typicalEasyPaceMin && profile.typicalEasyPaceMax) {
      if (useMiles) {
        const minPaceMile = profile.typicalEasyPaceMin / KM_TO_MILES;
        const maxPaceMile = profile.typicalEasyPaceMax / KM_TO_MILES;
        easyPaceStr = `${minPaceMile.toFixed(1)}-${maxPaceMile.toFixed(1)} ${paceUnit}`;
      } else {
        easyPaceStr = `${profile.typicalEasyPaceMin.toFixed(1)}-${profile.typicalEasyPaceMax.toFixed(1)} ${paceUnit}`;
      }
    }
    
    const systemPrompt = `You are an expert running coach creating personalized training plans. 
You follow evidence-based training principles:
- Progressive overload with 10-15% weekly mileage increases max
- Long runs should be 25-30% of weekly volume
- Include recovery weeks every 3-4 weeks (reduce volume by 20-25%)
- Proper taper before races (2-3 weeks for marathon, 1-2 for half)
- Easy runs at conversational pace (80% of training volume)
- Quality workouts (tempo, intervals) 2-3x per week max
- Rest days are essential for adaptation
${weekRequirement}

IMPORTANT: All distances in the JSON output MUST be in KILOMETERS (plannedDistanceKm field).
However, all TEXT descriptions, titles, and targetPace values MUST use ${distUnit} and ${paceUnit}.
This means: numeric distance fields are always in km, but human-readable text uses ${distUnit}.

Output a complete training plan in JSON format.`;

    const userPrompt = `Create EXACTLY ${totalWeeks} weeks of training (weekNumber 1 through ${totalWeeks}) for a runner with:

ATHLETE PROFILE:
- Current weekly mileage: ${weeklyMileage} ${distUnit}
- Average runs per week: ${profile.avgRunsPerWeek?.toFixed(1) || 0}
- Longest recent run: ${longestRun} ${distUnit}
- Easy pace: ${easyPaceStr}
- Estimated VDOT: ${profile.estimatedVdot || "not available"}
- Experience level: ${request.experienceLevel || "intermediate"}

GOAL:
- Target: ${request.goalType.replace("_", " ")}
${request.goalTimeTarget ? `- Goal time: ${request.goalTimeTarget}` : ""}
${request.raceName ? `- Race: ${request.raceName}` : ""}
${request.raceDate ? `- Race date: ${request.raceDate}` : ""}

PREFERENCES:
${request.preferredRunDays ? `- Preferred run days: ${request.preferredRunDays.join(", ")}` : "- Run days: flexible"}
${request.maxWeeklyHours ? `- Max weekly hours: ${request.maxWeeklyHours}` : ""}
${request.constraints ? `- Notes: ${request.constraints}` : ""}
- Include speedwork: ${request.includeSpeedwork !== false ? "yes" : "no"}
- Include long runs: ${request.includeLongRuns !== false ? "yes" : "no"}

CRITICAL UNIT INSTRUCTIONS:
- All "plannedDistanceKm" fields MUST be in KILOMETERS (the database field name)
- All "targetPace" values MUST use "${paceUnit}" format (e.g., "8:30-9:00 ${paceUnit}")
- All text descriptions mentioning distances should use "${distUnit}"

Output JSON with this exact structure:
{
  "weeks": [
    {
      "weekNumber": 1,
      "weekType": "base|build|peak|recovery|taper",
      "plannedDistanceKm": 25.0,
      "days": [
        {
          "dayOfWeek": "monday",
          "workoutType": "easy|tempo|intervals|long_run|recovery|rest|cross_training|fartlek|hills|progression",
          "title": "Easy Run",
          "description": "30 min easy pace",
          "plannedDistanceKm": 5.0,
          "plannedDurationMins": 30,
          "targetPace": "8:30-9:00 ${paceUnit}",
          "intensity": "low|moderate|high"
        }
      ]
    }
  ],
  "coachNotes": "Summary of the plan approach (use ${distUnit} for any distances mentioned)"
}

Days of week: monday, tuesday, wednesday, thursday, friday, saturday, sunday.
Ensure each week has 7 days. Use "rest" type for rest days.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 16000,
        response_format: { type: "json_object" },
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error("[PlanGenerator] No content in LLM response");
        return null;
      }
      
      // Check if response was truncated (finish_reason !== 'stop')
      const finishReason = response.choices[0]?.finish_reason;
      if (finishReason === 'length') {
        console.error("[PlanGenerator] Response was truncated due to token limit");
        return null;
      }
      
      let parsed: GeneratedPlan;
      try {
        parsed = JSON.parse(content) as GeneratedPlan;
      } catch (parseError) {
        console.error("[PlanGenerator] JSON parse failed, attempting repair...");
        // Attempt to repair common JSON issues
        const repaired = this.repairJSON(content);
        if (repaired) {
          parsed = repaired;
          console.log("[PlanGenerator] JSON repair successful");
        } else {
          console.error("[PlanGenerator] JSON repair failed");
          return null;
        }
      }
      
      // Validate structure
      if (!parsed.weeks || !Array.isArray(parsed.weeks)) {
        console.error("[PlanGenerator] Invalid plan structure - no weeks array");
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error("[PlanGenerator] LLM call failed:", error);
      return null;
    }
  }
  
  /**
   * Attempt to repair malformed JSON from LLM
   */
  private repairJSON(content: string): GeneratedPlan | null {
    try {
      let repaired = content;
      
      // Remove any markdown code blocks
      repaired = repaired.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Remove trailing commas before } or ]
      repaired = repaired.replace(/,\s*([}\]])/g, '$1');
      
      // Remove JavaScript-style comments
      repaired = repaired.replace(/\/\/[^\n]*/g, '');
      repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Try to fix truncated JSON by closing open brackets
      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/]/g) || []).length;
      
      // Add missing closing brackets/braces
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        repaired += ']';
      }
      for (let i = 0; i < openBraces - closeBraces; i++) {
        repaired += '}';
      }
      
      return JSON.parse(repaired) as GeneratedPlan;
    } catch (error) {
      console.error("[PlanGenerator] JSON repair attempt failed:", error);
      return null;
    }
  }
  
  /**
   * Quality workout types that need AI-generated content
   */
  private readonly qualityWorkoutTypes = new Set([
    "tempo", "intervals", "hills", "fartlek", "progression"
  ]);

  /**
   * Non-quality workout types that use deterministic templates
   */
  private readonly templateWorkoutTypes = new Set([
    "rest", "easy", "recovery", "long_run", "cross_training"
  ]);

  /**
   * Format pace from min/km to display string
   */
  private formatPace(paceMinPerKm: number, useMiles: boolean): string {
    const KM_TO_MILES = 0.621371;
    const pace = useMiles ? paceMinPerKm / KM_TO_MILES : paceMinPerKm;
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format distance for display
   */
  private formatDistance(km: number, useMiles: boolean): string {
    const KM_TO_MILES = 0.621371;
    const dist = useMiles ? km * KM_TO_MILES : km;
    return dist.toFixed(1);
  }

  /**
   * Fill non-quality days with deterministic templates
   * This is much faster than LLM and provides consistent content for simple workouts
   */
  private fillNonQualityDaysWithTemplates(
    skeleton: PlanSkeleton,
    profile: AthleteProfile,
    useMiles: boolean
  ): PlanSkeleton {
    const distUnit = useMiles ? "miles" : "km";
    const paceUnit = useMiles ? "min/mile" : "min/km";
    
    // Calculate pace ranges from profile
    const easyPaceMin = profile.typicalEasyPaceMin || 6.0;
    const easyPaceMax = profile.typicalEasyPaceMax || 7.0;
    const recoveryPace = easyPaceMax + 0.5; // Slower than easy
    const longRunPace = (easyPaceMin + easyPaceMax) / 2 + 0.3; // Mid-easy, slightly slower
    
    const easyPaceRange = `${this.formatPace(easyPaceMin, useMiles)}-${this.formatPace(easyPaceMax, useMiles)} ${paceUnit}`;
    const recoveryPaceStr = `${this.formatPace(recoveryPace, useMiles)}+ ${paceUnit}`;
    const longRunPaceStr = `${this.formatPace(longRunPace - 0.2, useMiles)}-${this.formatPace(longRunPace + 0.2, useMiles)} ${paceUnit}`;

    // Clone skeleton to avoid mutation
    const filledSkeleton: PlanSkeleton = JSON.parse(JSON.stringify(skeleton));

    for (const week of filledSkeleton.weeks) {
      for (const day of week.days) {
        // Skip quality workouts - they need LLM
        if (this.qualityWorkoutTypes.has(day.workoutType)) {
          continue;
        }

        const distStr = this.formatDistance(day.plannedDistanceKm || 0, useMiles);

        switch (day.workoutType) {
          case "rest":
            day.title = "Rest Day";
            day.description = "Complete rest or light stretching. Focus on recovery, hydration, and sleep.";
            day.intensity = "low";
            day.targetPace = null;
            day.targetHrZone = "Zone 1";
            break;

          case "easy":
            day.title = "Easy Run";
            day.description = `${distStr} ${distUnit} at a comfortable, conversational pace. Should feel relaxed - you can hold a conversation easily. Focus on good form and consistent rhythm.`;
            day.intensity = "low";
            day.targetPace = easyPaceRange;
            day.targetHrZone = "Zone 2";
            break;

          case "recovery":
            day.title = "Recovery Run";
            day.description = `${distStr} ${distUnit} at a very easy pace. This run should feel almost too slow. The purpose is active recovery to flush metabolic waste from previous hard efforts.`;
            day.intensity = "low";
            day.targetPace = recoveryPaceStr;
            day.targetHrZone = "Zone 1-2";
            break;

          case "long_run":
            day.title = "Long Run";
            day.description = `${distStr} ${distUnit} at an easy, sustainable pace. Start conservatively and maintain even effort throughout. Stay hydrated and fuel appropriately for runs over 90 minutes.`;
            day.intensity = "moderate";
            day.targetPace = longRunPaceStr;
            day.targetHrZone = "Zone 2";
            break;

          case "cross_training":
            day.title = "Cross Training";
            day.description = "30-45 minutes of low-impact activity such as cycling, swimming, or elliptical. Keep the intensity easy to moderate. Great for active recovery while giving running muscles a break.";
            day.intensity = "low";
            day.targetPace = null;
            day.targetHrZone = "Zone 1-2";
            break;
        }
      }
    }

    return filledSkeleton;
  }

  /**
   * Extract only quality workouts from skeleton for LLM processing
   * Returns a minimal structure that the LLM needs to fill
   */
  private extractQualityWorkoutsForLLM(skeleton: PlanSkeleton): { 
    qualityDays: Array<{ weekNumber: number; dayOfWeek: string; workoutType: string; plannedDistanceKm: number; qualityLevel: number }>;
    weekCoachNotes: Array<{ weekNumber: number; weekType: string; qualityLevel: number }>;
  } {
    const qualityDays: Array<{ weekNumber: number; dayOfWeek: string; workoutType: string; plannedDistanceKm: number; qualityLevel: number }> = [];
    const weekCoachNotes: Array<{ weekNumber: number; weekType: string; qualityLevel: number }> = [];

    for (const week of skeleton.weeks) {
      weekCoachNotes.push({
        weekNumber: week.weekNumber,
        weekType: week.weekType,
        qualityLevel: week.qualityLevel || 3,
      });

      for (const day of week.days) {
        if (this.qualityWorkoutTypes.has(day.workoutType)) {
          qualityDays.push({
            weekNumber: week.weekNumber,
            dayOfWeek: day.dayOfWeek,
            workoutType: day.workoutType,
            plannedDistanceKm: day.plannedDistanceKm || 0,
            qualityLevel: week.qualityLevel || 3,
          });
        }
      }
    }

    return { qualityDays, weekCoachNotes };
  }

  /**
   * Fill a skeleton with coaching content using LLM
   * OPTIMIZED: Only sends quality workouts to LLM, templates fill non-quality days
   * All other fields (dates, distances, workout types) remain unchanged from skeleton
   */
  private async fillSkeletonWithLLM(
    skeleton: PlanSkeleton,
    profile: AthleteProfile,
    request: PlanGenerationRequest,
    useMiles: boolean
  ): Promise<GeneratedPlan | null> {
    const KM_TO_MILES = 0.621371;
    const distUnit = useMiles ? "miles" : "km";
    const paceUnit = useMiles ? "min/mile" : "min/km";

    // Step 1: Pre-fill non-quality days with templates (instant, no LLM needed)
    console.log("[PlanGenerator] Filling non-quality days with templates...");
    const templateFilledSkeleton = this.fillNonQualityDaysWithTemplates(skeleton, profile, useMiles);

    // Step 2: Extract only quality workouts for LLM
    const { qualityDays, weekCoachNotes } = this.extractQualityWorkoutsForLLM(skeleton);
    console.log(`[PlanGenerator] Quality workouts to fill: ${qualityDays.length} (reduced from ${skeleton.weeks.reduce((sum, w) => sum + w.days.length, 0)} total days)`);

    // If no quality workouts, skip LLM entirely
    if (qualityDays.length === 0) {
      console.log("[PlanGenerator] No quality workouts - skipping LLM call");
      return this.skeletonToGeneratedPlan(templateFilledSkeleton);
    }
    
    // Convert profile values to display units
    const weeklyMileage = useMiles 
      ? ((profile.baselineWeeklyMileageKm || 0) * KM_TO_MILES).toFixed(1)
      : (profile.baselineWeeklyMileageKm?.toFixed(1) || "0");
    const longestRun = useMiles
      ? ((profile.longestRecentRunKm || 0) * KM_TO_MILES).toFixed(1)
      : (profile.longestRecentRunKm?.toFixed(1) || "0");
    
    let easyPaceStr = "not available";
    if (profile.typicalEasyPaceMin && profile.typicalEasyPaceMax) {
      if (useMiles) {
        const minPaceMile = profile.typicalEasyPaceMin / KM_TO_MILES;
        const maxPaceMile = profile.typicalEasyPaceMax / KM_TO_MILES;
        easyPaceStr = `${minPaceMile.toFixed(1)}-${maxPaceMile.toFixed(1)} ${paceUnit}`;
      } else {
        easyPaceStr = `${profile.typicalEasyPaceMin.toFixed(1)}-${profile.typicalEasyPaceMax.toFixed(1)} ${paceUnit}`;
      }
    }

    // Step 3: Build optimized prompt with only quality workouts (much smaller payload)
    const systemPrompt = `You are an expert running coach. Generate coaching content for QUALITY WORKOUTS ONLY.

You will receive a list of quality workouts (tempo, intervals, hills, fartlek, progression) that need detailed coaching.
Easy runs, recovery runs, long runs, rest days, and cross-training are already handled with templates.

For each quality workout, provide:
- title: Short descriptive title (e.g., "Threshold Tempo", "800m Repeats")
- description: Detailed workout instructions with warmup, main set, cooldown
- targetPace: Pace in ${paceUnit} format
- targetHrZone: Heart rate zone (e.g., "Zone 3-4")
- intensity: "moderate" or "high"
- workoutStructure: Structured breakdown (warmup/main/cooldown)

Also provide:
- coachNotes: Overall plan philosophy (1-2 sentences)
- weekNotes: Brief note for each week based on weekType and qualityLevel

Scale intensity based on qualityLevel (1-5):
- Level 1-2: Introductory quality work, shorter intervals, tempo blocks
- Level 3-4: Building intensity, longer efforts, more reps
- Level 5: Peak race-specific sessions

Output JSON only.`;

    const qualityWorkoutsInput = {
      qualityDays: qualityDays.map(d => ({
        ...d,
        plannedDistance: this.formatDistance(d.plannedDistanceKm, useMiles) + " " + distUnit,
      })),
      weekCoachNotes,
    };

    const userPrompt = `ATHLETE PROFILE:
- Weekly mileage: ${weeklyMileage} ${distUnit}
- Easy pace: ${easyPaceStr}
- VDOT: ${profile.estimatedVdot || "unknown"}
- Level: ${request.experienceLevel || "intermediate"}

GOAL: ${request.goalType.replace("_", " ")}${request.goalTimeTarget ? ` (${request.goalTimeTarget})` : ""}

QUALITY WORKOUTS TO FILL (${qualityDays.length} workouts):
${JSON.stringify(qualityWorkoutsInput, null, 2)}

Return JSON with this structure:
{
  "coachNotes": "Overall plan summary",
  "weekNotes": { "1": "Week 1 focus", "2": "Week 2 focus", ... },
  "workouts": [
    {
      "weekNumber": 1,
      "dayOfWeek": "tuesday",
      "title": "Tempo Run",
      "description": "Warmup: 10 min easy...",
      "targetPace": "7:30-8:00 ${paceUnit}",
      "targetHrZone": "Zone 3-4",
      "intensity": "moderate",
      "workoutStructure": { "warmup": "10 min easy", "main": "20 min tempo", "cooldown": "10 min easy" }
    }
  ]
}`;

    try {
      console.log(`[PlanGenerator] Calling LLM for ${qualityDays.length} quality workouts...`);
      const startTime = Date.now();
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use faster, cheaper model for quality workouts
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000, // Much smaller since we only need quality workouts
        response_format: { type: "json_object" },
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`[PlanGenerator] LLM call completed in ${elapsed}ms`);
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error("[PlanGenerator] No content in LLM fill response");
        return this.skeletonToGeneratedPlan(templateFilledSkeleton);
      }
      
      const finishReason = response.choices[0]?.finish_reason;
      if (finishReason === 'length') {
        console.warn("[PlanGenerator] Fill response was truncated, using templates only");
        return this.skeletonToGeneratedPlan(templateFilledSkeleton);
      }
      
      // Parse LLM response
      interface QualityWorkoutFill {
        weekNumber: number;
        dayOfWeek: string;
        title: string;
        description: string;
        targetPace: string | null;
        targetHrZone: string | null;
        intensity: "moderate" | "high";
        workoutStructure?: { warmup?: string; main?: string; cooldown?: string };
      }
      interface LLMQualityResponse {
        coachNotes?: string;
        weekNotes?: Record<string, string>;
        workouts: QualityWorkoutFill[];
      }
      
      let parsed: LLMQualityResponse;
      try {
        parsed = JSON.parse(content) as LLMQualityResponse;
      } catch (parseError) {
        console.error("[PlanGenerator] Fill JSON parse failed, using templates");
        return this.skeletonToGeneratedPlan(templateFilledSkeleton);
      }
      
      // Step 4: Merge LLM quality workout fills into template-filled skeleton
      const mergedSkeleton = this.mergeQualityWorkoutsIntoSkeleton(
        templateFilledSkeleton,
        parsed.workouts || [],
        parsed.coachNotes,
        parsed.weekNotes
      );
      
      return this.skeletonToGeneratedPlan(mergedSkeleton);
    } catch (error) {
      console.error("[PlanGenerator] LLM fill call failed:", error);
      // Fallback to template-only plan
      return this.skeletonToGeneratedPlan(templateFilledSkeleton);
    }
  }

  /**
   * Merge LLM-generated quality workout content into a template-filled skeleton
   */
  private mergeQualityWorkoutsIntoSkeleton(
    skeleton: PlanSkeleton,
    workouts: Array<{
      weekNumber: number;
      dayOfWeek: string;
      title: string;
      description: string;
      targetPace: string | null;
      targetHrZone: string | null;
      intensity: "moderate" | "high";
      workoutStructure?: { warmup?: string; main?: string; cooldown?: string };
    }>,
    coachNotes?: string,
    weekNotes?: Record<string, string>
  ): PlanSkeleton {
    // Clone to avoid mutation
    const merged: PlanSkeleton = JSON.parse(JSON.stringify(skeleton));
    
    // Set overall coach notes
    if (coachNotes) {
      merged.trainingPlan.coachNotes = coachNotes;
    }
    
    // Create lookup map for quick access
    const workoutMap = new Map<string, typeof workouts[0]>();
    for (const w of workouts) {
      const key = `${w.weekNumber}-${w.dayOfWeek}`;
      workoutMap.set(key, w);
    }
    
    // Merge into skeleton
    for (const week of merged.weeks) {
      // Set week notes if provided
      if (weekNotes && weekNotes[String(week.weekNumber)]) {
        week.coachNotes = weekNotes[String(week.weekNumber)];
      }
      
      for (const day of week.days) {
        const key = `${week.weekNumber}-${day.dayOfWeek}`;
        const fill = workoutMap.get(key);
        
        if (fill) {
          day.title = fill.title;
          day.description = fill.description;
          day.targetPace = fill.targetPace;
          day.targetHrZone = fill.targetHrZone;
          day.intensity = fill.intensity;
          if (fill.workoutStructure) {
            // Ensure required fields have values (or empty string)
            day.workoutStructure = {
              warmup: fill.workoutStructure.warmup || "",
              main: fill.workoutStructure.main || "",
              cooldown: fill.workoutStructure.cooldown || "",
            };
          }
        }
      }
    }
    
    return merged;
  }
  
  /**
   * Convert a skeleton (filled or not) to the GeneratedPlan format
   */
  private skeletonToGeneratedPlan(skeleton: PlanSkeleton): GeneratedPlan {
    return {
      weeks: skeleton.weeks.map(week => ({
        weekNumber: week.weekNumber,
        weekType: week.weekType,
        plannedDistanceKm: week.plannedDistanceKm,
        days: week.days.map(day => ({
          dayOfWeek: day.dayOfWeek,
          workoutType: day.workoutType as any,
          title: day.title || this.getDefaultTitle(day.workoutType),
          description: day.description || undefined,
          plannedDistanceKm: day.plannedDistanceKm || undefined,
          plannedDurationMins: day.plannedDurationMins || undefined,
          targetPace: day.targetPace || undefined,
          targetHrZone: day.targetHrZone || undefined,
          intensity: (day.intensity || this.getDefaultIntensity(day.workoutType)) as "low" | "moderate" | "high",
          workoutStructure: day.workoutStructure || undefined,
        })),
      })),
      coachNotes: skeleton.trainingPlan.coachNotes || undefined,
    };
  }
  
  /**
   * Get default title based on workout type
   */
  private getDefaultTitle(workoutType: string): string {
    const titles: Record<string, string> = {
      easy: "Easy Run",
      tempo: "Tempo Run",
      intervals: "Interval Training",
      long_run: "Long Run",
      recovery: "Recovery Run",
      rest: "Rest Day",
      cross_training: "Cross Training",
      fartlek: "Fartlek Run",
      hills: "Hill Repeats",
      progression: "Progression Run",
    };
    return titles[workoutType] || "Workout";
  }
  
  /**
   * Get default intensity based on workout type
   */
  private getDefaultIntensity(workoutType: string): "low" | "moderate" | "high" {
    const intensities: Record<string, "low" | "moderate" | "high"> = {
      easy: "low",
      tempo: "moderate",
      intervals: "high",
      long_run: "moderate",
      recovery: "low",
      rest: "low",
      cross_training: "low",
      fartlek: "moderate",
      hills: "high",
      progression: "moderate",
    };
    return intensities[workoutType] || "low";
  }
  
  /**
   * Save plan using skeleton dates (more accurate) and LLM-filled content
   */
  private async savePlanFromSkeleton(
    request: PlanGenerationRequest,
    skeleton: PlanSkeleton,
    plan: GeneratedPlan,
    profile: AthleteProfile
  ): Promise<TrainingPlan> {
    const raceDate = request.raceDate ? new Date(request.raceDate) : null;
    
    // Create the main plan record
    const planData: InsertTrainingPlan = {
      userId: request.userId,
      goalType: request.goalType,
      raceDate: raceDate || undefined,
      targetTime: request.goalTimeTarget || undefined,
      daysPerWeek: skeleton.trainingPlan.daysPerWeek,
      preferredLongRunDay: skeleton.trainingPlan.preferredLongRunDay,
      preferredDays: skeleton.trainingPlan.preferredDays,
      allowCrossTraining: skeleton.trainingPlan.allowCrossTraining,
      paceBasedWorkouts: skeleton.trainingPlan.paceBasedWorkouts,
      status: "active",
      totalWeeks: skeleton.weeks.length,
      currentWeek: 1,
      coachNotes: plan.coachNotes || undefined,
      generationPrompt: request.constraints || undefined,
    };
    
    const savedPlan = await storage.createTrainingPlanV2(planData);
    
    // Save weeks and days using skeleton dates
    for (let i = 0; i < skeleton.weeks.length; i++) {
      const skeletonWeek = skeleton.weeks[i];
      const planWeek = plan.weeks[i];
      
      const weekData: InsertPlanWeek = {
        planId: savedPlan.id,
        weekNumber: skeletonWeek.weekNumber,
        weekType: skeletonWeek.weekType,
        weekStartDate: new Date(skeletonWeek.weekStartDate),
        weekEndDate: new Date(skeletonWeek.weekEndDate),
        plannedDistanceKm: skeletonWeek.plannedDistanceKm,
        plannedDurationMins: skeletonWeek.plannedDurationMins || undefined,
        coachNotes: undefined,
      };
      
      const savedWeek = await storage.createPlanWeek(weekData);
      
      // Save days using skeleton dates but LLM content
      for (let j = 0; j < skeletonWeek.days.length; j++) {
        const skeletonDay = skeletonWeek.days[j];
        const planDay = planWeek?.days[j];
        
        const dayData: InsertPlanDay = {
          weekId: savedWeek.id,
          planId: savedPlan.id,
          date: new Date(skeletonDay.date),
          dayOfWeek: skeletonDay.dayOfWeek,
          workoutType: skeletonDay.workoutType,
          title: planDay?.title || this.getDefaultTitle(skeletonDay.workoutType),
          description: planDay?.description || undefined,
          plannedDistanceKm: skeletonDay.plannedDistanceKm || undefined,
          plannedDurationMins: skeletonDay.plannedDurationMins || undefined,
          targetPace: planDay?.targetPace || undefined,
          targetHrZone: planDay?.targetHrZone || undefined,
          intensity: planDay?.intensity || this.getDefaultIntensity(skeletonDay.workoutType),
          workoutStructure: planDay?.workoutStructure || undefined,
          userNotes: undefined,
          perceivedEffort: undefined,
        };
        
        await storage.createPlanDay(dayData);
      }
    }
    
    console.log(`[PlanGenerator] Plan saved from skeleton with ID ${savedPlan.id}, ${skeleton.weeks.length} weeks`);
    
    return savedPlan;
  }
  
  /**
   * Save the generated plan to the database
   */
  private async savePlan(
    request: PlanGenerationRequest,
    plan: GeneratedPlan,
    profile: AthleteProfile
  ): Promise<TrainingPlan> {
    const raceDate = request.raceDate ? new Date(request.raceDate) : null;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    
    // Create the main plan record
    const planData: InsertTrainingPlan = {
      userId: request.userId,
      goalType: request.goalType,
      raceDate: raceDate || undefined,
      targetTime: request.goalTimeTarget || undefined,
      daysPerWeek: request.preferredRunDays?.length || 4,
      preferredLongRunDay: "sunday",
      preferredDays: request.preferredRunDays || undefined,
      allowCrossTraining: true,
      paceBasedWorkouts: true,
      status: "active",
      totalWeeks: plan.weeks.length,
      currentWeek: 1,
      coachNotes: plan.coachNotes || undefined,
      generationPrompt: request.constraints || undefined,
    };
    
    const savedPlan = await storage.createTrainingPlanV2(planData);
    
    // Save weeks and days
    for (const week of plan.weeks) {
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(weekStartDate.getDate() + (week.weekNumber - 1) * 7);
      
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      
      const weekData: InsertPlanWeek = {
        planId: savedPlan.id,
        weekNumber: week.weekNumber,
        weekType: week.weekType,
        weekStartDate: weekStartDate,
        weekEndDate: weekEndDate,
        plannedDistanceKm: week.plannedDistanceKm,
        plannedDurationMins: undefined,
        coachNotes: undefined,
      };
      
      const savedWeek = await storage.createPlanWeek(weekData);
      
      // Save days
      const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      
      for (const day of week.days) {
        const dayIndex = dayOrder.indexOf(day.dayOfWeek.toLowerCase());
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(dayDate.getDate() + dayIndex);
        
        const dayData: InsertPlanDay = {
          weekId: savedWeek.id,
          planId: savedPlan.id,
          date: dayDate,
          dayOfWeek: day.dayOfWeek.toLowerCase(),
          workoutType: day.workoutType,
          title: day.title,
          description: day.description || undefined,
          plannedDistanceKm: day.plannedDistanceKm || undefined,
          plannedDurationMins: day.plannedDurationMins || undefined,
          targetPace: day.targetPace || undefined,
          targetHrZone: day.targetHrZone || undefined,
          intensity: day.intensity,
          workoutStructure: day.workoutStructure || undefined,
          userNotes: undefined,
          perceivedEffort: undefined,
        };
        
        await storage.createPlanDay(dayData);
      }
    }
    
    console.log(`[PlanGenerator] Plan saved with ID ${savedPlan.id}, ${plan.weeks.length} weeks`);
    
    return savedPlan;
  }
  
  /**
   * Generate a title for the plan
   */
  private generatePlanTitle(request: PlanGenerationRequest): string {
    const goalNames: Record<string, string> = {
      "5k": "5K",
      "10k": "10K",
      "half_marathon": "Half Marathon",
      "marathon": "Marathon",
      "general_fitness": "General Fitness",
    };
    
    const goal = goalNames[request.goalType] || request.goalType;
    
    if (request.raceName) {
      return `${request.raceName} Training Plan`;
    }
    
    if (request.goalTimeTarget) {
      return `${goal} - ${request.goalTimeTarget} Training Plan`;
    }
    
    return `${goal} Training Plan`;
  }
  
  /**
   * Get a preview of what the plan will look like (without saving)
   */
  async previewPlan(request: PlanGenerationRequest): Promise<{
    preview: GeneratedPlan | null;
    validation: { warnings: string[]; errors: string[] };
    suggestedWeeks: number;
  }> {
    const profile = await athleteProfileService.getOrComputeProfile(request.userId);
    const raceDate = request.raceDate ? new Date(request.raceDate) : undefined;
    const planWeeks = this.calculatePlanWeeks(request, profile, raceDate);
    
    const minWeeks = trainingGuardrails.constructor.prototype.constructor.getMinimumPlanWeeks 
      ? (trainingGuardrails.constructor as any).getMinimumPlanWeeks(request.goalType, profile.baselineWeeklyMileageKm || 0)
      : planWeeks;
    
    const validation = {
      warnings: [] as string[],
      errors: [] as string[],
    };
    
    if (planWeeks < minWeeks) {
      validation.warnings.push(
        `Recommended minimum ${minWeeks} weeks for ${request.goalType}. You have ${planWeeks} weeks.`
      );
    }
    
    if (request.goalType === "marathon" && (profile.baselineWeeklyMileageKm || 0) < 20) {
      validation.warnings.push(
        `Your current mileage (${profile.baselineWeeklyMileageKm?.toFixed(1) || 0}km/week) is below recommended base for marathon training.`
      );
    }
    
    return {
      preview: null, // Full preview would require LLM call - skip for now
      validation,
      suggestedWeeks: Math.max(planWeeks, minWeeks),
    };
  }
  
  /**
   * Adapt the plan based on actual training adherence and performance
   * This regenerates future weeks while keeping completed weeks intact
   */
  async adaptPlan(planId: number, reason?: string): Promise<{
    success: boolean;
    adaptedWeeks?: number;
    changes?: string[];
    error?: string;
  }> {
    console.log(`[PlanGenerator] Adapting plan ${planId}${reason ? ` - ${reason}` : ''}`);
    
    try {
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan) {
        return { success: false, error: "Plan not found" };
      }
      
      const profile = await athleteProfileService.getOrComputeProfile(plan.userId);
      const weeks = await storage.getPlanWeeks(planId);
      
      // Calculate adherence for completed weeks
      let totalPlanned = 0;
      let totalCompleted = 0;
      let completedWeeks = 0;
      
      for (const week of weeks) {
        const days = await storage.getPlanDays(week.id);
        const workoutDays = days.filter((d: any) => d.workoutType !== 'rest');
        const completedDays = workoutDays.filter((d: any) => 
          d.status === 'completed' || d.linkedActivityId
        );
        
        if (completedDays.length > 0) {
          completedWeeks++;
          totalPlanned += workoutDays.length;
          totalCompleted += completedDays.length;
        }
      }
      
      const adherenceRate = totalPlanned > 0 ? totalCompleted / totalPlanned : 1;
      const futureWeeks = weeks.filter((w: any) => w.weekNumber > completedWeeks);
      
      if (futureWeeks.length === 0) {
        return { 
          success: true, 
          adaptedWeeks: 0, 
          changes: ["Plan is complete, no future weeks to adapt"] 
        };
      }
      
      // Determine adaptation strategy based on adherence
      const changes: string[] = [];
      
      if (adherenceRate < 0.5) {
        changes.push(`Low adherence detected (${(adherenceRate * 100).toFixed(0)}%). Reducing volume for upcoming weeks.`);
        // Reduce future week volumes by 15-20%
        for (const week of futureWeeks) {
          const currentDistance = week.plannedDistanceKm || 0;
          const reducedDistance = currentDistance * 0.85;
          await storage.updatePlanWeek(week.id, { 
            plannedDistanceKm: reducedDistance,
            coachNotes: `Volume reduced due to training adherence. Original: ${currentDistance.toFixed(1)}km`
          });
          
          // Reduce individual day distances
          const days = await storage.getPlanDays(week.id);
          for (const day of days) {
            if (day.plannedDistanceKm && day.workoutType !== 'rest') {
              await storage.updatePlanDay(day.id, {
                plannedDistanceKm: day.plannedDistanceKm * 0.85
              });
            }
          }
        }
      } else if (adherenceRate < 0.75) {
        changes.push(`Moderate adherence (${(adherenceRate * 100).toFixed(0)}%). Making minor adjustments.`);
        // Reduce volume by 10%
        for (const week of futureWeeks.slice(0, 2)) { // Only next 2 weeks
          const currentDistance = week.plannedDistanceKm || 0;
          const reducedDistance = currentDistance * 0.9;
          await storage.updatePlanWeek(week.id, { 
            plannedDistanceKm: reducedDistance 
          });
        }
      } else if (adherenceRate >= 0.9) {
        changes.push(`Excellent adherence (${(adherenceRate * 100).toFixed(0)}%). Plan is on track.`);
        // Could optionally increase volume slightly, but safer to keep as-is
      } else {
        changes.push(`Good adherence (${(adherenceRate * 100).toFixed(0)}%). No changes needed.`);
      }
      
      // Update current week pointer
      if (completedWeeks > 0) {
        await storage.updateTrainingPlan(planId, { currentWeek: completedWeeks + 1 });
      }
      
      console.log(`[PlanGenerator] Adapted ${futureWeeks.length} future weeks with ${changes.length} changes`);
      
      return {
        success: true,
        adaptedWeeks: futureWeeks.length,
        changes,
      };
    } catch (error) {
      console.error(`[PlanGenerator] Adaptation failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during adaptation",
      };
    }
  }
  
  /**
   * Calculate adherence stats for a training plan
   */
  async getAdherenceStats(planId: number): Promise<{
    totalWorkouts: number;
    completedWorkouts: number;
    adherenceRate: number;
    weeklyStats: Array<{
      weekNumber: number;
      planned: number;
      completed: number;
      rate: number;
    }>;
  }> {
    const weeks = await storage.getPlanWeeks(planId);
    const weeklyStats = [];
    let totalPlanned = 0;
    let totalCompleted = 0;
    
    for (const week of weeks) {
      const days = await storage.getPlanDays(week.id);
      const workoutDays = days.filter((d: any) => d.workoutType !== 'rest');
      const completedDays = workoutDays.filter((d: any) => 
        d.status === 'completed' || d.linkedActivityId
      );
      
      totalPlanned += workoutDays.length;
      totalCompleted += completedDays.length;
      
      weeklyStats.push({
        weekNumber: week.weekNumber,
        planned: workoutDays.length,
        completed: completedDays.length,
        rate: workoutDays.length > 0 ? completedDays.length / workoutDays.length : 0,
      });
    }
    
    return {
      totalWorkouts: totalPlanned,
      completedWorkouts: totalCompleted,
      adherenceRate: totalPlanned > 0 ? totalCompleted / totalPlanned : 0,
      weeklyStats,
    };
  }
}

export const planGeneratorService = new PlanGeneratorService();

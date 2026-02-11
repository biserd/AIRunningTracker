import OpenAI from "openai";
import { storage } from "../storage";
import { athleteProfileService } from "./athleteProfile";
import { trainingGuardrails, type GeneratedPlan, type PlanWeekInput, type PlanDayInput } from "./trainingGuardrails";
import { generateSkeleton, type PlanSkeleton, type SkeletonWeek, type SkeletonDay } from "./skeletonGenerator";
import type { AthleteProfile, TrainingPlan, InsertTrainingPlan, InsertPlanWeek, InsertPlanDay, GoalType } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PlanGenerationRequest {
  userId: number;
  goalType: string;
  goalTimeTarget?: string;
  raceDate?: string;
  raceName?: string;
  preferredRunDays?: string[];
  maxWeeklyHours?: number;
  constraints?: string;
  includeSpeedwork?: boolean;
  includeLongRuns?: boolean;
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  unitPreference?: "km" | "miles";
  terrainType?: "road" | "trail" | "mountain";
  goals?: Array<{
    goalType: string;
    raceDate?: string;
    targetTime?: string;
    priority: "primary" | "secondary";
    terrainType?: "road" | "trail" | "mountain";
  }>;
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

export interface InstantPlanResult {
  success: boolean;
  planId?: number;
  plan?: TrainingPlan;
  totalWeeks?: number;
  enrichmentStatus?: "pending" | "enriching" | "complete" | "partial" | "failed";
  error?: string;
}

// SSE event emitter for enrichment progress
type EnrichmentListener = (event: { planId: number; enrichedWeeks: number; totalWeeks: number; status: string }) => void;
const enrichmentListeners = new Map<number, Set<EnrichmentListener>>();

export function subscribeToEnrichment(planId: number, listener: EnrichmentListener): () => void {
  if (!enrichmentListeners.has(planId)) {
    enrichmentListeners.set(planId, new Set());
  }
  enrichmentListeners.get(planId)!.add(listener);
  return () => {
    enrichmentListeners.get(planId)?.delete(listener);
    if (enrichmentListeners.get(planId)?.size === 0) {
      enrichmentListeners.delete(planId);
    }
  };
}

function emitEnrichmentProgress(planId: number, enrichedWeeks: number, totalWeeks: number, status: string) {
  const listeners = enrichmentListeners.get(planId);
  if (listeners) {
    Array.from(listeners).forEach(listener => {
      listener({ planId, enrichedWeeks, totalWeeks, status });
    });
  }
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
   * INSTANT PLAN GENERATION - Returns immediately with template content
   * Background enrichment fills in quality workouts progressively
   */
  async generatePlanInstant(request: PlanGenerationRequest): Promise<InstantPlanResult> {
    console.log(`[PlanGenerator] Instant generation: ${request.goalType} plan for user ${request.userId}`);
    
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
      
      // 3. Generate skeleton with fixed structure (instant, ~100ms)
      console.log(`[PlanGenerator] Generating skeleton for ${planWeeks} weeks`);
      const skeleton = generateSkeleton(request, profile, planWeeks);
      console.log(`[PlanGenerator] Skeleton generated with ${skeleton.weeks.length} weeks`);
      
      // 4. Fill non-quality days with templates (instant, ~50ms)
      const templateFilledSkeleton = this.fillNonQualityDaysWithTemplates(skeleton, profile, useMiles);
      
      // 5. Convert to plan format and save immediately with "enriching" status
      const templatePlan = this.skeletonToGeneratedPlan(templateFilledSkeleton);
      const savedPlan = await this.savePlanFromSkeletonWithStatus(
        request, 
        skeleton, 
        templatePlan, 
        profile,
        "enriching" // Status indicates enrichment in progress
      );
      
      console.log(`[PlanGenerator] Plan ${savedPlan.id} saved instantly, starting background enrichment`);
      
      // 6. Start background enrichment (fire and forget)
      this.enrichPlanInBackground(savedPlan.id, skeleton, profile, request, useMiles)
        .catch(err => console.error(`[PlanGenerator] Background enrichment failed for plan ${savedPlan.id}:`, err));
      
      return {
        success: true,
        planId: savedPlan.id,
        plan: savedPlan,
        totalWeeks: skeleton.weeks.length,
        enrichmentStatus: "enriching",
      };
    } catch (error) {
      console.error(`[PlanGenerator] Instant generation error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Background enrichment - processes quality workouts one chunk at a time
   * Updates database progressively and emits SSE events
   */
  private async enrichPlanInBackground(
    planId: number,
    skeleton: PlanSkeleton,
    profile: AthleteProfile,
    request: PlanGenerationRequest,
    useMiles: boolean
  ): Promise<void> {
    const paceUnit = useMiles ? "min/mile" : "min/km";
    const athleteContext = this.buildCompactAthleteContext(profile, request, useMiles);
    
    // Group quality workouts by week
    const weekChunks = this.groupQualityWorkoutsByWeek(skeleton, useMiles);
    const totalChunks = weekChunks.length;
    
    console.log(`[PlanGenerator] Starting background enrichment for plan ${planId} (${totalChunks} chunks)`);
    
    if (totalChunks === 0) {
      // No quality workouts to enrich, mark complete
      await storage.updateTrainingPlan(planId, { 
        enrichmentStatus: "complete",
        enrichedWeeks: skeleton.weeks.length 
      });
      emitEnrichmentProgress(planId, skeleton.weeks.length, skeleton.weeks.length, "complete");
      // Clean up listeners after terminal event
      setTimeout(() => enrichmentListeners.delete(planId), 1000);
      return;
    }
    
    let enrichedCount = 0;
    let failedCount = 0;
    
    try {
      // Pre-fetch weeks once to avoid repeated queries
      const allWeeks = await storage.getPlanWeeks(planId);
      const weekMap = new Map(allWeeks.map((w: any) => [w.weekNumber, w]));
      
      // Process chunks sequentially for progressive updates
      for (const chunk of weekChunks) {
        try {
          const result = await this.fillWeekChunk(chunk, athleteContext, paceUnit, request.goalType, profile.estimatedVdot || 45);
          
          if (result.success && result.workouts) {
            const week = weekMap.get(chunk.weekNumber);
            
            if (week) {
              // Fetch days for this specific week
              const days = await storage.getPlanDays(week.id);
              
              // Update each quality workout day
              for (const workout of result.workouts) {
                const day = days.find((d: any) => 
                  d.dayOfWeek === workout.dayOfWeek && 
                  this.qualityWorkoutTypes.has(d.workoutType)
                );
                if (day) {
                  await storage.updatePlanDay(day.id, {
                    title: workout.title,
                    description: workout.description,
                    intensity: workout.intensity,
                    targetPace: workout.targetPace || undefined,
                    workoutStructure: {
                      warmup: "10 min easy jog + dynamic stretches",
                      main: workout.mainSet || "",
                      cooldown: "10 min easy jog + stretching",
                    },
                  });
                }
              }
              
              // Mark week as enriched
              await storage.updatePlanWeek(week.id, { enriched: true });
            }
            enrichedCount++;
          } else {
            failedCount++;
          }
          
          // Update plan progress and emit event
          await storage.updateTrainingPlan(planId, { 
            enrichedWeeks: enrichedCount 
          });
          emitEnrichmentProgress(planId, enrichedCount, totalChunks, "enriching");
          
        } catch (error) {
          console.error(`[PlanGenerator] Chunk ${chunk.weekNumber} failed:`, error);
          failedCount++;
        }
      }
      
      // Final status update
      const finalStatus = failedCount === 0 ? "complete" : (enrichedCount > 0 ? "partial" : "failed");
      await storage.updateTrainingPlan(planId, { 
        enrichmentStatus: finalStatus,
        enrichedWeeks: enrichedCount,
        enrichmentError: failedCount > 0 ? `${failedCount} of ${totalChunks} chunks failed` : undefined
      });
      
      emitEnrichmentProgress(planId, enrichedCount, totalChunks, finalStatus);
      console.log(`[PlanGenerator] Enrichment complete for plan ${planId}: ${finalStatus} (${enrichedCount}/${totalChunks})`);
      
    } catch (error) {
      // Catch-all for unexpected errors
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[PlanGenerator] Background enrichment failed for plan ${planId}:`, error);
      
      await storage.updateTrainingPlan(planId, { 
        enrichmentStatus: "failed",
        enrichedWeeks: enrichedCount,
        enrichmentError: `Enrichment failed: ${errorMsg}`
      });
      
      emitEnrichmentProgress(planId, enrichedCount, totalChunks, "failed");
    } finally {
      // Clean up listeners after terminal event (give SSE clients time to receive final event)
      setTimeout(() => enrichmentListeners.delete(planId), 2000);
    }
  }

  /**
   * Save plan with specific enrichment status
   */
  private async savePlanFromSkeletonWithStatus(
    request: PlanGenerationRequest,
    skeleton: PlanSkeleton,
    plan: GeneratedPlan,
    profile: AthleteProfile,
    enrichmentStatus: "pending" | "enriching" | "complete" | "partial" | "failed"
  ): Promise<TrainingPlan> {
    const raceDate = request.raceDate ? new Date(request.raceDate) : null;
    
    const planData: InsertTrainingPlan = {
      userId: request.userId,
      goalType: request.goalType as GoalType,
      raceDate: raceDate || undefined,
      targetTime: request.goalTimeTarget || undefined,
      terrainType: request.terrainType || undefined,
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
      enrichmentStatus,
      enrichedWeeks: 0,
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
        phaseName: skeletonWeek.phaseName || undefined,
        plannedVertGainM: skeletonWeek.plannedVertGainM || undefined,
        plannedLongRunDurationMins: skeletonWeek.plannedLongRunDurationMins || undefined,
        goalSplit: skeletonWeek.goalSplit || undefined,
        whyThisWeek: skeletonWeek.whyThisWeek || undefined,
        coachNotes: undefined,
        enriched: false,
      };
      
      const savedWeek = await storage.createPlanWeek(weekData);
      
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
          plannedVertGainM: skeletonDay.plannedVertGainM || undefined,
          isBackToBackLongRun: skeletonDay.isBackToBackLongRun || false,
          fuelingPractice: skeletonDay.fuelingPractice || false,
          goalContribution: skeletonDay.goalContribution || undefined,
          userNotes: undefined,
          perceivedEffort: undefined,
        };
        
        await storage.createPlanDay(dayData);
      }
    }
    
    console.log(`[PlanGenerator] Plan ${savedPlan.id} saved with status '${enrichmentStatus}'`);
    
    return savedPlan;
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
   * OPTIMIZED V2: Per-week chunking, compact contract, graceful degradation
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

    // Step 1: Pre-fill non-quality days with templates (instant)
    console.log("[PlanGenerator] Filling non-quality days with templates...");
    const templateFilledSkeleton = this.fillNonQualityDaysWithTemplates(skeleton, profile, useMiles);

    // Step 2: Group quality workouts by week for chunked processing
    const weekChunks = this.groupQualityWorkoutsByWeek(skeleton, useMiles);
    const totalQualityWorkouts = weekChunks.reduce((sum, w) => sum + w.workouts.length, 0);
    console.log(`[PlanGenerator] Quality workouts: ${totalQualityWorkouts} across ${weekChunks.length} weeks`);

    // If no quality workouts, skip LLM entirely
    if (totalQualityWorkouts === 0) {
      console.log("[PlanGenerator] No quality workouts - skipping LLM");
      return this.skeletonToGeneratedPlan(templateFilledSkeleton);
    }

    // Step 3: Build compact athlete context (sent with each request)
    const athleteContext = this.buildCompactAthleteContext(profile, request, useMiles);

    // Step 4: Process weeks in parallel with concurrency limit
    const CONCURRENCY_LIMIT = 4;
    const startTime = Date.now();
    console.log(`[PlanGenerator] Starting ${weekChunks.length} chunk requests (concurrency: ${CONCURRENCY_LIMIT})...`);

    const results = await this.processWeekChunksWithConcurrency(
      weekChunks,
      athleteContext,
      paceUnit,
      CONCURRENCY_LIMIT,
      request.goalType,
      profile.estimatedVdot || 45
    );

    const elapsed = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    console.log(`[PlanGenerator] Chunks completed in ${elapsed}ms (${successCount}/${weekChunks.length} succeeded)`);

    // Step 5: Merge successful results into skeleton (graceful degradation)
    const mergedSkeleton = this.mergeChunkResultsIntoSkeleton(templateFilledSkeleton, results);

    return this.skeletonToGeneratedPlan(mergedSkeleton);
  }

  /**
   * Group quality workouts by week for chunked LLM processing
   */
  private groupQualityWorkoutsByWeek(skeleton: PlanSkeleton, useMiles: boolean): Array<{
    weekNumber: number;
    weekType: string;
    qualityLevel: number;
    workouts: Array<{
      dayOfWeek: string;
      workoutType: string;
      distance: string;
      distanceKm: number;
    }>;
  }> {
    const KM_TO_MILES = 0.621371;
    const distUnit = useMiles ? "miles" : "km";
    const chunks: Array<{
      weekNumber: number;
      weekType: string;
      qualityLevel: number;
      workouts: Array<{ dayOfWeek: string; workoutType: string; distance: string; distanceKm: number }>;
    }> = [];

    for (const week of skeleton.weeks) {
      const qualityWorkouts = week.days
        .filter(d => this.qualityWorkoutTypes.has(d.workoutType))
        .map(d => ({
          dayOfWeek: d.dayOfWeek,
          workoutType: d.workoutType,
          distance: this.formatDistance(d.plannedDistanceKm || 0, useMiles) + distUnit,
          distanceKm: d.plannedDistanceKm || 0,
        }));

      if (qualityWorkouts.length > 0) {
        chunks.push({
          weekNumber: week.weekNumber,
          weekType: week.weekType,
          qualityLevel: week.qualityLevel || 3,
          workouts: qualityWorkouts,
        });
      }
    }

    return chunks;
  }

  /**
   * Build compact athlete context for LLM prompts
   */
  private buildCompactAthleteContext(
    profile: AthleteProfile,
    request: PlanGenerationRequest,
    useMiles: boolean
  ): string {
    const KM_TO_MILES = 0.621371;
    const paceUnit = useMiles ? "min/mi" : "min/km";
    
    let easyPace = "6:00-7:00";
    if (profile.typicalEasyPaceMin && profile.typicalEasyPaceMax) {
      const min = useMiles ? profile.typicalEasyPaceMin / KM_TO_MILES : profile.typicalEasyPaceMin;
      const max = useMiles ? profile.typicalEasyPaceMax / KM_TO_MILES : profile.typicalEasyPaceMax;
      easyPace = `${this.formatPace(min, false)}-${this.formatPace(max, false)}`;
    }

    return `Goal:${request.goalType.replace("_", "")}${request.goalTimeTarget ? `(${request.goalTimeTarget})` : ""} Easy:${easyPace}${paceUnit} VDOT:${profile.estimatedVdot || 45} Level:${request.experienceLevel || "intermediate"}`;
  }

  /**
   * Process week chunks with concurrency limit
   */
  private async processWeekChunksWithConcurrency(
    chunks: Array<{
      weekNumber: number;
      weekType: string;
      qualityLevel: number;
      workouts: Array<{ dayOfWeek: string; workoutType: string; distance: string; distanceKm: number }>;
    }>,
    athleteContext: string,
    paceUnit: string,
    concurrencyLimit: number,
    goalType: string,
    vdot: number
  ): Promise<Array<{
    weekNumber: number;
    success: boolean;
    coachNotes?: string;
    workouts?: Array<{
      dayOfWeek: string;
      title: string;
      description: string;
      intensity: "moderate" | "high";
      targetPace: string | null;
      mainSet: string;
    }>;
  }>> {
    const results: Array<{
      weekNumber: number;
      success: boolean;
      coachNotes?: string;
      workouts?: Array<{
        dayOfWeek: string;
        title: string;
        description: string;
        intensity: "moderate" | "high";
        targetPace: string | null;
        mainSet: string;
      }>;
    }> = [];

    // Process in batches with concurrency limit
    for (let i = 0; i < chunks.length; i += concurrencyLimit) {
      const batch = chunks.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(chunk => this.fillWeekChunk(chunk, athleteContext, paceUnit, goalType, vdot));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Generate cache fingerprint for a workout
   * Format: {goalType}:{workoutType}:{qualityLevel}:{weekType}:{distanceBucket}:{vdotBucket}
   */
  private generateWorkoutFingerprint(
    goalType: string,
    workoutType: string,
    qualityLevel: number,
    weekType: string,
    distanceKm: number,
    vdot: number
  ): string {
    const distanceBucket = Math.round(distanceKm / 2) * 2;
    const vdotBucket = Math.round(vdot / 5) * 5;
    return `${goalType}:${workoutType}:${qualityLevel}:${weekType}:${distanceBucket}:${vdotBucket}`;
  }

  /**
   * Personalize cached pace based on athlete's VDOT
   * Uses VDOT-based pace calculation for consistent results
   */
  private personalizePace(vdot: number, workoutType: string, paceUnit: string): string {
    // Base easy pace calculation from VDOT (min per km)
    // Formula approximation: easy pace = 7.5 - (vdot - 30) * 0.05 min/km
    const baseEasyPaceKm = Math.max(4.5, 7.5 - (vdot - 30) * 0.05);
    
    // Pace multipliers for different workout types
    const paceMultipliers: Record<string, [number, number]> = {
      tempo: [0.88, 0.92],      // 88-92% of easy pace (faster)
      intervals: [0.80, 0.85],  // 80-85% of easy pace (fastest)
      long_run: [1.00, 1.05],   // 100-105% of easy pace (slightly slower)
      fartlek: [0.85, 0.95],    // Mixed paces
      hills: [0.90, 0.95],      // Slightly faster than easy
      progression: [0.90, 1.00], // Starts easy, ends faster
    };
    
    const [minMult, maxMult] = paceMultipliers[workoutType] || [0.85, 0.95];
    const minPaceKm = baseEasyPaceKm * minMult;
    const maxPaceKm = baseEasyPaceKm * maxMult;
    
    // Convert to miles if needed
    const KM_TO_MILES = 0.621371;
    const minPace = paceUnit.includes("mile") ? minPaceKm / KM_TO_MILES : minPaceKm;
    const maxPace = paceUnit.includes("mile") ? maxPaceKm / KM_TO_MILES : maxPaceKm;
    
    return `${this.formatPace(minPace, false)}-${this.formatPace(maxPace, false)} ${paceUnit}`;
  }

  /**
   * Fill a single week's quality workouts with compact LLM call
   * Now includes caching: checks cache first, stores results after LLM call
   */
  private async fillWeekChunk(
    chunk: {
      weekNumber: number;
      weekType: string;
      qualityLevel: number;
      workouts: Array<{ dayOfWeek: string; workoutType: string; distance: string; distanceKm: number }>;
    },
    athleteContext: string,
    paceUnit: string,
    goalType: string = "general_fitness",
    vdot: number = 45
  ): Promise<{
    weekNumber: number;
    success: boolean;
    coachNotes?: string;
    workouts?: Array<{
      dayOfWeek: string;
      title: string;
      description: string;
      intensity: "moderate" | "high";
      targetPace: string | null;
      mainSet: string;
    }>;
  }> {
    // Step 1: Check cache for each workout
    const cachedWorkouts: Array<{
      dayOfWeek: string;
      title: string;
      description: string;
      intensity: "moderate" | "high";
      targetPace: string | null;
      mainSet: string;
    }> = [];
    const uncachedWorkouts: typeof chunk.workouts = [];
    
    for (const workout of chunk.workouts) {
      const fingerprint = this.generateWorkoutFingerprint(
        goalType,
        workout.workoutType,
        chunk.qualityLevel,
        chunk.weekType,
        workout.distanceKm,
        vdot
      );
      
      try {
        const cached = await storage.getWorkoutByFingerprint(fingerprint);
        if (cached) {
          // Cache hit! Personalize pace and add to results
          await storage.incrementWorkoutCacheHit(fingerprint);
          cachedWorkouts.push({
            dayOfWeek: workout.dayOfWeek,
            title: cached.title,
            description: cached.descriptionTemplate,
            intensity: cached.intensity as "moderate" | "high",
            targetPace: this.personalizePace(vdot, workout.workoutType, paceUnit),
            mainSet: cached.mainSetTemplate,
          });
          console.log(`[PlanGenerator] Cache HIT for ${fingerprint}`);
        } else {
          uncachedWorkouts.push(workout);
        }
      } catch (err) {
        // Cache lookup failed, treat as uncached
        uncachedWorkouts.push(workout);
      }
    }
    
    // Step 2: If all workouts are cached, return immediately
    if (uncachedWorkouts.length === 0 && cachedWorkouts.length > 0) {
      console.log(`[PlanGenerator] Week ${chunk.weekNumber}: All ${cachedWorkouts.length} workouts from cache`);
      return {
        weekNumber: chunk.weekNumber,
        success: true,
        workouts: cachedWorkouts,
      };
    }
    
    // Step 3: Call LLM for uncached workouts (or all if none cached)
    const workoutsToFill = uncachedWorkouts.length > 0 ? uncachedWorkouts : chunk.workouts;
    
    // Compact system prompt with strict limits
    const systemPrompt = `Running coach. Fill quality workouts. STRICT LIMITS:
- title: max 6 words
- description: max 200 chars (warmup+main+cooldown summary)
- mainSet: max 100 chars (the core workout only)
- targetPace: pace range like "7:30-8:00 ${paceUnit}"
- intensity: "moderate" or "high"
- weekNote: max 150 chars

qualityLevel 1-2: intro work, short intervals
qualityLevel 3-4: building, longer efforts
qualityLevel 5: peak race-specific

JSON only. No markdown.`;

    const userPrompt = `${athleteContext}
Week ${chunk.weekNumber} (${chunk.weekType}, level ${chunk.qualityLevel}):
${JSON.stringify(workoutsToFill.map(w => ({ dayOfWeek: w.dayOfWeek, workoutType: w.workoutType, distance: w.distance })))}

Output:
{"weekNote":"...","workouts":[{"dayOfWeek":"...","title":"...","description":"...","intensity":"...","targetPace":"...","mainSet":"..."}]}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 800,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content || response.choices[0]?.finish_reason === 'length') {
        console.warn(`[PlanGenerator] Week ${chunk.weekNumber} truncated or empty`);
        return { weekNumber: chunk.weekNumber, success: false };
      }

      const parsed = JSON.parse(content) as {
        weekNote?: string;
        workouts: Array<{
          dayOfWeek: string;
          title: string;
          description: string;
          intensity: "moderate" | "high";
          targetPace: string | null;
          mainSet: string;
        }>;
      };

      // Step 4: Cache the LLM results
      for (const llmWorkout of parsed.workouts || []) {
        const matchingChunkWorkout = workoutsToFill.find(w => w.dayOfWeek === llmWorkout.dayOfWeek);
        if (matchingChunkWorkout) {
          const fingerprint = this.generateWorkoutFingerprint(
            goalType,
            matchingChunkWorkout.workoutType,
            chunk.qualityLevel,
            chunk.weekType,
            matchingChunkWorkout.distanceKm,
            vdot
          );
          
          try {
            await storage.cacheWorkout({
              fingerprint,
              goalType,
              workoutType: matchingChunkWorkout.workoutType,
              qualityLevel: chunk.qualityLevel,
              weekType: chunk.weekType,
              distanceBucket: Math.round(matchingChunkWorkout.distanceKm / 2) * 2,
              vdotBucket: Math.round(vdot / 5) * 5,
              title: llmWorkout.title,
              descriptionTemplate: llmWorkout.description,
              mainSetTemplate: llmWorkout.mainSet,
              intensity: llmWorkout.intensity,
            });
            console.log(`[PlanGenerator] Cached workout: ${fingerprint}`);
          } catch (err) {
            console.warn(`[PlanGenerator] Failed to cache workout:`, err);
          }
        }
      }

      // Step 5: Merge cached and LLM results
      const allWorkouts = [...cachedWorkouts, ...(parsed.workouts || [])];

      return {
        weekNumber: chunk.weekNumber,
        success: true,
        coachNotes: parsed.weekNote,
        workouts: allWorkouts,
      };
    } catch (error) {
      console.error(`[PlanGenerator] Week ${chunk.weekNumber} failed:`, error);
      return { weekNumber: chunk.weekNumber, success: false };
    }
  }

  /**
   * Merge chunk results into skeleton with graceful degradation
   */
  private mergeChunkResultsIntoSkeleton(
    skeleton: PlanSkeleton,
    results: Array<{
      weekNumber: number;
      success: boolean;
      coachNotes?: string;
      workouts?: Array<{
        dayOfWeek: string;
        title: string;
        description: string;
        intensity: "moderate" | "high";
        targetPace: string | null;
        mainSet: string;
      }>;
    }>
  ): PlanSkeleton {
    const merged: PlanSkeleton = JSON.parse(JSON.stringify(skeleton));

    // Build lookup for successful results
    const resultMap = new Map<number, typeof results[0]>();
    for (const r of results) {
      if (r.success) {
        resultMap.set(r.weekNumber, r);
      }
    }

    // Merge into skeleton
    for (const week of merged.weeks) {
      const result = resultMap.get(week.weekNumber);
      if (!result) continue;

      // Set week coach notes
      if (result.coachNotes) {
        week.coachNotes = result.coachNotes;
      }

      // Build workout lookup
      const workouts = result.workouts || [];
      const workoutMap = new Map<string, typeof workouts[number]>();
      for (const w of workouts) {
        workoutMap.set(w.dayOfWeek, w);
      }

      // Merge workouts
      for (const day of week.days) {
        const fill = workoutMap.get(day.dayOfWeek);
        if (fill && this.qualityWorkoutTypes.has(day.workoutType)) {
          day.title = fill.title;
          day.description = fill.description;
          day.intensity = fill.intensity;
          day.targetPace = fill.targetPace;
          // Build workoutStructure with mainSet only (warmup/cooldown are standard)
          day.workoutStructure = {
            warmup: "10 min easy jog + dynamic stretches",
            main: fill.mainSet || "",
            cooldown: "10 min easy jog + stretching",
          };
        }
      }
    }

    // Set overall coach notes from first successful week
    const firstSuccess = results.find(r => r.success && r.coachNotes);
    if (firstSuccess?.coachNotes && !merged.trainingPlan.coachNotes) {
      merged.trainingPlan.coachNotes = firstSuccess.coachNotes;
    }

    return merged;
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
    
    const planData: InsertTrainingPlan = {
      userId: request.userId,
      goalType: request.goalType as GoalType,
      raceDate: raceDate || undefined,
      targetTime: request.goalTimeTarget || undefined,
      terrainType: request.terrainType || undefined,
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
        phaseName: skeletonWeek.phaseName || undefined,
        plannedVertGainM: skeletonWeek.plannedVertGainM || undefined,
        plannedLongRunDurationMins: skeletonWeek.plannedLongRunDurationMins || undefined,
        goalSplit: skeletonWeek.goalSplit || undefined,
        whyThisWeek: skeletonWeek.whyThisWeek || undefined,
        coachNotes: undefined,
      };
      
      const savedWeek = await storage.createPlanWeek(weekData);
      
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
          plannedVertGainM: skeletonDay.plannedVertGainM || undefined,
          isBackToBackLongRun: skeletonDay.isBackToBackLongRun || false,
          fuelingPractice: skeletonDay.fuelingPractice || false,
          goalContribution: skeletonDay.goalContribution || undefined,
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
    
    const planData: InsertTrainingPlan = {
      userId: request.userId,
      goalType: request.goalType as GoalType,
      raceDate: raceDate || undefined,
      targetTime: request.goalTimeTarget || undefined,
      terrainType: request.terrainType || undefined,
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

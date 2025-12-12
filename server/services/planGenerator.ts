import OpenAI from "openai";
import { storage } from "../storage";
import { athleteProfileService } from "./athleteProfile";
import { trainingGuardrails, type GeneratedPlan, type PlanWeekInput, type PlanDayInput } from "./trainingGuardrails";
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
      
      // 3. Generate plan with LLM
      const generatedPlan = await this.callLLMForPlan(request, profile, planWeeks);
      
      if (!generatedPlan) {
        return {
          success: false,
          error: "Failed to generate training plan. Please try again.",
        };
      }
      
      // 4. Apply guardrails
      const { plan: correctedPlan, validation } = trainingGuardrails.validateAndCorrect(
        generatedPlan,
        profile,
        request.goalType,
        raceDate
      );
      
      // 5. Save to database
      const savedPlan = await this.savePlan(request, correctedPlan, profile);
      
      return {
        success: true,
        plan: savedPlan,
        validation: {
          warnings: validation.warnings,
          corrections: validation.corrections.map(c => c.reason),
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
   * Call LLM to generate the training plan structure
   */
  private async callLLMForPlan(
    request: PlanGenerationRequest,
    profile: AthleteProfile,
    totalWeeks: number
  ): Promise<GeneratedPlan | null> {
    const systemPrompt = `You are an expert running coach creating personalized training plans. 
You follow evidence-based training principles:
- Progressive overload with 10-15% weekly mileage increases max
- Long runs should be 25-30% of weekly volume
- Include recovery weeks every 3-4 weeks (reduce volume by 20-25%)
- Proper taper before races (2-3 weeks for marathon, 1-2 for half)
- Easy runs at conversational pace (80% of training volume)
- Quality workouts (tempo, intervals) 2-3x per week max
- Rest days are essential for adaptation

Output a complete training plan in JSON format.`;

    const userPrompt = `Create a ${totalWeeks}-week training plan for a runner with:

ATHLETE PROFILE:
- Current weekly mileage: ${profile.baselineWeeklyMileageKm?.toFixed(1) || 0}km
- Average runs per week: ${profile.avgRunsPerWeek?.toFixed(1) || 0}
- Longest recent run: ${profile.longestRecentRunKm?.toFixed(1) || 0}km
- Easy pace: ${profile.typicalEasyPaceMin ? `${profile.typicalEasyPaceMin.toFixed(1)}-${profile.typicalEasyPaceMax?.toFixed(1)} min/km` : "not available"}
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
          "targetPace": "5:30-6:00 min/km",
          "intensity": "low|moderate|high"
        }
      ]
    }
  ],
  "coachNotes": "Summary of the plan approach"
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
        max_tokens: 8000,
        response_format: { type: "json_object" },
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error("[PlanGenerator] No content in LLM response");
        return null;
      }
      
      const parsed = JSON.parse(content) as GeneratedPlan;
      
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
}

export const planGeneratorService = new PlanGeneratorService();

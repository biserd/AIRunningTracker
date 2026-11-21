import type { Activity, User } from "@shared/schema";
import { canGenerateRunCoachRecap, canViewRunAnalysis } from "./runAnalysisAccess";
import { storage } from "../storage";
import { jobQueue } from "./queue/jobQueue";
import { createCoachRecapJob, createHydrateActivityJob } from "./queue/jobTypes";
import { runEnrichmentNeeds, runHydrationJobId, runRecapJobId } from "./runEnrichmentPolicy";

/** A webhook and an opened run use the same durable jobs. Opening a run repairs
 * older webhook imports without starting a full Strava resync. */
export async function queueRunEnrichment(user: User, activity: Activity) {
  const { needsStreams, needsLaps } = runEnrichmentNeeds(activity);
  const eligible = activity.userId === user.id && !!activity.stravaId &&
    !!activity.type?.toLowerCase().includes("run") &&
    canViewRunAnalysis(user, activity);
  if (!eligible) return { needsStreams, needsLaps, hydrationQueued: false, recapQueued: false };

  if (needsStreams || needsLaps) {
    await jobQueue.addJob(createHydrateActivityJob(
      user.id, activity.id, activity.stravaId, needsStreams, needsLaps, 1,
    ), runHydrationJobId(user.id, activity.id));
    return { needsStreams, needsLaps, hydrationQueued: true, recapQueued: false };
  }

  if (canGenerateRunCoachRecap(user, activity) &&
      !await storage.getCoachRecapByActivityId(activity.id)) {
    await jobQueue.addJob(createCoachRecapJob(user.id, activity.id, activity.stravaId),
      runRecapJobId(user.id, activity.id));
    return { needsStreams, needsLaps, hydrationQueued: false, recapQueued: true };
  }
  return { needsStreams, needsLaps, hydrationQueued: false, recapQueued: false };
}

import { db } from '../db';
import { activities, activityFeatures, similarRunsCache, activityRouteMap } from '@shared/schema';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';

const DISTANCE_TOLERANCE = 0.10;
const ELEVATION_TOLERANCE = 0.25;
const MAX_COMPARABLES = 20;
const CACHE_EXPIRY_DAYS = 7;

interface ComparableRun {
  activityId: number;
  name: string;
  startDate: Date;
  distance: number;
  movingTime: number;
  averageSpeed: number;
  averageHeartrate: number | null;
  totalElevationGain: number;
  similarityScore: number;
}

interface BaselineMetrics {
  pace: number;
  hr: number | null;
  drift: number | null;
  pacingStability: number | null;
}

interface ComparisonResult {
  comparableRuns: ComparableRun[];
  baseline: BaselineMetrics;
  deltas: {
    paceVsBaseline: number;
    hrVsBaseline: number | null;
    driftVsBaseline: number | null;
    pacingVsBaseline: number | null;
  };
  routeMatch?: {
    routeId: number;
    lastRunOnRoute: ComparableRun | null;
    routeHistory: ComparableRun[];
  };
}

function calculateSimilarityScore(
  target: { distance: number; elevation: number; hr: number | null },
  candidate: { distance: number; elevation: number; hr: number | null }
): number {
  const distanceDiff = Math.abs(target.distance - candidate.distance) / target.distance;
  const elevationDiff = target.elevation > 0 
    ? Math.abs(target.elevation - candidate.elevation) / target.elevation 
    : candidate.elevation > 50 ? 0.5 : 0;
  
  let hrDiff = 0;
  if (target.hr && candidate.hr) {
    hrDiff = Math.abs(target.hr - candidate.hr) / target.hr;
  }
  
  const distanceScore = Math.max(0, 1 - distanceDiff * 5);
  const elevationScore = Math.max(0, 1 - elevationDiff * 2);
  const hrScore = Math.max(0, 1 - hrDiff * 3);
  
  const weights = { distance: 0.5, elevation: 0.3, hr: 0.2 };
  return distanceScore * weights.distance + elevationScore * weights.elevation + hrScore * weights.hr;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function findComparableRuns(
  userId: number,
  activityId: number,
  targetActivity: {
    distance: number;
    totalElevationGain: number;
    averageHeartrate: number | null;
    startDate: Date;
  }
): Promise<ComparableRun[]> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const minDistance = targetActivity.distance * (1 - DISTANCE_TOLERANCE);
  const maxDistance = targetActivity.distance * (1 + DISTANCE_TOLERANCE);
  
  const candidates = await db.select({
    id: activities.id,
    name: activities.name,
    startDate: activities.startDate,
    distance: activities.distance,
    movingTime: activities.movingTime,
    averageSpeed: activities.averageSpeed,
    averageHeartrate: activities.averageHeartrate,
    totalElevationGain: activities.totalElevationGain
  })
    .from(activities)
    .where(
      and(
        eq(activities.userId, userId),
        eq(activities.type, 'Run'),
        gte(activities.startDate, oneYearAgo),
        gte(activities.distance, minDistance),
        lte(activities.distance, maxDistance),
        sql`${activities.id} != ${activityId}`
      )
    )
    .orderBy(desc(activities.startDate))
    .limit(100);
  
  const scored = candidates.map(candidate => ({
    activityId: candidate.id,
    name: candidate.name,
    startDate: candidate.startDate,
    distance: candidate.distance,
    movingTime: candidate.movingTime,
    averageSpeed: candidate.averageSpeed,
    averageHeartrate: candidate.averageHeartrate,
    totalElevationGain: candidate.totalElevationGain,
    similarityScore: calculateSimilarityScore(
      { 
        distance: targetActivity.distance, 
        elevation: targetActivity.totalElevationGain,
        hr: targetActivity.averageHeartrate
      },
      { 
        distance: candidate.distance, 
        elevation: candidate.totalElevationGain,
        hr: candidate.averageHeartrate
      }
    )
  }));
  
  return scored
    .filter(r => r.similarityScore > 0.5)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, MAX_COMPARABLES);
}

export async function computeBaseline(comparableRuns: ComparableRun[]): Promise<BaselineMetrics> {
  if (comparableRuns.length === 0) {
    return { pace: 0, hr: null, drift: null, pacingStability: null };
  }
  
  const paces = comparableRuns.map(r => r.averageSpeed);
  const hrs = comparableRuns.filter(r => r.averageHeartrate).map(r => r.averageHeartrate!);
  
  return {
    pace: median(paces),
    hr: hrs.length > 0 ? median(hrs) : null,
    drift: null,
    pacingStability: null
  };
}

export async function computeDeltas(
  currentActivity: {
    averageSpeed: number;
    averageHeartrate: number | null;
  },
  baseline: BaselineMetrics,
  currentFeatures?: { aerobicDecoupling?: number | null; pacingStability?: number | null }
): Promise<ComparisonResult['deltas']> {
  const paceVsBaseline = baseline.pace > 0 
    ? ((currentActivity.averageSpeed - baseline.pace) / baseline.pace) * 100 
    : 0;
  
  const hrVsBaseline = baseline.hr && currentActivity.averageHeartrate
    ? ((currentActivity.averageHeartrate - baseline.hr) / baseline.hr) * 100
    : null;
  
  return {
    paceVsBaseline: Math.round(paceVsBaseline * 10) / 10,
    hrVsBaseline: hrVsBaseline ? Math.round(hrVsBaseline * 10) / 10 : null,
    driftVsBaseline: null,
    pacingVsBaseline: null
  };
}

export async function getOrComputeComparison(
  userId: number,
  activityId: number
): Promise<ComparisonResult | null> {
  const [cached] = await db.select()
    .from(similarRunsCache)
    .where(
      and(
        eq(similarRunsCache.activityId, activityId),
        gte(similarRunsCache.expiresAt, new Date())
      )
    );
  
  if (cached) {
    const activityIds = cached.similarActivityIds as number[];
    const scores = cached.similarityScores as number[];
    
    let comparableActivities: {
      id: number;
      name: string;
      startDate: Date;
      distance: number;
      movingTime: number;
      averageSpeed: number;
      averageHeartrate: number | null;
      totalElevationGain: number;
    }[] = [];
    
    if (activityIds.length > 0) {
      comparableActivities = await db.select({
        id: activities.id,
        name: activities.name,
        startDate: activities.startDate,
        distance: activities.distance,
        movingTime: activities.movingTime,
        averageSpeed: activities.averageSpeed,
        averageHeartrate: activities.averageHeartrate,
        totalElevationGain: activities.totalElevationGain
      })
        .from(activities)
        .where(inArray(activities.id, activityIds));
    }
    
    const comparableRuns = comparableActivities.map((a, idx) => ({
      ...a,
      activityId: a.id,
      similarityScore: scores[idx] || 0
    }));
    
    return {
      comparableRuns,
      baseline: {
        pace: cached.baselinePace || 0,
        hr: cached.baselineHr,
        drift: cached.baselineDrift,
        pacingStability: cached.baselinePacingStability
      },
      deltas: {
        paceVsBaseline: cached.paceVsBaseline || 0,
        hrVsBaseline: cached.hrVsBaseline,
        driftVsBaseline: cached.driftVsBaseline,
        pacingVsBaseline: cached.pacingVsBaseline
      }
    };
  }
  
  const [activity] = await db.select()
    .from(activities)
    .where(eq(activities.id, activityId));
  
  if (!activity) return null;
  
  const comparableRuns = await findComparableRuns(userId, activityId, {
    distance: activity.distance,
    totalElevationGain: activity.totalElevationGain,
    averageHeartrate: activity.averageHeartrate,
    startDate: activity.startDate
  });
  
  const baseline = await computeBaseline(comparableRuns);
  const deltas = await computeDeltas(
    { averageSpeed: activity.averageSpeed, averageHeartrate: activity.averageHeartrate },
    baseline
  );
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_EXPIRY_DAYS);
  
  await db.insert(similarRunsCache).values({
    activityId,
    userId,
    similarActivityIds: comparableRuns.map(r => r.activityId),
    similarityScores: comparableRuns.map(r => r.similarityScore),
    baselinePace: baseline.pace,
    baselineHr: baseline.hr,
    baselineDrift: baseline.drift,
    baselinePacingStability: baseline.pacingStability,
    paceVsBaseline: deltas.paceVsBaseline,
    hrVsBaseline: deltas.hrVsBaseline,
    driftVsBaseline: deltas.driftVsBaseline,
    pacingVsBaseline: deltas.pacingVsBaseline,
    expiresAt
  }).onConflictDoUpdate({
    target: similarRunsCache.activityId,
    set: {
      similarActivityIds: comparableRuns.map(r => r.activityId),
      similarityScores: comparableRuns.map(r => r.similarityScore),
      baselinePace: baseline.pace,
      baselineHr: baseline.hr,
      paceVsBaseline: deltas.paceVsBaseline,
      hrVsBaseline: deltas.hrVsBaseline,
      computedAt: new Date(),
      expiresAt
    }
  });
  
  const [routeMapping] = await db.select()
    .from(activityRouteMap)
    .where(eq(activityRouteMap.activityId, activityId));
  
  let routeMatch: ComparisonResult['routeMatch'];
  if (routeMapping) {
    const routeActivities = await db.select({
      activityId: activityRouteMap.activityId
    })
      .from(activityRouteMap)
      .where(
        and(
          eq(activityRouteMap.routeId, routeMapping.routeId),
          sql`${activityRouteMap.activityId} != ${activityId}`
        )
      )
      .orderBy(desc(activityRouteMap.createdAt))
      .limit(10);
    
    const routeActivityIds = routeActivities.map(r => r.activityId);
    
    if (routeActivityIds.length > 0) {
      const routeHistory = await db.select({
        id: activities.id,
        name: activities.name,
        startDate: activities.startDate,
        distance: activities.distance,
        movingTime: activities.movingTime,
        averageSpeed: activities.averageSpeed,
        averageHeartrate: activities.averageHeartrate,
        totalElevationGain: activities.totalElevationGain
      })
        .from(activities)
        .where(inArray(activities.id, routeActivityIds));
      
      const routeHistoryWithScore = routeHistory
        .map(a => ({ ...a, activityId: a.id, similarityScore: 1.0 }))
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      
      routeMatch = {
        routeId: routeMapping.routeId,
        lastRunOnRoute: routeHistoryWithScore[0] || null,
        routeHistory: routeHistoryWithScore
      };
    }
  }
  
  return {
    comparableRuns,
    baseline,
    deltas,
    routeMatch
  };
}

export async function getWhatChanged(
  activityId: number,
  comparison: ComparisonResult | null
): Promise<{
  vsLastSameRoute: { metric: string; change: string; direction: 'better' | 'worse' | 'neutral' }[] | null;
  vsComparableMedian: { metric: string; change: string; direction: 'better' | 'worse' | 'neutral' }[];
}> {
  const vsComparableMedian: { metric: string; change: string; direction: 'better' | 'worse' | 'neutral' }[] = [];
  
  if (comparison?.deltas) {
    if (comparison.deltas.paceVsBaseline !== 0) {
      const paceChange = comparison.deltas.paceVsBaseline;
      vsComparableMedian.push({
        metric: 'Pace',
        change: `${paceChange > 0 ? '+' : ''}${paceChange.toFixed(1)}%`,
        direction: paceChange > 0 ? 'better' : paceChange < -3 ? 'worse' : 'neutral'
      });
    }
    
    if (comparison.deltas.hrVsBaseline) {
      const hrChange = comparison.deltas.hrVsBaseline;
      vsComparableMedian.push({
        metric: 'Heart Rate',
        change: `${hrChange > 0 ? '+' : ''}${hrChange.toFixed(1)}%`,
        direction: hrChange < -3 ? 'better' : hrChange > 3 ? 'worse' : 'neutral'
      });
    }
  }
  
  let vsLastSameRoute: typeof vsComparableMedian | null = null;
  
  if (comparison?.routeMatch?.lastRunOnRoute) {
    const [current] = await db.select()
      .from(activities)
      .where(eq(activities.id, activityId));
    
    if (current) {
      const last = comparison.routeMatch.lastRunOnRoute;
      vsLastSameRoute = [];
      
      const paceChange = ((current.averageSpeed - last.averageSpeed) / last.averageSpeed) * 100;
      vsLastSameRoute.push({
        metric: 'Pace',
        change: `${paceChange > 0 ? '+' : ''}${paceChange.toFixed(1)}%`,
        direction: paceChange > 2 ? 'better' : paceChange < -2 ? 'worse' : 'neutral'
      });
      
      if (current.averageHeartrate && last.averageHeartrate) {
        const hrChange = ((current.averageHeartrate - last.averageHeartrate) / last.averageHeartrate) * 100;
        vsLastSameRoute.push({
          metric: 'Heart Rate',
          change: `${hrChange > 0 ? '+' : ''}${hrChange.toFixed(1)}%`,
          direction: hrChange < -3 ? 'better' : hrChange > 3 ? 'worse' : 'neutral'
        });
      }
      
      const timeChange = ((last.movingTime - current.movingTime) / last.movingTime) * 100;
      if (Math.abs(timeChange) > 1) {
        vsLastSameRoute.push({
          metric: 'Time',
          change: `${timeChange > 0 ? '' : '+'}${Math.abs(timeChange).toFixed(1)}% ${timeChange > 0 ? 'faster' : 'slower'}`,
          direction: timeChange > 0 ? 'better' : 'worse'
        });
      }
    }
  }
  
  return { vsLastSameRoute, vsComparableMedian };
}

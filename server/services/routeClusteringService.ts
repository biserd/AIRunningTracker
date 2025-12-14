// @ts-ignore - ngeohash doesn't have type declarations
import ngeohash from 'ngeohash';
import * as polylineCodec from '@googlemaps/polyline-codec';
import { db } from '../db';
import { routes, activityRouteMap, activities } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

const GEOHASH_PRECISION = 6;
const PATH_GEOHASH_PRECISION = 5;
const ROUTE_MATCH_THRESHOLD = 0.7;

interface LatLng {
  lat: number;
  lng: number;
}

interface RouteSignature {
  startGeohash: string;
  endGeohash: string;
  pathCells: string[];
  routeKey: string;
}

function simplifyPath(points: LatLng[], tolerance: number = 0.0001): LatLng[] {
  if (points.length <= 2) return points;
  
  let maxDist = 0;
  let maxIndex = 0;
  
  const start = points[0];
  const end = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  
  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  
  return [start, end];
}

function perpendicularDistance(point: LatLng, lineStart: LatLng, lineEnd: LatLng): number {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt(Math.pow(point.lat - lineStart.lat, 2) + Math.pow(point.lng - lineStart.lng, 2));
  }
  
  const t = ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / (dx * dx + dy * dy);
  const nearestLng = lineStart.lng + t * dx;
  const nearestLat = lineStart.lat + t * dy;
  
  return Math.sqrt(Math.pow(point.lat - nearestLat, 2) + Math.pow(point.lng - nearestLng, 2));
}

export function decodePolylineToLatLng(polyline: string): LatLng[] {
  try {
    const decoded = polylineCodec.decode(polyline);
    return decoded.map(([lat, lng]) => ({ lat, lng }));
  } catch (error) {
    console.error('Error decoding polyline:', error);
    return [];
  }
}

export function extractLatLngFromStreams(streams: any): LatLng[] {
  if (!streams) return [];
  
  let latlng = streams.latlng;
  if (latlng?.data) {
    latlng = latlng.data;
  }
  
  if (!Array.isArray(latlng)) return [];
  
  return latlng.map((point: [number, number]) => ({
    lat: point[0],
    lng: point[1]
  })).filter((p: LatLng) => p.lat && p.lng && !isNaN(p.lat) && !isNaN(p.lng));
}

export function generateRouteSignature(points: LatLng[]): RouteSignature | null {
  if (points.length < 2) return null;
  
  const simplified = simplifyPath(points, 0.0005);
  if (simplified.length < 2) return null;
  
  const startPoint = simplified[0];
  const endPoint = simplified[simplified.length - 1];
  
  const startGeohash = ngeohash.encode(startPoint.lat, startPoint.lng, GEOHASH_PRECISION);
  const endGeohash = ngeohash.encode(endPoint.lat, endPoint.lng, GEOHASH_PRECISION);
  
  const pathCellsSet = new Set<string>();
  for (const point of simplified) {
    const hash = ngeohash.encode(point.lat, point.lng, PATH_GEOHASH_PRECISION);
    pathCellsSet.add(hash);
  }
  const pathCells = Array.from(pathCellsSet).sort();
  
  const routeKeyInput = `${startGeohash}|${endGeohash}|${pathCells.join(',')}`;
  const routeKey = crypto.createHash('md5').update(routeKeyInput).digest('hex');
  
  return {
    startGeohash,
    endGeohash,
    pathCells,
    routeKey
  };
}

export function calculateRouteSimilarity(sig1: RouteSignature, sig2: RouteSignature): number {
  if (sig1.startGeohash.substring(0, 4) !== sig2.startGeohash.substring(0, 4)) {
    return 0;
  }
  if (sig1.endGeohash.substring(0, 4) !== sig2.endGeohash.substring(0, 4)) {
    return 0;
  }
  
  const set1 = new Set(sig1.pathCells);
  const set2 = new Set(sig2.pathCells);
  
  let intersection = 0;
  sig1.pathCells.forEach(cell => {
    if (set2.has(cell)) intersection++;
  });
  
  const union = set1.size + set2.size - intersection;
  if (union === 0) return 1;
  
  return intersection / union;
}

export async function findOrCreateRoute(
  userId: number,
  activityId: number,
  polyline: string | null,
  streams: any
): Promise<{ routeId: number; isNewRoute: boolean; matchConfidence: number } | null> {
  let points: LatLng[] = [];
  
  if (streams) {
    points = extractLatLngFromStreams(streams);
  }
  
  if (points.length < 10 && polyline) {
    points = decodePolylineToLatLng(polyline);
  }
  
  if (points.length < 10) {
    return null;
  }
  
  const signature = generateRouteSignature(points);
  if (!signature) return null;
  
  const existingRoutes = await db.select()
    .from(routes)
    .where(eq(routes.userId, userId))
    .orderBy(desc(routes.runCount));
  
  let bestMatch: { route: typeof existingRoutes[0]; similarity: number } | null = null;
  
  for (const route of existingRoutes) {
    const routeSig: RouteSignature = {
      startGeohash: route.startGeohash,
      endGeohash: route.endGeohash,
      pathCells: route.pathCells || [],
      routeKey: route.routeKey
    };
    
    const similarity = calculateRouteSimilarity(signature, routeSig);
    if (similarity >= ROUTE_MATCH_THRESHOLD) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { route, similarity };
      }
    }
  }
  
  if (bestMatch) {
    await db.update(routes)
      .set({
        runCount: (bestMatch.route.runCount || 0) + 1,
        lastRunAt: new Date()
      })
      .where(eq(routes.id, bestMatch.route.id));
    
    await db.insert(activityRouteMap).values({
      activityId,
      routeId: bestMatch.route.id,
      matchConfidence: bestMatch.similarity
    });
    
    return {
      routeId: bestMatch.route.id,
      isNewRoute: false,
      matchConfidence: bestMatch.similarity
    };
  }
  
  const [newRoute] = await db.insert(routes).values({
    userId,
    routeKey: signature.routeKey,
    startGeohash: signature.startGeohash,
    endGeohash: signature.endGeohash,
    pathCells: signature.pathCells,
    representativePolyline: polyline,
    runCount: 1,
    lastRunAt: new Date()
  }).returning();
  
  await db.insert(activityRouteMap).values({
    activityId,
    routeId: newRoute.id,
    matchConfidence: 1.0
  });
  
  return {
    routeId: newRoute.id,
    isNewRoute: true,
    matchConfidence: 1.0
  };
}

export async function getRouteHistory(routeId: number, limit: number = 20): Promise<any[]> {
  const activityMaps = await db.select()
    .from(activityRouteMap)
    .where(eq(activityRouteMap.routeId, routeId))
    .orderBy(desc(activityRouteMap.createdAt))
    .limit(limit);
  
  if (activityMaps.length === 0) return [];
  
  const activityIds = activityMaps.map(m => m.activityId);
  
  const activityList = await db.select({
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
    .where(eq(activities.id, activityIds[0]));
  
  for (let i = 1; i < activityIds.length; i++) {
    const additional = await db.select({
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
      .where(eq(activities.id, activityIds[i]));
    
    activityList.push(...additional);
  }
  
  return activityList.sort((a, b) => 
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
}

export async function getActivityRoute(activityId: number): Promise<{ route: any; history: any[] } | null> {
  const [mapping] = await db.select()
    .from(activityRouteMap)
    .where(eq(activityRouteMap.activityId, activityId));
  
  if (!mapping) return null;
  
  const [route] = await db.select()
    .from(routes)
    .where(eq(routes.id, mapping.routeId));
  
  if (!route) return null;
  
  const history = await getRouteHistory(route.id);
  
  return { route, history };
}

export async function assignRouteToActivity(activityId: number): Promise<boolean> {
  const [activity] = await db.select()
    .from(activities)
    .where(eq(activities.id, activityId));
  
  if (!activity) return false;
  
  const [existingMapping] = await db.select()
    .from(activityRouteMap)
    .where(eq(activityRouteMap.activityId, activityId));
  
  if (existingMapping) return true;
  
  let streams = null;
  if (activity.streamsData) {
    try {
      streams = JSON.parse(activity.streamsData);
    } catch (e) {
      console.error('Error parsing streams data:', e);
    }
  }
  
  const result = await findOrCreateRoute(
    activity.userId,
    activityId,
    activity.polyline || activity.detailedPolyline,
    streams
  );
  
  return result !== null;
}

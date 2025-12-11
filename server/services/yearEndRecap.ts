import { GoogleGenAI, Modality } from "@google/genai";
import { Activity } from "@shared/schema";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export interface YearlyStats {
  totalRuns: number;
  totalDistanceMeters: number;
  totalDistanceMiles: number;
  totalDistanceKm: number;
  totalTimeSeconds: number;
  totalElevationMeters: number;
  totalElevationFeet: number;
  longestRunMeters: number;
  longestRunMiles: number;
  fastestPaceMinPerMile: number;
  fastestPaceMinPerKm: number;
  averagePaceMinPerMile: number;
  averagePaceMinPerKm: number;
  totalCalories: number;
  averageHeartrate: number | null;
  maxHeartrateAchieved: number | null;
  mostActiveMonth: string;
  mostActiveMonthRuns: number;
  streakDays: number;
  mostRunLocation: LocationInfo | null;
  // Advanced metrics
  averageCadence: number | null;
  zone2Hours: number | null;
  estimatedVO2Max: number | null;
  trainingDistribution: {
    easy: number;
    moderate: number;
    hard: number;
  };
  totalSufferScore: number;
  averageRunDistance: number;
  averageRunTime: number;
}

export interface LocationInfo {
  name: string;
  latitude: number;
  longitude: number;
  runCount: number;
  description: string;
}

export function calculateYearlyStats(activities: Activity[], year: number): YearlyStats {
  const yearActivities = activities.filter(a => {
    const activityYear = new Date(a.startDate).getFullYear();
    return activityYear === year && a.type === "Run";
  });

  if (yearActivities.length === 0) {
    return {
      totalRuns: 0,
      totalDistanceMeters: 0,
      totalDistanceMiles: 0,
      totalDistanceKm: 0,
      totalTimeSeconds: 0,
      totalElevationMeters: 0,
      totalElevationFeet: 0,
      longestRunMeters: 0,
      longestRunMiles: 0,
      fastestPaceMinPerMile: 0,
      fastestPaceMinPerKm: 0,
      averagePaceMinPerMile: 0,
      averagePaceMinPerKm: 0,
      totalCalories: 0,
      averageHeartrate: null,
      maxHeartrateAchieved: null,
      mostActiveMonth: "",
      mostActiveMonthRuns: 0,
      streakDays: 0,
      mostRunLocation: null,
      averageCadence: null,
      zone2Hours: null,
      estimatedVO2Max: null,
      trainingDistribution: { easy: 0, moderate: 0, hard: 0 },
      totalSufferScore: 0,
      averageRunDistance: 0,
      averageRunTime: 0,
    };
  }

  const totalDistanceMeters = yearActivities.reduce((sum, a) => sum + a.distance, 0);
  const totalTimeSeconds = yearActivities.reduce((sum, a) => sum + a.movingTime, 0);
  const totalElevationMeters = yearActivities.reduce((sum, a) => sum + a.totalElevationGain, 0);
  const totalCalories = yearActivities.reduce((sum, a) => sum + (a.calories || 0), 0);

  const longestRun = yearActivities.reduce((max, a) => a.distance > max.distance ? a : max, yearActivities[0]);
  
  const fastestPace = yearActivities.reduce((fastest, a) => {
    const pace = a.movingTime / (a.distance / 1609.34);
    return pace < fastest ? pace : fastest;
  }, Infinity);

  const avgPaceSeconds = totalTimeSeconds / (totalDistanceMeters / 1609.34);

  const activitiesWithHR = yearActivities.filter(a => a.averageHeartrate);
  const avgHR = activitiesWithHR.length > 0
    ? activitiesWithHR.reduce((sum, a) => sum + (a.averageHeartrate || 0), 0) / activitiesWithHR.length
    : null;

  // Max heart rate achieved during the year
  const maxHRActivity = yearActivities.filter(a => a.maxHeartrate).reduce((max, a) => 
    (a.maxHeartrate || 0) > (max?.maxHeartrate || 0) ? a : max, 
    yearActivities[0]
  );
  const maxHeartrateAchieved = maxHRActivity?.maxHeartrate || null;

  // Average cadence
  const activitiesWithCadence = yearActivities.filter(a => a.averageCadence && a.averageCadence > 0);
  const avgCadence = activitiesWithCadence.length > 0
    ? activitiesWithCadence.reduce((sum, a) => sum + (a.averageCadence || 0), 0) / activitiesWithCadence.length
    : null;

  // Zone 2 training hours estimation (HR between 60-70% of max)
  // Using age-based max HR estimate if we have HR data
  let zone2Hours: number | null = null;
  if (activitiesWithHR.length > 0 && maxHeartrateAchieved) {
    const zone2Upper = maxHeartrateAchieved * 0.75;
    const zone2Lower = maxHeartrateAchieved * 0.60;
    const zone2Activities = activitiesWithHR.filter(a => 
      (a.averageHeartrate || 0) >= zone2Lower && (a.averageHeartrate || 0) <= zone2Upper
    );
    const zone2Seconds = zone2Activities.reduce((sum, a) => sum + a.movingTime, 0);
    zone2Hours = zone2Seconds / 3600;
  }

  // Estimated VO2 Max using Jack Daniels formula from best 5K-ish effort
  // VO2max = (0.8 + 0.1894393 * e^(-0.012778 * t) + 0.2989558 * e^(-0.1932605 * t)) * v
  // where t = time in minutes, v = velocity in m/min
  let estimatedVO2Max: number | null = null;
  const fiveKRuns = yearActivities.filter(a => a.distance >= 4500 && a.distance <= 5500);
  if (fiveKRuns.length > 0) {
    const best5K = fiveKRuns.reduce((best, a) => {
      const pace = a.movingTime / (a.distance / 1000);
      const bestPace = best.movingTime / (best.distance / 1000);
      return pace < bestPace ? a : best;
    }, fiveKRuns[0]);
    
    const timeMinutes = best5K.movingTime / 60;
    const velocityMetersPerMin = best5K.distance / timeMinutes;
    const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * timeMinutes) + 0.2989558 * Math.exp(-0.1932605 * timeMinutes);
    estimatedVO2Max = Math.round((velocityMetersPerMin / 1000 * 60 * 3.5) / percentMax);
  } else if (yearActivities.length > 0) {
    // Fallback: estimate from best effort run of any distance
    const bestEffort = yearActivities.reduce((best, a) => {
      const pace = a.movingTime / (a.distance / 1000);
      const bestPace = best.movingTime / (best.distance / 1000);
      return pace < bestPace ? a : best;
    }, yearActivities[0]);
    
    const timeMinutes = bestEffort.movingTime / 60;
    const velocityMetersPerMin = bestEffort.distance / timeMinutes;
    // Simplified estimation
    estimatedVO2Max = Math.round((velocityMetersPerMin / 1000) * 210);
  }

  // Training distribution based on heart rate or perceived effort
  let trainingDistribution = { easy: 0, moderate: 0, hard: 0 };
  if (activitiesWithHR.length > 0 && maxHeartrateAchieved) {
    const easyThreshold = maxHeartrateAchieved * 0.70;
    const hardThreshold = maxHeartrateAchieved * 0.85;
    
    let easyCount = 0, moderateCount = 0, hardCount = 0;
    activitiesWithHR.forEach(a => {
      const hr = a.averageHeartrate || 0;
      if (hr < easyThreshold) {
        easyCount++;
      } else if (hr >= hardThreshold) {
        hardCount++;
      } else {
        moderateCount++;
      }
    });
    
    // Convert to percentages only if we have data
    const total = easyCount + moderateCount + hardCount;
    if (total > 0) {
      trainingDistribution = {
        easy: Math.round((easyCount / total) * 100),
        moderate: Math.round((moderateCount / total) * 100),
        hard: Math.round((hardCount / total) * 100),
      };
    }
  }

  // Total suffer score (Strava's relative effort)
  const totalSufferScore = yearActivities.reduce((sum, a) => sum + (a.sufferScore || 0), 0);

  const monthCounts: Record<string, number> = {};
  const monthNames = ["January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"];
  yearActivities.forEach(a => {
    const month = monthNames[new Date(a.startDate).getMonth()];
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });
  const mostActiveMonth = Object.entries(monthCounts).reduce((a, b) => b[1] > a[1] ? b : a, ["", 0]);

  const streakDays = calculateLongestStreak(yearActivities);

  const mostRunLocation = findMostRunLocation(yearActivities);

  return {
    totalRuns: yearActivities.length,
    totalDistanceMeters,
    totalDistanceMiles: totalDistanceMeters / 1609.34,
    totalDistanceKm: totalDistanceMeters / 1000,
    totalTimeSeconds,
    totalElevationMeters,
    totalElevationFeet: totalElevationMeters * 3.28084,
    longestRunMeters: longestRun.distance,
    longestRunMiles: longestRun.distance / 1609.34,
    fastestPaceMinPerMile: fastestPace / 60,
    fastestPaceMinPerKm: (fastestPace / 60) / 1.60934,
    averagePaceMinPerMile: avgPaceSeconds / 60,
    averagePaceMinPerKm: (avgPaceSeconds / 60) / 1.60934,
    totalCalories,
    averageHeartrate: avgHR,
    maxHeartrateAchieved,
    mostActiveMonth: mostActiveMonth[0],
    mostActiveMonthRuns: mostActiveMonth[1],
    streakDays,
    mostRunLocation,
    averageCadence: avgCadence ? Math.round(avgCadence * 2) : null, // Convert to steps per minute (Strava gives half cadence)
    zone2Hours: zone2Hours ? Math.round(zone2Hours * 10) / 10 : null,
    estimatedVO2Max,
    trainingDistribution,
    totalSufferScore,
    averageRunDistance: totalDistanceMeters / yearActivities.length,
    averageRunTime: totalTimeSeconds / yearActivities.length,
  };
}

function calculateLongestStreak(activities: Activity[]): number {
  if (activities.length === 0) return 0;

  const dateSet = new Set(activities.map(a => 
    new Date(a.startDate).toISOString().split('T')[0]
  ));
  const dates = Array.from(dateSet).sort();

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

function findMostRunLocation(activities: Activity[]): LocationInfo | null {
  const activitiesWithLocation = activities.filter(a => a.startLatitude && a.startLongitude);
  
  if (activitiesWithLocation.length === 0) return null;

  const locationClusters: Map<string, { lat: number; lng: number; count: number; activities: Activity[] }> = new Map();
  const CLUSTER_RADIUS = 0.01;

  activitiesWithLocation.forEach(activity => {
    const lat = activity.startLatitude!;
    const lng = activity.startLongitude!;
    
    let foundCluster = false;
    const entries = Array.from(locationClusters.entries());
    for (const [key, cluster] of entries) {
      const distance = Math.sqrt(
        Math.pow(lat - cluster.lat, 2) + Math.pow(lng - cluster.lng, 2)
      );
      if (distance < CLUSTER_RADIUS) {
        cluster.count++;
        cluster.activities.push(activity);
        cluster.lat = (cluster.lat * (cluster.count - 1) + lat) / cluster.count;
        cluster.lng = (cluster.lng * (cluster.count - 1) + lng) / cluster.count;
        foundCluster = true;
        break;
      }
    }

    if (!foundCluster) {
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
      locationClusters.set(key, { lat, lng, count: 1, activities: [activity] });
    }
  });

  let mostRunCluster = { lat: 0, lng: 0, count: 0, activities: [] as Activity[] };
  const clusterValues = Array.from(locationClusters.values());
  for (const cluster of clusterValues) {
    if (cluster.count > mostRunCluster.count) {
      mostRunCluster = cluster;
    }
  }

  if (mostRunCluster.count === 0) return null;

  return {
    name: "Your favorite running spot",
    latitude: mostRunCluster.lat,
    longitude: mostRunCluster.lng,
    runCount: mostRunCluster.count,
    description: `You ran here ${mostRunCluster.count} times this year`,
  };
}

export async function generateYearEndImage(
  stats: YearlyStats,
  userName: string,
  year: number
): Promise<string> {
  const locationTheme = stats.mostRunLocation 
    ? `The background should feature a beautiful scenic view inspired by coordinates (${stats.mostRunLocation.latitude.toFixed(4)}, ${stats.mostRunLocation.longitude.toFixed(4)}) - imagine a typical running route scenery for this location with paths, nature, and local landmarks.`
    : "The background should feature a generic beautiful running trail with sunrise colors.";

  const formatPace = (pace: number) => {
    const mins = Math.floor(pace);
    const secs = Math.round((pace - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Build advanced metrics section if available
  const advancedMetrics: string[] = [];
  if (stats.estimatedVO2Max) advancedMetrics.push(`VO2 Max: ${stats.estimatedVO2Max} ml/kg/min`);
  if (stats.averageCadence) advancedMetrics.push(`Cadence: ${stats.averageCadence} spm`);
  if (stats.zone2Hours && stats.zone2Hours > 0) advancedMetrics.push(`Zone 2: ${stats.zone2Hours}h aerobic base`);
  if (stats.averageHeartrate) advancedMetrics.push(`Avg HR: ${Math.round(stats.averageHeartrate)} bpm`);
  if (stats.totalSufferScore > 0) advancedMetrics.push(`Total Effort: ${stats.totalSufferScore.toLocaleString()}`);

  const advancedSection = advancedMetrics.length > 0 
    ? `\n\nADVANCED PERFORMANCE DATA (smaller section):\n${advancedMetrics.join('\n')}`
    : '';

  const prompt = `Create an EPIC, jaw-dropping Year in Running infographic poster for ${year}. This should look like a premium sports brand advertisement - the kind of image that makes people stop scrolling.

CRITICAL DESIGN REQUIREMENTS:
- LARGE vertical format (9:16 aspect ratio, Instagram story style)
- MASSIVE, BOLD typography - think Nike/Adidas campaign level impact
- Electric gradient color scheme: deep purples, hot oranges, electric blues, neon accents
- High contrast with dark backgrounds and glowing text effects
- ${locationTheme}
- Premium sports magazine aesthetic with dramatic lighting effects
- Geometric patterns, speed lines, and dynamic visual elements
- Numbers should be HUGE and impossible to miss

LAYOUT STRUCTURE:
1. TOP: Epic hero title "${userName.toUpperCase()}'S ${year}" with dramatic styling
2. CENTER: The biggest stat as a massive hero number (total distance: ${stats.totalDistanceMiles.toFixed(0)} MILES)
3. GRID: Key stats in bold cards with icons

HERO STATS (make these MASSIVE and bold):
🏃 ${stats.totalRuns} RUNS
📏 ${stats.totalDistanceMiles.toFixed(1)} MILES (${stats.totalDistanceKm.toFixed(0)} km)
⏱️ ${formatTime(stats.totalTimeSeconds)} TOTAL TIME
⛰️ ${stats.totalElevationFeet.toFixed(0)} FT CLIMBED
🚀 ${formatPace(stats.fastestPaceMinPerMile)}/mi FASTEST PACE
🏆 ${stats.longestRunMiles.toFixed(1)} mi LONGEST RUN
📅 ${stats.mostActiveMonth.toUpperCase()} BEST MONTH
${stats.streakDays > 1 ? `🔥 ${stats.streakDays} DAY STREAK` : ''}
${stats.totalCalories > 0 ? `💪 ${stats.totalCalories.toLocaleString()} CALORIES` : ''}${advancedSection}

VISUAL ELEMENTS:
- Glowing running shoe silhouettes
- Abstract route/trail lines as design accents  
- Medal or trophy graphics
- Speed motion blur effects
- Particle/energy effects around numbers

BRANDING:
- Small "RunAnalytics" logo watermark in bottom corner
- Premium, polished finish

Make this image SO impressive that every runner would be proud to share it. It should feel like a celebration of athletic achievement.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((part: any) => part.inlineData);
    
    if (!imagePart?.inlineData?.data) {
      throw new Error("No image data in response");
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    return `data:${mimeType};base64,${imagePart.inlineData.data}`;
  } catch (error) {
    console.error("Error generating year-end image:", error);
    throw error;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
      {
        headers: {
          'User-Agent': 'RunAnalytics/1.0'
        }
      }
    );
    
    if (!response.ok) {
      return "Your favorite running spot";
    }

    const data = await response.json();
    const address = data.address;
    
    if (address.neighbourhood) return address.neighbourhood;
    if (address.suburb) return address.suburb;
    if (address.city_district) return address.city_district;
    if (address.city) return address.city;
    if (address.town) return address.town;
    if (address.village) return address.village;
    
    return data.display_name?.split(',')[0] || "Your favorite running spot";
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return "Your favorite running spot";
  }
}

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
  mostActiveMonth: string;
  mostActiveMonthRuns: number;
  streakDays: number;
  mostRunLocation: LocationInfo | null;
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
      mostActiveMonth: "",
      mostActiveMonthRuns: 0,
      streakDays: 0,
      mostRunLocation: null,
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
    mostActiveMonth: mostActiveMonth[0],
    mostActiveMonthRuns: mostActiveMonth[1],
    streakDays,
    mostRunLocation,
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

  const prompt = `Create a stunning, modern Year in Running infographic poster for ${year}.

DESIGN REQUIREMENTS:
- Vertical format optimized for social media sharing (Instagram story style)
- Bold, energetic typography with clear hierarchy
- Vibrant gradient color scheme (oranges, purples, blues - running/fitness themed)
- ${locationTheme}
- Professional sports magazine aesthetic with clean data visualization

CONTENT TO INCLUDE (display prominently):
Title: "${userName}'s ${year} Running Year"

KEY STATS (use large, bold numbers):
- Total Runs: ${stats.totalRuns}
- Total Distance: ${stats.totalDistanceMiles.toFixed(1)} miles (${stats.totalDistanceKm.toFixed(0)} km)
- Total Time: ${formatTime(stats.totalTimeSeconds)}
- Elevation Gained: ${stats.totalElevationFeet.toFixed(0)} ft
- Longest Run: ${stats.longestRunMiles.toFixed(1)} miles
- Fastest Pace: ${formatPace(stats.fastestPaceMinPerMile)} /mile
- Best Month: ${stats.mostActiveMonth} (${stats.mostActiveMonthRuns} runs)
${stats.streakDays > 1 ? `- Longest Streak: ${stats.streakDays} days` : ''}
${stats.totalCalories > 0 ? `- Calories Burned: ${stats.totalCalories.toLocaleString()}` : ''}

Add subtle running-related visual elements like running shoe silhouettes, route lines, or medal icons as accents.
Include a small "RunAnalytics" watermark in the corner.

Make it visually striking and something a runner would be proud to share on social media.`;

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

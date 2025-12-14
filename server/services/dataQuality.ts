import { storage } from "../storage";

interface DataQualityFlag {
  type: "hr_dropout" | "gps_drift" | "pause_artifact" | "hr_flatline" | "pace_spike";
  severity: "low" | "medium" | "high";
  description: string;
  affectedSeconds?: number;
}

interface DataQualityResult {
  score: number;
  flags: DataQualityFlag[];
  hrQuality: number;
  gpsQuality: number;
  pauseQuality: number;
  totalDataPoints: number;
  affectedPercentage: number;
}

interface StreamData {
  time?: number[];
  heartrate?: number[];
  velocity_smooth?: number[];
  distance?: number[];
  altitude?: number[];
  latlng?: [number, number][];
  cadence?: number[];
  watts?: number[];
}

export class DataQualityService {
  analyzeStreamQuality(streams: StreamData, movingTime: number, elapsedTime: number): DataQualityResult {
    const flags: DataQualityFlag[] = [];
    let hrQuality = 100;
    let gpsQuality = 100;
    let pauseQuality = 100;
    
    const totalDataPoints = streams.time?.length || 0;
    let affectedPoints = 0;

    if (streams.heartrate && streams.heartrate.length > 0) {
      const hrAnalysis = this.analyzeHeartRate(streams.heartrate, streams.time);
      hrQuality = hrAnalysis.quality;
      flags.push(...hrAnalysis.flags);
      affectedPoints += hrAnalysis.affectedPoints;
    }

    if (streams.velocity_smooth && streams.velocity_smooth.length > 0) {
      const paceAnalysis = this.analyzePaceData(streams.velocity_smooth, streams.time);
      gpsQuality = Math.min(gpsQuality, paceAnalysis.quality);
      flags.push(...paceAnalysis.flags);
      affectedPoints += paceAnalysis.affectedPoints;
    }

    if (streams.latlng && streams.latlng.length > 0) {
      const gpsAnalysis = this.analyzeGPSData(streams.latlng, streams.time);
      gpsQuality = Math.min(gpsQuality, gpsAnalysis.quality);
      flags.push(...gpsAnalysis.flags);
      affectedPoints += gpsAnalysis.affectedPoints;
    }

    const pauseAnalysis = this.analyzePauseArtifacts(movingTime, elapsedTime);
    pauseQuality = pauseAnalysis.quality;
    flags.push(...pauseAnalysis.flags);

    const score = Math.round(
      (hrQuality * 0.4) + (gpsQuality * 0.4) + (pauseQuality * 0.2)
    );

    const affectedPercentage = totalDataPoints > 0 
      ? Math.round((affectedPoints / totalDataPoints) * 100) 
      : 0;

    return {
      score,
      flags: flags.slice(0, 5),
      hrQuality: Math.round(hrQuality),
      gpsQuality: Math.round(gpsQuality),
      pauseQuality: Math.round(pauseQuality),
      totalDataPoints,
      affectedPercentage
    };
  }

  private analyzeHeartRate(heartrate: number[], time?: number[]): { quality: number; flags: DataQualityFlag[]; affectedPoints: number } {
    const flags: DataQualityFlag[] = [];
    let affectedPoints = 0;
    let quality = 100;

    let dropoutCount = 0;
    let flatlineCount = 0;
    let flatlineStart = -1;

    for (let i = 1; i < heartrate.length; i++) {
      if (heartrate[i] === 0 || heartrate[i] === null) {
        dropoutCount++;
        affectedPoints++;
      }
      
      if (heartrate[i] === heartrate[i - 1] && heartrate[i] > 0) {
        if (flatlineStart === -1) flatlineStart = i - 1;
        flatlineCount++;
      } else {
        if (flatlineCount > 10) {
          const duration = time ? (time[i - 1] - time[flatlineStart]) : flatlineCount;
          flags.push({
            type: "hr_flatline",
            severity: flatlineCount > 30 ? "high" : "medium",
            description: `HR flatlined at ${heartrate[flatlineStart]} bpm for ~${Math.round(duration)}s`,
            affectedSeconds: duration
          });
          affectedPoints += flatlineCount;
        }
        flatlineStart = -1;
        flatlineCount = 0;
      }
    }

    const dropoutPercentage = (dropoutCount / heartrate.length) * 100;
    if (dropoutPercentage > 5) {
      flags.push({
        type: "hr_dropout",
        severity: dropoutPercentage > 20 ? "high" : dropoutPercentage > 10 ? "medium" : "low",
        description: `${Math.round(dropoutPercentage)}% of HR data missing`,
        affectedSeconds: Math.round((dropoutCount / heartrate.length) * (time ? time[time.length - 1] : 0))
      });
    }

    quality -= dropoutPercentage * 2;
    quality -= Math.min(30, (affectedPoints / heartrate.length) * 50);

    return { quality: Math.max(0, quality), flags, affectedPoints };
  }

  private analyzePaceData(velocity: number[], time?: number[]): { quality: number; flags: DataQualityFlag[]; affectedPoints: number } {
    const flags: DataQualityFlag[] = [];
    let affectedPoints = 0;
    let quality = 100;

    let spikeCount = 0;
    
    for (let i = 1; i < velocity.length; i++) {
      if (velocity[i - 1] > 0) {
        const changeRatio = velocity[i] / velocity[i - 1];
        if (changeRatio > 3 || changeRatio < 0.3) {
          spikeCount++;
          affectedPoints++;
        }
      }
    }

    const spikePercentage = (spikeCount / velocity.length) * 100;
    if (spikePercentage > 2) {
      flags.push({
        type: "pace_spike",
        severity: spikePercentage > 10 ? "high" : spikePercentage > 5 ? "medium" : "low",
        description: `${spikeCount} sudden pace changes detected (GPS noise)`,
        affectedSeconds: spikeCount
      });
      quality -= spikePercentage * 3;
    }

    return { quality: Math.max(0, quality), flags, affectedPoints };
  }

  private analyzeGPSData(latlng: [number, number][], time?: number[]): { quality: number; flags: DataQualityFlag[]; affectedPoints: number } {
    const flags: DataQualityFlag[] = [];
    let affectedPoints = 0;
    let quality = 100;

    let driftCount = 0;
    
    for (let i = 1; i < latlng.length; i++) {
      const [lat1, lng1] = latlng[i - 1];
      const [lat2, lng2] = latlng[i];
      
      const distanceM = this.haversineDistance(lat1, lng1, lat2, lng2);
      const timeDelta = time ? (time[i] - time[i - 1]) : 1;
      
      if (timeDelta > 0) {
        const speedMs = distanceM / timeDelta;
        if (speedMs > 12.5) {
          driftCount++;
          affectedPoints++;
        }
      }
    }

    const driftPercentage = (driftCount / latlng.length) * 100;
    if (driftPercentage > 1) {
      flags.push({
        type: "gps_drift",
        severity: driftPercentage > 5 ? "high" : driftPercentage > 2 ? "medium" : "low",
        description: `${driftCount} GPS drift points (impossible speeds >45km/h)`,
        affectedSeconds: driftCount
      });
      quality -= driftPercentage * 5;
    }

    return { quality: Math.max(0, quality), flags, affectedPoints };
  }

  private analyzePauseArtifacts(movingTime: number, elapsedTime: number): { quality: number; flags: DataQualityFlag[] } {
    const flags: DataQualityFlag[] = [];
    let quality = 100;

    const pauseTime = elapsedTime - movingTime;
    const pausePercentage = elapsedTime > 0 ? (pauseTime / elapsedTime) * 100 : 0;

    if (pausePercentage > 30) {
      flags.push({
        type: "pause_artifact",
        severity: pausePercentage > 50 ? "high" : "medium",
        description: `${Math.round(pausePercentage)}% of elapsed time was paused`,
        affectedSeconds: pauseTime
      });
      quality -= Math.min(30, (pausePercentage - 30) * 2);
    }

    return { quality: Math.max(0, quality), flags };
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const dataQualityService = new DataQualityService();

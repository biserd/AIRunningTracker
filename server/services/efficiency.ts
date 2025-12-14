import { storage } from "../storage";

interface EfficiencyMetrics {
  aerobicDecoupling: number | null;
  decouplingLabel: "excellent" | "good" | "moderate" | "concerning" | "unknown";
  paceHrEfficiency: number | null;
  pacingStability: number;
  pacingLabel: "very_stable" | "stable" | "variable" | "erratic";
  cadenceDrift: number | null;
  firstHalfPace: number | null;
  secondHalfPace: number | null;
  firstHalfHr: number | null;
  secondHalfHr: number | null;
  splitVariance: number;
}

interface StreamData {
  time?: number[];
  heartrate?: number[];
  velocity_smooth?: number[];
  distance?: number[];
  altitude?: number[];
  cadence?: number[];
  watts?: number[];
}

export class EfficiencyService {
  calculateEfficiencyMetrics(streams: StreamData, distance: number): EfficiencyMetrics {
    const aerobicData = this.calculateAerobicDecoupling(streams);
    const pacingData = this.analyzePacingStability(streams.velocity_smooth, streams.distance, distance);
    const cadenceDrift = this.calculateCadenceDrift(streams.cadence);

    return {
      aerobicDecoupling: aerobicData.decoupling,
      decouplingLabel: aerobicData.label,
      paceHrEfficiency: aerobicData.efficiency,
      pacingStability: pacingData.stability,
      pacingLabel: pacingData.label,
      cadenceDrift,
      firstHalfPace: aerobicData.firstHalfPace,
      secondHalfPace: aerobicData.secondHalfPace,
      firstHalfHr: aerobicData.firstHalfHr,
      secondHalfHr: aerobicData.secondHalfHr,
      splitVariance: pacingData.variance
    };
  }

  private calculateAerobicDecoupling(streams: StreamData): {
    decoupling: number | null;
    label: "excellent" | "good" | "moderate" | "concerning" | "unknown";
    efficiency: number | null;
    firstHalfPace: number | null;
    secondHalfPace: number | null;
    firstHalfHr: number | null;
    secondHalfHr: number | null;
  } {
    if (!streams.heartrate || !streams.velocity_smooth || 
        streams.heartrate.length < 10 || streams.velocity_smooth.length < 10) {
      return { 
        decoupling: null, 
        label: "unknown", 
        efficiency: null,
        firstHalfPace: null,
        secondHalfPace: null,
        firstHalfHr: null,
        secondHalfHr: null
      };
    }

    const midpoint = Math.floor(streams.heartrate.length / 2);
    
    const firstHalfHr = streams.heartrate.slice(0, midpoint).filter(h => h > 0);
    const secondHalfHr = streams.heartrate.slice(midpoint).filter(h => h > 0);
    const firstHalfVel = streams.velocity_smooth.slice(0, midpoint).filter(v => v > 0);
    const secondHalfVel = streams.velocity_smooth.slice(midpoint).filter(v => v > 0);

    if (firstHalfHr.length < 5 || secondHalfHr.length < 5 ||
        firstHalfVel.length < 5 || secondHalfVel.length < 5) {
      return { 
        decoupling: null, 
        label: "unknown", 
        efficiency: null,
        firstHalfPace: null,
        secondHalfPace: null,
        firstHalfHr: null,
        secondHalfHr: null
      };
    }

    const avgHr1 = this.average(firstHalfHr);
    const avgHr2 = this.average(secondHalfHr);
    const avgVel1 = this.average(firstHalfVel);
    const avgVel2 = this.average(secondHalfVel);

    const pacePerKm1 = avgVel1 > 0 ? 1000 / (avgVel1 * 60) : 0;
    const pacePerKm2 = avgVel2 > 0 ? 1000 / (avgVel2 * 60) : 0;

    const ratio1 = avgHr1 / avgVel1;
    const ratio2 = avgHr2 / avgVel2;
    
    const decoupling = ratio1 > 0 ? ((ratio2 - ratio1) / ratio1) * 100 : null;

    let label: "excellent" | "good" | "moderate" | "concerning" | "unknown" = "unknown";
    if (decoupling !== null) {
      if (decoupling < 3) label = "excellent";
      else if (decoupling < 5) label = "good";
      else if (decoupling < 10) label = "moderate";
      else label = "concerning";
    }

    const efficiency = avgVel1 > 0 && avgHr1 > 0 
      ? Math.round((avgVel1 * 60) / avgHr1 * 1000) / 10
      : null;

    return {
      decoupling: decoupling !== null ? Math.round(decoupling * 10) / 10 : null,
      label,
      efficiency,
      firstHalfPace: pacePerKm1 > 0 ? Math.round(pacePerKm1 * 10) / 10 : null,
      secondHalfPace: pacePerKm2 > 0 ? Math.round(pacePerKm2 * 10) / 10 : null,
      firstHalfHr: Math.round(avgHr1),
      secondHalfHr: Math.round(avgHr2)
    };
  }

  private analyzePacingStability(velocity?: number[], distance?: number[], totalDistance?: number): {
    stability: number;
    label: "very_stable" | "stable" | "variable" | "erratic";
    variance: number;
  } {
    if (!velocity || velocity.length < 10) {
      return { stability: 50, label: "variable", variance: 0 };
    }

    const validVelocities = velocity.filter(v => v > 0);
    if (validVelocities.length < 10) {
      return { stability: 50, label: "variable", variance: 0 };
    }

    const mean = this.average(validVelocities);
    const variance = this.variance(validVelocities, mean);
    const coefficientOfVariation = (Math.sqrt(variance) / mean) * 100;

    let label: "very_stable" | "stable" | "variable" | "erratic";
    let stability: number;

    if (coefficientOfVariation < 5) {
      label = "very_stable";
      stability = 95;
    } else if (coefficientOfVariation < 10) {
      label = "stable";
      stability = 80;
    } else if (coefficientOfVariation < 20) {
      label = "variable";
      stability = 60;
    } else {
      label = "erratic";
      stability = 30;
    }

    return {
      stability,
      label,
      variance: Math.round(coefficientOfVariation * 10) / 10
    };
  }

  private calculateCadenceDrift(cadence?: number[]): number | null {
    if (!cadence || cadence.length < 10) return null;

    const midpoint = Math.floor(cadence.length / 2);
    const firstHalf = cadence.slice(0, midpoint).filter(c => c > 0);
    const secondHalf = cadence.slice(midpoint).filter(c => c > 0);

    if (firstHalf.length < 5 || secondHalf.length < 5) return null;

    const avgFirst = this.average(firstHalf);
    const avgSecond = this.average(secondHalf);

    const drift = ((avgSecond - avgFirst) / avgFirst) * 100;
    return Math.round(drift * 10) / 10;
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  private variance(arr: number[], mean?: number): number {
    if (arr.length === 0) return 0;
    const m = mean ?? this.average(arr);
    return arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / arr.length;
  }
}

export const efficiencyService = new EfficiencyService();

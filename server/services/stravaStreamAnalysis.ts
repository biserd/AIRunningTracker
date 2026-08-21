export interface StreamAnalysis {
  splitLabel: string;
  splitDeltaSec: number;
  decouplingPct: number | null;
  fastestSplitPace: string | null;
  avgCadence: number | null;
  terrainAffected: boolean;
  firstHalfElevationGainM: number | null;
  secondHalfElevationGainM: number | null;
  firstHalfElevationChangeM: number | null;
  secondHalfElevationChangeM: number | null;
  summaryLines: string[];
}

interface TerrainAnalysis {
  firstHalfElevationGainM: number;
  secondHalfElevationGainM: number;
  firstHalfElevationChangeM: number;
  secondHalfElevationChangeM: number;
}

function analyzeTerrain(altitude: number[], splitIdx: number, pointCount: number): TerrainAnalysis | null {
  if (altitude.length !== pointCount || splitIdx <= 0 || splitIdx >= pointCount - 1) return null;
  if (!altitude.every(value => Number.isFinite(value))) return null;

  const segment = (start: number, end: number) => {
    let gain = 0;
    for (let i = start + 1; i <= end; i++) {
      const delta = altitude[i] - altitude[i - 1];
      // Ignore sub-metre GPS/barometric noise when estimating climbing.
      if (delta > 1) gain += delta;
    }
    return { gain, change: altitude[end] - altitude[start] };
  };
  const first = segment(0, splitIdx);
  const second = segment(splitIdx, pointCount - 1);
  return {
    firstHalfElevationGainM: first.gain,
    secondHalfElevationGainM: second.gain,
    firstHalfElevationChangeM: first.change,
    secondHalfElevationChangeM: second.change,
  };
}

// Compute substantive, non-obvious insights from detailed Strava streams.
// key_by_type=true means streams arrive as { distance: { data: [...] }, ... }.
// Everything here is best-effort and must never throw into the email path.
export function analyzeRunStreams(streams: any, isKm: boolean): StreamAnalysis | null {
  try {
    if (!streams) return null;
    const dist: number[] = streams.distance?.data || [];
    const time: number[] = streams.time?.data || [];
    const hr: number[] = streams.heartrate?.data || [];
    const cad: number[] = streams.cadence?.data || [];
    const altitude: number[] = streams.altitude?.data || [];
    const n = dist.length;
    if (n < 20 || time.length !== n) return null;

    const unit = isKm ? "km" : "mi";
    const unitMeters = isKm ? 1000 : 1609.34;
    const summaryLines: string[] = [];

    const totalDist = dist[n - 1] - dist[0];
    const half = dist[0] + totalDist / 2;
    let splitIdx = dist.findIndex(d => d >= half);
    if (splitIdx <= 0 || splitIdx >= n - 1) splitIdx = Math.floor(n / 2);
    const t1 = time[splitIdx] - time[0];
    const d1 = dist[splitIdx] - dist[0];
    const t2 = time[n - 1] - time[splitIdx];
    const d2 = dist[n - 1] - dist[splitIdx];
    const terrain = analyzeTerrain(altitude, splitIdx, n);
    const terrainAffected = terrain !== null &&
      terrain.secondHalfElevationGainM - terrain.firstHalfElevationGainM >= 20 &&
      terrain.secondHalfElevationChangeM >= 15;

    let splitLabel = "Even pacing";
    let splitDeltaSec = 0;
    if (d1 > 0 && d2 > 0 && t1 > 0 && t2 > 0) {
      const pace1 = (t1 / d1) * unitMeters;
      const pace2 = (t2 / d2) * unitMeters;
      splitDeltaSec = Math.round(pace2 - pace1);
      const absS = Math.abs(splitDeltaSec);
      if (splitDeltaSec <= -8) {
        splitLabel = "Negative split (finished faster)";
        summaryLines.push(`Pacing: negative split — the second half was about ${absS}s/${unit} faster than the first. Strong, controlled effort.`);
      } else if (splitDeltaSec >= 8) {
        if (terrainAffected) {
          splitLabel = "Positive split (terrain-affected)";
          summaryLines.push(`Pacing: the second half was about ${absS}s/${unit} slower, but the return was materially more uphill. This is primarily terrain-affected pacing, not evidence by itself of fading or poor fueling.`);
        } else {
          splitLabel = "Positive split (faded late)";
          summaryLines.push(`Pacing: faded about ${absS}s/${unit} in the second half. Likely went out too hot, or fatigue/fueling caught up.`);
        }
      } else {
        splitLabel = "Even pacing";
        summaryLines.push(`Pacing: very even — within ${absS}s/${unit} between the first and second half.`);
      }
    }

    if (terrain) {
      const firstChange = Math.round(terrain.firstHalfElevationChangeM);
      const secondChange = Math.round(terrain.secondHalfElevationChangeM);
      summaryLines.push(
        `Terrain: first half gained ${Math.round(terrain.firstHalfElevationGainM)}m with a ${firstChange >= 0 ? "+" : ""}${firstChange}m net change; second half gained ${Math.round(terrain.secondHalfElevationGainM)}m with a ${secondChange >= 0 ? "+" : ""}${secondChange}m net change.` +
        (terrainAffected ? " The uphill return can explain the slower late pace." : ""),
      );
    }

    let decouplingPct: number | null = null;
    if (hr.length === n && d1 > 0 && d2 > 0 && t1 > 0 && t2 > 0) {
      const avg = (arr: number[], a: number, b: number) => {
        let sum = 0;
        let count = 0;
        for (let i = a; i < b; i++) {
          if (Number.isFinite(arr[i]) && arr[i] > 0) {
            sum += arr[i];
            count++;
          }
        }
        return count ? sum / count : 0;
      };
      const hr1 = avg(hr, 0, splitIdx);
      const hr2 = avg(hr, splitIdx, n);
      const sp1 = d1 / t1;
      const sp2 = d2 / t2;
      if (hr1 > 0 && hr2 > 0) {
        const ratio1 = sp1 / hr1;
        const ratio2 = sp2 / hr2;
        decouplingPct = Math.round(((ratio1 - ratio2) / ratio1) * 1000) / 10;
        if (decouplingPct > 5) {
          summaryLines.push(`Aerobic decoupling: ${decouplingPct}% — heart rate drifted up relative to pace (above the ~5% durability threshold).${terrainAffected ? " Because the second half was materially uphill, terrain may contribute to this drift; do not treat it as standalone proof of poor durability." : " The effort was beyond a comfortable aerobic zone, or aerobic durability is the current limiter."}`);
        } else if (decouplingPct >= 0) {
          summaryLines.push(`Aerobic decoupling: ${decouplingPct}% — well coupled (under 5%). Good aerobic durability; HR held steady against pace.`);
        } else {
          summaryLines.push(`Aerobic decoupling: ${decouplingPct}% — pace-per-heartbeat actually improved late (warmed into it nicely).`);
        }
      }
    }

    let fastestSplitPace: string | null = null;
    if (totalDist >= unitMeters) {
      let best = Infinity;
      let j = 1;
      for (let i = 0; i < n; i++) {
        if (j <= i) j = i + 1;
        const target = dist[i] + unitMeters;
        while (j < n && dist[j] < target) j++;
        if (j >= n) break;
        const dPrev = dist[j - 1];
        const denominator = dist[j] - dPrev;
        const fraction = denominator > 0 ? (target - dPrev) / denominator : 0;
        const timeAtTarget = time[j - 1] + fraction * (time[j] - time[j - 1]);
        const duration = timeAtTarget - time[i];
        if (duration > 0 && duration < best) best = duration;
      }
      if (best !== Infinity) {
        const totalSeconds = Math.round(best);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        fastestSplitPace = `${minutes}:${String(seconds).padStart(2, "0")} /${unit}`;
        summaryLines.push(`Fastest ${unit}: ${fastestSplitPace}.`);
      }
    }

    let avgCadence: number | null = null;
    if (cad.length) {
      const valid = cad.filter(value => Number.isFinite(value) && value > 0);
      if (valid.length) {
        avgCadence = Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 2);
        summaryLines.push(`Average cadence: ${avgCadence} spm.`);
      }
    }

    if (!summaryLines.length) return null;
    return {
      splitLabel,
      splitDeltaSec,
      decouplingPct,
      fastestSplitPace,
      avgCadence,
      terrainAffected,
      firstHalfElevationGainM: terrain?.firstHalfElevationGainM ?? null,
      secondHalfElevationGainM: terrain?.secondHalfElevationGainM ?? null,
      firstHalfElevationChangeM: terrain?.firstHalfElevationChangeM ?? null,
      secondHalfElevationChangeM: terrain?.secondHalfElevationChangeM ?? null,
      summaryLines,
    };
  } catch {
    return null;
  }
}
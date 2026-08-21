import assert from "node:assert/strict";
import test from "node:test";

import { analyzeRunStreams } from "./stravaStreamAnalysis";

const analyze = (streams: any, isKm = true) => analyzeRunStreams(streams, isKm);

function makeStreams(options: {
  secondHalfPaceSeconds?: number;
  firstHalfPaceSeconds?: number;
  altitude?: number[];
  includeAltitude?: boolean;
}) {
  const count = 40;
  const distance = Array.from({ length: count }, (_, i) => i * 250);
  const split = count / 2;
  const firstPace = options.firstHalfPaceSeconds ?? 300;
  const secondPace = options.secondHalfPaceSeconds ?? firstPace;
  const time = distance.map((_, i) =>
    i <= split
      ? i * 250 * firstPace / 1000
      : split * 250 * firstPace / 1000 + (i - split) * 250 * secondPace / 1000,
  );
  const streams: any = {
    distance: { data: distance },
    time: { data: time },
    heartrate: { data: Array(count).fill(140) },
    cadence: { data: Array(count).fill(90) },
  };
  if (options.includeAltitude !== false) {
    streams.altitude = { data: options.altitude ?? Array(count).fill(100) };
  }
  return streams;
}

test("recognizes downhill-out and uphill-back slowdown as terrain affected", () => {
  const altitude = Array.from({ length: 40 }, (_, i) => i < 20 ? 100 - i * 2 : 62 + (i - 20) * 4);
  const result = analyze(makeStreams({ firstHalfPaceSeconds: 300, secondHalfPaceSeconds: 330, altitude }));
  assert.ok(result);
  assert.equal(result.splitLabel, "Positive split (terrain-affected)");
  assert.equal(result.terrainAffected, true);
  assert.match(result.summaryLines.join("\n"), /uphill|terrain-affected/i);
  assert.doesNotMatch(result.summaryLines.join("\n"), /fatigue\/fueling caught up/i);
});

test("still identifies a positive split on a flat route", () => {
  const result = analyze(makeStreams({ firstHalfPaceSeconds: 300, secondHalfPaceSeconds: 330 }));
  assert.ok(result);
  assert.equal(result.splitLabel, "Positive split (faded late)");
  assert.equal(result.terrainAffected, false);
  assert.match(result.summaryLines.join("\n"), /fatigue\/fueling caught up/i);
});

test("does not call a downhill finish a terrain-affected fade", () => {
  const altitude = Array.from({ length: 40 }, (_, i) => i < 20 ? 100 + i * 3 : 157 - (i - 20) * 3);
  const result = analyze(makeStreams({ firstHalfPaceSeconds: 300, secondHalfPaceSeconds: 330, altitude }));
  assert.ok(result);
  assert.equal(result.splitLabel, "Positive split (faded late)");
  assert.equal(result.terrainAffected, false);
});

test("keeps even pacing and handles missing or mismatched elevation cautiously", () => {
  const even = analyze(makeStreams({ firstHalfPaceSeconds: 300, secondHalfPaceSeconds: 303 }));
  assert.ok(even);
  assert.equal(even.splitLabel, "Even pacing");
  assert.equal(even.terrainAffected, false);

  const missing = analyze(makeStreams({ firstHalfPaceSeconds: 300, secondHalfPaceSeconds: 330, includeAltitude: false }));
  assert.ok(missing);
  assert.equal(missing.terrainAffected, false);
  assert.doesNotMatch(missing.summaryLines.join("\n"), /Terrain:/);

  const mismatched = analyze({
    ...makeStreams({ firstHalfPaceSeconds: 300, secondHalfPaceSeconds: 330 }),
    altitude: { data: [100, 101] },
  });
  assert.ok(mismatched);
  assert.equal(mismatched.terrainAffected, false);
  assert.doesNotMatch(mismatched.summaryLines.join("\n"), /Terrain:/);
});
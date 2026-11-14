import assert from "node:assert/strict";
import { test } from "node:test";
import { previewCoachingTip } from "../previewCoachingTip";

const comparison = {
  sampleSize: 3,
  baselinePaceSecondsPerUnit: 600,
  paceDeltaSecondsPerUnit: 10,
  heartRateDelta: 9,
};

test("a marathon-length run prioritizes an easy return over comparing heart rates", () => {
  assert.match(previewCoachingTip({ distanceMeters: 42_567, movingTimeSec: 16_320 }, comparison), /first run back short and conversational/);
});

test("a long outing gets a shorter follow-up even when distance is unavailable", () => {
  assert.match(previewCoachingTip({ movingTimeSec: 5_400 }), /easier and shorter/);
});

test("meaningful heart rate differences at a comparable pace get distinct tips", () => {
  assert.match(previewCoachingTip({}, comparison), /higher than usual at a similar pace/);
  assert.match(previewCoachingTip({}, { ...comparison, heartRateDelta: -6 }), /One run is a useful signal, not a trend/);
});

test("missing data, different paces, and small samples do not trigger heart-rate conclusions", () => {
  for (const baseline of [null, { ...comparison, paceDeltaSecondsPerUnit: 90 }, { ...comparison, sampleSize: 1 }, { ...comparison, heartRateDelta: null }]) {
    assert.match(previewCoachingTip({ distanceMeters: 5_000, movingTimeSec: 1_700 }, baseline), /first 10 minutes/);
  }
});

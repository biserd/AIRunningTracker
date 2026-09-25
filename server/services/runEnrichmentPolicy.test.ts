import assert from "node:assert/strict";
import test from "node:test";
import { runEnrichmentNeeds, runHydrationJobId, runRecapJobId } from "./runEnrichmentPolicy";

test("a webhook run with streams but no laps still needs enrichment", () => {
  assert.deepEqual(runEnrichmentNeeds({ streamsData: '{"time":{}}', lapsData: null }),
    { needsStreams: false, needsLaps: true });
});

test("a Strava no-laps sentinel is complete, not endlessly requeued", () => {
  assert.deepEqual(runEnrichmentNeeds({ streamsData: '{}', lapsData: '{"status":"not_available"}' }),
    { needsStreams: false, needsLaps: false });
});

test("webhook and app requests share one durable job identity per run", () => {
  assert.equal(runHydrationJobId(105, 91191), runHydrationJobId(105, 91191));
  assert.equal(runRecapJobId(105, 91191), runRecapJobId(105, 91191));
  assert.notEqual(runRecapJobId(105, 91191), runRecapJobId(105, 90956));
});

# Coach Insights D1 repair

2026-09-14

## Cause

The latest 50 activities for the affected runner contained 13,616,519 bytes
of sensor/lap/route fields alone. Performance summary calculations loaded
those fields, exceeding the private transport's 8 MB response ceiling.
The batch endpoint caught the exceptions and returned null estimates,
which the page incorrectly presented as insufficient running data.

## Repair

- Performance, ML summary and recovery reads opt into summary-only storage
  projections. Detail endpoints retain their full payloads.
- Batch failures expose only unavailable section identifiers, never raw errors.
- Partial failures are not cached. Coach Insights offers a retry notice.
- No schema change, activity deletion, or response-limit increase.

## Tests

The synthetic D1 application test stores more than 12 MB of hydrated activity
data and verifies populated efficiency and HR-zone responses plus ownership
checks. The complete application smoke test and 32 supporting tests pass.

Application commit: 48bb7f8.

## Production verification

Deployed image 723806def3240eea526d85244d29f704205bce87cc773285f17f23945b6a6d70.
Worker version 0cfb9101-ca1e-4e9a-83c3-8546555c97bb.
Signed-in Coach Insights displays race predictions, HR zones, VO2 estimates
and form signals based on 45 cadence-enabled runs.
Fresh logged requests: efficiency 200 / 190 ms, analytics batch 200 / 184 ms,
recovery 200 / 109 ms. These are smoke observations, not percentile benchmarks.

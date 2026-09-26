# Native mileage chart — 2026-09-26

App change: `7554880`, TestFlight tag `ios-testflight-20260926-mileage-progress` (build 28).

## Experience

- Progress has a native Swift Charts card above Runner Score, styled with the existing orange theme.
- Weekly: up to 12 Monday–Sunday buckets. Monthly: up to six calendar months.
- The selected period shows distance and run count, following the account's miles/km setting.
- Latest period is labeled “so far”; incomplete source coverage is explicitly labeled partial history.
- Existing Progress pull-to-refresh updates the chart. Changing the period does not request another API or invoke AI.

## Source and scope

Uses the existing authenticated `/api/activities/heatmap?range=6m` response already loaded for Activity Calendar. No new endpoint, database migration, provider call, entitlement, or package. Access filtering and the endpoint's existing activity limits remain unchanged.

Aggregation uses the API's UTC day keys, not a second device-timezone interpretation. Fully covered zero-run periods remain zero; missing days are not described as complete coverage. Invalid/non-finite/negative records are skipped; duplicate day keys do not double-count. The pure aggregation model is separate from the view.

## Verification

- iPhone and iPad simulator matrix passed: https://github.com/biserd/AIRunningTracker/actions/runs/36247094738
- Each device passed 44 unit tests and four UI tests. Added six mileage tests covering calendar boundaries, leap months, window sizes, daylight-saving invariance, incomplete coverage, units and malformed/duplicate data.
- UI checks switch weekly/monthly and assert expected totals. iPhone screenshots visually checked. The iPad landscape artifact has the same rotation/cropping defect as the previous build's artifacts, so a complete iPad screenshot review was not possible; its UI assertions passed.
- TestFlight pipeline: https://github.com/biserd/AIRunningTracker/actions/runs/36247201884
- Build 28 signed, encryption declaration checked, and upload completed successfully. Apple processing/tester availability has not been independently verified. No App Store release was submitted.
- Unrelated local voice, research and WhatsApp changes were excluded from this commit/release.

# Native contribution calendar — 2026-09-26

Changes: `b814387`, screenshot-test correction `cb841c6`, and iPad label-width correction `0d4da3c`.

## Behavior

- Replaces the conventional month calendar with GitHub-style week columns and Sunday–Saturday rows. Existing UTC activity dates are preserved.
- Defaults to 12 week columns; a menu exposes the full six-month response. Larger responsive cells use the iPad card width. Narrow windows scroll horizontally, initially showing recent weeks; weekday labels remain fixed.
- Missing and future dates are blank/non-interactive, distinct from valid zero-run days. Month labels and a distance-intensity legend explain the grid.
- Selecting a day reveals native navigation links for each recorded run. Existing summary data is reused where available; older calendar runs open the same detail API by ID, without needing to be in the recent 90-day snapshot.
- Run details now prefer API-formatted pace/duration so older runs do not display invented zero-minute summaries.
- No backend, access-control, database, or production-website changes. Unrelated local changes are excluded.

## Verification / release

- Added unit coverage for Sunday-first ordering, week boundaries, missing weeks, leap dates and blank future cells.
- Added an offline UI test that selects a day, opens its run, and verifies native duration/pace details on iPhone and iPad.
- Screenshot attachments now use `XCUIScreen.main.screenshot()` to avoid the previous application-bounds crop in iPad landscape exports.
- Simulator checks: https://github.com/biserd/AIRunningTracker/actions/runs/36249444929
- TestFlight build 31: https://github.com/biserd/AIRunningTracker/actions/runs/36249445892
- Initial build 29 failed in the screenshot test helper before signing/upload; it was not delivered to testers.
- Build 30 caught incorrect UI test selectors: native LabeledContent exposes combined label/value strings. Its screenshots confirmed that run navigation and metrics worked, but also revealed an expanding weekday-label column. The column is now explicitly 32 points wide and a UI width assertion guards against that regression. Build 30 was not uploaded.
- Build 31 passed its pre-upload simulator checks, signed and uploaded successfully to App Store Connect at 14:51 UTC. No App Store release was submitted; Apple processing/tester availability is not independently verified.
- Final iPhone and iPad matrix checks both passed. Final screenshots were inspected on both devices; iPad now displays all 12 week columns across the card, with a fixed narrow weekday-label column and a linked selected-run row. The UI test verifies the grid width and successfully opens the native run detail screen.

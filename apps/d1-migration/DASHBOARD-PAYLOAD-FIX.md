# Dashboard summary repair, 2026-09-14

The calendar and Runner Score fetched full activity rows, including hydrated GPS,
sensor streams and laps. These reads exceeded the private database transport's
8,000,000-byte response ceiling after the D1 cutover. A read-only aggregate check
on the reported account found 8,555,234 bytes of payloads in six months and
20,892,112 bytes in the latest 500 activities, before response serialization.

`getActivitiesByUserId` now supports an explicit `summaryOnly` projection that
replaces streams, laps and both polylines with SQL NULL before reading from D1.
The calendar, current score and historical score opt in. Existing detail readers,
ownership predicates, date ordering, row limits and free-plan lock filtering are
unchanged. The transport ceiling is unchanged. No migration or data deletion.

Verification:

- Full D1 application bundle builds.
- All 30 D1 unit tests pass.
- Synthetic application smoke test compares calendar (three/six months), current
  score and score history before/after adding over 12 MB of hydration payloads.
  Responses are identical and return HTTP 200.
- Cross-runner score/history reads remain HTTP 403; free calendars omit locked runs.

Application commit: `16435c1`.
Cloudflare build: `a61684bb-1dec-42b5-a1e7-1dae8a866f51`.
Production image: `sha256:441991101b84e4dc1e858458386e48ff6db178ef826ee8ae4d340a261d34e39f`.
Production image deployment: `d05c2d9f-f53b-4327-a888-3753ff1c4e7d`.
Final Worker deployment: `cf7c127e-2fac-4ee2-a72d-148412d722c7`.

After the completed image rollout, the existing container process still served
the old application. The existing one-time runtime restart marker was advanced
only after the new immutable image was confirmed active. Production dashboard
verification after restart showed Runner Score 54/100 with all four components,
and the six-month calendar rendered populated activity cells. Health and public
platform-stat endpoints also returned HTTP 200. Worker type checking passed;
the repository-wide type check still reports unrelated existing storage errors.

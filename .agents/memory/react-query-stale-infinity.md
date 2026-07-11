---
name: React Query staleTime Infinity model
description: App-wide caching model — queries never refetch on their own; implications for onboarding/data-arrival flows
---

The web client sets `staleTime: Infinity` and `refetchOnWindowFocus: false` globally. Any query fetched while data was empty (e.g. during a new user's first Strava sync) will show empty results forever unless something explicitly invalidates it.

**Why:** New-user dashboards appeared "empty until manual refresh" — server logs showed fresh data delivered while the UI stayed blank, because sub-component queries had cached empty responses.

**How to apply:** Whenever server-side data materializes after page load (first sync, background jobs, webhooks), explicitly invalidate affected queries. Surgical key lists are fragile (keys often embed query strings like `?range=3m`); prefer a blanket `invalidateQueries` with a predicate excluding the triggering query. Also: dashboard.tsx once had early returns before hooks (Rules-of-Hooks violation) — a crash-on-transition pattern that looks identical to this symptom; keep all hooks above any conditional return in page components.

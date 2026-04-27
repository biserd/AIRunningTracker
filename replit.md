# RunAnalytics - AI-Powered Running Analytics Platform

## Overview

RunAnalytics is an AI-powered platform designed for runners, integrating with Strava to provide personalized insights, performance tracking, and training recommendations. Key features include a Race Predictor, Form Stability Analyzer, Aerobic Decoupling Calculator, Training Split Analyzer, Marathon Fueling Planner, Running Heatmap, and an AI Running Coach Chat. The platform operates on a freemium model (Free and Premium tiers only — Pro tier has been removed) with the business vision of offering comprehensive, AI-driven running analytics to help runners of all levels improve performance and prevent injuries.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Frontend**: React with TypeScript, styled using Tailwind CSS and shadcn/ui.
- **Visualizations**: Interactive Recharts for trend lines, gauge charts, stacked area, and ternary bar charts.
- **Design**: Intuitive UI with gradient-themed cards and comprehensive user support.
- **Mapping**: Interactive Leaflet maps for visualizing running routes.

### Technical Implementations
- **Backend**: Node.js with Express, PostgreSQL database via Drizzle ORM.
- **Authentication**: JWT-based with bcrypt hashing.
- **Strava Integration**: Two-phase sync architecture (List & Hydrate) for efficiency, with a robust rate limiter and in-memory job queue for activity processing. Per-user sync state tracking for progress and error recovery.
- **AI Engine**: Utilizes OpenAI GPT-5.1 for personalized insights, training plan generation, and conversational AI, incorporating strict JSON schema enforcement and streaming responses.
- **Training Plans**: AI-generated, personalized training plans with athlete profile computation, guardrail validation, plan adaptation based on adherence, and a deterministic skeleton generator.
- **AI Running Coach Chat**: Real-time conversational interface using GPT-5.1 with SSE, providing contextual data analysis and training plan awareness.
- **Activity Analysis**: "Activity Story Mode" for a compact view with Coach Verdict and Run Timeline, and "Deep Dive Mode" for detailed analysis including performance metrics, route maps with key moments, splits analysis, and benchmark comparisons. Includes Effort Score, Training Consistency badges, and AI-detected event pins.
- **Proactive Coaching**: AI Agent Coach (Premium) provides post-activity recaps with personalized feedback, integrating with user-defined goals and preferences.
- **Recovery System**: Time-aware recovery analysis providing dynamic recommendations based on rest days and training load (acute/chronic load, freshness score).
- **Running Shoe Hub**: Database and recommendation system with personalized shoe finder, rotation planning, and AI-generated insights.
- **Year End Recap**: Personalized yearly running summaries with AI-generated infographics for social sharing.
- **Coach Insights Page**: Unified analytics dashboard categorizing performance metrics into "The Engine" (cardiovascular power) and "The Mechanics" (form stability).
- **Marketing & Engagement**: Drip campaign system for user lifecycle email marketing, SEO optimization, and a reverse trial system for new users.
- **SEO & Hybrid SSR/SSG**: 
  - **Homepage SSG**: Static-generated marketing homepage served to crawlers only (Googlebot, Bingbot, etc.) for optimal SEO. Regular users get the SPA for client-side JWT authentication. Content includes hero, AI coach features, Runner Score, pricing, and testimonials. WebApplication + Organization structured data. (1h cache)
  - **Blog SSG**: True static site generation - pre-rendered HTML files served directly from disk with SSR fallback. Full article content with table of contents. BlogPosting schema. (24h cache). **Crawlers only** - regular users get the rich SPA.
  - **Shoe Pages SSG**: True static site generation - pre-rendered HTML files served directly from disk with SSR fallback. Complete specifications with Product schema. (1h cache). **Crawlers only** - regular users get the rich SPA.
  - **Comparison Pages SSR**: Side-by-side comparison tables with WebPage schema. (1h cache)
  - **Renderers**: server/ssr/renderer.ts (renderHomepage, renderBlogPost, etc.), server/ssr/homepageContent.ts, server/ssr/blogContent.ts
  - **Pre-render Script**: scripts/prerender.ts generates static HTML files at build time for homepage, all blog posts, and all shoe pages
  - **Crawler Detection**: Regex pattern matches Googlebot, Bingbot, Yandex, Baidu, DuckDuckBot, Slurp, and social media crawlers
- **Strava Activity Branding**: User-opt-in feature to append customizable branding text to Strava activity descriptions.
- **PWA + Web Push**:
  - Installable PWA with manifest, service worker (cache + push handlers), and 192/512 icons
  - Web push notifications via VAPID (auto-generated and persisted in `system_settings` on first boot, env var override supported)
  - `push_subscriptions` table stores web push endpoints (extensible to native via `platform` column)
  - Endpoints: `/api/push/vapid-public-key`, `/api/push/subscribe`, `/api/push/unsubscribe`, `/api/push/test`
  - Coach Recap flow queues both an email and a push notification (de-duped per activity); notification processor handles `push` channel via `pushService.sendPushToUser()`
  - Settings → Notifications has a per-device push toggle (`PushNotificationToggle`)
  - Native mobile app lives at `apps/mobile/` (Expo SDK 54 + Expo Router + NativeWind). Self-contained sibling project; runs locally via `cd apps/mobile && npm install && npx expo start`. Hits the same `aitracker.run/api/*` backend (no API changes for mobile work). Designed as a minimalist **companion** to the web SaaS — surfaces only what a runner needs at a glance, with deeper analytics one tap away. **5-tab structure**: **Home** (warm greeting + Last Run hero card with inline AI Summary from `/api/coach-recaps` + Readiness/Injury status duo from `/api/performance/recovery` + `/api/ml/injury-risk` + Weekly Debrief whisper from `/api/dashboard` + quiet Runner Score peek), **Coach** (AI Coach Chat with SSE streaming; AI bubbles labeled "RunAnalytics Coach" in brand orange), **Score** (Runner Score hero from `/api/runner-score/:userId` with 4 component progress bars + VO2 Max card from `/api/performance/vo2max/:userId` + 3-cell Training Load grid CTL/ATL/TSB from `/api/performance/fitness/:userId`), **History** (month-grouped run list with brief-ready dot indicator from `/api/activities` + `/api/coach-recaps`), **Profile** (account, Premium subscription status linking to web billing, Strava connection, units segment, push toggle, weekly debrief toggle, Privacy Policy, Sign Out). Tools sub-routes (`/tools/recovery`, `/tools/injury-risk`, `/tools/coach-recaps`, `/tools/notifications`, etc.) remain reachable via deep links from Home cards but are hidden from the tab bar via `href: null`. Activity detail surfaces Coach Verdict, Coach Recap, Efficiency, Data Quality, splits.
  - **Mobile design system (iOS 17+ light theme)**: Tokens live in `apps/mobile/lib/theme.ts` (`colors`, `radii`, `shadow`). Palette: brand `#FC4C02` (+ `brandLight` rgba 0.08), warm bg `#F0EEE9`, white surfaces, hairline `#E8E6E1`, ink `#181715` / ink2 `#5C5B58` / ink3 `#A09F9C`, semantic green `#2A7A1C`, amber `#B85C00`, premium purple `#6C31B0`, red `#C0272D` (each with matching `*Bg` rgba 0.08 variants). Card radius 20, soft shadow (12px blur). Tab icons via `@expo/vector-icons` Ionicons (no `react-native-svg` dependency). Translucent white tab bar over warm bg. Pill tags use colored dot + label inside soft-tint background. Status semantic colors mirror the web design: green = ready/all clear, amber = caution, red = recover/back off, purple = premium-gated.

### System Design Choices
- **Database Schema**: Comprehensive schema covering users, activities, AI insights, training plans, shoes, and more.
- **Deployment**: Replit-optimized development, Vite/ESBuild for production, Neon for PostgreSQL.
- **Performance Analytics**: Includes VO2 Max estimation, HR zone calculations, running efficiency, and training load analysis.
- **Race Predictor Algorithm**: 
  - Uses Riegel formula (T2 = T1 × (D2/D1)^1.06) for predictions
  - Auto-detects races from activities using: name patterns (marathon, half, 5K, 10K, parkrun), pace analysis (top 10-15% fastest efforts), and standard race distance matching
  - Combines Strava's workout_type=1 (marked races) with auto-detected races
  - VDOT-based reference race selection with distance multipliers to prefer longer, more reliable races (Marathon=1.5x, Half=1.3x, 10K=1.15x)
  - 180-day race history window for users who race infrequently
  - Minimum 5K distance filter for Riegel formula predictions

## Stripe Subscription Resolver
The webhook handler (`server/webhookHandlers.ts`) is **price-ID-agnostic** to avoid the test/live mode pitfall that broke billing previously. `resolvePlan(subscription)` decides the plan in this order:
1. `subscription.items[0].price.metadata.plan` (Stripe-native — this is the recommended way to tag prices)
2. Cached fetch of `subscription.items[0].price.product` → `product.metadata.plan`
3. Env-var override: `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_ANNUAL`
4. Status fallback: `active` / `trialing` / `past_due` ⇒ `'premium'` (Premium is the only paid tier; admin email is sent so we notice missing tags)
5. Terminal status (`canceled` / `incomplete_expired` / `unpaid`) ⇒ `'free'`

**Safety rule**: an existing `'premium'` user is never silently downgraded to `'free'` on `customer.subscription.created`/`.updated`. Downgrade only happens on `customer.subscription.deleted` or an explicit terminal status.

**`shouldProcessEvent` accepts owned customers**: any event whose `customer` ID matches a row in `users.stripe_customer_id` is processed regardless of metadata, so Customer-Portal updates and legacy subscriptions still flow through.

**Frontend price IDs are dynamic**: `client/src/pages/pricing.tsx` fetches `/api/stripe/products` and picks the right price by metadata + recurring interval — no hardcoded test-mode IDs. The audit-report checkout endpoint (`/api/stripe/create-audit-checkout`) resolves the live monthly Premium price via `STRIPE_PRICE_PREMIUM_MONTHLY` env var or a metadata lookup against the `stripe.prices` sync table.

**Manual sync after checkout**: `/api/stripe/sync-subscription` (called from `/billing?success=true` and `/audit-report?upgraded=true`) lists the current user's Stripe subscriptions and runs the same resolver. The UI shows Premium immediately even if the webhook is delayed/filtered.

**Backfill script**: `scripts/backfill-stripe-plans.ts` — dry-run by default; pass `--apply` to write. Use after deploys to catch any users stuck on `'free'` despite an active Stripe subscription.

### Optional Stripe env vars
- `STRIPE_PRICE_PREMIUM_MONTHLY` — pin the live monthly Premium price ID (skips the metadata lookup)
- `STRIPE_PRICE_PREMIUM_ANNUAL` — pin the live annual Premium price ID

## External Dependencies

### Core Services
- **Neon Database**: PostgreSQL hosting.
- **OpenAI API**: GPT-5.1 for AI capabilities.
- **Strava API**: Activity data synchronization.
- **Stripe**: Payment processing for subscriptions.
- **SMTP**: For email services (Gmail, Outlook, Yahoo).

### Development Tools & Libraries
- **Drizzle Kit**: Database migrations.
- **TypeScript**: For type safety.
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon system.
- **Recharts**: Data visualization library.
- **React Hook Form**: Form management with Zod validation.
- **Leaflet**: Interactive mapping library.
- **Google Polyline Codec**: Decoding Strava polyline data.
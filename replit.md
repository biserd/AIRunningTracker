# RunAnalytics - AI-Powered Running Analytics Platform

## Overview

RunAnalytics is an AI-powered platform integrating with Strava to provide personalized running insights, performance tracking, and training recommendations. Its core purpose is to help runners improve performance and prevent injuries through features like a Race Predictor, Form Stability Analyzer, Aerobic Decoupling Calculator, Training Split Analyzer, Marathon Fueling Planner, Running Heatmap, and an AI Running Coach Chat. The platform operates on a freemium model, aiming to offer comprehensive, AI-driven analytics to runners of all levels.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Frontend**: React with TypeScript, Tailwind CSS, and shadcn/ui.
- **Visualizations**: Interactive Recharts for various chart types.
- **Design**: Intuitive UI with gradient-themed cards and comprehensive user support.
- **Mapping**: Interactive Leaflet maps for route visualization.
- **Mobile Design**: iOS 17+ light theme for the companion mobile app, featuring a specific color palette, radii, and shadow system, utilizing Ionicons for tab icons.

### Technical Implementations
- **Backend**: Node.js with Express, PostgreSQL via Drizzle ORM.
- **Authentication**: JWT-based with bcrypt hashing.
- **Strava Integration**: Efficient two-phase sync (List & Hydrate) with rate limiting and in-memory job queue, tracking per-user sync state for progress and error recovery.
- **AI Engine**: OpenAI GPT-5.1 for personalized insights, training plan generation, and conversational AI, with JSON schema enforcement and streaming responses.
- **Training Plans**: AI-generated, personalized plans with athlete profile computation, guardrail validation, plan adaptation based on adherence, and a deterministic skeleton generator.
- **AI Running Coach Chat**: Real-time conversational interface using GPT-5.1 with SSE for contextual data analysis and training plan awareness.
- **Activity Analysis**: "Activity Story Mode" for compact summaries (with Coach Verdict and Run Timeline) and "Deep Dive Mode" for detailed metrics, route maps with key moments, splits analysis, and benchmarks, including Effort Score, Training Consistency badges, and AI-detected event pins.
- **Proactive Coaching**: AI Agent Coach (Premium) provides post-activity recaps and feedback, integrating with user-defined goals and preferences.
- **Recovery System**: Time-aware analysis with dynamic recommendations based on training load (acute/chronic load, freshness score).
- **Running Shoe Hub**: Database (282 shoes incl. 60+ confirmed 2026 releases across 13 major brands) with personalized finder, rotation planning, comparison pages, and AI-generated insights (`aiNarrative`, `aiFaq`, `aiResilienceScore`, `aiMileageEstimate`, `aiTargetUsage`). Includes a reusable importer at `scripts/import-latest-shoes.ts` (with `onConflictDoUpdate` and `COALESCE` to preserve photos), a brand-cleanup migration `scripts/normalize-shoe-brands.ts`, and an image backfill workflow (`scripts/backfill-shoe-images.ts`) for product photos. A monthly auto-refresh orchestrator (`scripts/refresh-shoe-database.ts`) chains importer → AI enrichment → image backfill and emails an admin summary via Resend; published as a separate Replit **Scheduled Deployment** (run command `npx tsx scripts/refresh-shoe-database.ts`, recommended cron `0 9 1 * *`). Setup steps in `SHOE_DB_REFRESH.md`.
- **Year End Recap**: Personalized yearly running summaries with AI-generated infographics for social sharing.
- **Coach Insights Page**: Unified dashboard categorizing performance metrics into "The Engine" (cardiovascular power) and "The Mechanics" (form stability).
- **Marketing & Engagement**: Drip campaign system, SEO optimization, and a reverse trial system.
- **SEO & Hybrid SSR/SSG**: 
  - **Homepage SSG**: Static-generated marketing homepage for crawlers (Googlebot, etc.) for optimal SEO. WebApplication + Organization structured data. (1h cache)
  - **Blog SSG**: True static site generation - pre-rendered HTML files with SSR fallback. BlogPosting schema. (24h cache).
  - **Shoe Pages SSG**: True static site generation - pre-rendered HTML files with SSR fallback. Complete specifications with Product schema. (1h cache).
  - **Comparison Pages SSR**: Side-by-side comparison tables with WebPage schema. (1h cache)
  - **Tooling**: Includes `scripts/prerender.ts` for build-time generation and regex-based crawler detection. Regular users always receive the rich React SPA.
- **Strava Activity Branding**: User-opt-in feature for customizable branding text in Strava activity descriptions.
- **PWA + Web Push**:
  - Installable PWA with manifest, service worker (cache + push handlers), and 192/512 icons.
  - Web push notifications via VAPID (persisted in `system_settings`), managed through a `push_subscriptions` table.
  - Integrated with Coach Recap flow to queue both email and push notifications.
  - Settings → Notifications includes a per-device push toggle.
- **Native Mobile App**: Expo-based companion app (`apps/mobile/`) mirroring core web features like Home (Last Run hero, Readiness status), Coach Chat (SSE streaming), Runner Score, History, and Profile. Uses a custom iOS 17+ light theme (tokens in `lib/theme.ts`) with brand orange accents and a minimalist 5-tab structure. Built with Expo SDK 54, Expo Router, and NativeWind.

### System Design Choices
- **Database Schema**: Comprehensive schema for users, activities, AI insights, training plans, shoes, etc.
- **Deployment**: Replit-optimized development, Vite/ESBuild for production, Neon for PostgreSQL.
- **Performance Analytics**: VO2 Max estimation, HR zone calculations, running efficiency, and training load analysis.
- **Race Predictor Algorithm**: Uses Riegel formula, auto-detects races, combines Strava data with auto-detection, and applies VDOT-based reference race selection with distance multipliers.

### Stripe Subscription Resolver
- **Price-ID-Agnostic Webhook Handler**: Resolves subscription plan based on Stripe metadata, cached product metadata, environment variables, or subscription status.
- **Safety Rule**: Prevents silent downgrades of existing premium users.
- **Customer Ownership**: Processes events for owned customers regardless of metadata.
- **Dynamic Frontend Price IDs**: Fetches Stripe products dynamically from the backend.
- **Manual Sync**: Allows immediate UI update after checkout, independent of webhook latency.
- **Backfill Script**: A script to correct user subscription statuses if they are mismatched.

## External Dependencies

### Core Services
- **Neon Database**: PostgreSQL hosting.
- **OpenAI API**: GPT-5.1 for AI capabilities.
- **Strava API**: Activity data synchronization.
- **Stripe**: Payment processing for subscriptions.
- **SMTP**: For email services (e.g., via Resend service).

### Development Tools & Libraries
- **Drizzle Kit**: Database migrations.
- **TypeScript**: For type safety.
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon system.
- **Recharts**: Data visualization library.
- **React Hook Form**: Form management with Zod validation.
- **Leaflet**: Interactive mapping library.
- **Google Polyline Codec**: Decoding Strava polyline data.
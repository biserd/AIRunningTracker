# RunAnalytics - AI-Powered Running Analytics Platform

## Overview

RunAnalytics is an AI-powered platform for runners that integrates with Strava to offer personalized insights, performance tracking, and training recommendations. It features tools like a Race Predictor, Form Stability Analyzer, Aerobic Decoupling Calculator, Training Split Analyzer, Marathon Fueling Planner, Running Heatmap, and an AI Running Coach Chat. The platform operates on a freemium model with Free, Pro, and Premium subscription tiers. The business vision is to provide comprehensive, AI-driven running analytics to a broad market, helping runners of all levels improve performance and prevent injuries.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Build Tool**: Vite
- **UI/UX**: Intuitive design with simplified UI, interactive Recharts visualizations (trend lines, gauge charts, stacked area, ternary bar charts), gradient-themed cards, and comprehensive user support.

### Backend
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based with bcrypt hashing
- **API Integration**: Strava API
- **AI Services**: OpenAI GPT-5.1 for insights, training plans, and conversational AI.

### Technical Implementations
- **Strava Sync**: Optimized batch processing with incremental sync (uses most recent activity start date with `after` parameter). Features a centralized rate limiter and job queue system for controlled API access.
- **Strava Rate Limiter & Queue** (`server/services/stravaClient.ts`, `server/services/queue/`): Global rate limiting tracking X-RateLimit headers, auto-pause at 80/100 threshold, in-memory job queue with 2 concurrent workers, delayed retry with exponential backoff for rate limit errors, and locked token refresh to prevent concurrent refresh failures. Endpoints: `GET /api/strava/queue/status` (admin-only monitoring), `POST /api/strava/queue/sync/:userId` (queue-based sync), `POST /api/strava/queue/repair/:userId` (smart repair: checks sync state to decide list vs hydrate), `GET /api/strava/sync-status` (user sync progress polling).
- **Per-User Sync State Tracking**: Database fields (syncStatus, syncProgress, syncTotal, syncError, lastSyncAt, lastIncrementalSince) enable progress bars, error recovery prompts, and smarter repair decisions. Job queue automatically tracks sync start/completion and updates progress as activities are processed.
- **Queue Observability & Metrics** (`server/services/queue/metrics.ts`): In-memory metrics registry tracking jobs_processed_total by type, jobs_failed_total by type, rate_limit_hits_total, timestamps (lastRateLimitPauseAt, lastJobFailureAt), and recent events log (last 50). Structured JSON logging for rate limit pauses/resumes. Admin-only Queue Dashboard at `/admin/queue` with real-time auto-refresh displaying queue health, rate limiter status, and event history.
- **AI Engine**: Utilizes GPT-5.1 with OpenAI Responses API for enhanced training plan generation and insights, featuring strict JSON schema enforcement, streaming responses, and optimized token limits.
- **Goals & Training Tracking**: Allows conversion of AI recommendations into trackable goals.
- **Free Tools Section**: Dedicated `/tools` section with SEO-optimized calculators and analyzers, supporting Strava auto-fetch or manual entry.
- **Running Shoe Hub**: Comprehensive database and recommendation system with personalized shoe finder, rotation planner, and comparison tool. Includes detailed shoe specifications, AI-generated insights (Resilience Score, estimated lifespan, target usage), and Series Evolution charts.
- **Running Heatmap**: Interactive Leaflet map visualizing recent Strava activities, highlighting frequently used routes.
- **AI Running Coach Chat**: Real-time conversational interface using GPT-5.1 with SSE for streaming responses, providing contextual data analysis.
- **Fitness/Fatigue/Form Chart (CTL/ATL/TSB)**: Dashboard visualization of training load metrics, with detailed explanations and time range selection.
- **SEO & Content Marketing**: Blog system, dedicated landing pages, and SEO-optimized content with JSON-LD schemas and meta tags.
- **Mobile Authentication**: JWT-based authentication for native mobile apps, including refresh tokens and session management.
- **Stripe Subscription System**: Full freemium model management with Stripe for payments, checkout sessions, and customer portal integration.
- **Reverse Trial System**: 7-day Pro access for new users without credit card. Automatically downgrades to Free tier after trial. Includes trial badge UI component, email notifications (welcome, day 5 reminder, expiry CTA), and admin endpoints for email processing.
- **Strava Activity Branding**: Feature to append customizable branding text to Strava activity descriptions post-sync, with user opt-in and template support.
- **Year End Recap**: Personalized yearly running summary with AI-generated infographics using Nano Banana (Gemini 2.5 Flash Image). Features comprehensive stats including total distance/time/elevation, longest run, fastest pace, longest streak, plus advanced metrics: estimated VO2 Max (Jack Daniels formula), average cadence, Zone 2 training hours, heart rate data, and training distribution (easy/moderate/hard). Generates epic, Nike/Adidas-style infographic images with bold typography and dramatic visuals for social sharing.

### System Design Choices
- **Database Schema**: Users, Activities, AI Insights, Training Plans, Email Waitlist, AI Conversations, AI Messages, Running Shoes, Refresh Tokens.
- **Authentication**: JWT token-based, secure password hashing, protected routes, admin roles.
- **Strava Integration**: OAuth, periodic activity fetching, real-time data, automatic refresh token management. Syncs all activity types, filtering for running-specific metrics where applicable.
- **AI Analytics Engine**: OpenAI GPT-5.1 integration for performance insights, ML-powered race predictions, injury risk analysis, personalized training plans, Runner Score, conversational coaching, and gear recommendations.
- **Performance Analytics**: VO2 Max estimation, heart rate zone calculations, running efficiency, training load analysis, progress tracking.
- **Deployment Strategy**: Replit-optimized development, Vite/ESBuild for production, Neon for PostgreSQL, request logging, error tracking, and performance monitoring.

## External Dependencies

### Core Services
- **Neon Database**: PostgreSQL hosting
- **OpenAI API**: GPT-5
- **Strava API**: Activity data synchronization
- **Stripe**: Payment processing
- **SMTP (Gmail, Outlook, Yahoo)**: Email services

### Development Tools
- **Drizzle Kit**: Database migrations
- **TypeScript**: Type safety

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon system
- **Recharts**: Data visualization
- **React Hook Form**: Form management with Zod validation
- **Leaflet**: Interactive mapping
- **Google Polyline Codec**: Decoding Strava polyline data
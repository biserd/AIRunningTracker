# RunAnalytics - AI-Powered Running Analytics Platform

## Overview

RunAnalytics is an AI-powered platform designed for runners, integrating with Strava to provide personalized insights, performance tracking, and training recommendations. Key features include a Race Predictor, Form Stability Analyzer, Aerobic Decoupling Calculator, Training Split Analyzer, Marathon Fueling Planner, Running Heatmap, and an AI Running Coach Chat. The platform operates on a freemium model (Free, Pro, Premium tiers) with the business vision of offering comprehensive, AI-driven running analytics to help runners of all levels improve performance and prevent injuries.

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

### System Design Choices
- **Database Schema**: Comprehensive schema covering users, activities, AI insights, training plans, shoes, and more.
- **Deployment**: Replit-optimized development, Vite/ESBuild for production, Neon for PostgreSQL.
- **Performance Analytics**: Includes VO2 Max estimation, HR zone calculations, running efficiency, and training load analysis.

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
# RunAnalytics - AI-Powered Running Analytics Platform

## Overview

RunAnalytics is a comprehensive running analytics platform that integrates with Strava to provide AI-powered insights, performance tracking, and training recommendations for runners. The application combines real-time activity data with machine learning algorithms to deliver personalized running analytics and coaching. The platform offers advanced features like a Race Predictor, Form Stability Analyzer, Aerobic Decoupling Calculator, Training Split Analyzer, Marathon Fueling Planner, Running Heatmap, and AI Running Coach Chat, all accessible for free. Its business vision is to provide all users with Pro-tier features, focusing on SEO optimization, mobile optimization, and an improved onboarding experience to maximize user acquisition.

**Current Version**: 2.7.5 (Released November 16, 2025)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based with bcrypt password hashing
- **API Integration**: Strava API for activity synchronization
- **AI Services**: OpenAI GPT-5.1 for insights, training plan generation, and conversational chat

### UI/UX Decisions
- Intuitive and simplified UI, for example, single "Action" button for detailed rationale modals.
- Interactive visualizations using Recharts for data like trend lines, gauge charts, stacked area charts, and ternary bar charts.
- Gradient-themed cards for tools and features.
- Comprehensive FAQ, Release Notes, and Contact Support for user assistance.

### Technical Implementations
- **Strava Sync**: Optimized for 5x faster dashboard sync using batch processing with `Promise.all()` and real-time progress indicators via Server-Sent Events (SSE) with cryptographic nonces for security.
- **AI Engine**: Upgraded to GPT-5.1 with OpenAI Responses API for enhanced training plan generation and improved AI insights. Uses optimized reasoning configuration (no reasoning parameter for insights, low effort for training plans) achieving 5.8 second AI insights generation (20% faster) and 19.9 second training plans (27% faster). Features strict JSON schema enforcement via text.format parameter, streaming with response.output_text.delta events, and optimized token limits (1000 for insights, 1500 for training plans). Provides fixed pace calculations and better context with comprehensive fitness data.
- **Goals & Training Tracking**: Allows conversion of AI recommendations into trackable, actionable goals with progress monitoring, auto-completion, and smart criteria based on activity types.
- **Free Tools Section**: Dedicated `/tools` section with SEO-optimized calculators and analyzers (Aerobic Decoupling, Training Split, Marathon Fueling, Race Predictor, Cadence Analyzer, Running Heatmap) accessible to all users with dual-mode input (Strava auto-fetch or manual entry).
- **Running Heatmap**: Interactive route visualization tool at `/tools/heatmap` that displays the last 30 activities on a single Leaflet map with semi-transparent blue overlays (60% opacity). Overlapping routes create brighter hotspots showing frequently-used training areas. Features smart zoom optimization that focuses on the 10 most recent routes while displaying all 30, auth protection, interactive route popups with activity details, and uses Strava polyline data with automatic fallback to detailed polylines.
- **AI Running Coach Chat**: Real-time conversational chat interface accessible from the dashboard via a floating button. Enables on-demand, contextual analysis of running data through natural language conversations. Uses GPT-5.1 with low reasoning effort for fast responses (typically 10-20 seconds), Server-Sent Events (SSE) for streaming responses character-by-character, and assembles comprehensive user context including recent activities, VO2 Max, Runner Score, and race predictions. Features example prompts for quick starts, conversation persistence across sessions, and mobile-responsive slide-out panel design.
- **SEO & Content Marketing Infrastructure**: Comprehensive organic traffic strategy with blog system at `/blog`, dedicated `/ai-running-coach` landing page, and SEO-optimized content targeting high-value keywords (3,600-9,900 searches/month). Features FAQ schemas (JSON-LD) on all 6 calculator pages for Google rich snippets, keyword-optimized titles/meta descriptions, canonical URLs, Open Graph/Twitter Card tags for social sharing, and strategic internal linking between blog posts and tools. Blog navigation integrated into AppHeader and Footer. **Note**: Current implementation uses client-side SEO (JavaScript-injected meta tags via useEffect). For production deployment, consider implementing server-side rendering (SSR), static site generation (SSG), or pre-rendering to ensure search engine crawlers receive SEO meta tags in initial HTML response.

### System Design Choices
- **Database Schema**: Users, Activities, AI Insights, Training Plans, Email Waitlist, AI Conversations, AI Messages.
- **Authentication**: JWT token-based, secure password hashing, protected routes, admin roles.
- **Strava Integration**: OAuth, periodic activity fetching, real-time data, automatic refresh token management. Syncs ALL activity types (running, cross-training, cycling, etc.) but filters to running types (`Run`, `TrailRun`, `VirtualRun`) for running-specific metrics (VO2 max, Runner Score, race predictions, pace analysis). Training load and injury risk analysis use all activities for holistic assessment.
- **AI Analytics Engine**: OpenAI GPT-5.1 integration for performance insights, ML-powered race predictions, injury risk analysis, personalized training plans, Runner Score calculation, and conversational coaching chat. Uses unified AI pipeline with conditional prompts: runners receive pace/form analysis, cross-training-only users receive "running readiness" guidance based on their fitness foundation. All users get the same five insight types plus three recommendations through the AI pipeline.
- **Performance Analytics**: VO2 Max estimation, heart rate zone calculations, running efficiency, training load analysis, progress tracking.
- **Version Management**: Centralized version configuration, structured changelog, dedicated release notes page, and automated tracking of changes.
- **Deployment Strategy**: Replit-optimized development, Vite/ESBuild for production, Neon for PostgreSQL, request logging, error tracking, and performance monitoring.

## External Dependencies

### Core Services
- **Neon Database**: PostgreSQL hosting
- **OpenAI API**: GPT-5
- **Strava API**: Activity data synchronization
- **Email Services**: SMTP (Gmail, Outlook, Yahoo)

### Development Tools
- **Drizzle Kit**: Database migrations
- **TypeScript**: Type safety
- **ESBuild**: Production bundling
- **Replit Integration**: Development environment

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon system
- **Recharts**: Data visualization
- **React Hook Form**: Form management with Zod validation
- **Leaflet**: Interactive mapping for route visualization
- **Google Polyline Codec**: Decoding Strava polyline data for map rendering
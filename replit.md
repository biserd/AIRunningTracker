# RunAnalytics - AI-Powered Running Analytics Platform

## Overview

RunAnalytics is a comprehensive running analytics platform that integrates with Strava to provide AI-powered insights, performance tracking, and training recommendations for runners. The application combines real-time activity data with machine learning algorithms to deliver personalized running analytics and coaching. The platform offers advanced features like a Race Predictor, Form Stability Analyzer, Aerobic Decoupling Calculator, Training Split Analyzer, and Marathon Fueling Planner, all accessible for free. Its business vision is to provide all users with Pro-tier features, focusing on SEO optimization, mobile optimization, and an improved onboarding experience to maximize user acquisition.

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
- **AI Services**: OpenAI GPT-5 for insights and training plan generation

### UI/UX Decisions
- Intuitive and simplified UI, for example, single "Action" button for detailed rationale modals.
- Interactive visualizations using Recharts for data like trend lines, gauge charts, stacked area charts, and ternary bar charts.
- Gradient-themed cards for tools and features.
- Comprehensive FAQ, Release Notes, and Contact Support for user assistance.

### Technical Implementations
- **Strava Sync**: Optimized for 5x faster dashboard sync using batch processing with `Promise.all()` and real-time progress indicators via Server-Sent Events (SSE) with cryptographic nonces for security.
- **AI Engine**: Upgraded to GPT-5 for enhanced training plan generation, improved AI insights, fixed pace calculations, and better context with comprehensive fitness data.
- **Goals & Training Tracking**: Allows conversion of AI recommendations into trackable, actionable goals with progress monitoring, auto-completion, and smart criteria based on activity types.
- **Free Tools Section**: Dedicated `/tools` section with SEO-optimized calculators and analyzers (Aerobic Decoupling, Training Split, Marathon Fueling) accessible to all users with dual-mode input (Strava auto-fetch or manual entry).

### System Design Choices
- **Database Schema**: Users, Activities, AI Insights, Training Plans, Email Waitlist.
- **Authentication**: JWT token-based, secure password hashing, protected routes, admin roles.
- **Strava Integration**: OAuth, periodic activity fetching, real-time data, automatic refresh token management.
- **AI Analytics Engine**: OpenAI integration for performance insights, ML-powered race predictions, injury risk analysis, personalized training plans, and Runner Score calculation.
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
# RunAnalytics - AI-Powered Running Analytics Platform

## Overview

RunAnalytics is a comprehensive running analytics platform that integrates with Strava to provide AI-powered insights, performance tracking, and training recommendations for runners. The application combines real-time activity data with machine learning algorithms to deliver personalized running analytics and coaching.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 2025)

- **Marketing Campaign Launch Preparation (Oct 18)**: Comprehensive optimization for marketing campaign launch including:
  - **SEO Enhancement**: Added comprehensive meta tags, Open Graph tags, Twitter cards, and JSON-LD structured data (WebApplication + Organization schemas) for improved search visibility and social sharing
  - **Mobile Optimization**: Optimized all touch targets to 44px minimum, responsive text scaling, full mobile responsiveness across all pages
  - **Landing Page CTA Optimization**: Enhanced primary CTAs with larger sizes, social proof ("Join 10,000+ runners"), trust indicators ("Free forever", "No credit card required"), and improved conversion funnel
  - **Onboarding Flow**: Created 4-step welcome modal (Welcome, Strava Connection, Runner Score, AI Insights) with progress tracking and localStorage persistence, plus dashboard progress checklist for new user guidance
  - **Welcome Email System**: Automated welcome emails for new users and admin notifications to hello@bigappledigital.nyc
- **Version 2.3.0 Release (Sep 28)**: Full Strava API Agreement compliance with enhanced privacy protections, official branding implementation, security procedures documentation, and subscription model transparency ensuring all Strava developer requirements are met.
- **Version 2.2.0 Release (Sep 28)**: Enhanced subscription system with promotion code support for friend testing and user acquisition, including test codes TESTFREE1, HALFPRICE, and FIRSTFREE for flexible discount options.
- **Version 2.1.0 Release (Sep 28)**: SaaS platform transformation with subscription billing, Free tier (30 days data) and Pro tier ($9.99/month) with advanced AI insights and unlimited history.
- **Version 2.0.0 Release (Sep 13)**: Major platform transformation with 9 comprehensive enhancements including advanced analytics, admin dashboard with user monitoring and performance tracking, detailed splits analysis, historical Runner Score tracking, and enhanced AI insights with actionable recommendations.

## Version Management

### Current Version: 2.3.0

The application now includes a comprehensive versioning system to track features, improvements, and fixes across releases:

- **Version Configuration**: Centralized version management in `shared/version.ts`
- **Release Notes**: Structured changelog with categorized changes (features, fixes, improvements, breaking changes)
- **Version Display**: Application version shown in landing page footer and release notes page
- **Release Notes Page**: Dedicated page at `/release-notes` for viewing version history
- **Automated Tracking**: Each release includes detailed descriptions and categorized change lists

### Release Process

When adding new features or making changes:
1. Update the `VERSION` constant in `shared/version.ts`
2. Add a new entry to `RELEASE_NOTES` array with:
   - Version number and release date
   - Descriptive title and summary
   - Categorized list of changes (feature, fix, improvement, breaking)
3. Document significant changes in this file's "Recent Changes" section

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with custom configuration for Replit environment

### Backend Architecture
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based with bcrypt password hashing
- **API Integration**: Strava API for activity synchronization
- **AI Services**: OpenAI GPT-4o for insights generation

## Key Components

### Database Schema
The application uses a PostgreSQL database with the following main entities:
- **Users**: Authentication, Strava integration, preferences
- **Activities**: Running data synchronized from Strava
- **AI Insights**: Generated performance analysis and recommendations
- **Training Plans**: ML-generated personalized training schedules
- **Email Waitlist**: Pre-launch email collection

### Authentication System
- JWT token-based authentication
- Secure password hashing with bcrypt
- Protected routes with middleware
- Admin role system for management access

### Strava Integration
- OAuth flow for user authentication
- Activity synchronization with real-time data
- Support for comprehensive running metrics (pace, heart rate, elevation, etc.)
- Automatic refresh token management

### AI Analytics Engine
- OpenAI integration for performance insights
- ML-powered race time predictions
- Injury risk analysis
- Personalized training plan generation
- Runner score calculation system

### Performance Analytics
- VO2 Max estimation using Jack Daniels' formula
- Heart rate zone calculations
- Running efficiency metrics
- Training load analysis
- Progress tracking and trends

### User Support & Documentation
- **FAQ Page**: Comprehensive frequently asked questions covering platform features, data handling, training insights, and user support
- **Release Notes**: Version history with detailed changelog showing new features, bug fixes, and improvements
- **Contact Support**: Direct communication channel for user assistance and feature requests
- **Privacy & Security**: Detailed privacy policy and data protection information

## Data Flow

1. **User Registration/Authentication**
   - User signs up with email/password
   - JWT token issued for session management
   - Optional Strava connection for data import

2. **Activity Synchronization**
   - Strava OAuth integration
   - Periodic activity fetching
   - Data normalization and storage
   - Real-time updates on dashboard

3. **AI Analysis Pipeline**
   - Activity data processing
   - OpenAI API integration for insights
   - Performance metric calculations
   - Recommendation generation

4. **Dashboard Presentation**
   - Real-time data visualization
   - Interactive charts and metrics
   - Personalized insights display
   - Goal tracking and progress

## External Dependencies

### Core Services
- **Neon Database**: PostgreSQL hosting with serverless architecture
- **OpenAI API**: GPT-4o for AI-powered insights
- **Strava API**: Activity data synchronization
- **Email Services**: Multiple SMTP options (Gmail, Outlook, Yahoo)

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Production bundling
- **Replit Integration**: Development environment optimization

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon system
- **Recharts**: Data visualization
- **React Hook Form**: Form management with Zod validation

## Deployment Strategy

### Development Environment
- Replit-optimized configuration
- Hot module replacement with Vite
- Development-specific middleware and plugins
- Environment variable management

### Production Build
- Vite build for optimized client bundle
- ESBuild for server-side compilation
- Static asset serving with Express
- HTTPS enforcement and security headers

### Database Management
- Drizzle migrations for schema changes
- Connection pooling with Neon serverless
- Environment-based configuration
- Backup and recovery through Neon platform

### Monitoring and Analytics
- Request logging middleware
- Error tracking and reporting
- Performance monitoring
- User activity analytics

The application is designed to scale efficiently while maintaining a focus on user experience and data accuracy. The modular architecture allows for easy feature additions and maintenance while ensuring robust performance analytics for runners of all levels.
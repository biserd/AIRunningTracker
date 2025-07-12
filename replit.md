# RunAnalytics - AI-Powered Running Analytics Platform

## Overview

RunAnalytics is a comprehensive running analytics platform that integrates with Strava to provide AI-powered insights, performance tracking, and training recommendations for runners. The application combines real-time activity data with machine learning algorithms to deliver personalized running analytics and coaching.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)

- **Landing Page Updates (Jan 12)**: Removed "Coming Soon" elements and waitlist functionality. Users can now register and login directly through "Get Started Free" and "Sign In" buttons.
- **Dashboard Fix (Jan 12)**: Fixed misleading percentage calculations that showed "-100% vs last month" when insufficient previous data existed. Now shows "No previous data" or meaningful percentages only.
- **Fitness Trends Fix (Jan 12)**: Corrected "Weekly Volume" metric that was incorrectly summing individual activities. Changed to "Avg Distance/Run" for more accurate representation.

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
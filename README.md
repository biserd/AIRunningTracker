# RunAnalytics - AI-Powered Running Analytics Platform

<div align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-orange.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/React-18.x-blue.svg" alt="React 18.x">
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue.svg" alt="TypeScript 5.x">
  <img src="https://img.shields.io/badge/Node.js-20.x-green.svg" alt="Node.js 20.x">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License">
</div>

## 🏃‍♂️ Overview

RunAnalytics is a comprehensive running analytics platform that integrates with Strava to provide AI-powered insights, performance tracking, and training recommendations for runners. The application combines real-time activity data with machine learning algorithms to deliver personalized running analytics and coaching.

## ✨ Key Features

### 🚀 Version 2.0.0 - Latest Release
- **Enhanced Quick Stats** with comparison arrows and trend indicators
- **Performance Chart Time Filters** (7 days, 3 months, 6 months, 1 year)
- **AI Insights Categories** (Performance, Training, Health, Goals, Motivation)
- **Insight History Timeline** with progressive tracking
- **Actionable Recommendations** with implementation guidance
- **Historical Runner Score** tracking with trend charts
- **Detailed Splits Analysis** with table, chart, and analysis views
- **Admin Dashboard** with user analytics and performance monitoring
- **Real-time System Monitoring** with 30-second refresh intervals

### 🧠 AI-Powered Analytics
- **Runner Score System** - Comprehensive performance rating with radar visualization
- **VO2 Max Estimation** - Using Jack Daniels' proven formula
- **Race Time Predictions** - ML-powered performance forecasting
- **Injury Risk Analysis** - Proactive health monitoring
- **Personalized Training Plans** - AI-generated coaching recommendations

### 📊 Advanced Performance Tracking
- **Strava Integration** - Seamless activity synchronization
- **Heart Rate Zone Analysis** - Detailed cardiovascular insights
- **Running Efficiency Metrics** - Comprehensive performance analysis
- **Training Load Monitoring** - Optimal workload management
- **Progress Visualization** - Interactive charts and trends

### 🛡️ Enterprise-Grade Admin Tools
- **User Analytics Dashboard** - DAU/WAU/MAU tracking and growth metrics
- **System Performance Monitoring** - Real-time health metrics and API monitoring
- **Error Tracking** - Comprehensive system health monitoring
- **Database Performance** - Query optimization and connection monitoring

## 🏗️ Technical Architecture

### Frontend Stack
- **React 18** with TypeScript for type-safe development
- **Tailwind CSS** with shadcn/ui components for modern styling
- **TanStack Query** for efficient server state management
- **Wouter** for lightweight client-side routing
- **Vite** for optimized build performance

### Backend Infrastructure
- **Node.js** with Express for robust API services
- **PostgreSQL** with Drizzle ORM for type-safe database operations
- **JWT Authentication** with bcrypt for secure user management
- **OpenAI Integration** for AI-powered insights generation

### Development & Deployment
- **TypeScript** throughout the entire stack
- **ESBuild** for production optimization
- **Neon Database** for serverless PostgreSQL hosting
- **Replit** for seamless development and deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL database
- OpenAI API key (for AI features)
- Strava API credentials (for activity sync)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/runanalytics.git
   cd runanalytics
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 📋 Environment Variables

```env
# Database
DATABASE_URL=your_postgresql_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key

# OpenAI (for AI insights)
OPENAI_API_KEY=your_openai_api_key

# Strava Integration
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret

# Email (optional)
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm run test         # Run test suite
```

### Project Structure

```
runanalytics/
├── client/           # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utility functions
│   │   └── hooks/       # Custom React hooks
├── server/           # Backend Node.js application
│   ├── routes/       # API route handlers
│   ├── middleware/   # Express middleware
│   └── storage/      # Database layer
├── shared/           # Shared types and utilities
└── docs/            # Documentation
```

## 📊 Features Deep Dive

### AI Insights System
The platform analyzes your running data across five comprehensive categories:
- **Performance Analysis** - Speed, endurance, and efficiency metrics
- **Training Recommendations** - Personalized workout suggestions
- **Health Monitoring** - Injury prevention and recovery insights
- **Goal Achievement** - Progress tracking and milestone planning
- **Motivation Support** - Encouragement and achievement recognition

### Admin Dashboard
Comprehensive platform management with:
- **User Analytics** - Registration trends, activity levels, engagement metrics
- **System Performance** - API response times, error rates, database health
- **Real-time Monitoring** - Live system status with automatic refresh
- **Error Tracking** - Detailed error logs with context and timestamps

### Runner Score Algorithm
Our proprietary scoring system evaluates:
- **Consistency** - Regular training patterns
- **Improvement** - Performance progression over time
- **Volume** - Training load and distance metrics
- **Intensity** - Heart rate and pace analysis
- **Recovery** - Rest day patterns and load management

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [runanalytics.replit.app](https://runanalytics.replit.app)
- **Documentation**: [docs.runanalytics.com](https://docs.runanalytics.com)
- **Support**: [support@runanalytics.com](mailto:support@runanalytics.com)
- **Strava Integration**: [Connect your Strava account](https://www.strava.com/oauth/authorize)

## 🏆 Achievements

- ⭐ **2.0.0 Release** - Major platform transformation with 9 comprehensive enhancements
- 🚀 **Enterprise-Grade** - Admin dashboard with real-time monitoring
- 🧠 **AI-Powered** - Comprehensive insights across 5 categories
- 📊 **Advanced Analytics** - Detailed performance tracking and historical analysis
- 🛡️ **Production-Ready** - Secure, scalable, and professionally architected

---

<div align="center">
  Made with ❤️ for the running community
  <br>
  <strong>RunAnalytics - Where Data Meets Performance</strong>
</div>
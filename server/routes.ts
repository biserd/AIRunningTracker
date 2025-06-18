import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { stravaService } from "./services/strava";
import { aiService } from "./services/ai";
import { mlService } from "./services/ml";
import { performanceService } from "./services/performance";
import { authService } from "./services/auth";
import { insertUserSchema, loginSchema, registerSchema, insertEmailWaitlistSchema } from "@shared/schema";
import { z } from "zod";

// Authentication middleware
const authenticateJWT = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const user = await authService.verifyToken(token);
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      const result = await authService.register(userData);
      res.json(result);
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ message: error.message || "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      const result = await authService.login(loginData);
      res.json(result);
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(400).json({ message: error.message || "Failed to login" });
    }
  });

  app.get("/api/auth/user", authenticateJWT, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Email waitlist endpoint
  app.post("/api/waitlist", async (req, res) => {
    try {
      const { email } = insertEmailWaitlistSchema.parse(req.body);
      await authService.addToWaitlist(email);
      res.json({ message: "Successfully added to waitlist" });
    } catch (error: any) {
      console.error('Waitlist error:', error);
      if (error.message?.includes('duplicate key')) {
        res.status(400).json({ message: "Email already on waitlist" });
      } else {
        res.status(500).json({ message: "Failed to add email to waitlist" });
      }
    }
  });

  // Strava OAuth
  app.post("/api/strava/connect", authenticateJWT, async (req: any, res) => {
    try {
      const { code, userId } = req.body;
      
      if (!code || !userId) {
        return res.status(400).json({ message: "Code and userId are required" });
      }

      const tokenData = await stravaService.exchangeCodeForTokens(code);
      
      await storage.updateUser(userId, {
        stravaAccessToken: tokenData.access_token,
        stravaRefreshToken: tokenData.refresh_token,
        stravaAthleteId: tokenData.athlete.id.toString(),
        stravaConnected: true,
      });

      // Auto-sync activities after connecting
      try {
        await stravaService.syncActivitiesForUser(userId);
      } catch (syncError) {
        console.error('Auto-sync failed after Strava connection:', syncError);
        // Don't fail the connection if sync fails
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Strava connection error:', error);
      res.status(500).json({ message: "Failed to connect to Strava" });
    }
  });

  // Sync activities from Strava
  app.post("/api/strava/sync/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      await stravaService.syncActivitiesForUser(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Sync error:', error);
      res.status(500).json({ message: error.message || "Failed to sync activities" });
    }
  });

  // Get user dashboard data
  app.get("/api/dashboard/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const activities = await storage.getActivitiesByUserId(userId, 10);
      const insights = await storage.getAIInsightsByUserId(userId);
      
      // Calculate quick stats
      const thisMonth = new Date();
      thisMonth.setDate(1);
      
      const monthlyActivities = activities.filter(a => 
        new Date(a.startDate) >= thisMonth
      );
      
      const totalDistance = monthlyActivities.reduce((sum, a) => sum + a.distance, 0);
      const totalTime = monthlyActivities.reduce((sum, a) => sum + a.movingTime, 0);
      const avgPace = totalDistance > 0 ? (totalTime / 60) / (totalDistance / 1000) : 0;
      
      const dashboardData = {
        user: {
          name: user.username,
          stravaConnected: user.stravaConnected,
          unitPreference: user.unitPreference || "km",
          lastSyncAt: user.lastSyncAt,
        },
        stats: {
          totalDistance: user.unitPreference === "miles" ? 
            ((totalDistance / 1000) * 0.621371).toFixed(1) : 
            (totalDistance / 1000).toFixed(1),
          avgPace: avgPace > 0 ? (() => {
            const paceToShow = user.unitPreference === "miles" ? avgPace / 0.621371 : avgPace;
            return `${Math.floor(paceToShow)}:${String(Math.round((paceToShow % 1) * 60)).padStart(2, '0')}`;
          })() : "0:00",
          trainingLoad: monthlyActivities.length * 85, // Simple calculation
          recovery: "Good", // Placeholder
          unitPreference: user.unitPreference || "km",
        },
        activities: activities.map(activity => ({
          id: activity.id,
          name: activity.name,
          distance: user.unitPreference === "miles" ? 
            ((activity.distance / 1000) * 0.621371).toFixed(1) : 
            (activity.distance / 1000).toFixed(1),
          pace: activity.distance > 0 ? (() => {
            const distanceInKm = activity.distance / 1000;
            const pacePerKm = (activity.movingTime / 60) / distanceInKm;
            const paceToShow = user.unitPreference === "miles" ? pacePerKm / 0.621371 : pacePerKm;
            return `${Math.floor(paceToShow)}:${String(Math.round((paceToShow % 1) * 60)).padStart(2, '0')}`;
          })() : "0:00",
          duration: `${Math.floor(activity.movingTime / 60)}:${String(activity.movingTime % 60).padStart(2, '0')}`,
          elevation: `+${Math.round(activity.totalElevationGain)}m`,
          date: new Date(activity.startDate).toLocaleDateString(),
          startDate: activity.startDate,
        })),
        insights: {
          performance: insights.find(i => i.type === 'performance'),
          pattern: insights.find(i => i.type === 'pattern'),
          recovery: insights.find(i => i.type === 'recovery'),
          recommendations: insights.filter(i => i.type === 'recommendation'),
        },
        chartData: activities.slice(0, 6).reverse().map((activity, index) => {
          const distanceInKm = activity.distance / 1000;
          const distanceConverted = user.unitPreference === "miles" ? distanceInKm * 0.621371 : distanceInKm;
          const pacePerKm = activity.distance > 0 ? (activity.movingTime / 60) / distanceInKm : 0;
          const paceConverted = user.unitPreference === "miles" ? pacePerKm / 0.621371 : pacePerKm;
          
          return {
            week: `Week ${index + 1}`,
            pace: paceConverted,
            distance: distanceConverted,
          };
        }),
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Get chart data with time range
  app.get("/api/chart/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const timeRange = req.query.range as string || "30days";
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      let activityLimit = 6;

      switch (timeRange) {
        case "3months":
          startDate.setMonth(now.getMonth() - 3);
          activityLimit = 12;
          break;
        case "year":
          startDate.setFullYear(now.getFullYear() - 1);
          activityLimit = 24;
          break;
        default: // 30days
          startDate.setDate(now.getDate() - 30);
          activityLimit = 6;
      }

      const activities = await storage.getActivitiesByUserId(userId, activityLimit);
      const filteredActivities = activities.filter(a => new Date(a.startDate) >= startDate);

      const chartData = filteredActivities.reverse().map((activity, index) => {
        const distanceInKm = activity.distance / 1000;
        const distanceConverted = user.unitPreference === "miles" ? distanceInKm * 0.621371 : distanceInKm;
        const pacePerKm = activity.distance > 0 ? (activity.movingTime / 60) / distanceInKm : 0;
        const paceConverted = user.unitPreference === "miles" ? pacePerKm / 0.621371 : pacePerKm;
        
        return {
          week: timeRange === "year" ? `Month ${index + 1}` : `Week ${index + 1}`,
          pace: paceConverted,
          distance: distanceConverted,
        };
      });

      res.json({ chartData });
    } catch (error) {
      console.error('Chart data error:', error);
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });

  // Generate AI insights
  app.post("/api/ai/insights/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      await aiService.generateInsights(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('AI insights error:', error);
      res.status(500).json({ message: error.message || "Failed to generate insights" });
    }
  });

  // Generate AI insights
  app.post("/api/insights/generate/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Verify the user owns this resource
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await aiService.generateInsights(userId);
      res.json({ success: true, message: "Insights generated successfully" });
    } catch (error: any) {
      console.error('Insights generation error:', error);
      res.status(500).json({ message: error.message || "Failed to generate insights" });
    }
  });

  // Update user settings
  app.patch("/api/users/:userId/settings", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { unitPreference } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Verify the user owns this resource
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (unitPreference && !["km", "miles"].includes(unitPreference)) {
        return res.status(400).json({ message: "Invalid unit preference" });
      }

      const updatedUser = await storage.updateUser(userId, { unitPreference });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error('Settings update error:', error);
      res.status(500).json({ message: error.message || "Failed to update settings" });
    }
  });

  // Disconnect Strava
  app.post("/api/strava/disconnect/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const updatedUser = await storage.updateUser(userId, {
        stravaConnected: false,
        stravaAccessToken: null,
        stravaRefreshToken: null,
        stravaAthleteId: null,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Strava disconnect error:', error);
      res.status(500).json({ message: error.message || "Failed to disconnect Strava" });
    }
  });

  // Get activity details
  app.get("/api/activities/:activityId", async (req, res) => {
    try {
      const activityId = parseInt(req.params.activityId);
      
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      // Get activity by ID from all users
      const activities = await storage.getActivitiesByUserId(1);
      const activity = activities.find(a => a.id === activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Get user for unit preferences
      const user = await storage.getUser(activity.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Format activity data with unit conversions
      const distanceInKm = activity.distance / 1000;
      const distanceConverted = user.unitPreference === "miles" ? distanceInKm * 0.621371 : distanceInKm;
      const pacePerKm = activity.distance > 0 ? (activity.movingTime / 60) / distanceInKm : 0;
      const paceConverted = user.unitPreference === "miles" ? pacePerKm / 0.621371 : pacePerKm;
      
      const formattedActivity = {
        ...activity,
        formattedDistance: distanceConverted.toFixed(2),
        formattedPace: paceConverted > 0 ? `${Math.floor(paceConverted)}:${String(Math.round((paceConverted % 1) * 60)).padStart(2, '0')}` : "0:00",
        formattedDuration: `${Math.floor(activity.movingTime / 60)}:${String(activity.movingTime % 60).padStart(2, '0')}`,
        formattedSpeed: user.unitPreference === "miles" ? 
          (activity.averageSpeed * 2.23694).toFixed(1) : 
          (activity.averageSpeed * 3.6).toFixed(1),
        formattedMaxSpeed: user.unitPreference === "miles" ? 
          (activity.maxSpeed * 2.23694).toFixed(1) : 
          (activity.maxSpeed * 3.6).toFixed(1),
        unitPreference: user.unitPreference,
        distanceUnit: user.unitPreference === "miles" ? "mi" : "km",
        paceUnit: user.unitPreference === "miles" ? "/mi" : "/km",
        speedUnit: user.unitPreference === "miles" ? "mph" : "km/h",
      };

      res.json({ activity: formattedActivity });
    } catch (error: any) {
      console.error('Activity fetch error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch activity" });
    }
  });

  // Strava OAuth callback handler
  app.get("/strava/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.redirect("/?error=missing_params");
      }

      const userId = parseInt(state as string);
      if (isNaN(userId)) {
        return res.redirect("/?error=invalid_user");
      }

      const tokenData = await stravaService.exchangeCodeForTokens(code as string);
      
      await storage.updateUser(userId, {
        stravaAccessToken: tokenData.access_token,
        stravaRefreshToken: tokenData.refresh_token,
        stravaAthleteId: tokenData.athlete.id.toString(),
        stravaConnected: true,
      });

      res.redirect("/dashboard?connected=true");
    } catch (error: any) {
      console.error('Strava callback error:', error);
      res.redirect("/dashboard?error=connection_failed");
    }
  });

  // Create a demo user for testing
  app.post("/api/demo/user", async (req, res) => {
    try {
      const user = await storage.createUser({
        username: "demo_runner",
        password: "demo123",
      });

      // Add some demo activities for testing
      const demoActivities = [
        {
          userId: user.id,
          stravaId: "demo_1",
          name: "Morning Run",
          distance: 5200, // 5.2km in meters
          movingTime: 1560, // 26 minutes
          totalElevationGain: 45,
          averageSpeed: 3.33, // m/s
          maxSpeed: 4.5,
          averageHeartrate: 165,
          maxHeartrate: 180,
          startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          type: "Run",
        },
        {
          userId: user.id,
          stravaId: "demo_2", 
          name: "Easy Recovery Run",
          distance: 3800, // 3.8km
          movingTime: 1320, // 22 minutes
          totalElevationGain: 20,
          averageSpeed: 2.88, // m/s
          maxSpeed: 3.2,
          averageHeartrate: 145,
          maxHeartrate: 160,
          startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
          type: "Run",
        },
        {
          userId: user.id,
          stravaId: "demo_3",
          name: "Tempo Run",
          distance: 8000, // 8km
          movingTime: 2400, // 40 minutes
          totalElevationGain: 80,
          averageSpeed: 3.33, // m/s
          maxSpeed: 4.0,
          averageHeartrate: 175,
          maxHeartrate: 185,
          startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
          type: "Run",
        }
      ];

      for (const activity of demoActivities) {
        await storage.createActivity(activity);
      }

      res.json({ user });
    } catch (error: any) {
      console.error('Demo user creation error:', error);
      res.status(500).json({ message: "Failed to create demo user" });
    }
  });

  // ML Features - Race Predictions
  app.get("/api/ml/predictions/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const predictions = await mlService.predictRacePerformance(userId);
      res.json({ predictions });
    } catch (error: any) {
      console.error('Race prediction error:', error);
      res.status(500).json({ message: error.message || "Failed to generate race predictions" });
    }
  });

  // ML Features - Training Plans
  app.post("/api/ml/training-plan/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { weeks = 4 } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const trainingPlan = await mlService.generateTrainingPlan(userId, weeks);
      res.json({ trainingPlan });
    } catch (error: any) {
      console.error('Training plan generation error:', error);
      res.status(500).json({ message: error.message || "Failed to generate training plan" });
    }
  });

  // ML Features - Injury Risk Analysis
  app.get("/api/ml/injury-risk/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const riskAnalysis = await mlService.analyzeInjuryRisk(userId);
      res.json(riskAnalysis);
    } catch (error: any) {
      console.error('Injury risk analysis error:', error);
      res.status(500).json({ message: error.message || "Failed to analyze injury risk" });
    }
  });

  // Performance Analytics - VO2 Max
  app.get("/api/performance/vo2max/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const vo2MaxData = await performanceService.calculateVO2Max(userId);
      res.json(vo2MaxData);
    } catch (error: any) {
      console.error('VO2 Max calculation error:', error);
      res.status(500).json({ message: error.message || "Failed to calculate VO2 Max" });
    }
  });

  // Performance Analytics - Heart Rate Zones
  app.get("/api/performance/hr-zones/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { maxHR, restingHR } = req.query;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const heartRateZones = performanceService.calculateHeartRateZones(
        maxHR ? parseInt(maxHR as string) : undefined,
        restingHR ? parseInt(restingHR as string) : undefined
      );
      res.json({ heartRateZones });
    } catch (error: any) {
      console.error('Heart rate zones calculation error:', error);
      res.status(500).json({ message: error.message || "Failed to calculate heart rate zones" });
    }
  });

  // Performance Analytics - Running Efficiency
  app.get("/api/performance/efficiency/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const efficiencyData = await performanceService.analyzeRunningEfficiency(userId);
      res.json(efficiencyData);
    } catch (error: any) {
      console.error('Running efficiency analysis error:', error);
      res.status(500).json({ message: error.message || "Failed to analyze running efficiency" });
    }
  });

  // Performance Analytics - Complete Metrics
  app.get("/api/performance/metrics/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const performanceMetrics = await performanceService.getPerformanceMetrics(userId);
      res.json(performanceMetrics);
    } catch (error: any) {
      console.error('Performance metrics calculation error:', error);
      res.status(500).json({ message: error.message || "Failed to calculate performance metrics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

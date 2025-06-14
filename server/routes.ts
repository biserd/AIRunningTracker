import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { stravaService } from "./services/strava";
import { aiService } from "./services/ai";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Strava OAuth
  app.post("/api/strava/connect", async (req, res) => {
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

      res.json({ success: true });
    } catch (error) {
      console.error('Strava connection error:', error);
      res.status(500).json({ message: "Failed to connect to Strava" });
    }
  });

  // Sync activities from Strava
  app.post("/api/strava/sync/:userId", async (req, res) => {
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
  app.get("/api/dashboard/:userId", async (req, res) => {
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
        },
        stats: {
          totalDistance: (totalDistance / 1000).toFixed(1),
          avgPace: avgPace > 0 ? `${Math.floor(avgPace)}:${String(Math.round((avgPace % 1) * 60)).padStart(2, '0')}` : "0:00",
          trainingLoad: monthlyActivities.length * 85, // Simple calculation
          recovery: "Good", // Placeholder
        },
        activities: activities.map(activity => ({
          id: activity.id,
          name: activity.name,
          distance: (activity.distance / 1000).toFixed(1),
          pace: activity.distance > 0 ? 
            `${Math.floor((activity.movingTime / 60) / (activity.distance / 1000))}:${String(Math.round(((activity.movingTime / 60) / (activity.distance / 1000) % 1) * 60)).padStart(2, '0')}` 
            : "0:00",
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
        chartData: activities.slice(0, 6).reverse().map((activity, index) => ({
          week: `Week ${index + 1}`,
          pace: activity.distance > 0 ? (activity.movingTime / 60) / (activity.distance / 1000) : 0,
          distance: activity.distance / 1000,
        })),
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
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

      res.redirect("/?connected=true");
    } catch (error: any) {
      console.error('Strava callback error:', error);
      res.redirect("/?error=connection_failed");
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

  const httpServer = createServer(app);
  return httpServer;
}

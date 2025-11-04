import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { stravaService } from "./services/strava";
import { aiService } from "./services/ai";
import { mlService } from "./services/ml";
import { performanceService } from "./services/performance";
import { authService } from "./services/auth";
import { emailService } from "./services/email";
import { runnerScoreService } from "./services/runnerScore";
import goalsService from "./services/goals";
import { insertUserSchema, loginSchema, registerSchema, insertFeedbackSchema, insertGoalSchema, type Activity } from "@shared/schema";
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

// Admin middleware
const authenticateAdmin = async (req: any, res: Response, next: NextFunction) => {
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
    
    // Check if user is admin
    const fullUser = await storage.getUser(user.id);
    if (!fullUser?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Simple in-memory cache for expensive endpoints (60 second TTL)
// NOTE: This cache is reset on server restart/deployment. For production with multiple
// instances, consider using Redis or similar shared cache layer for consistency.
// Single-process deployments (like Replit) work fine with in-memory cache.
interface CacheEntry {
  data: any;
  timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 60 seconds
const ENABLE_CACHE_LOGGING = process.env.NODE_ENV !== 'production'; // Disable verbose logging in production

function getCachedResponse(key: string): any | null {
  const entry = responseCache.get(key);
  if (!entry) {
    if (ENABLE_CACHE_LOGGING) {
      console.log(`[CACHE] Key "${key}" not found in cache. Cache size: ${responseCache.size}`);
    }
    return null;
  }
  
  const now = Date.now();
  const age = now - entry.timestamp;
  if (age > CACHE_TTL) {
    if (ENABLE_CACHE_LOGGING) {
      console.log(`[CACHE] Key "${key}" expired (age: ${age}ms, TTL: ${CACHE_TTL}ms)`);
    }
    responseCache.delete(key);
    return null;
  }
  
  if (ENABLE_CACHE_LOGGING) {
    console.log(`[CACHE] Key "${key}" found in cache (age: ${age}ms)`);
  }
  return entry.data;
}

function setCachedResponse(key: string, data: any): void {
  if (ENABLE_CACHE_LOGGING) {
    console.log(`[CACHE] Setting cache for key "${key}". Cache size before: ${responseCache.size}`);
  }
  responseCache.set(key, {
    data,
    timestamp: Date.now()
  });
  if (ENABLE_CACHE_LOGGING) {
    console.log(`[CACHE] Cache set. Cache size after: ${responseCache.size}`);
  }
}

function deleteCachedResponse(key: string): void {
  const deleted = responseCache.delete(key);
  if (ENABLE_CACHE_LOGGING) {
    console.log(`[CACHE] ${deleted ? 'Deleted' : 'Attempted to delete'} cache key "${key}". Cache size: ${responseCache.size}`);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // SEO: robots.txt
  app.get("/robots.txt", (req, res) => {
    const baseUrl = "https://aitracker.run";
    
    const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /admin
Disallow: /admin/
Disallow: /settings
Disallow: /billing
Disallow: /activities
Disallow: /activity/
Disallow: /performance
Disallow: /ml-insights

Sitemap: ${baseUrl}/sitemap.xml`;

    res.header("Content-Type", "text/plain");
    res.send(robotsTxt);
  });

  // SEO: Sitemap
  app.get("/sitemap.xml", (req, res) => {
    const baseUrl = "https://aitracker.run";
    
    const pages = [
      { url: "/", changefreq: "daily", priority: "1.0" },
      { url: "/auth", changefreq: "monthly", priority: "0.8" },
      { url: "/forgot-password", changefreq: "yearly", priority: "0.4" },
      { url: "/reset-password", changefreq: "yearly", priority: "0.3" },
      { url: "/about", changefreq: "monthly", priority: "0.7" },
      { url: "/features", changefreq: "monthly", priority: "0.8" },
      { url: "/pricing", changefreq: "weekly", priority: "0.9" },
      { url: "/subscribe", changefreq: "weekly", priority: "0.8" },
      { url: "/tools", changefreq: "weekly", priority: "0.9" },
      { url: "/tools/aerobic-decoupling-calculator", changefreq: "weekly", priority: "0.8" },
      { url: "/tools/training-split-analyzer", changefreq: "weekly", priority: "0.8" },
      { url: "/tools/marathon-fueling", changefreq: "weekly", priority: "0.8" },
      { url: "/tools/race-predictor", changefreq: "weekly", priority: "0.8" },
      { url: "/tools/cadence-analyzer", changefreq: "weekly", priority: "0.8" },
      { url: "/runner-score", changefreq: "weekly", priority: "0.7" },
      { url: "/faq", changefreq: "monthly", priority: "0.6" },
      { url: "/contact", changefreq: "monthly", priority: "0.5" },
      { url: "/privacy", changefreq: "yearly", priority: "0.3" },
      { url: "/terms", changefreq: "yearly", priority: "0.3" },
      { url: "/release-notes", changefreq: "weekly", priority: "0.7" },
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(sitemap);
  });

  // Platform stats for landing page (public endpoint)
  app.get("/api/platform-stats", async (req, res) => {
    try {
      const cacheKey = "platform-stats";
      const cached = getCachedResponse(cacheKey);
      
      if (cached) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.json(cached);
      }

      const stats = await storage.getPlatformStats();
      
      setCachedResponse(cacheKey, stats);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(stats);
    } catch (error: any) {
      console.error('Platform stats error:', error);
      res.status(500).json({ message: "Failed to get platform stats" });
    }
  });
  
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      const result = await authService.register(userData);
      
      // Send welcome email to new user
      await emailService.sendWelcomeEmail(userData.email);
      
      // Send notification to admin
      await emailService.sendRegistrationNotification(userData.email);
      
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

  // Get current user data (for authenticated queries)
  app.get("/api/user", authenticateJWT, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      console.log('[API /api/user] Returning user data:', { id: user.id, email: user.email, unitPreference: user.unitPreference });
      res.json(user);
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Delete user account (GDPR compliance)
  app.delete("/api/user", authenticateJWT, async (req: any, res) => {
    try {
      // Get user email before deletion for confirmation email
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userEmail = user.email;
      const userId = req.user.id;

      // Delete all user data
      await storage.deleteAccount(userId);

      // Send confirmation email to user
      await emailService.sendAccountDeletionConfirmation(userEmail);

      // Send notification to admin
      await emailService.sendAccountDeletionNotification(userEmail, userId);

      console.log(`[API DELETE /api/user] Account deleted for user ID: ${userId}, email: ${userEmail}`);
      
      res.json({ 
        success: true, 
        message: "Your account and all associated data have been permanently deleted. A confirmation email has been sent." 
      });
    } catch (error: any) {
      console.error('Delete account error:', error);
      res.status(500).json({ message: error.message || "Failed to delete account" });
    }
  });

  app.get("/api/logout", (req, res) => {
    // Clear any server-side session data if needed
    res.redirect("/");
  });

  // Password reset endpoints
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // Generate reset token and send email
      const resetToken = await authService.generatePasswordResetToken(email);
      
      if (resetToken) {
        // Send password reset email
        await emailService.sendPasswordResetEmail(email, resetToken);
      }
      
      // Always return success to prevent email enumeration
      res.json({ message: "If an account exists with that email, a password reset link has been sent." });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(400).json({ message: "Invalid email address" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = z.object({ 
        token: z.string(),
        password: z.string().min(6)
      }).parse(req.body);
      
      // Reset password using token
      const success = await authService.resetPassword(token, password);
      
      if (!success) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      res.json({ message: "Password successfully reset. You can now log in with your new password." });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(400).json({ message: error.message || "Failed to reset password" });
    }
  });

  // Feedback endpoint
  app.post("/api/feedback", authenticateJWT, async (req: any, res) => {
    try {
      const feedbackData = insertFeedbackSchema.parse(req.body);
      
      // Create feedback in database
      const feedback = await storage.createFeedback(feedbackData);
      
      // Send email notification
      await emailService.sendFeedbackNotification(
        feedbackData.type,
        feedbackData.title,
        feedbackData.description,
        feedbackData.userEmail || 'Unknown'
      );
      
      res.json({ success: true, message: "Feedback submitted successfully" });
    } catch (error: any) {
      console.error('Feedback error:', error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // Goal endpoints
  app.get("/api/goals/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { status } = req.query;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const goals = await storage.getGoalsByUserId(userId, status as string);
      res.json(goals);
    } catch (error: any) {
      console.error('Get goals error:', error);
      res.status(500).json({ message: "Failed to get goals" });
    }
  });

  app.post("/api/goals", authenticateJWT, async (req: any, res) => {
    try {
      const goalData = insertGoalSchema.parse(req.body);
      const goal = await storage.createGoal(goalData);
      res.json(goal);
    } catch (error: any) {
      console.error('Create goal error:', error);
      res.status(400).json({ message: error.message || "Failed to create goal" });
    }
  });

  app.patch("/api/goals/:id/complete", authenticateJWT, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }
      
      const goal = await storage.completeGoal(goalId);
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json(goal);
    } catch (error: any) {
      console.error('Complete goal error:', error);
      res.status(500).json({ message: "Failed to complete goal" });
    }
  });

  app.delete("/api/goals/:id", authenticateJWT, async (req: any, res) => {
    try {
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }
      
      await storage.deleteGoal(goalId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete goal error:', error);
      res.status(500).json({ message: "Failed to delete goal" });
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

      // Auto-sync activities and generate insights after connecting
      try {
        await stravaService.syncActivitiesForUser(userId, 50); // Initial connection: 50 activities
        console.log('Auto-sync completed after Strava connection');
        
        // Generate AI insights after sync
        try {
          await aiService.generateInsights(userId);
          console.log('AI insights generated after Strava connection');
        } catch (insightError) {
          console.error('AI insight generation failed after connection:', insightError);
        }
      } catch (syncError) {
        console.error('Auto-sync failed after Strava connection:', syncError);
        // Don't fail the connection if sync fails
      }

      res.json({ success: true, autoSyncCompleted: true });
    } catch (error) {
      console.error('Strava connection error:', error);
      res.status(500).json({ message: "Failed to connect to Strava" });
    }
  });

  // Create short-lived SSE nonces for sync
  const sseNonces = new Map<string, { userId: number; maxActivities: number; expiresAt: number }>();
  
  app.post("/api/strava/sync/:userId/start-stream", authenticateJWT, async (req: any, res) => {
    const userId = parseInt(req.params.userId);
    let maxActivities = parseInt(req.body?.maxActivities) || 50;
    
    if (isNaN(userId) || req.user.id !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Clamp maxActivities to prevent abuse
    maxActivities = Math.max(1, Math.min(100, maxActivities));
    
    // Generate cryptographically random nonce (NOT a JWT)
    const crypto = await import('crypto');
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    
    sseNonces.set(nonce, { userId, maxActivities, expiresAt });
    
    // Clean up expired nonces
    for (const [n, data] of Array.from(sseNonces.entries())) {
      if (data.expiresAt < Date.now()) {
        sseNonces.delete(n);
      }
    }
    
    res.json({ sseNonce: nonce });
  });

  // Sync activities from Strava with SSE progress
  app.get("/api/strava/sync/:userId/stream", async (req: any, res) => {
    const userId = parseInt(req.params.userId);
    const nonce = req.query.nonce as string;
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    // Validate single-use nonce (cannot be used for other API calls)
    const nonceData = sseNonces.get(nonce);
    if (!nonceData || nonceData.userId !== userId || nonceData.expiresAt < Date.now()) {
      return res.status(401).json({ message: "Invalid or expired sync session" });
    }
    
    // Consume the single-use nonce immediately
    sseNonces.delete(nonce);
    
    const maxActivities = nonceData.maxActivities;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx
    
    // Send initial connection confirmation
    res.write(': connected\n\n');
    
    // Keep-alive ping every 15 seconds to prevent timeout
    const keepAliveInterval = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': keepalive\n\n');
      }
    }, 15000);
    
    // Clean up on client disconnect or any connection close
    const cleanup = () => {
      clearInterval(keepAliveInterval);
    };
    
    req.on('close', cleanup);
    res.on('close', cleanup);
    
    // Progress callback
    const onProgress = (current: number, total: number, activityName: string) => {
      res.write(`data: ${JSON.stringify({ current, total, activityName })}\n\n`);
    };
    
    try {
      // Start sync with progress callback
      const result = await stravaService.syncActivitiesForUser(userId, maxActivities, onProgress);
      
      // Send completion event
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        syncedCount: result.syncedCount,
        totalActivities: result.totalActivities 
      })}\n\n`);
      
      // Auto-generate AI insights after sync if there were new activities
      if (result.syncedCount > 0) {
        try {
          res.write(`data: ${JSON.stringify({ type: 'insights', message: 'Generating AI insights...' })}\n\n`);
          await aiService.generateInsights(userId);
          res.write(`data: ${JSON.stringify({ type: 'insights_complete', message: 'AI insights generated' })}\n\n`);
        } catch (insightError) {
          console.error('AI insight generation failed after sync:', insightError);
        }
        
        // Invalidate cache for user's dashboard and chart data since new data was synced
        deleteCachedResponse(`dashboard:${userId}`);
        deleteCachedResponse(`chart:${userId}:30days`);
        console.log(`Cache invalidated for user ${userId} after SSE sync with ${result.syncedCount} new activities`);
      }
      
      cleanup();
      res.end();
    } catch (error: any) {
      console.error('Sync error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Failed to sync activities' })}\n\n`);
      cleanup();
      res.end();
    }
  });

  // Sync activities from Strava (legacy endpoint)
  app.post("/api/strava/sync/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const maxActivities = req.body?.maxActivities || 50; // Default to 50 for dashboard
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const result = await stravaService.syncActivitiesForUser(userId, maxActivities);
      
      // Auto-generate AI insights after sync if new activities were synced
      if (result.syncedCount > 0) {
        try {
          await aiService.generateInsights(userId);
          console.log('AI insights generated after sync');
        } catch (insightError) {
          console.error('AI insight generation failed after sync:', insightError);
        }
        
        // Invalidate cache for user's dashboard and chart data since new data was synced
        deleteCachedResponse(`dashboard:${userId}`);
        deleteCachedResponse(`chart:${userId}:30days`);
        console.log(`Cache invalidated for user ${userId} after legacy sync with ${result.syncedCount} new activities`);
      }
      
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

      // Security check: ensure user can only access their own dashboard
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied: cannot access another user's dashboard" });
      }

      // Check cache first
      const cacheKey = `dashboard:${userId}`;
      const cachedData = getCachedResponse(cacheKey);
      if (cachedData) {
        // Prevent browser caching with 304 responses
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');
        return res.json(cachedData);
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const activities = await storage.getActivitiesByUserId(userId, 10);
      
      const insights = await storage.getAIInsightsByUserId(userId);
      
      // Calculate quick stats for this month and last month, plus weekly comparisons
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      // Calculate weekly periods
      const thisWeek = new Date();
      const daysSinceMonday = (thisWeek.getDay() + 6) % 7; // Monday = 0
      thisWeek.setDate(thisWeek.getDate() - daysSinceMonday);
      thisWeek.setHours(0, 0, 0, 0);
      
      const lastWeek = new Date(thisWeek);
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      // OPTIMIZATION: Only fetch activities from last 3 months instead of all activities
      // This filters at the DATABASE level for maximum performance
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);
      
      // Reduced from 200 to 100 for faster queries - 3 months of data is sufficient for stats
      const recentActivities = await storage.getActivitiesByUserId(userId, 100, threeMonthsAgo);
      
      // FIX: Use the most recent activity date to determine "current month" instead of server time
      // This prevents timezone issues where server is in UTC Nov 1 but user activities are Oct 31
      let referenceDate = new Date();
      if (recentActivities.length > 0) {
        // Use the most recent activity's date as reference
        const mostRecentActivity = recentActivities[0]; // Activities are sorted by date desc
        referenceDate = new Date(mostRecentActivity.startDate);
      }
      
      // Recalculate thisMonth and lastMonth based on the reference date
      const adjustedThisMonth = new Date(referenceDate);
      adjustedThisMonth.setDate(1);
      adjustedThisMonth.setHours(0, 0, 0, 0);
      
      const adjustedLastMonth = new Date(adjustedThisMonth);
      adjustedLastMonth.setMonth(adjustedLastMonth.getMonth() - 1);
      
      console.log(`[Dashboard Debug] User ${userId}:`);
      console.log(`  Server time: ${new Date().toISOString()}`);
      console.log(`  Reference date (from most recent activity): ${referenceDate.toISOString()}`);
      console.log(`  Adjusted This Month starts: ${adjustedThisMonth.toISOString()}`);
      console.log(`  Adjusted Last Month: ${adjustedLastMonth.toISOString()} to ${adjustedThisMonth.toISOString()}`);
      console.log(`  Total recent activities fetched: ${recentActivities.length}`);
      if (recentActivities.length > 0) {
        console.log(`  Sample activity dates: ${recentActivities.slice(0, 3).map(a => new Date(a.startDate).toISOString()).join(', ')}`);
      }
      
      // Filter activities by time periods (using adjusted month boundaries)
      const thisMonthActivities = recentActivities.filter(a => 
        new Date(a.startDate) >= adjustedThisMonth
      );
      
      const lastMonthActivities = recentActivities.filter(a => 
        new Date(a.startDate) >= adjustedLastMonth && new Date(a.startDate) < adjustedThisMonth
      );
      
      console.log(`  This month activities: ${thisMonthActivities.length}`);
      console.log(`  Last month activities: ${lastMonthActivities.length}`);
      
      const thisWeekActivities = recentActivities.filter(a => 
        new Date(a.startDate) >= thisWeek
      );
      
      const lastWeekActivities = recentActivities.filter(a => 
        new Date(a.startDate) >= lastWeek && new Date(a.startDate) < thisWeek
      );
      
      // Calculate this month stats
      const totalDistance = thisMonthActivities.reduce((sum, a) => sum + a.distance, 0);
      const totalTime = thisMonthActivities.reduce((sum, a) => sum + a.movingTime, 0);
      const avgPace = totalDistance > 0 ? (totalTime / 60) / (totalDistance / 1000) : 0;
      const totalActivities = thisMonthActivities.length;
      
      // Calculate last month stats for comparison
      const lastMonthDistance = lastMonthActivities.reduce((sum, a) => sum + a.distance, 0);
      const lastMonthTime = lastMonthActivities.reduce((sum, a) => sum + a.movingTime, 0);
      const lastMonthAvgPace = lastMonthDistance > 0 ? (lastMonthTime / 60) / (lastMonthDistance / 1000) : 0;
      const lastMonthActivitiesCount = lastMonthActivities.length;
      
      // Calculate this week stats
      const thisWeekDistance = thisWeekActivities.reduce((sum, a) => sum + a.distance, 0);
      const thisWeekTime = thisWeekActivities.reduce((sum, a) => sum + a.movingTime, 0);
      const thisWeekAvgPace = thisWeekDistance > 0 ? (thisWeekTime / 60) / (thisWeekDistance / 1000) : 0;
      const thisWeekActivitiesCount = thisWeekActivities.length;
      
      // Calculate last week stats for comparison
      const lastWeekDistance = lastWeekActivities.reduce((sum, a) => sum + a.distance, 0);
      const lastWeekTime = lastWeekActivities.reduce((sum, a) => sum + a.movingTime, 0);
      const lastWeekAvgPace = lastWeekDistance > 0 ? (lastWeekTime / 60) / (lastWeekDistance / 1000) : 0;
      const lastWeekActivitiesCount = lastWeekActivities.length;
      
      // Calculate percentage changes (monthly comparisons)
      const monthlyDistanceChange = lastMonthDistance > 0 && totalDistance > 0 ? 
        ((totalDistance - lastMonthDistance) / lastMonthDistance) * 100 : null;
      const monthlyPaceChange = lastMonthAvgPace > 0 && avgPace > 0 && lastMonthActivitiesCount >= 3 && totalActivities >= 3 ? 
        ((avgPace - lastMonthAvgPace) / lastMonthAvgPace) * 100 : null; // Positive means slower, negative means faster
      const monthlyActivitiesChange = lastMonthActivitiesCount > 0 ? 
        ((totalActivities - lastMonthActivitiesCount) / lastMonthActivitiesCount) * 100 : null;
      
      // Calculate percentage changes (weekly comparisons)
      const weeklyDistanceChange = lastWeekDistance > 0 && thisWeekDistance > 0 ? 
        ((thisWeekDistance - lastWeekDistance) / lastWeekDistance) * 100 : null;
      const weeklyPaceChange = lastWeekAvgPace > 0 && thisWeekAvgPace > 0 && lastWeekActivitiesCount >= 2 && thisWeekActivitiesCount >= 2 ? 
        ((thisWeekAvgPace - lastWeekAvgPace) / lastWeekAvgPace) * 100 : null;
      const weeklyActivitiesChange = lastWeekActivitiesCount > 0 ? 
        ((thisWeekActivitiesCount - lastWeekActivitiesCount) / lastWeekActivitiesCount) * 100 : null;
      
      const dashboardData = {
        user: {
          name: user.username,
          stravaConnected: user.stravaConnected,
          unitPreference: user.unitPreference || "km",
          lastSyncAt: user.lastSyncAt,
        },
        stats: {
          // Monthly totals (current behavior)
          monthlyTotalDistance: user.unitPreference === "miles" ? 
            ((totalDistance / 1000) * 0.621371).toFixed(1) : 
            (totalDistance / 1000).toFixed(1),
          monthlyAvgPace: avgPace > 0 ? (() => {
            const paceToShow = user.unitPreference === "miles" ? avgPace / 0.621371 : avgPace;
            return `${Math.floor(paceToShow)}:${String(Math.round((paceToShow % 1) * 60)).padStart(2, '0')}`;
          })() : "0:00",
          monthlyTotalActivities: totalActivities,
          monthlyTrainingLoad: totalActivities * 85,
          
          // Weekly totals
          weeklyTotalDistance: user.unitPreference === "miles" ? 
            ((thisWeekDistance / 1000) * 0.621371).toFixed(1) : 
            (thisWeekDistance / 1000).toFixed(1),
          weeklyAvgPace: thisWeekAvgPace > 0 ? (() => {
            const paceToShow = user.unitPreference === "miles" ? thisWeekAvgPace / 0.621371 : thisWeekAvgPace;
            return `${Math.floor(paceToShow)}:${String(Math.round((paceToShow % 1) * 60)).padStart(2, '0')}`;
          })() : "0:00",
          weeklyTotalActivities: thisWeekActivitiesCount,
          weeklyTrainingLoad: thisWeekActivitiesCount * 85,
          
          // Recovery based on weekly activity
          recovery: thisWeekActivitiesCount >= 4 ? "Good" : thisWeekActivitiesCount >= 2 ? "Moderate" : "Low",
          unitPreference: user.unitPreference || "km",
          
          // Calculate proper training load changes
          monthlyTrainingLoadActual: totalActivities * 85,
          lastMonthTrainingLoadActual: lastMonthActivitiesCount * 85,
          weeklyTrainingLoadActual: thisWeekActivitiesCount * 85,
          lastWeekTrainingLoadActual: lastWeekActivitiesCount * 85,
          
          // Monthly percentage changes
          monthlyDistanceChange: monthlyDistanceChange !== null ? Math.round(monthlyDistanceChange) : null,
          monthlyPaceChange: monthlyPaceChange !== null ? Math.round(monthlyPaceChange) : null,
          monthlyActivitiesChange: monthlyActivitiesChange !== null ? Math.round(monthlyActivitiesChange) : null,
          monthlyTrainingLoadChange: lastMonthActivitiesCount > 0 ? Math.round(((totalActivities * 85 - lastMonthActivitiesCount * 85) / (lastMonthActivitiesCount * 85)) * 100) : null,
          
          // Weekly percentage changes
          weeklyDistanceChange: weeklyDistanceChange !== null ? Math.round(weeklyDistanceChange) : null,
          weeklyPaceChange: weeklyPaceChange !== null ? Math.round(weeklyPaceChange) : null,
          weeklyActivitiesChange: weeklyActivitiesChange !== null ? Math.round(weeklyActivitiesChange) : null,
          weeklyTrainingLoadChange: lastWeekActivitiesCount > 0 ? Math.round(((thisWeekActivitiesCount * 85 - lastWeekActivitiesCount * 85) / (lastWeekActivitiesCount * 85)) * 100) : null,
          
          // Backward compatibility (default to monthly)
          totalDistance: user.unitPreference === "miles" ? 
            ((totalDistance / 1000) * 0.621371).toFixed(1) : 
            (totalDistance / 1000).toFixed(1),
          avgPace: avgPace > 0 ? (() => {
            const paceToShow = user.unitPreference === "miles" ? avgPace / 0.621371 : avgPace;
            return `${Math.floor(paceToShow)}:${String(Math.round((paceToShow % 1) * 60)).padStart(2, '0')}`;
          })() : "0:00",
          trainingLoad: totalActivities * 85,
          totalActivities: totalActivities,
          distanceChange: monthlyDistanceChange !== null ? Math.round(monthlyDistanceChange) : null,
          paceChange: monthlyPaceChange !== null ? Math.round(monthlyPaceChange) : null,
          activitiesChange: monthlyActivitiesChange !== null ? Math.round(monthlyActivitiesChange) : null,
          trainingLoadChange: lastMonthActivitiesCount > 0 ? Math.round(((totalActivities * 85 - lastMonthActivitiesCount * 85) / (lastMonthActivitiesCount * 85)) * 100) : null,
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
          motivation: insights.find(i => i.type === 'motivation'),
          technique: insights.find(i => i.type === 'technique'),
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
      
      // Cache the response
      setCachedResponse(cacheKey, dashboardData);
      
      // Prevent browser caching with 304 responses
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      
      res.json(dashboardData);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });

  // Get historical insights for timeline view
  app.get("/api/insights/history/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Security check: ensure user can only access their own insights history
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied: cannot access another user's insights history" });
      }

      const historicalInsights = await storage.getHistoricalAIInsights(userId, 50);
      
      // Group insights by date for timeline display
      type InsightsGrouped = {
        performance: any[];
        pattern: any[];
        recovery: any[];
        motivation: any[];
        technique: any[];
        recommendation: any[];
      };
      
      const timelineData = historicalInsights.reduce((acc: Record<string, { date: string; insights: InsightsGrouped }>, insight) => {
        const dateStr = new Date(insight.createdAt || new Date()).toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (!acc[dateStr]) {
          acc[dateStr] = {
            date: dateStr,
            insights: {
              performance: [],
              pattern: [],
              recovery: [],
              motivation: [],
              technique: [],
              recommendation: []
            }
          };
        }
        
        acc[dateStr].insights[insight.type as keyof InsightsGrouped].push({
          id: insight.id,
          title: insight.title,
          content: insight.content,
          confidence: insight.confidence,
          createdAt: insight.createdAt
        });
        
        return acc;
      }, {});

      // Convert to array and sort by date (newest first)
      const timeline = Object.values(timelineData).sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      res.json({ timeline });
    } catch (error) {
      console.error('Insights history error:', error);
      res.status(500).json({ message: "Failed to fetch insights history" });
    }
  });

  // Get chart data with time range
  app.get("/api/chart/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const timeRange = req.query.range as string || "30days";
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Security check: ensure user can only access their own chart data
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied: cannot access another user's chart data" });
      }

      // Check cache first (include timeRange in cache key)
      const cacheKey = `chart:${userId}:${timeRange}`;
      const cachedData = getCachedResponse(cacheKey);
      if (cachedData) {
        // Prevent browser caching with 304 responses
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');
        return res.json(cachedData);
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
        case "7days":
          startDate.setDate(now.getDate() - 7);
          activityLimit = 7; // One data point per day
          break;
        case "3months":
          startDate.setMonth(now.getMonth() - 3);
          activityLimit = 12; // Group by week
          break;
        case "6months":
          startDate.setMonth(now.getMonth() - 6);
          activityLimit = 26; // Group by week (~6 months = 26 weeks)
          break;
        case "year":
          // This year - from January 1st to now
          startDate = new Date(now.getFullYear(), 0, 1);
          activityLimit = 12; // Group by month
          break;
        case "1year":
          // Last 12 months from today
          startDate.setFullYear(now.getFullYear() - 1);
          activityLimit = 12; // Group by month
          break;
        default: // 30days
          startDate.setDate(now.getDate() - 30);
          activityLimit = 6; // Group by week
      }

      // OPTIMIZATION: Filter at database level using startDate parameter
      const filteredActivities = await storage.getActivitiesByUserId(userId, 100, startDate);

      // Group activities by week/month
      const groupedData = new Map();
      
      filteredActivities.forEach(activity => {
        const activityDate = new Date(activity.startDate);
        let groupKey: string;
        
        if (timeRange === "7days") {
          // Group by day for 7-day view
          groupKey = activityDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        } else if (timeRange === "year" || timeRange === "1year") {
          // Group by month for year views
          groupKey = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
        } else {
          // Group by week for 30days, 3months, and 6months views
          const weekStart = new Date(activityDate);
          weekStart.setDate(activityDate.getDate() - activityDate.getDay()); // Start of week (Sunday)
          groupKey = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
        
        if (!groupedData.has(groupKey)) {
          groupedData.set(groupKey, {
            activities: [],
            totalDistance: 0,
            totalTime: 0,
            date: activityDate
          });
        }
        
        const group = groupedData.get(groupKey);
        group.activities.push(activity);
        group.totalDistance += activity.distance;
        group.totalTime += activity.movingTime;
      });

      // Convert grouped data to chart format
      const chartData = Array.from(groupedData.entries())
        .sort(([a], [b]) => a.localeCompare(b)) // Sort by date
        .map(([key, group], index) => {
          const distanceInKm = group.totalDistance / 1000;
          const distanceConverted = user.unitPreference === "miles" ? distanceInKm * 0.621371 : distanceInKm;
          
          // Calculate weighted average pace across all activities in the group
          let totalPaceWeightedDistance = 0;
          let totalDistanceForPace = 0;
          
          group.activities.forEach((activity: Activity) => {
            if (activity.distance > 0) {
              const activityDistanceKm = activity.distance / 1000;
              const activityPace = (activity.movingTime / 60) / activityDistanceKm; // min/km
              totalPaceWeightedDistance += activityPace * activityDistanceKm;
              totalDistanceForPace += activityDistanceKm;
            }
          });
          
          const averagePace = totalDistanceForPace > 0 ? totalPaceWeightedDistance / totalDistanceForPace : 0;
          const paceConverted = user.unitPreference === "miles" ? averagePace / 0.621371 : averagePace;
          
          let label: string;
          if (timeRange === "7days") {
            // Daily labels for 7-day view
            const date = new Date(key);
            label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          } else if (timeRange === "year" || timeRange === "1year") {
            // Monthly labels for year views
            const date = new Date(key + "-01");
            label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          } else {
            // Weekly labels for 30days, 3months, and 6months views
            const weekStart = new Date(key);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}-${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
          }
          
          return {
            week: label,
            pace: paceConverted,
            distance: distanceConverted,
            activitiesCount: group.activities.length
          };
        })
        .slice(-activityLimit); // Limit to requested number of periods
      
      const responseData = { chartData };
      
      // Cache the response
      setCachedResponse(cacheKey, responseData);
      
      // Prevent browser caching with 304 responses
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.set('Pragma', 'no-cache');
      
      res.json(responseData);
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

  // Logout endpoint
  app.get("/api/logout", (req, res) => {
    res.redirect("/");
  });

  // Runner Score endpoint (authenticated)
  app.get("/api/runner-score/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Verify the user owns this resource
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const runnerScore = await runnerScoreService.calculateRunnerScore(userId);
      res.json(runnerScore);
    } catch (error: any) {
      console.error('Runner score error:', error);
      res.status(500).json({ message: error.message || "Failed to calculate runner score" });
    }
  });

  // Historical Runner Score endpoint (authenticated)
  app.get("/api/runner-score/:userId/history", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Verify the user owns this resource
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const historicalData = await runnerScoreService.calculateHistoricalRunnerScore(userId);
      res.json(historicalData);
    } catch (error: any) {
      console.error('Historical runner score error:', error);
      res.status(500).json({ message: error.message || "Failed to get historical runner score" });
    }
  });

  // Public Runner Score endpoint (for sharing)
  app.get("/api/runner-score/public/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const runnerScore = await runnerScoreService.calculateRunnerScore(userId);
      
      // Add user name for public display
      const publicScore = {
        ...runnerScore,
        userName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.email?.split('@')[0] || "Runner"
      };
      
      res.json(publicScore);
    } catch (error: any) {
      console.error('Public runner score error:', error);
      res.status(500).json({ message: error.message || "Failed to get runner score" });
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

      // Invalidate cached dashboard and chart data since they depend on unit preference
      deleteCachedResponse(`dashboard:${userId}`);
      deleteCachedResponse(`chart:${userId}:30days`);
      console.log(`[Settings] Invalidated cache for user ${userId} after unit preference change to ${unitPreference}`);

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

  // Get activities suitable for aerobic decoupling analysis
  app.get("/api/activities/decoupling-suitable", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user for unit preference
      const user = await storage.getUser(userId);
      const unitPreference = user?.unitPreference || 'km';

      // Fetch recent activities with minimum 45 minutes duration and heart rate data
      const result = await storage.getActivitiesByUserIdPaginated(userId, {
        page: 1,
        pageSize: 20,
        minDistance: undefined,
        maxDistance: undefined,
        startDate: undefined,
        endDate: undefined,
      });

      // Filter for decoupling-suitable activities (60+ minutes, has HR data)
      const suitableActivities = result.activities.filter(activity => 
        activity.movingTime >= 3600 && // 60 minutes minimum
        activity.hasHeartrate &&
        activity.averageHeartrate !== null
      ).map(activity => {
        const distanceInKm = activity.distance / 1000;
        const distanceConverted = unitPreference === 'miles' ? distanceInKm * 0.621371 : distanceInKm;
        const pacePerKm = activity.distance > 0 ? (activity.movingTime / 60) / distanceInKm : 0;
        const paceConverted = unitPreference === 'miles' ? pacePerKm / 0.621371 : pacePerKm;

        return {
          id: activity.id,
          name: activity.name,
          distance: distanceConverted,
          distanceFormatted: distanceConverted.toFixed(2),
          movingTime: activity.movingTime,
          durationFormatted: `${Math.floor(activity.movingTime / 60)}:${String(Math.floor(activity.movingTime % 60)).padStart(2, '0')}`,
          averageHeartrate: activity.averageHeartrate,
          averageSpeed: activity.averageSpeed,
          paceFormatted: paceConverted > 0 ? `${Math.floor(paceConverted)}:${String(Math.round((paceConverted % 1) * 60)).padStart(2, '0')}` : "0:00",
          startDate: activity.startDate,
          distanceUnit: unitPreference === 'miles' ? 'mi' : 'km',
        };
      });

      res.json({ activities: suitableActivities });
    } catch (error: any) {
      console.error('Get decoupling-suitable activities error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch activities" });
    }
  });

  // Analyze training split (polarized vs pyramidal)
  app.get("/api/training-split/analyze", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const periodDays = parseInt(req.query.periodDays as string) || 28;
      
      // Get user for HR zones and preferences
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - periodDays);

      // Fetch activities with HR data in the period
      const result = await storage.getActivitiesByUserIdPaginated(userId, {
        page: 1,
        pageSize: 500, // Get all activities in period
        minDistance: undefined,
        maxDistance: undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Filter for activities with HR data
      const activitiesWithHR = result.activities.filter(activity => 
        activity.hasHeartrate && 
        activity.averageHeartrate !== null &&
        activity.movingTime >= 600 // At least 10 minutes
      );

      if (activitiesWithHR.length === 0) {
        return res.status(400).json({ 
          message: "No activities with heart rate data found in the selected period"
        });
      }

      // Estimate HR zones - use default values
      // TODO: Could enhance by adding maxHeartRate and thresholdHeartRate to user schema
      const hrMax = 185; // Default max HR estimate
      const lt1HR = Math.round(hrMax * 0.75); // ~75% HRmax (Zone 1/2 boundary)
      const lt2HR = Math.round(hrMax * 0.88); // ~88% HRmax (Zone 2/3 boundary)

      // Calculate time in each zone for each activity
      interface ActivityZones {
        activityId: number;
        date: Date;
        zone1Minutes: number;
        zone2Minutes: number;
        zone3Minutes: number;
      }

      const activityZones: ActivityZones[] = [];

      for (const activity of activitiesWithHR) {
        const avgHR = activity.averageHeartrate!;
        const durationMinutes = activity.movingTime / 60;

        // Simple estimation: allocate all time to the zone matching avg HR
        // In a real implementation, we'd fetch HR streams for detailed analysis
        let z1 = 0, z2 = 0, z3 = 0;
        
        if (avgHR < lt1HR) {
          z1 = durationMinutes;
        } else if (avgHR < lt2HR) {
          z2 = durationMinutes;
        } else {
          z3 = durationMinutes;
        }

        activityZones.push({
          activityId: activity.id,
          date: new Date(activity.startDate),
          zone1Minutes: z1,
          zone2Minutes: z2,
          zone3Minutes: z3,
        });
      }

      // Aggregate total time in zones
      const totalZ1 = activityZones.reduce((sum, a) => sum + a.zone1Minutes, 0);
      const totalZ2 = activityZones.reduce((sum, a) => sum + a.zone2Minutes, 0);
      const totalZ3 = activityZones.reduce((sum, a) => sum + a.zone3Minutes, 0);
      const totalMinutes = totalZ1 + totalZ2 + totalZ3;

      if (totalMinutes === 0) {
        return res.status(400).json({ message: "No valid training data found" });
      }

      // Calculate percentages
      const z1Pct = (totalZ1 / totalMinutes) * 100;
      const z2Pct = (totalZ2 / totalMinutes) * 100;
      const z3Pct = (totalZ3 / totalMinutes) * 100;

      // Classify distribution
      let classification = "Mixed";
      let classificationColor = "bg-gray-500";

      if (z1Pct >= 70 && z3Pct >= 10 && z2Pct <= 20) {
        classification = "Polarized";
        classificationColor = "bg-blue-500";
      } else if (z2Pct >= 25) {
        classification = "Threshold-Heavy";
        classificationColor = "bg-orange-500";
      } else if (z1Pct > z2Pct && z2Pct > z3Pct && z2Pct >= 10 && z2Pct <= 25) {
        classification = "Pyramidal";
        classificationColor = "bg-green-500";
      }

      // Generate weekly breakdown
      const weeks = Math.ceil(periodDays / 7);
      const weeklyData = [];
      
      for (let i = 0; i < weeks; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekActivities = activityZones.filter(a => 
          a.date >= weekStart && a.date < weekEnd
        );

        const weekZ1 = weekActivities.reduce((sum, a) => sum + a.zone1Minutes, 0);
        const weekZ2 = weekActivities.reduce((sum, a) => sum + a.zone2Minutes, 0);
        const weekZ3 = weekActivities.reduce((sum, a) => sum + a.zone3Minutes, 0);

        weeklyData.push({
          week: `Week ${i + 1}`,
          zone1: Math.round(weekZ1),
          zone2: Math.round(weekZ2),
          zone3: Math.round(weekZ3),
          total: Math.round(weekZ1 + weekZ2 + weekZ3),
        });
      }

      // Generate recommendations
      const recommendations = [];
      
      if (classification === "Threshold-Heavy") {
        const reduceZ2 = Math.round((z2Pct - 20) * totalMinutes / 100);
        const addZ1 = Math.round(reduceZ2 * 0.7);
        const addZ3 = Math.round(reduceZ2 * 0.3);
        
        recommendations.push({
          zone: "Zone 1",
          adjustment: `+${addZ1} min/week`,
          rationale: "Increase aerobic base to balance intensity"
        });
        recommendations.push({
          zone: "Zone 2",
          adjustment: `-${reduceZ2} min/week`,
          rationale: "Reduce threshold work to prevent overtraining"
        });
        recommendations.push({
          zone: "Zone 3",
          adjustment: `+${addZ3} min/week`,
          rationale: "Add high-intensity to maintain fitness"
        });
      } else if (classification === "Polarized" || classification === "Pyramidal") {
        recommendations.push({
          zone: "Current Split",
          adjustment: "Maintain",
          rationale: "Your distribution is well-balanced for sustainable progress"
        });
        
        if (z3Pct < 15) {
          recommendations.push({
            zone: "Zone 3",
            adjustment: `+${Math.round((15 - z3Pct) * totalMinutes / 100)} min/week`,
            rationale: "Consider adding more high-intensity for speed development"
          });
        }
      } else {
        const targetZ1 = 75;
        const targetZ2 = 15;
        const targetZ3 = 10;
        
        const z1Delta = Math.round((targetZ1 - z1Pct) * totalMinutes / 100);
        const z2Delta = Math.round((targetZ2 - z2Pct) * totalMinutes / 100);
        const z3Delta = Math.round((targetZ3 - z3Pct) * totalMinutes / 100);
        
        if (Math.abs(z1Delta) > 30) {
          recommendations.push({
            zone: "Zone 1",
            adjustment: `${z1Delta > 0 ? '+' : ''}${z1Delta} min/week`,
            rationale: z1Delta > 0 ? "Build aerobic base" : "Reduce easy volume slightly"
          });
        }
        if (Math.abs(z2Delta) > 20) {
          recommendations.push({
            zone: "Zone 2",
            adjustment: `${z2Delta > 0 ? '+' : ''}${z2Delta} min/week`,
            rationale: z2Delta > 0 ? "Add threshold work" : "Reduce threshold volume"
          });
        }
        if (Math.abs(z3Delta) > 15) {
          recommendations.push({
            zone: "Zone 3",
            adjustment: `${z3Delta > 0 ? '+' : ''}${z3Delta} min/week`,
            rationale: z3Delta > 0 ? "Increase high-intensity" : "Reduce high-intensity volume"
          });
        }
      }

      res.json({
        zone1Percent: z1Pct,
        zone2Percent: z2Pct,
        zone3Percent: z3Pct,
        zone1Minutes: Math.round(totalZ1),
        zone2Minutes: Math.round(totalZ2),
        zone3Minutes: Math.round(totalZ3),
        totalMinutes: Math.round(totalMinutes),
        classification,
        classificationColor,
        weeklyData,
        recommendations,
        hrZones: {
          lt1HR,
          lt2HR,
          hrMax,
        },
        activitiesAnalyzed: activitiesWithHR.length,
      });
    } catch (error: any) {
      console.error('Training split analysis error:', error);
      res.status(500).json({ message: error.message || "Failed to analyze training split" });
    }
  });

  // Race Predictor - Calculate race time prediction
  app.post("/api/race-predictor/calculate", async (req, res) => {
    try {
      const { predictRaceTime } = await import("@shared/racePrediction");
      const result = predictRaceTime(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Race prediction error:', error);
      res.status(500).json({ message: error.message || "Failed to calculate race prediction" });
    }
  });

  // Race Predictor - Get suitable activities for base effort (recent race efforts)
  app.get("/api/race-predictor/suitable-activities", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user for unit preference
      const user = await storage.getUser(userId);
      const unitPreference = user?.unitPreference || 'km';

      // Fetch recent activities (last 90 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const result = await storage.getActivitiesByUserIdPaginated(userId, {
        page: 1,
        pageSize: 100,
        minDistance: 3000, // At least 3km
        maxDistance: undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Filter for race-effort candidates (fast paces)
      const suitableActivities = result.activities
        .filter(activity => activity.movingTime >= 600) // At least 10 minutes
        .map(activity => {
          const distanceInKm = activity.distance / 1000;
          const distanceConverted = unitPreference === 'miles' ? distanceInKm * 0.621371 : distanceInKm;
          const pacePerKm = activity.distance > 0 ? (activity.movingTime / 60) / distanceInKm : 0;
          const paceConverted = unitPreference === 'miles' ? pacePerKm / 0.621371 : pacePerKm;

          return {
            id: activity.id,
            stravaId: activity.stravaId,
            name: activity.name,
            distance: activity.distance, // Keep in meters for calculation
            distanceFormatted: distanceConverted.toFixed(2),
            movingTime: activity.movingTime,
            durationFormatted: `${Math.floor(activity.movingTime / 60)}:${String(Math.floor(activity.movingTime % 60)).padStart(2, '0')}`,
            averageSpeed: activity.averageSpeed,
            paceFormatted: paceConverted > 0 ? `${Math.floor(paceConverted)}:${String(Math.round((paceConverted % 1) * 60)).padStart(2, '0')}` : "0:00",
            startDate: activity.startDate,
            distanceUnit: unitPreference === 'miles' ? 'mi' : 'km',
          };
        })
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()); // Most recent first

      res.json({ activities: suitableActivities });
    } catch (error: any) {
      console.error('Get race predictor suitable activities error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch activities" });
    }
  });

  // Cadence Analyzer - Analyze cadence from activity
  app.post("/api/cadence/analyze", authenticateJWT, async (req: any, res) => {
    try {
      const { activityId } = req.body;
      const userId = req.user!.id;

      if (!activityId) {
        return res.status(400).json({ message: "Activity ID required" });
      }

      // Fetch activity
      const activity = await storage.getActivityById(activityId);
      if (!activity || activity.userId !== userId) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Check if activity has cadence data
      if (!activity.averageCadence) {
        return res.status(400).json({ message: "Activity does not have cadence data" });
      }

      // Parse streams data
      let streamsData: any = {};
      if (activity.streamsData) {
        try {
          streamsData = typeof activity.streamsData === 'string' 
            ? JSON.parse(activity.streamsData) 
            : activity.streamsData;
        } catch (e) {
          console.error('Failed to parse streams data:', e);
        }
      }

      // Extract cadence time series
      const times = streamsData.time?.data || [];
      const cadences = streamsData.cadence?.data || [];
      const velocities = streamsData.velocity_smooth?.data || [];

      if (cadences.length === 0) {
        return res.status(400).json({ message: "No cadence stream data available for this activity" });
      }

      // Sample and analyze
      const { sampleCadenceData, analyzeCadence } = await import("@shared/cadenceAnalysis");
      const sampledData = sampleCadenceData(times, cadences, velocities);
      
      const analysis = analyzeCadence({
        dataPoints: sampledData,
        activityDuration: activity.movingTime,
        activityName: activity.name,
        distance: activity.distance
      });

      res.json(analysis);
    } catch (error: any) {
      console.error('Cadence analysis error:', error);
      res.status(500).json({ message: error.message || "Failed to analyze cadence" });
    }
  });

  // Cadence Analyzer - Get suitable activities (45+ min with cadence data)
  app.get("/api/cadence/suitable-activities", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user for unit preference
      const user = await storage.getUser(userId);
      const unitPreference = user?.unitPreference || 'km';

      // Fetch recent activities (last 60 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 60);

      const result = await storage.getActivitiesByUserIdPaginated(userId, {
        page: 1,
        pageSize: 100,
        minDistance: undefined,
        maxDistance: undefined,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Filter for cadence-suitable activities (45+ min with cadence data)
      const suitableActivities = result.activities
        .filter(activity => 
          activity.movingTime >= 2700 && // At least 45 minutes
          activity.averageCadence !== null &&
          activity.averageCadence > 0
        )
        .map(activity => {
          const distanceInKm = activity.distance / 1000;
          const distanceConverted = unitPreference === 'miles' ? distanceInKm * 0.621371 : distanceInKm;

          return {
            id: activity.id,
            name: activity.name,
            distance: distanceConverted.toFixed(2),
            movingTime: activity.movingTime,
            durationFormatted: `${Math.floor(activity.movingTime / 60)}:${String(Math.floor(activity.movingTime % 60)).padStart(2, '0')}`,
            averageCadence: activity.averageCadence,
            startDate: activity.startDate,
            distanceUnit: unitPreference === 'miles' ? 'mi' : 'km',
          };
        })
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

      res.json({ activities: suitableActivities });
    } catch (error: any) {
      console.error('Get cadence suitable activities error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch activities" });
    }
  });

  // Get all activities for a user with pagination and filtering
  app.get("/api/activities", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 25;
      const minDistance = req.query.minDistance ? parseFloat(req.query.minDistance as string) : undefined;
      const maxDistance = req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      // Get user for unit preference
      const user = await storage.getUser(userId);
      const unitPreference = user?.unitPreference || 'km';

      // Convert distance filters to meters based on unit preference
      let minDistanceMeters = minDistance;
      let maxDistanceMeters = maxDistance;
      
      if (minDistance) {
        minDistanceMeters = unitPreference === 'miles' ? minDistance * 1609.34 : minDistance * 1000;
      }
      if (maxDistance) {
        maxDistanceMeters = unitPreference === 'miles' ? maxDistance * 1609.34 : maxDistance * 1000;
      }

      const result = await storage.getActivitiesByUserIdPaginated(userId, {
        page,
        pageSize,
        minDistance: minDistanceMeters,
        maxDistance: maxDistanceMeters,
        startDate,
        endDate,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Get activities error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch activities" });
    }
  });

  // Get activities with polylines for heatmap visualization
  app.get("/api/activities/routes", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 30;
      
      const routes = await storage.getActivitiesWithPolylines(userId, limit);
      
      // Filter out activities without polylines and format for frontend
      // Use detailed polyline if summary polyline is not available
      const routesWithPolylines = routes
        .filter(route => route.polyline || route.detailedPolyline)
        .map(route => ({
          id: route.id,
          name: route.name,
          distance: route.distance,
          startDate: route.startDate,
          polyline: route.polyline || route.detailedPolyline,
        }));
      
      res.json({ 
        routes: routesWithPolylines,
        count: routesWithPolylines.length 
      });
    } catch (error: any) {
      console.error('Get routes error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch routes" });
    }
  });

  // Get activity details
  app.get("/api/activities/:activityId", async (req, res) => {
    try {
      const activityId = parseInt(req.params.activityId);
      
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      // Find activity across all users by searching through database
      const activity = await storage.getActivityById(activityId);
      
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
        // Include GPS coordinates for mapping
        startLatitude: activity.startLatitude,
        startLongitude: activity.startLongitude,
        endLatitude: activity.endLatitude,
        endLongitude: activity.endLongitude,
      };

      res.json({ activity: formattedActivity });
    } catch (error: any) {
      console.error('Activity fetch error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch activity" });
    }
  });

  // Subscription status endpoint - Returns Pro for all users (no payment required)
  app.get("/api/subscription/status", authenticateJWT, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Everyone gets Pro features for free
      res.json({ 
        status: 'active',
        plan: 'pro'
      });
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.status(500).json({ message: error.message || "Failed to get subscription status" });
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

  // Manual Strava activity sync endpoint
  app.post("/api/strava/sync-activities", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { maxActivities = 100 } = req.body;

      const user = await storage.getUser(userId);
      if (!user || !user.stravaConnected) {
        return res.status(400).json({ message: "Strava not connected" });
      }

      const result = await stravaService.syncActivitiesForUser(userId, maxActivities);
      
      // Auto-generate AI insights only if new activities were synced
      if (result.syncedCount > 0) {
        try {
          await aiService.generateInsights(userId);
          console.log('AI insights regenerated after manual sync');
        } catch (error) {
          console.error('Error generating AI insights after sync:', error);
        }
        
        // Check and auto-complete goals based on new activities
        try {
          const goalsResult = await goalsService.checkAndCompleteGoals(userId);
          if (goalsResult.completedGoals > 0) {
            console.log(`Auto-completed ${goalsResult.completedGoals} goals for user ${userId}`);
          }
        } catch (error) {
          console.error('Error checking goals after sync:', error);
        }
        
        // Invalidate cache for user's dashboard and chart data since new data was synced
        deleteCachedResponse(`dashboard:${userId}`);
        deleteCachedResponse(`chart:${userId}:30days`);
        console.log(`Cache invalidated for user ${userId} after syncing ${result.syncedCount} new activities`);
      }
      
      res.json({
        success: true,
        syncedCount: result.syncedCount,
        totalActivities: result.totalActivities,
        message: `Successfully synced ${result.syncedCount} new activities out of ${result.totalActivities} total activities`
      });
    } catch (error: any) {
      console.error('Manual sync error:', error);
      res.status(500).json({ message: error.message || "Failed to sync activities" });
    }
  });

  // Create a demo user for testing
  app.post("/api/demo/user", async (req, res) => {
    try {
      const user = await storage.createUser({
        email: "demo@runner.com",
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

      // Check cache first
      const cacheKey = `predictions:${userId}`;
      const cachedData = getCachedResponse(cacheKey);
      if (cachedData) {
        // Prevent browser caching with 304 responses
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');
        return res.json(cachedData);
      }

      const predictions = await mlService.predictRacePerformance(userId);
      const response = { predictions };
      
      // Cache the result
      setCachedResponse(cacheKey, response);
      
      res.json(response);
    } catch (error: any) {
      console.error('Race prediction error:', error);
      res.status(500).json({ message: error.message || "Failed to generate race predictions" });
    }
  });

  // ML Features - Training Plans
  app.post("/api/ml/training-plan/:userId", async (req, res) => {
    const startTime = Date.now();
    try {
      const userId = parseInt(req.params.userId);
      const { 
        weeks = 4, 
        goal = 'general', 
        daysPerWeek = 4, 
        targetDistance, 
        raceDate,
        fitnessLevel = 'intermediate'
      } = req.body;
      
      console.log(`[Training Plan] Request received for user ${userId}:`, { weeks, goal, daysPerWeek, targetDistance, raceDate, fitnessLevel });
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const params = {
        weeks,
        goal,
        daysPerWeek,
        targetDistance,
        raceDate,
        fitnessLevel
      };

      console.log(`[Training Plan] Calling GPT-5 to generate plan...`);
      const trainingPlan = await mlService.generateTrainingPlan(userId, params);
      const generationTime = Date.now() - startTime;
      console.log(`[Training Plan] GPT-5 generation completed in ${generationTime}ms`);
      
      // Save the training plan to database with metadata
      console.log(`[Training Plan] Saving plan to database...`);
      await storage.createTrainingPlan({
        userId,
        weeks,
        planData: trainingPlan
      });
      console.log(`[Training Plan] Plan saved successfully`);
      
      res.json({ trainingPlan });
    } catch (error: any) {
      const errorTime = Date.now() - startTime;
      console.error(`[Training Plan] Generation error after ${errorTime}ms:`, error);
      res.status(500).json({ message: error.message || "Failed to generate training plan" });
    }
  });

  // Get latest training plan
  app.get("/api/ml/training-plan/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const savedPlan = await storage.getLatestTrainingPlan(userId);
      
      if (savedPlan) {
        res.json({ trainingPlan: savedPlan.planData });
      } else {
        res.json({ trainingPlan: null });
      }
    } catch (error: any) {
      console.error('Error fetching training plan:', error);
      res.status(500).json({ message: error.message || "Failed to fetch training plan" });
    }
  });

  // Goals Progress Tracking
  app.get("/api/goals/progress/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const activities = await storage.getActivitiesByUserId(userId, 100);
      
      // Calculate current month's progress
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const currentMonthActivities = activities.filter(activity => {
        const activityDate = new Date(activity.startDate);
        return activityDate.getMonth() === currentMonth && activityDate.getFullYear() === currentYear;
      });

      // Calculate monthly distance (convert from meters to km)
      const monthlyDistance = currentMonthActivities.reduce((total, activity) => {
        return total + ((activity.distance || 0) / 1000); // Convert meters to km
      }, 0);

      // Calculate best 5K time from recent activities
      const fiveKActivities = activities.filter(activity => {
        const distance = (activity.distance || 0) / 1000; // Convert to km
        return distance >= 4.5 && distance <= 5.5; // 5K range
      }).sort((a, b) => (a.movingTime || 0) - (b.movingTime || 0));

      const best5K = fiveKActivities[0];
      
      // Calculate weekly distance (last 7 days)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyActivities = activities.filter(activity => {
        return new Date(activity.startDate) >= oneWeekAgo;
      });
      
      const weeklyDistance = weeklyActivities.reduce((total, activity) => {
        return total + ((activity.distance || 0) / 1000); // Convert meters to km
      }, 0);

      // Format distance based on user preference
      const isMetric = user.unitPreference === 'km' || user.unitPreference === null;
      
      const goals = [];

      // Monthly distance goal
      const monthlyTarget = isMetric ? 150 : 93; // 150km or 93 miles
      const monthlyProgress = Math.round((monthlyDistance / monthlyTarget) * 100);
      const daysLeftInMonth = new Date(currentYear, currentMonth + 1, 0).getDate() - now.getDate();
      
      goals.push({
        title: 'Monthly Distance',
        current: (monthlyDistance / (isMetric ? 1 : 1.60934)).toFixed(1),
        target: monthlyTarget.toString(),
        unit: isMetric ? 'km' : 'mi',
        progress: monthlyProgress,
        timeLeft: `${daysLeftInMonth} days remaining`,
        status: monthlyProgress >= 100 ? 'Completed!' : monthlyProgress >= 80 ? 'On track' : monthlyProgress >= 50 ? 'Behind pace' : 'Needs focus'
      });

      // 5K time goal (if user has 5K activities)
      if (best5K) {
        const currentTime = best5K.movingTime || 0;
        const targetTime = 20 * 60; // 20 minutes in seconds
        const currentTimeMinutes = Math.floor(currentTime / 60);
        const currentTimeSeconds = currentTime % 60;
        const targetProgress = Math.max(0, 100 - ((currentTime - targetTime) / targetTime * 100));
        
        goals.push({
          title: 'Sub-20 5K Goal',
          current: `${currentTimeMinutes}:${currentTimeSeconds.toString().padStart(2, '0')}`,
          target: '20:00',
          unit: 'PB',
          progress: Math.round(Math.min(100, targetProgress)),
          timeLeft: currentTime <= targetTime ? 'Achieved!' : `${Math.ceil((currentTime - targetTime) / 60)}min to improve`,
          status: currentTime <= targetTime ? 'Goal achieved!' : currentTime <= targetTime + 60 ? 'Very close' : 'Keep training'
        });
      }

      // Weekly consistency goal
      const weeklyTarget = isMetric ? 30 : 18.6; // 30km or 18.6 miles per week
      const weeklyProgress = Math.round((weeklyDistance / weeklyTarget) * 100);
      
      goals.push({
        title: 'Weekly Consistency',
        current: (weeklyDistance / (isMetric ? 1 : 1.60934)).toFixed(1),
        target: (weeklyTarget / (isMetric ? 1 : 1.60934)).toFixed(0),
        unit: isMetric ? 'km/week' : 'mi/week',
        progress: weeklyProgress,
        timeLeft: 'This week',
        status: weeklyProgress >= 100 ? 'Exceeded!' : weeklyProgress >= 80 ? 'Strong week' : 'Build it up'
      });

      res.json({ goals });
    } catch (error: any) {
      console.error('Error calculating goal progress:', error);
      res.status(500).json({ message: error.message || "Failed to calculate goal progress" });
    }
  });



  // Get activity with performance data
  app.get("/api/activities/:activityId/performance", async (req, res) => {
    try {
      const activityId = parseInt(req.params.activityId);
      
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      const activity = await storage.getActivityById(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Parse stored streams and laps data
      let streams = null;
      let laps = null;
      
      if (activity.streamsData) {
        try {
          streams = JSON.parse(activity.streamsData);
          
          // Convert cadence stream data from RPM to SPM (multiply by 2)
          if (streams?.cadence?.data) {
            streams.cadence.data = streams.cadence.data.map((rpm: number) => rpm * 2);
          }
        } catch (e) {
          console.error('Error parsing streams data:', e);
        }
      }
      
      if (activity.lapsData) {
        try {
          laps = JSON.parse(activity.lapsData);
          
          // Convert lap cadence data from RPM to SPM (multiply by 2)
          if (laps && Array.isArray(laps)) {
            laps = laps.map(lap => ({
              ...lap,
              average_cadence: lap.average_cadence ? lap.average_cadence * 2 : lap.average_cadence,
              max_cadence: lap.max_cadence ? lap.max_cadence * 2 : lap.max_cadence
            }));
          }
        } catch (e) {
          console.error('Error parsing laps data:', e);
        }
      }

      res.json({
        activity,
        streams,
        laps,
        hasPerformanceData: !!(streams || laps)
      });
    } catch (error: any) {
      console.error('Error fetching activity performance data:', error);
      res.status(500).json({ message: error.message || "Failed to fetch activity performance data" });
    }
  });

  // Batch Analytics Endpoint - Combines all ML and performance calculations
  app.get("/api/analytics/batch/:userId", async (req, res) => {
    const startTime = Date.now();
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check cache first
      const cacheKey = `analytics-batch:${userId}`;
      const cachedData = getCachedResponse(cacheKey);
      if (cachedData) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');
        console.log(`[Batch Analytics] Returned cached data in ${Date.now() - startTime}ms`);
        return res.json(cachedData);
      }

      console.log(`[Batch Analytics] Starting batch calculation for user ${userId}`);

      // Execute all calculations in parallel
      const [predictions, injuryRisk, trainingPlan, vo2Max, efficiency, hrZones] = await Promise.all([
        mlService.predictRacePerformance(userId).catch(err => {
          console.error('[Batch] Predictions error:', err.message);
          return null;
        }),
        mlService.analyzeInjuryRisk(userId).catch(err => {
          console.error('[Batch] Injury risk error:', err.message);
          return null;
        }),
        storage.getLatestTrainingPlan(userId).catch(err => {
          console.error('[Batch] Training plan error:', err.message);
          return null;
        }),
        performanceService.calculateVO2Max(userId).catch(err => {
          console.error('[Batch] VO2 Max error:', err.message);
          return null;
        }),
        performanceService.analyzeRunningEfficiency(userId).catch(err => {
          console.error('[Batch] Efficiency error:', err.message);
          return null;
        }),
        performanceService.calculateHeartRateZones(userId).catch(err => {
          console.error('[Batch] HR Zones error:', err.message);
          return null;
        })
      ]);

      const response = {
        predictions: predictions || [],
        injuryRisk,
        trainingPlan,
        vo2Max,
        efficiency,
        hrZones
      };

      // Cache the result
      setCachedResponse(cacheKey, response);
      
      const totalTime = Date.now() - startTime;
      console.log(`[Batch Analytics] Completed all calculations in ${totalTime}ms`);
      
      res.json(response);
    } catch (error: any) {
      const errorTime = Date.now() - startTime;
      console.error(`[Batch Analytics] Error after ${errorTime}ms:`, error);
      res.status(500).json({ message: error.message || "Failed to generate analytics" });
    }
  });

  // ML Features - Injury Risk Analysis
  app.get("/api/ml/injury-risk/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check cache first
      const cacheKey = `injury-risk:${userId}`;
      const cachedData = getCachedResponse(cacheKey);
      if (cachedData) {
        // Prevent browser caching with 304 responses
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.set('Pragma', 'no-cache');
        return res.json(cachedData);
      }

      const riskAnalysis = await mlService.analyzeInjuryRisk(userId);
      
      // Cache the result
      setCachedResponse(cacheKey, riskAnalysis);
      
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

      // Check cache first (only if no custom HR values provided)
      const cacheKey = `hr-zones:${userId}`;
      if (!maxHR && !restingHR) {
        const cachedData = getCachedResponse(cacheKey);
        if (cachedData) {
          // Prevent browser caching with 304 responses
          res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.set('Pragma', 'no-cache');
          return res.json(cachedData);
        }
      }

      const heartRateZones = await performanceService.calculateHeartRateZones(
        userId,
        maxHR ? parseInt(maxHR as string) : undefined,
        restingHR ? parseInt(restingHR as string) : undefined
      );
      
      const response = { heartRateZones };
      
      // Cache the result (only if no custom HR values provided)
      if (!maxHR && !restingHR) {
        setCachedResponse(cacheKey, response);
      }
      
      res.json(response);
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
      
      // If no data available, return null (user will see fallback UI)
      if (!efficiencyData) {
        return res.json(null);
      }
      
      // Get user's unit preference
      const user = await storage.getUser(userId);
      const unitPreference = user?.unitPreference || 'km';
      
      res.json({
        ...efficiencyData,
        unitPreference
      });
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

  // Admin routes
  app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      console.error('Admin stats error:', error);
      res.status(500).json({ message: error.message || "Failed to get admin stats" });
    }
  });

  app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 25;
      const offset = (page - 1) * pageSize;
      
      const allUsers = await storage.getAllUsers(1000); // Get all users
      const total = allUsers.length;
      const users = allUsers.slice(offset, offset + pageSize);
      
      // Remove sensitive data
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        stravaConnected: user.stravaConnected,
        unitPreference: user.unitPreference,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        lastSyncAt: user.lastSyncAt
      }));
      
      res.json({
        users: sanitizedUsers,
        total,
        page,
        pageSize
      });
    } catch (error: any) {
      console.error('Admin users error:', error);
      res.status(500).json({ message: error.message || "Failed to get users" });
    }
  });


  app.get("/api/admin/analytics", authenticateAdmin, async (req, res) => {
    try {
      const analytics = await storage.getUserAnalytics();
      res.json(analytics);
    } catch (error: any) {
      console.error('Admin analytics error:', error);
      res.status(500).json({ message: error.message || "Failed to get user analytics" });
    }
  });

  // Get performance logs with filtering options
  app.get("/api/admin/performance-logs", authenticateAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const endpoint = req.query.endpoint as string | undefined;
      const method = req.query.method as string | undefined;
      const minStatusCode = req.query.minStatusCode ? parseInt(req.query.minStatusCode as string) : undefined;
      const maxStatusCode = req.query.maxStatusCode ? parseInt(req.query.maxStatusCode as string) : undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const logs = await storage.getPerformanceLogs({
        limit,
        userId,
        endpoint,
        method,
        minStatusCode,
        maxStatusCode,
        startDate,
        endDate,
      });

      res.json({ logs, count: logs.length });
    } catch (error: any) {
      console.error('Performance logs error:', error);
      res.status(500).json({ message: error.message || "Failed to get performance logs" });
    }
  });

  app.get("/api/admin/performance", authenticateAdmin, async (req, res) => {
    try {
      const performance = await storage.getSystemPerformance();
      res.json(performance);
    } catch (error: any) {
      console.error('Admin performance error:', error);
      res.status(500).json({ message: error.message || "Failed to get system performance" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

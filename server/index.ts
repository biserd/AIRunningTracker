import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { performanceLogger } from "./middleware/performance-logger";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { storage } from './storage';
import { emailService } from './services/email';

const app = express();

// Security headers for HTTPS
app.use((req, res, next) => {
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  
  // Security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// Stripe webhook route MUST be before express.json() - needs raw body
app.post(
  '/api/stripe/webhook/:uuid',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Performance logging middleware - captures all API requests
app.use(performanceLogger);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Add process error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Trial email scheduler - runs daily to send reminder and expiry emails
async function processTrialEmails() {
  console.log('[Trial Scheduler] Processing trial emails...');
  try {
    let remindersSent = 0;
    let remindersSkipped = 0;
    let expiredSent = 0;
    let expiredSkipped = 0;

    // 1. Send reminder emails (2 days before expiry) - with dedupe check
    const usersNearingExpiry = await storage.getUsersWithTrialEndingSoon(2);
    for (const user of usersNearingExpiry) {
      try {
        // Check if we already sent a trial reminder to this user
        const dedupeKey = `trial_reminder_${user.id}`;
        const existingNotification = await storage.getNotificationByDedupeKey(dedupeKey);
        
        if (existingNotification) {
          remindersSkipped++;
          console.log(`[Trial Scheduler] Skipping reminder for ${user.email} - already sent`);
          continue;
        }
        
        // Send the email
        await emailService.sendTrialReminderEmail(user.email, user.firstName || undefined, 2);
        
        // Track in notification_outbox to prevent future duplicates
        const notification = await storage.createNotification({
          userId: user.id,
          type: 'trial_reminder',
          channel: 'email',
          title: 'Trial Reminder',
          body: `Sent trial reminder email to ${user.email}`,
          dedupeKey,
        });
        await storage.markNotificationSent(notification.id);
        
        remindersSent++;
        console.log(`[Trial Scheduler] Sent reminder to ${user.email}`);
      } catch (err: any) {
        console.error(`[Trial Scheduler] Failed to send reminder to ${user.email}:`, err.message);
      }
    }

    // 2. Send expiry emails (trial just ended) - with dedupe check
    const usersWithExpiredTrials = await storage.getUsersWithExpiredTrials();
    for (const user of usersWithExpiredTrials) {
      try {
        // Check if we already sent a trial expired email to this user
        const dedupeKey = `trial_expired_${user.id}`;
        const existingNotification = await storage.getNotificationByDedupeKey(dedupeKey);
        
        if (existingNotification) {
          expiredSkipped++;
          console.log(`[Trial Scheduler] Skipping expiry email for ${user.email} - already sent`);
          continue;
        }
        
        // Send the email
        await emailService.sendTrialExpiredEmail(user.email, user.firstName || undefined);
        
        // Track in notification_outbox to prevent future duplicates
        const notification = await storage.createNotification({
          userId: user.id,
          type: 'trial_expired',
          channel: 'email',
          title: 'Trial Expired',
          body: `Sent trial expired email to ${user.email}`,
          dedupeKey,
        });
        await storage.markNotificationSent(notification.id);
        
        expiredSent++;
        console.log(`[Trial Scheduler] Sent expiry email to ${user.email}`);
      } catch (err: any) {
        console.error(`[Trial Scheduler] Failed to send expiry to ${user.email}:`, err.message);
      }
    }

    console.log(`[Trial Scheduler] Complete - Reminders: ${remindersSent} sent, ${remindersSkipped} skipped | Expiry: ${expiredSent} sent, ${expiredSkipped} skipped`);
  } catch (error) {
    console.error('[Trial Scheduler] Error processing trial emails:', error);
  }
}

function startTrialEmailScheduler() {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  
  // Run once shortly after startup (5 minutes delay to let server stabilize)
  setTimeout(() => {
    processTrialEmails();
  }, 5 * 60 * 1000);
  
  // Then run every 24 hours
  setInterval(() => {
    processTrialEmails();
  }, ONE_DAY_MS);
  
  console.log('[Trial Scheduler] Started - will process emails daily');
}

// Initialize Stripe schema and sync
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL not set - Stripe integration disabled');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl, schema: 'stripe' });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    // Set up managed webhook
    console.log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      { enabled_events: ['*'], description: 'RunAnalytics Stripe sync' }
    );
    console.log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`);

    // Sync Stripe data in background
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

(async () => {
  try {
    // Initialize Stripe before routes
    await initStripe();
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error('Server error:', err);
      res.status(status).json({ message });
      // Don't throw the error to prevent server crash
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      console.log(`🚀 RunAnalytics app is ready at http://localhost:${port}`);
      
      // Start the trial email scheduler
      startTrialEmailScheduler();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

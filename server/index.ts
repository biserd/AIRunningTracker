import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { performanceLogger } from "./middleware/performance-logger";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';

const app = express();

// Health check endpoint - MUST be first, before any middleware that could slow or redirect
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Security headers (TLS termination is handled by Replit's proxy - no HTTPS redirect needed)
app.use((_req, res, next) => {
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
    const webhookBaseUrl = `https://aitracker.run`;
    const { webhook, uuid } = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      { enabled_events: ['*'], description: 'RunAnalytics Stripe sync' }
    );
    console.log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`);

    // Sync Stripe data in background, then verify Premium price config so we
    // surface "no live Premium price tagged + no env override" loudly at boot
    // instead of silently failing checkout later.
    stripeSync.syncBackfill()
      .then(async () => {
        console.log('Stripe data synced');
        await verifyPremiumPriceConfig();
      })
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

async function verifyPremiumPriceConfig(): Promise<void> {
  try {
    const envMonthly = process.env.STRIPE_PRICE_PREMIUM_MONTHLY;
    if (envMonthly) {
      console.log(`[startup-check] STRIPE_PRICE_PREMIUM_MONTHLY=${envMonthly} (env override active)`);
      return;
    }
    // No env override -- check that at least one live Stripe price is tagged
    // with metadata.plan='premium' & metadata.billing='monthly'.
    const { db } = await import('./db');
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`
      SELECT id FROM stripe.prices
      WHERE active = true
        AND metadata->>'plan' = 'premium'
        AND metadata->>'billing' = 'monthly'
      LIMIT 1
    `);
    const rows: any[] = (result as any).rows || (result as any) || [];
    if (rows.length === 0) {
      const msg =
        '[startup-check] no Premium monthly price found. ' +
        'Either set env STRIPE_PRICE_PREMIUM_MONTHLY, or tag a live Stripe price ' +
        "with metadata.plan='premium' and metadata.billing='monthly'. " +
        'Until this is fixed, the pricing page checkout will fail at request time.';
      // We deliberately do NOT process.exit here even in production: a
      // transient Stripe-sync hiccup at boot could otherwise crash-loop
      // the deployment. The request-time checks in
      // /api/stripe/create-checkout-session
      // already fail clearly with 4xx/5xx if config is missing, so missed
      // checkouts surface immediately to ops via 500-rate alerts.
      // STRIPE_PRICE_PREMIUM_MONTHLY (env) is the recommended belt-and-suspenders.
      if (process.env.NODE_ENV === 'production') {
        console.error('[startup-check] FATAL (production) - Stripe Premium price unconfigured:', msg);
      } else {
        console.warn('[startup-check] WARNING:', msg);
      }
    } else {
      console.log(`[startup-check] Premium monthly price OK (priceId=${rows[0].id})`);
    }
  } catch (err: any) {
    console.warn('[startup-check] Could not verify Premium price config:', err?.message || err);
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
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

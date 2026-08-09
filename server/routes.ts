import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import * as fs from "fs";
import * as path from "path";
import { storage, RUNNING_ACTIVITY_TYPES } from "./storage";
import { stravaService } from "./services/strava";
import { stravaClient } from "./services/stravaClient";
import { jobQueue, createListActivitiesJob, createHydrateActivityJob, metrics } from "./services/queue";
import { aiService } from "./services/ai";
import { mlService } from "./services/ml";
import { performanceService } from "./services/performance";
import { authService, AuthError } from "./services/auth";
import { emailService } from "./services/email";
import { runnerScoreService } from "./services/runnerScore";
import goalsService from "./services/goals";
import { ChatService } from "./services/chat";
import { fitnessService } from "./services/fitness";
import { autoLinkActivitiesForPlan } from "./services/activityLinker";
import { calculateYearlyStats, reverseGeocode } from "./services/yearEndRecap";
import { effortScoreService } from "./services/effortScore";
import { coachVerdictService } from "./services/coachVerdict";
import { getRecoveryState } from "./services/recoveryService";
import { dataQualityService } from "./services/dataQuality";
import { efficiencyService } from "./services/efficiency";
import { dripCampaignService } from "./services/dripCampaign";
import { dripCampaignWorker } from "./services/dripCampaignWorker";
import { sendWeeklySummaries, weeklySummaryWorker } from "./services/weeklySummaryWorker";
import { accountDormancyWorker, reactivateDormantAccount } from "./services/accountDormancy";
import { stravaWebhookService } from "./services/stravaWebhook";
import { insertUserSchema, loginSchema, registerSchema, insertFeedbackSchema, insertGoalSchema, updateCoachPreferencesSchema, emailWaitlist, users, stravaWebhookLogs, notificationOutbox, type Activity, type RunningShoe } from "@shared/schema";
import { shoeData } from "./shoe-data";
import { validateAllShoes, getPipelineStats, findDuplicates, getShoeDataWithMetadata, getShoesWithMetadataFromStorage, getEnrichedShoeData, enrichShoeWithAIData } from "./shoe-pipeline";
import { z } from "zod";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { resolvePlan } from "./webhookHandlers";
import { db } from "./db";
import { sql, eq, isNull } from "drizzle-orm";
import { checkInsightRateLimit, incrementInsightCount, getUserUsageStats, getActivityHistoryLimit, getFreeActivityLimit, RATE_LIMITS, canSyncFromStrava, getInitialSyncCap, isPaidPlan } from "./rateLimits";
import { renderBlogPost, renderShoePage, renderComparisonPage, renderHomepage, renderToolPage, getAllToolSlugs, renderFaqPage, renderBlogIndex, renderPricingPage, renderFeaturesPage, renderAboutPage, renderEbookLandingPage, renderDevelopersPage, renderDevelopersApiPage, renderToolsHubPage } from "./ssr/renderer";
import { getAllBlogPosts } from "./ssr/blogContent";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import {
  type Capability,
  canAccessCapability,
  getCapabilityMatrix,
  hasPremiumAccess,
} from "@shared/entitlements";
import { normalizeCadenceToSpm } from "@shared/cadenceNormalization";
import { buildUpgradeUrl, isBenefitKey, sanitizeReturnTo } from "@shared/upgradeIntent";
import { recordFunnelEvent } from "./services/funnelAnalytics";
import { isClientFunnelEvent, buildFunnelDedupeKey, billingPeriodFromInterval } from "@shared/funnelEvents";
import { getDashboardCalendarPeriods, getLastMonthComparisonEnd, partitionDashboardActivities } from "./services/dashboardPeriods";
import { formatRunDistance, formatRunDuration, formatRunPace, runUnitLabels } from "@shared/runFormatting";
import { summarizeTrainingSplit } from "@shared/trainingSplit";
import { canonicalizeShoeCatalog, normalizedShoeModelKey } from "@shared/shoeCanonicalization";
import { registerMcpRoutes } from "./mcp/router";
import { ensureProactiveCoachSchema, isValidTimezone, localDateKey, proactiveCoachWorker } from "./services/proactiveCoach";
import { notificationDeliveryWorker } from "./services/notificationProcessor";

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

async function requireCapability(
  req: any,
  res: Response,
  capability: Capability,
) {
  const user = await storage.getUser(req.user.id);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return null;
  }

  if (!canAccessCapability(user, capability)) {
    res.status(403).json({
      code: "PREMIUM_REQUIRED",
      capability,
      message: "Premium access required.",
    });
    return null;
  }

  return user;
}

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
const CACHE_TTL = 60 * 1000; // 60 seconds (default)
const CACHE_TTL_LONG = 5 * 60 * 1000; // 5 minutes (for expensive/stable endpoints like platform-stats)
const ENABLE_CACHE_LOGGING = process.env.NODE_ENV !== 'production'; // Disable verbose logging in production

function getCachedResponse(key: string, ttl: number = CACHE_TTL): any | null {
  const entry = responseCache.get(key);
  if (!entry) {
    if (ENABLE_CACHE_LOGGING) {
      console.log(`[CACHE] Key "${key}" not found in cache. Cache size: ${responseCache.size}`);
    }
    return null;
  }
  
  const now = Date.now();
  const age = now - entry.timestamp;
  if (age > ttl) {
    if (ENABLE_CACHE_LOGGING) {
      console.log(`[CACHE] Key "${key}" expired (age: ${age}ms, TTL: ${ttl}ms)`);
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

export function deleteCachedResponse(key: string): void {
  const deleted = responseCache.delete(key);
  if (ENABLE_CACHE_LOGGING) {
    console.log(`[CACHE] ${deleted ? 'Deleted' : 'Attempted to delete'} cache key "${key}". Cache size: ${responseCache.size}`);
  }
}

export function deleteCachedByPrefix(prefix: string): void {
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
    }
  }
}

// Resolve the price ID for the Premium plan (current Stripe environment).
// Strategy:
//   1. Env-var override (STRIPE_PRICE_PREMIUM_MONTHLY / STRIPE_PRICE_PREMIUM_ANNUAL)
//   2. Active price in stripe.prices sync table whose product/price metadata
//      matches { plan: 'premium', billing: 'monthly' | 'annual' }.
// Returns null if nothing matches so the caller can return a clear 500.
const _priceCache = new Map<string, { value: string | null; at: number }>();
const PRICE_CACHE_TTL = 60_000; // 60s
async function resolvePremiumPriceId(billing: 'monthly' | 'annual'): Promise<string | null> {
  const envName = billing === 'monthly' ? 'STRIPE_PRICE_PREMIUM_MONTHLY' : 'STRIPE_PRICE_PREMIUM_ANNUAL';
  const envVal = process.env[envName];
  if (envVal) return envVal;

  const cached = _priceCache.get(billing);
  if (cached && Date.now() - cached.at < PRICE_CACHE_TTL) return cached.value;

  try {
    const result = await db.execute(sql`
      SELECT pr.id
      FROM stripe.prices pr
      JOIN stripe.products p ON p.id = pr.product
      WHERE pr.active = true
        AND p.active = true
        AND (
          (pr.metadata->>'plan' = 'premium' AND pr.metadata->>'billing' = ${billing})
          OR (
            p.metadata->>'plan' = 'premium'
            AND (pr.recurring->>'interval' = ${billing === 'monthly' ? 'month' : 'year'})
          )
        )
      ORDER BY pr.created DESC
      LIMIT 1
    `);
    const row: any = result.rows?.[0];
    const id = row?.id ? String(row.id) : null;
    _priceCache.set(billing, { value: id, at: Date.now() });
    return id;
  } catch (err) {
    console.warn(`[resolvePremiumPriceId] DB lookup failed for ${billing}:`, (err as any)?.message);
    return null;
  }
}

// Server-side allow-list for /api/stripe/create-checkout-session. We never
// trust a client-supplied priceId blindly: it must either match a configured
// env override or be tagged as Premium in our synced stripe.prices table.
// 60s cache to keep happy paths fast.
const _allowedPriceCache = new Map<string, { allowed: boolean; at: number }>();
async function isAllowedCheckoutPriceId(priceId: unknown): Promise<boolean> {
  if (typeof priceId !== 'string' || !priceId.startsWith('price_')) return false;

  // Env-pinned IDs are always allowed.
  if (
    priceId === process.env.STRIPE_PRICE_PREMIUM_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_PREMIUM_ANNUAL
  ) {
    return true;
  }

  const cached = _allowedPriceCache.get(priceId);
  if (cached && Date.now() - cached.at < PRICE_CACHE_TTL) return cached.allowed;

  let allowed = false;
  try {
    const result = await db.execute(sql`
      SELECT 1
      FROM stripe.prices pr
      JOIN stripe.products p ON p.id = pr.product
      WHERE pr.id = ${priceId}
        AND pr.active = true
        AND p.active = true
        AND (pr.metadata->>'plan' = 'premium' OR p.metadata->>'plan' = 'premium')
      LIMIT 1
    `);
    allowed = (result.rows?.length ?? 0) > 0;
  } catch (err) {
    console.warn('[isAllowedCheckoutPriceId] DB lookup failed:', (err as any)?.message);
    allowed = false;
  }
  _allowedPriceCache.set(priceId, { allowed, at: Date.now() });
  return allowed;
}

export async function registerRoutes(app: Express): Promise<Server> {
  registerObjectStorageRoutes(app);
  await registerMcpRoutes(app);
  await ensureProactiveCoachSchema();

  
  // SEO: Page-specific meta data for dynamic rendering
  // Maps routes to SEO metadata for crawler-optimized responses
  const SEO_PAGES: Record<string, { title: string; description: string; keywords?: string; ogImage?: string }> = {
    "/": {
      title: "RunAnalytics - AI-Powered Running Insights & Analytics",
      description: "Get personalized running analytics with AI coaching, race predictions, and training insights. Connect Strava for free and unlock your running potential.",
      keywords: "running analytics, AI running coach, Strava analytics, runner score, race predictions"
    },
    "/tools": {
      title: "Free Running Tools & Calculators | RunAnalytics",
      description: "Free running calculators for pacing, splits and fueling, plus connected Strava analyzers for cadence, training balance and aerobic drift.",
      keywords: "running tools, running calculators, free running apps, marathon calculator, running analysis"
    },
    "/tools/race-predictor": {
      title: "Race Time Predictor | Free 5K to Marathon Calculator | RunAnalytics",
      description: "Predict your 5K, 10K, half marathon & marathon times using the Riegel formula. Import Strava data for personalized race predictions. Free calculator.",
      keywords: "race time predictor, marathon time calculator, running pace calculator, Riegel formula"
    },
    "/tools/marathon-fueling": {
      title: "Marathon Fueling Calculator | Gel Timing & Nutrition Plan | RunAnalytics",
      description: "Turn practiced carbohydrate and product targets into a simple marathon fueling schedule, with clear sodium and fluid limitations.",
      keywords: "marathon fueling, gel timing calculator, marathon nutrition plan, race nutrition"
    },
    "/tools/aerobic-decoupling-calculator": {
      title: "Aerobic Decoupling Calculator | Running Endurance Test | RunAnalytics",
      description: "Measure aerobic fade on long runs. Calculate your Pa:HR ratio and endurance efficiency score. Free tool with Strava import.",
      keywords: "aerobic decoupling, running endurance test, cardiac drift calculator, Pa:HR ratio"
    },
    "/tools/training-split-analyzer": {
      title: "Training Split Analyzer | Polarized vs Pyramidal Training | RunAnalytics",
      description: "Analyze your running intensity distribution. Discover if you're training polarized, pyramidal, or threshold-heavy. Free with Strava sync.",
      keywords: "training split analyzer, polarized training, pyramidal training, running zones"
    },
    "/tools/cadence-analyzer": {
      title: "Running Cadence Analyzer | Form Stability Score | RunAnalytics",
      description: "Review cadence stability and late-run change from connected activity data, with pace context, methodology and clear limitations.",
      keywords: "running cadence analyzer, form stability, stride length, running form analysis"
    },
    "/tools/training-pace-calculator": {
      title: "Training Pace Calculator | Free Running Pace Zones",
      description: "Calculate broad easy, long-run, steady, threshold and int×^µïÛh‘éì¶»§q«^tØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈÙ][œ™XYÛİ[ˆJNÃBˆCBˆJNÃBƒBˆËÈX\šÈÚ[™ÛH›İYšXØ][Ûˆ\È™XYBˆ\œÜİ
‹Ø\KÛ›İYšXØ][ÛœËÎ››İYšXØ][Û’YÜ™XY‹]][XØ]R•Õ\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİ›İYšXØ][Û’YH\œÙR[
™\Kœ\˜[\Ë››İYšXØ][Û’Y
NÃBˆÛÛœİ\Ù\’YH™\K\Ù\ˆKšYÃBˆBˆÛÛœİİXØÙ\ÜÈH]ØZ]İÜ˜YÙK›X\šÓ›İYšXØ][Û”™XY›Ü•\Ù\Š›İYšXØ][Û’Y\Ù\’Y
NÃBˆYˆ
\İXØÙ\ÜÊHÃBˆ™]\›ˆ™\Ëœİ]\Ê
KšœÛÛŠÈY\ÜØYÙNˆ“›İYšXØ][Ûˆ›İ›İ[™ˆJNÃBˆCBˆBˆ™\ËšœÛÛŠÈİXØÙ\ÜÎˆYHJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ“X\šÈ›İYšXØ][Ûˆ™XY\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈX\šÈ›İYšXØ][Ûˆ\È™XYˆJNÃBˆCBˆJNÃBƒBˆËÈX\šÈ[›İYšXØ][ÛœÈ\È™XYBˆ\œÜİ
‹Ø\KÛ›İYšXØ][ÛœËÜ™XYX[‹]][XØ]R•Õ\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİ\Ù\’YH™\K\Ù\ˆKšYÃBˆ]ØZ]İÜ˜YÙK›X\šĞ[›İYšXØ][ÛœÔ™XY
\Ù\’Y
NÃBˆ™\ËšœÛÛŠÈİXØÙ\ÜÎˆYHJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ“X\šÈ[›İYšXØ][ÛœÈ™XY\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈX\šÈ›İYšXØ][ÛœÈ\È™XYˆJNÃBˆCBˆJNÃBƒBˆËÈOOOOOOOOOOOOH’TĞSTRQÓˆS‘ÒS•ÈOOOOOOOOOOOOCBƒBˆËÈ˜XÚÈ[XZ[ÛXÚÈ
X›XÈ[™Ú[Ú]ÚÙ[ˆ˜[Y][ÛŠCBˆ\™Ù]
‹Ø\Kİ˜XÚËØÛXÚÈ‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİÈ\Ù\’YØ[\ZYÛ‹İ\™Y\™XİÛİ\˜ÙHHH™\Kœ]Y\NÃBˆBˆYˆ
\Ù\’Y	‰ˆØ[\ZYÛˆ	‰ˆİ\
HÃBˆ]ØZ]İÜ˜YÙK˜Ü™X]Q[XZ[ÛXÚÊÃBˆ\Ù\’Yˆ\œÙR[
\Ù\’Y
KBˆØ[\ZYÛ‹Bˆİ\BˆÛİ\˜ÙNˆÛİ\˜ÙH[BˆİRÙ^Nˆ[BˆJNÃBˆCBˆBˆËÈ™Y\™XİÈH\™Ù]T“Üˆ\Ú›Ø\™BˆÛÛœİ\™Ù]\›H™Y\™Xİ	ËÙ\Ú›Ø\™	ÎÃBˆ™\Ëœ™Y\™Xİ
Ì‹\™Ù]\›
NÃBˆHØ]Ú
\œ›ÜŠHÃBˆÛÛœÛÛK™\œ›ÜŠ•˜XÚÈÛXÚÈ\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœ™Y\™Xİ
Ì‹	ËÙ\Ú›Ø\™	ÊNÃBˆCBˆJNÃBƒBˆËÈYZ[ˆÙ]Ø[\ZYÛˆ[˜[]XÜÃBˆ\™Ù]
‹Ø\KØYZ[‹ØØ[\ZYÛœËØ[˜[]XÜÈ‹]][XØ]PYZ[‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİ[˜[]XÜÈH]ØZ]İÜ˜YÙK™Ù]Ø[\ZYÛ[˜[]XÜÊ
NÃBˆ™\ËšœÛÛŠ[˜[]XÜÊNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠØ[\ZYÛˆ[˜[]XÜÈ\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈÙ][˜[]XÜÈˆJNÃBˆCBˆJNÃBƒBˆËÈYZ[ˆÙ]š\Ø[\ZYÛˆÛÜšÙ\ˆİ]\ÃBˆ\™Ù]
‹Ø\KØYZ[‹ØØ[\ZYÛœËİÛÜšÙ\‹\İ]\È‹]][XØ]PYZ[‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİİ]\ÈHš\Ø[\ZYÛ•ÛÜšÙ\‹™Ù]İ]\Ê
NÃBˆ™\ËšœÛÛŠİ]\ÊNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ•ÛÜšÙ\ˆİ]\È\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈÙ]ÛÜšÙ\ˆİ]\ÈˆJNÃBˆCBˆJNÃBƒBˆËÈYZ[ˆšYÙÙ\ˆX[X[š\Ø[\ZYÛˆÛÜšÙ\ˆ[ƒBˆ\œÜİ
‹Ø\KØYZ[‹ØØ[\ZYÛœËÜ›ØÙ\ÜÈ‹]][XØ]PYZ[‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆ]ØZ]š\Ø[\ZYÛ•ÛÜšÙ\‹œ[“›İÊ
NÃBˆ™\ËšœÛÛŠÈİXØÙ\ÜÎˆYKY\ÜØYÙNˆ•ÛÜšÙ\ˆ[ˆšYÙÙ\™YˆJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ•ÛÜšÙ\ˆšYÙÙ\ˆ\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈšYÙÙ\ˆÛÜšÙ\ˆˆJNÃBˆCBˆJNÃBƒBˆËÈYZ[ˆÙÙÛHš\Ø[\ZYÛœÈÓ‹ÓÑ‘ƒBˆ\œÜİ
‹Ø\KØYZ[‹ØØ[\ZYÛœËİÙÙÛH‹]][XØ]PYZ[‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİÈ[˜X›YHH™\K˜›ÙNÃBˆBˆYˆ
\[Ùˆ[˜X›YOOH	Ø›ÛÛX[‰ÊHÃBˆ™]\›ˆ™\Ëœİ]\Ê
KšœÛÛŠÈY\ÜØYÙNˆ™[˜X›Y]\İ™HH›ÛÛX[ˆˆJNÃBˆCBˆBˆ]ØZ]š\Ø[\ZYÛ•ÛÜšÙ\‹œÙ]Ø[\ZYÛœÑ[˜X›Y
[˜X›Y
NÃBˆBˆ™\ËšœÛÛŠÈBˆİXØÙ\ÜÎˆYKBˆØ[\ZYÛœÑ[˜X›Yˆš\Ø[\ZYÛ•ÛÜšÙ\‹š\ĞØ[\ZYÛœÑ[˜X›Y

KBˆY\ÜØYÙNˆš\Ø[\ZYÛœÈ	Ù[˜X›YÈ	ÑSP“Q	Èˆ	ÑTĞP“Q	ßXBˆJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠØ[\ZYÛˆÙÙÛH\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈÙÙÛHØ[\ZYÛœÈˆJNÃBˆCBˆJNÃBƒBˆËÈYZ[ˆÙ]ÙYÛY[İ]È›ÜˆØ[\ZYÛœÈ
™XYÈœ›ÛH\Ù\—ØØ[\ZYÛœÈX›JCBˆ\™Ù]
‹Ø\KØYZ[‹ØØ[\ZYÛœËÜÙYÛY[\İ]È‹]][XØ]PYZ[‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆËÈÙ]XİX[[œ›ÛY[Ûİ[Èœ›ÛH\Ù\—ØØ[\ZYÛœÈX›CBˆÛÛœİÙYÛY[İ]ÈH]ØZ]İÜ˜YÙK™Ù]ÙYÛY[İ]Ñœ›ÛPØ[\ZYÛœÊ
NÃBˆBˆËÈÙ]\Ù\ˆÛİ[È\Ú[™È›Ü\ˆÛİ[]Y\šY\È
›È[Z]
CBˆÛÛœİ\Ù\Ûİ[ÈH]ØZ]İÜ˜YÙK™Ù]\Ù\Ûİ[ĞTİXœØÜš\[ÛŠ
NÃBˆBˆ™\ËšœÛÛŠÃBˆÙYÛY[ØNˆÙYÛY[İ]ËœÙYÛY[ØHBˆÙYÛY[ØˆÙYÛY[İ]ËœÙYÛY[ØˆBˆÙYÛY[ØÎˆÙYÛY[İ]ËœÙYÛY[ØÈBˆZYˆ\Ù\Ûİ[ËœZYBˆİ[ˆ\Ù\Ûİ[Ëİ[BˆJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ”ÙYÛY[İ]È\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈÙ]ÙYÛY[İ]ÈˆJNÃBˆCBˆJNÃBƒBˆËÈYZ[ˆÙ][™[™È[XZ[›ØœÃBˆ\™Ù]
‹Ø\KØYZ[‹ØØ[\ZYÛœËÜ[™[™ËZ›ØœÈ‹]][XØ]PYZ[‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİ[Z]H\œÙR[
™\Kœ]Y\OË›[Z]\Èİš[™ÊHLÃBˆÛÛœİ›ØœÈH]ØZ]İÜ˜YÙK™Ù][™[™Ñ[XZ[›ØœÊ[Z]
NÃBˆ™\ËšœÛÛŠÈ›ØœËÛİ[ˆ›ØœË›[™İJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ”[™[™È›ØœÈ\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈÙ][™[™È›ØœÈˆJNÃBˆCBˆJNÃBƒBˆËÈYZ[ˆ[œ›ÛZ\ÜÚ[™È\Ù\œÈ[Èš\Ø[\ZYÛœÃBˆ\œÜİ
‹Ø\KØYZ[‹ØØ[\ZYÛœËÙ[œ›Û[Z\ÜÚ[™È‹]][XØ]PYZ[‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİ™\İ[H]ØZ]š\Ø[\ZYÛ”Ù\šXÙK™[œ›ÛZ\ÜÚ[™Õ\Ù\œÊ
NÃBˆ™\ËšœÛÛŠÈBˆİXØÙ\ÜÎˆYKBˆ[œ›ÛYˆ™\İ[™[œ›ÛYBˆÚÚ\Yˆ™\İ[œÚÚ\YBˆY\ÜØYÙNˆ[œ›ÛY	Ü™\İ[™[œ›ÛYH\Ù\œËÚÚ\Y	Ü™\İ[œÚÚ\YH[™XYH[œ›ÛYBˆJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ‘[œ›ÛZ\ÜÚ[™È\Ù\œÈ\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈ[œ›Û\Ù\œÈˆJNÃBˆCBˆJNÃBƒBˆËÈYZ[ˆÙ]Ù[ÛÛYH[XZ[Ø[\ZYÛˆİ]ÃBˆ\™Ù]
‹Ø\KØYZ[‹İÙ[ÛÛYKXØ[\ZYÛ‹Üİ]È‹]][XØ]PYZ[‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİİ]ÈH]ØZ]İÜ˜YÙK™Ù]Ù[ÛÛYPØ[\ZYÛ”İ]Ê
NÃBˆ™\ËšœÛÛŠİ]ÊNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ•Ù[ÛÛYHØ[\ZYÛˆİ]È\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈÙ]İ]ÈˆJNÃBˆCBˆJNÃBƒBˆËÈYZ[ˆÙ[™\İÙ[ÛÛYH[XZ[Èİ\œ™[YZ[ƒBˆ\œÜİ
‹Ø\KØYZ[‹İÙ[ÛÛYKXØ[\ZYÛ‹İ\İ‹]][XØ]PYZ[‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİYZ[•\Ù\ˆH]ØZ]İÜ˜YÙK™Ù]\Ù\Š™\K\Ù\‹šY
NÃBˆYˆ
XYZ[•\Ù\ŠHÃBˆ™]\›ˆ™\Ëœİ]\Ê
KšœÛÛŠÈY\ÜØYÙNˆ•\Ù\ˆ›İ›İ[™ˆJNÃBˆCBˆBˆÛÛœİİXØÙ\ÜÈH]ØZ][XZ[Ù\šXÙKœÙ[™›İ[™\œÕÙ[ÛÛYQ[XZ[
YZ[•\Ù\‹™[XZ[
NÃBˆ™\ËšœÛÛŠÈBˆİXØÙ\ÜËBˆY\ÜØYÙNˆİXØÙ\ÜÈÈ\İ[XZ[Ù[È	ØYZ[•\Ù\‹™[XZ[Xˆ‘˜Z[YÈÙ[™[XZ[ˆBˆJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ•\İÙ[ÛÛYH[XZ[\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈÙ[™\İ[XZ[ˆJNÃBˆCBˆJNÃBƒBˆËÈYZ[ˆÙ[™Ù[ÛÛYH[XZ[ÈÈ[\Ù\œÈ
˜]K[[Z]Y˜]Ú
CBˆ\œÜİ
‹Ø\KØYZ[‹İÙ[ÛÛYKXØ[\ZYÛ‹ÜÙ[™X[‹]][XØ]PYZ[‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆËÈÙ][\Ù\œÈÚÈ]™[‰İ™XÙZ]™YHÙ[ÛÛYH[XZ[Y]BˆÛÛœİ\Ù\œÈH]ØZ]İÜ˜YÙK™Ù]\Ù\œÕÚ]İ]Ù[ÛÛYQ[XZ[

NÃBˆBˆYˆ
\Ù\œË›[™İOOH
HÃBˆ™]\›ˆ™\ËšœÛÛŠÈBˆİXØÙ\ÜÎˆYKBˆÙ[ˆBˆ˜Z[YˆBˆİ[ˆBˆY\ÜØYÙNˆ“›È\Ù\œÈ™YYHÙ[ÛÛYH[XZ[ˆBˆJNÃBˆCBˆBˆ]Ù[HÃBˆ]˜Z[YHÃBˆÛÛœİ˜]ÚÚ^™HHNÃBˆÛÛœİ[^S\ÈHMLÈËÈKHÙXÛÛ™È™]ÙY[ˆ˜]Ú\ÃBˆBˆ›Üˆ
]HHÈH\Ù\œË›[™İÈH
ÏH˜]ÚÚ^™JHÃBˆÛÛœİ˜]ÚH\Ù\œËœÛXÙJKH
È˜]ÚÚ^™JNÃBˆBˆËÈ›ØÙ\ÜÈ˜]Ú[ˆ\˜[[BˆÛÛœİ™\İ[ÈH]ØZ]›ÛZ\ÙK˜[
Bˆ˜]Ú›X\
\Ş[˜È
\Ù\ˆÈYˆ[X™\È[XZ[ˆİš[™È[JHOˆÃBˆYˆ
]\Ù\‹™[XZ[
H™]\›ˆ˜[ÙNÈËÈÚÚ\İ˜]˜K[Û›H\Ù\œÈÚ]›È[XZ[BˆHÃBˆÛÛœİİXØÙ\ÜÈH]ØZ][XZ[Ù\šXÙKœÙ[™›İ[™\œÕÙ[ÛÛYQ[XZ[
\Ù\‹™[XZ[
NÃBˆYˆ
İXØÙ\ÜÊHÃBˆ]ØZ]İÜ˜YÙK\]U\Ù\Š\Ù\‹šYÈÙ[ÛÛYQ[XZ[Ù[]ˆ™]È]J
HJNÃBˆ™]\›ˆYNÃBˆCBˆ™]\›ˆ˜[ÙNÃBˆHØ]Ú
\œŠHÃBˆÛÛœÛÛK™\œ›ÜŠ˜Z[YÈÙ[™Ù[ÛÛYH[XZ[È	İ\Ù\‹™[XZ[N˜\œŠNÃBˆ™]\›ˆ˜[ÙNÃBˆCBˆJCBˆ
NÃBˆBˆÙ[
ÏH™\İ[Ë™š[\Š
ˆ›ÛÛX[ŠHOˆŠK›[™İÃBˆ˜Z[Y
ÏH™\İ[Ë™š[\Š
ˆ›ÛÛX[ŠHOˆ\ŠK›[™İÃBˆBˆËÈ[^H™]ÙY[ˆ˜]Ú\È
^Ù\›Üˆ\İ˜]Ú
CBˆYˆ
H
È˜]ÚÚ^™H\Ù\œË›[™İ
HÃBˆ]ØZ]™]È›ÛZ\ÙJ™\ÛÛ™HOˆÙ][Y[İ]
™\ÛÛ™K[^S\ÊJNÃBˆCBˆCBˆBˆ™\ËšœÛÛŠÈBˆİXØÙ\ÜÎˆYKBˆÙ[Bˆ˜Z[YBˆİ[ˆ\Ù\œË›[™İBˆY\ÜØYÙNˆÙ[	ÜÙ[HÙ[ÛÛYH[XZ[Ë	Ù˜Z[YH˜Z[YBˆJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ[ÈÙ[ÛÛYH[XZ[\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈÙ[™[XZ[ÈˆJNÃBˆCBˆJNÃBƒBˆËÈYZ[ˆÙ[™›ÙXİ\]H[XZ[
\İÜˆ[
CBˆ\œÜİ
‹Ø\KØYZ[‹ÜÙ[™\›ÙXİ]\]H‹]][XØ]PYZ[‹\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİ\Õ\İH™\Kœ]Y\K\İOOHYHÃBˆÛÛœİYZ[•\Ù\ˆH™\K\Ù\ÃBƒBˆÛÛœİÈİXš™Xİ[ˆ[›ÙK^ˆ^›ÙHHH[XZ[Ù\šXÙKœ›ÙXİ\]S™]ÜÛ]\Š
NÃBƒBˆYˆ
\Õ\İ
HÃBˆÛÛœİİXØÙ\ÜÈH]ØZ][XZ[Ù\šXÙKœÙ[™[XZ[
ÃBˆÎˆYZ[•\Ù\‹™[XZ[BˆİXš™XİˆÕTÕH	ÜİXš™XİXBˆ[ˆ[›ÙKBˆ^ˆ^›ÙKBˆJNÃBˆ™]\›ˆ™\ËšœÛÛŠÃBˆİXØÙ\ÜËBˆÙ[ˆİXØÙ\ÜÈÈHˆBˆ˜Z[YˆİXØÙ\ÜÈÈˆKBˆİ[ˆKBˆY\ÜØYÙNˆİXØÙ\ÜÈÈ\İ[XZ[Ù[È	ØYZ[•\Ù\‹™[XZ[Xˆ‘˜Z[YÈÙ[™\İ[XZ[‹BˆJNÃBˆCBƒBˆÛÛœİ[\Ù\œÈH]ØZ]İÜ˜YÙK™Ù][\Ù\œÊL
NÃBˆÛÛœİ™XÚ\Y[ÈH[\Ù\œË™š[\Š
Nˆ[JHOˆ]K›X\šÙ][™ÓÜİ]	‰ˆK™[XZ[
NÃBƒBˆ]Ù[HÃBˆ]˜Z[YHÃBˆËÈ™\Ù[™	ÜÈY˜][[Z]\Èˆ™\]Y\İËÜÙXÛÛ™ˆÙ[™ˆ\ˆ˜]ÚÚ]CBˆËÈŒKŒ\ÈØ\
ŒK™\KÜÊHÈİ^HØY™[H[™\ˆ]ÈÙ[™[XZ[[ÛÈ™]šY\ÃBˆËÈÚ]˜XÚÛÙ™ˆÛˆ[HHÛÈ˜[œÚY[ÜZÙ\ÈÛ‰İ›ÜY\ÜØYÙ\ËƒBˆÛÛœİ˜]ÚÚ^™HHÃBˆÛÛœİ[^S\ÈHLLÃBƒBˆ›Üˆ
]HHÈH™XÚ\Y[Ë›[™İÈH
ÏH˜]ÚÚ^™JHÃBˆÛÛœİ˜]ÚH™XÚ\Y[ËœÛXÙJKH
È˜]ÚÚ^™JNÃBˆÛÛœİ™\İ[ÈH]ØZ]›ÛZ\ÙK˜[
Bˆ˜]Ú›X\
\Ş[˜È
\Ù\ˆ[JHOˆÃBˆHÃBˆÛÛœİİXØÙ\ÜÈH]ØZ][XZ[Ù\šXÙKœÙ[™[XZ[
ÃBˆÎˆ\Ù\‹™[XZ[BˆİXš™XİBˆ[ˆ[›ÙKBˆ^ˆ^›ÙKBˆJNÃBˆ™]\›ˆİXØÙ\ÜÎÃBˆHØ]Ú
\œŠHÃBˆÛÛœÛÛK™\œ›ÜŠ˜Z[YÈÙ[™›ÙXİ\]HÈ	İ\Ù\‹™[XZ[N˜\œŠNÃBˆ™]\›ˆ˜[ÙNÃBˆCBˆJCBˆ
NÃBˆÙ[
ÏH™\İ[Ë™š[\Š›ÛÛX[ŠK›[™İÃBˆ˜Z[Y
ÏH™\İ[Ë™š[\Š
ˆ›ÛÛX[ŠHOˆ\ŠK›[™İÃBˆYˆ
H
È˜]ÚÚ^™H™XÚ\Y[Ë›[™İ
HÃBˆ]ØZ]™]È›ÛZ\ÙJ™\ÛÛ™HOˆÙ][Y[İ]
™\ÛÛ™K[^S\ÊJNÃBˆCBˆCBƒBˆÛÛœÛÛK›ÙÊÔ›ÙXİ\]WHÙ[ˆ	ÜÙ[K˜Z[Yˆ	Ù˜Z[YKİ[ˆ	Ü™XÚ\Y[Ë›[™İX
NÃBˆ™\ËšœÛÛŠÃBˆİXØÙ\ÜÎˆYKBˆÙ[Bˆ˜Z[YBˆİ[ˆ™XÚ\Y[Ë›[™İBˆY\ÜØYÙNˆÙ[	ÜÙ[H›ÙXİ\]H[XZ[Ë	Ù˜Z[YH˜Z[YBˆJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ”›ÙXİ\]H[XZ[\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈÙ[™›ÙXİ\]H[XZ[ÈˆJNÃBˆCBˆJNÃBƒBˆËÈ\Ù\ˆÜİ]ÙˆX\šÙ][™È[XZ[ÃBˆ\œÜİ
‹Ø\Kİ\Ù\œËÎ\Ù\’YÛX\šÙ][™Ë[Üİ]‹]][XØ]R•Õ\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİ\Ù\’YH\œÙR[
™\Kœ\˜[\Ë\Ù\’Y
NÃBˆBˆYˆ
™\K\Ù\‹šYOOH\Ù\’Y
HÃBˆ™]\›ˆ™\Ëœİ]\ÊÊKšœÛÛŠÈY\ÜØYÙNˆXØÙ\ÜÈ[šYYˆJNÃBˆCBˆBˆ]ØZ]İÜ˜YÙK\]U\Ù\Š\Ù\’YÈX\šÙ][™ÓÜİ]ˆYHJNÃBˆ]ØZ]š\Ø[\ZYÛ”Ù\šXÙK™^]Ø[\ZYÛ‘›Ü•\Ù\Š\Ù\’Y\Ù\—ÛÜİ]ŠNÃBˆBˆ™\ËšœÛÛŠÈİXØÙ\ÜÎˆYKY\ÜØYÙNˆ”İXØÙ\ÜÙ[H[œİXœØÜšX™Yœ›ÛHX\šÙ][™È[XZ[ÈˆJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠ“X\šÙ][™ÈÜİ]\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈÜİ]ˆJNÃBˆCBˆJNÃBƒBˆËÈ\]H\Ù\‰ÜÈ\İÙY[ˆ[Y\İ[\Ûˆ\Ú›Ø\™ØYBˆ\œÜİ
‹Ø\Kİ\Ù\œËÎ\Ù\’YÚX\™X]‹]][XØ]R•Õ\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİ\Ù\’YH\œÙR[
™\Kœ\˜[\Ë\Ù\’Y
NÃBˆBˆYˆ
™\K\Ù\‹šYOOH\Ù\’Y
HÃBˆ™]\›ˆ™\Ëœİ]\ÊÊKšœÛÛŠÈY\ÜØYÙNˆXØÙ\ÜÈ[šYYˆJNÃBˆCBˆBˆÛÛœİ™\İ[H]ØZ]™XXİ]˜]QÜ›X[XØÛİ[
\Ù\’Y
NÃBˆ™\ËšœÛÛŠÈİXØÙ\ÜÎˆYK™XXİ]˜]Yˆ™\İ[œ™XXİ]˜]YJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆËÈÚ[[˜Z[\™H›ÜˆX\™X]Bˆ™\ËšœÛÛŠÈİXØÙ\ÜÎˆ˜[ÙHJNÃBˆCBˆJNÃBƒBˆËÈ™XÛÜ™\Ù\ˆXİ]˜][Ûˆ]™[Bˆ\œÜİ
‹Ø\Kİ\Ù\œËÎ\Ù\’YØXİ]˜][Ûˆ‹]][XØ]R•Õ\Ş[˜È
™\Nˆ[K™\ÊHOˆÃBˆHÃBˆÛÛœİ\Ù\’YH\œÙR[
™\Kœ\˜[\Ë\Ù\’Y
NÃBˆÛÛœİÈXİ]˜][Û•\HHH™\K˜›ÙNÃBˆBˆYˆ
™\K\Ù\‹šYOOH\Ù\’Y
HÃBˆ™]\›ˆ™\Ëœİ]\ÊÊKšœÛÛŠÈY\ÜØYÙNˆXØÙ\ÜÈ[šYYˆJNÃBˆCBˆBˆ]ØZ]š\Ø[\ZYÛ”Ù\šXÙKœ™XÛÜ™Xİ]˜][ÛŠ\Ù\’YXİ]˜][Û•\H™\Ú›Ø\™İšY]ÈŠNÃBˆ™\ËšœÛÛŠÈİXØÙ\ÜÎˆYHJNÃBˆHØ]Ú
\œ›Üˆ[JHÃBˆÛÛœÛÛK™\œ›ÜŠXİ]˜][Ûˆ™XÛÜ™[™È\œ›Üˆ‹\œ›ÜŠNÃBˆ™\Ëœİ]\ÊL
KšœÛÛŠÈY\ÜØYÙNˆ\œ›Ü‹›Y\ÜØYÙH‘˜Z[YÈ™XÛÜ™Xİ]˜][ÛˆˆJNÃBˆCBˆJNÃBƒBˆËÈİ\Hš\Ø[\ZYÛˆÛÜšÙ\ˆ
\Ş[˜ËØYÈÙ][™ÜÈœ›ÛHŠCBˆš\Ø[\ZYÛ•ÛÜšÙ\‹œİ\

K˜Ø]Ú
\œˆOˆBˆÛÛœÛÛK™\œ›ÜŠ–Ñš\ÛÜšÙ\—H˜Z[YÈİ\ˆ‹\œŠCBˆ
NÃBƒBˆËÈİ\HÙYZÛHİ[[X\HÛÜšÙ\ˆ
š\™\È]™\H[Û™^HUÊCBˆÙYZÛTİ[[X\UÛÜšÙ\‹œİ\

NÂ‚ˆËÈ[›™\‹[ØØ[[Ü›š[™ÈœšYYš[™ÜËÙX]\ˆY\İY[ËZ\ÜÙY]ÛÜšÛİ][™ˆËÈ˜XÙK]ÙYZÈİZY[˜ÙKˆ[]™\Hİ[ÛÙ\È›İYÚHY[\İ[İ]›Ş‚ˆ›ØXİ]™PÛØXÚÛÜšÙ\‹œİ\

NÂˆ›İYšXØ][Û‘[]™\UÛÜšÙ\‹œİ\

NÂƒBˆËÈ]\ÙHœ™YHİ˜]˜H›ØÙ\ÜÚ[™ÈY\ˆÌ^\ÈÚ]İ][ˆ\š\Ú]ƒBˆXØÛİ[Ü›X[˜ŞUÛÜšÙ\‹œİ\

NÃBƒBˆÛÛœİÙ\™\ˆHÜ™X]TÙ\™\Š\
NÃBˆ™]\›ˆÙ\™\ÃBŸCB
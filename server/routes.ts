import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import * as fs from "fs";
import * as path from "path";
import { storage } from "./storage";
import { stravaService } from "./services/strava";
import { stravaClient } from "./services/stravaClient";
import { jobQueue, createListActivitiesJob, createHydrateActivityJob, metrics } from "./services/queue";
import { aiService } from "./services/ai";
import { mlService } from "./services/ml";
import { performanceService } from "./services/performance";
import { authService } from "./services/auth";
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
import { insertUserSchema, loginSchema, registerSchema, insertFeedbackSchema, insertGoalSchema, emailWaitlist, type Activity, type RunningShoe } from "@shared/schema";
import { shoeData } from "./shoe-data";
import { validateAllShoes, getPipelineStats, findDuplicates, getShoeDataWithMetadata, getShoesWithMetadataFromStorage, getEnrichedShoeData, enrichShoeWithAIData } from "./shoe-pipeline";
import { z } from "zod";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { db } from "./db";
import { sql, eq, isNull } from "drizzle-orm";
import { checkInsightRateLimit, incrementInsightCount, getUserUsageStats, getActivityHistoryLimit, RATE_LIMITS } from "./rateLimits";
import { renderBlogPost, renderShoePage, renderComparisonPage, renderHomepage } from "./ssr/renderer";
import { getAllBlogPosts } from "./ssr/blogContent";

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

export async function registerRoutes(app: Express): Promise<Server> {
  
  // SEO: Page-specific meta data for dynamic rendering
  // Maps routes to SEO metadata for crawler-optimized responses
  const SEO_PAGES: Record<string, { title: string; description: string; keywords?: string }> = {
    "/": {
      title: "RunAnalytics - AI-Powered Running Insights & Analytics",
      description: "Get personalized running analytics with AI coaching, race predictions, and training insights. Connect Strava for free and unlock your running potential.",
      keywords: "running analytics, AI running coach, Strava analytics, runner score, race predictions"
    },
    "/tools": {
      title: "Free Running Tools & Calculators | RunAnalytics",
      description: "Free running calculators: race predictor, marathon fueling, aerobic decoupling, cadence analysis & more. No signup required.",
      keywords: "running tools, running calculators, free running apps, marathon calculator, running analysis"
    },
    "/tools/race-predictor": {
      title: "Race Time Predictor | Free 5K to Marathon Calculator | RunAnalytics",
      description: "Predict your 5K, 10K, half marathon & marathon times using the Riegel formula. Import Strava data for personalized race predictions. Free calculator.",
      keywords: "race time predictor, marathon time calculator, running pace calculator, Riegel formula"
    },
    "/tools/marathon-fueling": {
      title: "Marathon Fueling Calculator | Gel Timing & Nutrition Plan | RunAnalytics",
      description: "Calculate your marathon nutrition plan with exact gel timing, carb targets & sodium needs. Get a personalized race fueling strategy in minutes.",
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
      description: "Detect running form fade with cadence and stride analysis. Get your Form Stability Score and identify late-run form breakdown.",
      keywords: "running cadence analyzer, form stability, stride length, running form analysis"
    },
    "/tools/heatmap": {
      title: "Running Heatmap | Visualize Your Training Routes | RunAnalytics",
      description: "See your most-run routes on an interactive heatmap. Discover training patterns and favorite paths from your Strava activities.",
      keywords: "running heatmap, training routes, Strava heatmap, route visualization"
    },
    "/tools/shoes": {
      title: "Running Shoe Database | Compare 100+ Running Shoes | RunAnalytics",
      description: "Browse and compare 100+ running shoes with specs, reviews & AI insights. Find the best shoes for your running needs.",
      keywords: "running shoes database, compare running shoes, best running shoes 2026"
    },
    "/tools/shoe-finder": {
      title: "Running Shoe Finder | Personalized Shoe Recommendations | RunAnalytics",
      description: "Find your perfect running shoe based on foot type, running style & goals. AI-powered recommendations from 100+ models.",
      keywords: "running shoe finder, best running shoes, shoe recommendations"
    },
    "/tools/rotation-planner": {
      title: "Running Shoe Rotation Planner | Build Your Shoe Lineup | RunAnalytics",
      description: "Plan the perfect running shoe rotation. Get AI recommendations for daily trainers, speed shoes & race day options.",
      keywords: "shoe rotation, running shoe lineup, multiple running shoes"
    },
    "/blog": {
      title: "Running Blog | Training Tips & AI Coaching Insights | RunAnalytics",
      description: "Expert running advice, training tips, and AI coaching insights. Learn how to improve your pace, pick training plans, and run smarter.",
      keywords: "running blog, training tips, running advice, AI running coach"
    },
    "/blog/ai-running-coach-complete-guide-2026": {
      title: "AI Running Coach Complete Guide 2026 | RunAnalytics Blog",
      description: "Everything you need to know about AI running coaches in 2026. Compare features, benefits, and find the best AI coach for your training.",
      keywords: "AI running coach, AI training, running coach app, AI fitness"
    },
    "/blog/best-strava-analytics-tools-2026": {
      title: "Best Strava Analytics Tools 2026 | RunAnalytics Blog",
      description: "Compare the best Strava analytics tools for runners in 2026. Find deeper insights, better visualizations, and smarter training analysis.",
      keywords: "Strava analytics, Strava tools, running analytics, Strava apps"
    },
    "/blog/how-to-improve-running-pace": {
      title: "How to Improve Your Running Pace | RunAnalytics Blog",
      description: "Proven strategies to get faster: interval training, tempo runs, and pace improvement techniques for runners of all levels.",
      keywords: "improve running pace, run faster, speed training, running tips"
    },
    "/blog/ai-agent-coach-proactive-coaching": {
      title: "AI Agent Coach: Proactive Coaching That Knows You | RunAnalytics Blog",
      description: "Discover how AI Agent Coach provides personalized, proactive coaching based on your training patterns and goals. Premium feature spotlight.",
      keywords: "AI agent coach, proactive coaching, personalized training, running AI"
    },
    "/blog/how-to-pick-a-training-plan": {
      title: "How to Pick a Training Plan | RunAnalytics Blog",
      description: "Choose the right training plan for your goals, experience level, and schedule. Expert guidance for 5K to marathon training.",
      keywords: "training plan, marathon training, 5K plan, running schedule"
    },
    "/pricing": {
      title: "Pricing | Free, Pro & Premium Plans | RunAnalytics",
      description: "Start free with basic analytics. Upgrade to Pro for advanced insights or Premium for AI Agent Coach and unlimited features.",
      keywords: "running app pricing, strava analytics cost, AI coach pricing"
    },
    "/features": {
      title: "Features | AI Analytics & Coaching | RunAnalytics",
      description: "Explore RunAnalytics features: Runner Score, AI insights, race predictions, training plans, shoe tracking, and proactive AI coaching.",
      keywords: "running app features, AI running features, Strava analytics features"
    },
    "/ai-running-coach": {
      title: "AI Running Coach | Personalized Training Advice | RunAnalytics",
      description: "Get personalized running advice from an AI coach that knows your training. Ask questions, get insights, and improve your running.",
      keywords: "AI running coach, running advice, AI training, personalized coaching"
    },
    "/ai-agent-coach": {
      title: "AI Agent Coach | Proactive Training Intelligence | RunAnalytics",
      description: "Premium AI coaching that proactively analyzes your runs and provides personalized recommendations before you ask. The future of running coaching.",
      keywords: "AI agent coach, proactive coaching, premium running coach, AI training"
    },
    // Additional pages from sitemap
    "/about": {
      title: "About RunAnalytics | AI-Powered Running Analytics",
      description: "Learn about RunAnalytics - the AI-powered platform helping runners improve with personalized insights, training analytics, and smart coaching.",
      keywords: "about RunAnalytics, running analytics company, AI running platform"
    },
    "/auth": {
      title: "Sign In or Sign Up | RunAnalytics",
      description: "Sign in to RunAnalytics to access your personalized running insights, or create a free account to get started with AI-powered analytics.",
      keywords: "login, sign up, create account, running app"
    },
    "/faq": {
      title: "FAQ | Frequently Asked Questions | RunAnalytics",
      description: "Get answers to common questions about RunAnalytics, Strava integration, AI coaching, subscriptions, and how to get the most from your training data.",
      keywords: "FAQ, frequently asked questions, help, support, running analytics help"
    },
    "/contact": {
      title: "Contact Us | RunAnalytics Support",
      description: "Get in touch with the RunAnalytics team. We're here to help with questions about your running analytics, account, or technical support.",
      keywords: "contact, support, help, customer service, running analytics support"
    },
    "/privacy": {
      title: "Privacy Policy | RunAnalytics",
      description: "Read the RunAnalytics privacy policy. Learn how we protect your running data, Strava information, and personal details.",
      keywords: "privacy policy, data protection, GDPR, running data privacy"
    },
    "/terms": {
      title: "Terms of Service | RunAnalytics",
      description: "Read the RunAnalytics terms of service. Understand your rights and responsibilities when using our running analytics platform.",
      keywords: "terms of service, terms and conditions, user agreement"
    },
    "/release-notes": {
      title: "Release Notes | What's New | RunAnalytics",
      description: "See the latest updates, new features, and improvements to RunAnalytics. Stay up to date with our running analytics platform.",
      keywords: "release notes, updates, changelog, new features, running app updates"
    },
    "/runner-score": {
      title: "Runner Score | Your Running Performance Index | RunAnalytics",
      description: "Discover your Runner Score - a comprehensive metric combining fitness, consistency, and progression. Share your score and track improvement.",
      keywords: "runner score, running performance, fitness score, running index"
    },
    "/developers": {
      title: "Developer Portal | RunAnalytics API",
      description: "Build with RunAnalytics. Access our API documentation, integration guides, and developer resources for running analytics.",
      keywords: "API, developers, integration, running API, developer portal"
    },
    "/developers/api": {
      title: "API Documentation | RunAnalytics Developers",
      description: "Complete API documentation for RunAnalytics. Learn how to integrate running analytics, access activity data, and build custom solutions.",
      keywords: "API documentation, REST API, running data API, developer docs"
    },
    "/tools/shoes/compare": {
      title: "Compare Running Shoes | Side-by-Side Comparison | RunAnalytics",
      description: "Compare running shoes side-by-side. See specs, features, and AI insights to find the best shoes for your running style.",
      keywords: "compare running shoes, shoe comparison, running shoe specs"
    }
  };

  // Crawler detection helper
  const isCrawler = (userAgent: string): boolean => {
    const crawlerPatterns = [
      /googlebot/i, /bingbot/i, /yandex/i, /baiduspider/i, 
      /duckduckbot/i, /slurp/i, /facebookexternalhit/i, 
      /twitterbot/i, /linkedinbot/i, /applebot/i,
      /developers\.google\.com/i, /google-inspectiontool/i
    ];
    return crawlerPatterns.some(pattern => pattern.test(userAgent));
  };

  // SEO: 301 redirects for renamed blog posts (preserve indexed URLs)
  app.get("/blog/best-strava-analytics-tools-2025", (req, res) => {
    res.redirect(301, "/blog/best-strava-analytics-tools-2026");
  });

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

  // SEO: Sitemap (dynamic with shoe pages and lastmod timestamps)
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = "https://aitracker.run";
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const staticPages = [
        { url: "/", changefreq: "daily", priority: "1.0", lastmod: today },
        { url: "/auth", changefreq: "monthly", priority: "0.8", lastmod: "2026-01-01" },
        { url: "/forgot-password", changefreq: "yearly", priority: "0.4", lastmod: "2025-12-01" },
        { url: "/reset-password", changefreq: "yearly", priority: "0.3", lastmod: "2025-12-01" },
        { url: "/about", changefreq: "monthly", priority: "0.7", lastmod: "2026-01-01" },
        { url: "/features", changefreq: "monthly", priority: "0.8", lastmod: today },
        { url: "/pricing", changefreq: "weekly", priority: "0.9", lastmod: today },
        
        // Blog & Content Marketing
        { url: "/blog", changefreq: "weekly", priority: "0.9", lastmod: today },
        { url: "/blog/ai-running-coach-complete-guide-2026", changefreq: "monthly", priority: "0.9", lastmod: "2026-01-05" },
        { url: "/blog/best-strava-analytics-tools-2026", changefreq: "monthly", priority: "0.9", lastmod: "2026-01-05" },
        { url: "/blog/how-to-improve-running-pace", changefreq: "monthly", priority: "0.9", lastmod: "2026-01-03" },
        { url: "/blog/ai-agent-coach-proactive-coaching", changefreq: "monthly", priority: "0.9", lastmod: "2026-01-06" },
        { url: "/blog/how-to-pick-a-training-plan", changefreq: "monthly", priority: "0.9", lastmod: "2026-01-04" },
        { url: "/ai-running-coach", changefreq: "weekly", priority: "0.9", lastmod: today },
        { url: "/ai-agent-coach", changefreq: "weekly", priority: "0.9", lastmod: today },
        
        // Free Tools
        { url: "/tools", changefreq: "weekly", priority: "0.9", lastmod: today },
        { url: "/tools/aerobic-decoupling-calculator", changefreq: "weekly", priority: "0.8", lastmod: today },
        { url: "/tools/training-split-analyzer", changefreq: "weekly", priority: "0.8", lastmod: today },
        { url: "/tools/marathon-fueling", changefreq: "weekly", priority: "0.8", lastmod: today },
        { url: "/tools/race-predictor", changefreq: "weekly", priority: "0.8", lastmod: today },
        { url: "/tools/cadence-analyzer", changefreq: "weekly", priority: "0.8", lastmod: today },
        { url: "/tools/heatmap", changefreq: "weekly", priority: "0.7", lastmod: today },
        
        // Running Shoe Hub
        { url: "/tools/shoes", changefreq: "weekly", priority: "0.9", lastmod: today },
        { url: "/tools/shoes/compare", changefreq: "weekly", priority: "0.8", lastmod: today },
        { url: "/tools/shoe-finder", changefreq: "weekly", priority: "0.8", lastmod: today },
        { url: "/tools/rotation-planner", changefreq: "weekly", priority: "0.8", lastmod: today },
        
        // Developer API
        { url: "/developers", changefreq: "weekly", priority: "0.8", lastmod: "2026-01-01" },
        { url: "/developers/api", changefreq: "weekly", priority: "0.8", lastmod: "2026-01-01" },
        
        // Other Pages
        { url: "/runner-score", changefreq: "weekly", priority: "0.7", lastmod: today },
        { url: "/faq", changefreq: "monthly", priority: "0.6", lastmod: "2026-01-01" },
        { url: "/contact", changefreq: "monthly", priority: "0.5", lastmod: "2025-12-01" },
        { url: "/privacy", changefreq: "yearly", priority: "0.3", lastmod: "2025-11-01" },
        { url: "/terms", changefreq: "yearly", priority: "0.3", lastmod: "2025-11-01" },
        { url: "/release-notes", changefreq: "weekly", priority: "0.7", lastmod: today },
      ];

      // Fetch all shoes for individual shoe pages
      const shoes = await storage.getShoes({});
      const shoePages = shoes.map(shoe => ({
        url: `/tools/shoes/${shoe.slug}`,
        changefreq: "monthly",
        priority: "0.7",
        lastmod: shoe.createdAt ? new Date(shoe.createdAt).toISOString().split('T')[0] : today
      }));

      // Fetch all shoe comparisons for comparison pages
      const comparisons = await storage.getShoeComparisons({});
      const comparisonPages = comparisons.map(comparison => ({
        url: `/tools/shoes/compare/${comparison.slug}`,
        changefreq: "monthly",
        priority: "0.7",
        lastmod: comparison.createdAt ? new Date(comparison.createdAt).toISOString().split('T')[0] : today
      }));

      const allPages = [...staticPages, ...shoePages, ...comparisonPages];

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

      res.header("Content-Type", "application/xml");
      res.send(sitemap);
    } catch (error: any) {
      console.error('Sitemap generation error:', error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Dynamic Rendering for SEO: Serve enhanced HTML to crawlers
  // This middleware intercepts requests to public pages and injects proper meta tags for search engines
  // Regular users get the SPA experience (handled by Vite's catch-all)
  const fs = await import('fs');
  const path = await import('path');
  
  // Helper to generate pre-rendered HTML with SEO meta tags
  const generateSEOHtml = (pageMeta: { title: string; description: string; keywords?: string }, url: string): string => {
    const baseUrl = "https://aitracker.run";
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5, user-scalable=yes" />
  <title>${pageMeta.title}</title>
  <meta name="description" content="${pageMeta.description}" />
  ${pageMeta.keywords ? `<meta name="keywords" content="${pageMeta.keywords}" />` : ''}
  <meta name="author" content="RunAnalytics" />
  <meta name="theme-color" content="#fc4c02" />
  <link rel="canonical" href="${baseUrl}${url}" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${baseUrl}${url}" />
  <meta property="og:title" content="${pageMeta.title}" />
  <meta property="og:description" content="${pageMeta.description}" />
  <meta property="og:image" content="${baseUrl}/og-image.jpg" />
  <meta property="og:site_name" content="RunAnalytics" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${baseUrl}${url}" />
  <meta name="twitter:title" content="${pageMeta.title}" />
  <meta name="twitter:description" content="${pageMeta.description}" />
  <meta name="twitter:image" content="${baseUrl}/og-image.jpg" />
  
  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "${pageMeta.title}",
    "description": "${pageMeta.description}",
    "url": "${baseUrl}${url}",
    "publisher": {
      "@type": "Organization",
      "name": "RunAnalytics",
      "url": "${baseUrl}"
    }
  }
  </script>
  
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
</head>
<body>
  <div id="root">
    <main>
      <h1>${pageMeta.title}</h1>
      <p>${pageMeta.description}</p>
      <noscript>
        <p>RunAnalytics requires JavaScript to run. Please enable JavaScript in your browser settings.</p>
      </noscript>
    </main>
  </div>
  <script>
    // Redirect to SPA for client-side rendering
    window.location.href = "${url}";
  </script>
</body>
</html>`;
  };

  // SSG for homepage - serves to crawlers only for SEO
  // All other users get the SPA (app uses client-side JWT, not server sessions)
  app.get("/", (req: any, res, next) => {
    const userAgent = req.get('user-agent') || '';
    
    // Only serve SSG to search engine crawlers for SEO benefits
    const isCrawlerRequest = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|pinterest|semrush|ahrefsbot|mj12bot|dotbot|petalbot|rogerbot|dataforseo/i.test(userAgent);
    
    if (isCrawlerRequest) {
      try {
        console.log(`[SSG] Serving static-generated homepage to crawler: ${userAgent.substring(0, 50)}`);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('X-Robots-Tag', 'index, follow');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
        const html = renderHomepage();
        res.send(html);
        return;
      } catch (error) {
        console.error('[SSG] Error serving homepage:', error);
        next();
        return;
      }
    }
    
    // All regular users get the SPA
    next();
  });

  // Middleware to handle crawler requests for SEO pages (static marketing/tool pages)
  Object.entries(SEO_PAGES).forEach(([route, meta]) => {
    // Skip homepage - it gets full SSG above
    if (route === '/') {
      return;
    }
    // Skip blog posts - they get full SSR below
    if (route.startsWith('/blog/') && route !== '/blog') {
      return;
    }
    
    app.get(route, (req: any, res, next) => {
      const userAgent = req.get('user-agent') || '';
      
      // Only serve pre-rendered HTML to crawlers for non-blog pages
      if (isCrawler(userAgent)) {
        console.log(`[SEO] Serving pre-rendered HTML for crawler on ${route}: ${userAgent.substring(0, 50)}`);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('X-Robots-Tag', 'index, follow');
        res.send(generateSEOHtml(meta, route));
      } else {
        // Let Vite/static serving handle regular users
        next();
      }
    });
  });

  // SSG for blog posts - serves to crawlers only for SEO, regular users get SPA
  app.get("/blog/:slug", (req: any, res, next) => {
    const userAgent = req.get('user-agent') || '';
    const isCrawlerRequest = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|pinterest|semrush|ahrefsbot|mj12bot|dotbot|petalbot|rogerbot|dataforseo/i.test(userAgent);
    
    // Only serve SSG to crawlers - regular users get the rich SPA
    if (!isCrawlerRequest) {
      next();
      return;
    }
    
    const { slug } = req.params;
    const staticFilePath = path.join(process.cwd(), 'dist', 'prerender', `blog-${slug}.html`);
    
    // Try to serve pre-rendered static file first (SSG)
    if (fs.existsSync(staticFilePath)) {
      console.log(`[SSG] Serving static blog post to crawler: ${slug}`);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Robots-Tag', 'index, follow');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hour cache
      const html = fs.readFileSync(staticFilePath, 'utf-8');
      res.send(html);
      return;
    }
    
    // Fallback to SSR if static file doesn't exist
    const html = renderBlogPost(slug);
    if (html) {
      console.log(`[SSR] Fallback: serving server-rendered blog post to crawler: ${slug}`);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Robots-Tag', 'index, follow');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(html);
    } else {
      // Blog post not found, let React handle it
      next();
    }
  });

  // SSG for individual shoe pages - serves to crawlers only for SEO, regular users get SPA
  app.get("/tools/shoes/:slug", async (req: any, res, next) => {
    const userAgent = req.get('user-agent') || '';
    const isCrawlerRequest = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|pinterest|semrush|ahrefsbot|mj12bot|dotbot|petalbot|rogerbot|dataforseo/i.test(userAgent);
    
    // Only serve SSG to crawlers - regular users get the rich SPA
    if (!isCrawlerRequest) {
      next();
      return;
    }
    
    const { slug } = req.params;
    const staticFilePath = path.join(process.cwd(), 'dist', 'prerender', `shoes-${slug}.html`);
    
    // Try to serve pre-rendered static file first (SSG)
    if (fs.existsSync(staticFilePath)) {
      console.log(`[SSG] Serving static shoe page to crawler: ${slug}`);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Robots-Tag', 'index, follow');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
      const html = fs.readFileSync(staticFilePath, 'utf-8');
      res.send(html);
      return;
    }
    
    // Fallback to SSR if static file doesn't exist
    try {
      const shoe = await storage.getShoeBySlug(slug);
      
      if (shoe) {
        console.log(`[SSR] Fallback: serving server-rendered shoe page to crawler: ${slug}`);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('X-Robots-Tag', 'index, follow');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        const html = renderShoePage(slug, {
          brand: shoe.brand,
          model: shoe.model,
          category: shoe.category,
          weight: shoe.weight,
          heelToToeDrop: shoe.heelToToeDrop,
          heelStackHeight: shoe.heelStackHeight,
          forefootStackHeight: shoe.forefootStackHeight,
          description: shoe.description,
          cushioningLevel: shoe.cushioningLevel,
          stability: shoe.stability,
          bestFor: shoe.bestFor,
          price: shoe.price,
          hasCarbonPlate: shoe.hasCarbonPlate,
          hasSuperFoam: shoe.hasSuperFoam
        });
        res.send(html);
      } else {
        next();
      }
    } catch (error) {
      console.error('[SSR] Error generating shoe page:', error);
      next();
    }
  });

  // SSR for shoe comparison pages - serves to ALL users for better SEO and Core Web Vitals
  app.get("/tools/shoes/compare/:slug", async (req: any, res, next) => {
    try {
      const { slug } = req.params;
      const comparison = await storage.getShoeComparisonBySlug(slug);
      
      if (comparison) {
        console.log(`[SSR] Serving server-rendered comparison page: ${slug}`);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('X-Robots-Tag', 'index, follow');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
        
        // Fetch shoe specs for comparison table by their IDs
        const shoe1 = await storage.getShoeById(comparison.shoe1Id);
        const shoe2 = await storage.getShoeById(comparison.shoe2Id);
        
        const html = renderComparisonPage(slug, {
          title: comparison.title,
          metaDescription: comparison.metaDescription,
          verdict: comparison.verdict,
          shoe1: shoe1 ? {
            brand: shoe1.brand,
            model: shoe1.model,
            weight: shoe1.weight,
            heelToToeDrop: shoe1.heelToToeDrop,
            category: shoe1.category,
            price: shoe1.price
          } : null,
          shoe2: shoe2 ? {
            brand: shoe2.brand,
            model: shoe2.model,
            weight: shoe2.weight,
            heelToToeDrop: shoe2.heelToToeDrop,
            category: shoe2.category,
            price: shoe2.price
          } : null
        });
        res.send(html);
      } else {
        next();
      }
    } catch (error) {
      console.error('[SSR] Error generating comparison page:', error);
      next();
    }
  });

  // Waitlist for email capture (public endpoint)
  app.post("/api/waitlist", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      
      // Check if email already exists
      const existing = await db.select().from(emailWaitlist).where(eq(emailWaitlist.email, email)).limit(1);
      if (existing.length > 0) {
        return res.status(409).json({ message: "Email already registered" });
      }
      
      await db.insert(emailWaitlist).values({ email });
      res.json({ success: true, message: "You're on the list!" });
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ message: "Email already registered" });
      }
      console.error('Waitlist error:', error);
      res.status(500).json({ message: "Failed to join waitlist" });
    }
  });

  // Platform stats for landing page (public endpoint)
  // Uses 5-minute cache since stats don't change frequently and this is on the homepage
  app.get("/api/platform-stats", async (req, res) => {
    try {
      const cacheKey = "platform-stats";
      const cached = getCachedResponse(cacheKey, CACHE_TTL_LONG);
      
      if (cached) {
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min browser cache
        return res.json(cached);
      }

      const stats = await storage.getPlatformStats();
      
      setCachedResponse(cacheKey, stats);
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min browser cache
      res.json(stats);
    } catch (error: any) {
      console.error('Platform stats error:', error);
      res.status(500).json({ message: "Failed to get platform stats" });
    }
  });

  // =====================
  // Stripe Payment Routes
  // =====================

  // Get Stripe publishable key for client
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error('Stripe config error:', error);
      res.status(500).json({ message: "Stripe not configured" });
    }
  });

  // Get subscription products and prices
  app.get("/api/stripe/products", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.metadata as price_metadata
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC
      `);
      
      // Group by product
      const productsMap = new Map();
      for (const row of result.rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            metadata: row.price_metadata
          });
        }
      }
      
      res.json({ products: Array.from(productsMap.values()) });
    } catch (error: any) {
      console.error('Stripe products error:', error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Create checkout session
  app.post("/api/stripe/create-checkout-session", authenticateJWT, async (req: any, res) => {
    try {
      const { priceId } = req.body;
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stripe = await getUncachableStripeClient();

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: String(userId) }
        });
        await storage.updateStripeCustomerId(userId, customer.id);
        customerId = customer.id;
      }

      // Get the domain - use custom domain in production
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
      const domain = isProduction ? 'aitracker.run' : (process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000');
      const protocol = domain.includes('localhost') ? 'http' : 'https';

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        allow_promotion_codes: true,
        success_url: `${protocol}://${domain}/billing?success=true`,
        cancel_url: `${protocol}://${domain}/pricing?canceled=true`,
        metadata: { userId: String(userId) }
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout session error details:', {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        raw: error.raw,
        requestId: error.requestId,
        stack: error.stack
      });
      res.status(500).json({ 
        message: error.message || "Failed to create checkout session",
        code: error.code,
        type: error.type
      });
    }
  });

  // Create audit checkout session (with 14-day trial for Pro plan)
  app.post("/api/stripe/create-audit-checkout", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stripe = await getUncachableStripeClient();

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: String(userId) }
        });
        await storage.updateStripeCustomerId(userId, customer.id);
        customerId = customer.id;
      }

      // Get the Premium yearly price from Stripe
      const prices = await stripe.prices.list({
        active: true,
        type: 'recurring',
        limit: 20,
      });
      
      // Find Premium yearly price (look for 'premium' in product metadata or name, with yearly interval)
      let premiumPriceId: string | null = null;
      for (const price of prices.data) {
        if (price.recurring?.interval === 'year') {
          const product = await stripe.products.retrieve(price.product as string);
          if (product.name?.toLowerCase().includes('premium') || 
              product.metadata?.tier === 'premium') {
            premiumPriceId = price.id;
            break;
          }
        }
      }
      
      if (!premiumPriceId) {
        // Fallback to first yearly price if no Premium price found
        const yearlyPrice = prices.data.find(p => p.recurring?.interval === 'year');
        if (yearlyPrice) {
          premiumPriceId = yearlyPrice.id;
        } else {
          // Final fallback to any recurring price
          const anyPrice = prices.data[0];
          if (anyPrice) {
            premiumPriceId = anyPrice.id;
          } else {
            return res.status(400).json({ message: "No subscription price found" });
          }
        }
      }

      // Get the domain
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
      const domain = isProduction ? 'aitracker.run' : (process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000');
      const protocol = domain.includes('localhost') ? 'http' : 'https';

      // Create checkout session with 14-day trial
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: premiumPriceId, quantity: 1 }],
        mode: 'subscription',
        allow_promotion_codes: true,
        subscription_data: {
          trial_period_days: 14,
        },
        success_url: `${protocol}://${domain}/audit-report?upgraded=true`,
        cancel_url: `${protocol}://${domain}/audit-report?canceled=true`,
        metadata: { userId: String(userId), source: 'audit-report' }
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Audit checkout session error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to create checkout session"
      });
    }
  });

  // Get user subscription status
  app.get("/api/stripe/subscription", authenticateJWT, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is in active reverse trial (7-day Pro trial, no credit card)
      const now = new Date();
      const isInReverseTrial = user.trialEndsAt && new Date(user.trialEndsAt) > now && 
                               !user.stripeSubscriptionId && user.subscriptionPlan === 'free';
      
      // Calculate days remaining in trial
      let trialDaysRemaining = 0;
      if (isInReverseTrial && user.trialEndsAt) {
        const msRemaining = new Date(user.trialEndsAt).getTime() - now.getTime();
        trialDaysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      }

      // Get usage stats for rate limit display
      const usageStats = await getUserUsageStats(req.user.id);

      // For reverse trial users, treat them as Pro tier with 'trialing' status
      const effectivePlan = isInReverseTrial ? 'pro' : (user.subscriptionPlan || 'free');
      const effectiveStatus = isInReverseTrial ? 'trialing' : (user.subscriptionStatus || 'free');

      res.json({
        subscriptionStatus: effectiveStatus,
        subscriptionPlan: effectivePlan,
        stripeSubscriptionId: user.stripeSubscriptionId,
        trialEndsAt: user.trialEndsAt,
        subscriptionEndsAt: user.subscriptionEndsAt,
        usage: usageStats,
        // Reverse trial specific fields
        isReverseTrial: isInReverseTrial,
        trialDaysRemaining: trialDaysRemaining
      });
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });

  // Create trial setup intent for Audit Report paywall
  app.post("/api/stripe/create-trial-setup", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stripe = await getUncachableStripeClient();

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: String(userId) }
        });
        await storage.updateStripeCustomerId(userId, customer.id);
        customerId = customer.id;
      }

      // Create a SetupIntent for collecting payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata: {
          userId: String(userId),
          flow: 'audit_report_trial'
        }
      });

      // After setup intent is confirmed, create subscription with trial
      // This will be handled by the webhook or by a follow-up call

      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error: any) {
      console.error('Trial setup intent error:', error);
      res.status(500).json({ message: "Failed to create trial setup" });
    }
  });

  // Create customer portal session
  app.post("/api/stripe/create-portal-session", authenticateJWT, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No active subscription" });
      }

      const stripe = await getUncachableStripeClient();
      const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
      const domain = isProduction ? 'aitracker.run' : (process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000');
      const protocol = domain.includes('localhost') ? 'http' : 'https';

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${protocol}://${domain}/billing`
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Portal session error:', error);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });
  
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      const result = await authService.register(userData);
      
      // Send trial welcome email to new user (7-day Pro trial)
      await emailService.sendTrialWelcomeEmail(userData.email, userData.firstName);
      
      // Send notification to admin
      await emailService.sendRegistrationNotification(userData.email);
      
      // Enter new user into drip campaign Segment A (not connected to Strava yet)
      try {
        await dripCampaignService.enterCampaign(result.user.id, "segment_a");
        console.log('New user entered drip campaign segment A');
      } catch (campaignError) {
        console.error('Drip campaign entry failed:', campaignError);
      }
      
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

  // Get fitness metrics (CTL/ATL/TSB chart data)
  app.get("/api/fitness/:userId", authenticateJWT, async (req: any, res) => {
    try {
      // Validate request parameters using Zod
      const paramsSchema = z.object({
        userId: z.coerce.number().int().positive(),
      });
      
      const querySchema = z.object({
        days: z.enum(["30", "90", "180"]).default("90").transform((val) => parseInt(val)),
      });
      
      const { userId } = paramsSchema.parse(req.params);
      const { days } = querySchema.parse(req.query);
      
      // Ensure user can only access their own data
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Check cache first
      const cacheKey = `fitness:${userId}:${days}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      // Get all activities for the specified time period
      const activities = await storage.getActivitiesByUserId(userId, days * 2); // Get more to have historical context
      const metrics = await fitnessService.calculateFitnessMetrics(activities, days);
      
      const response = {
        metrics,
        currentForm: metrics.length > 0 ? metrics[metrics.length - 1] : null,
        interpretation: metrics.length > 0 
          ? fitnessService.getFormInterpretation(metrics[metrics.length - 1].tsb)
          : null
      };
      
      // Cache for 5 minutes
      setCachedResponse(cacheKey, response);
      
      res.json(response);
    } catch (error: any) {
      console.error('Get fitness metrics error:', error);
      
      // Handle Zod validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid request parameters", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to get fitness metrics" });
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

  // Delete user account with feedback (new flow)
  app.post("/api/user/delete-with-feedback", authenticateJWT, async (req: any, res) => {
    try {
      const feedbackSchema = z.object({
        reason: z.enum(["too_expensive", "not_using", "missing_features", "found_alternative", "technical_issues", "privacy_concerns", "other"]),
        details: z.string().optional(),
      });

      const parseResult = feedbackSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid feedback data", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { reason, details } = parseResult.data;

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userEmail = user.email;
      const userId = req.user.id;
      const subscriptionPlan = user.subscriptionPlan || "free";
      
      // Calculate account age
      const accountAgeInDays = user.createdAt 
        ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Store feedback before deletion
      await storage.createDeletionFeedback({
        userId,
        userEmail,
        reason,
        details: details || null,
        wasRetained: false,
        subscriptionPlan,
        accountAgeInDays,
      });

      // Delete all user data
      await storage.deleteAccount(userId);

      // Send confirmation email to user
      await emailService.sendAccountDeletionConfirmation(userEmail);

      // Send notification to admin with feedback
      await emailService.sendAccountDeletionWithFeedback(userEmail, userId, reason, details, subscriptionPlan, accountAgeInDays);

      console.log(`[API POST /api/user/delete-with-feedback] Account deleted for user ID: ${userId}, email: ${userEmail}, reason: ${reason}`);
      
      res.json({ 
        success: true, 
        message: "Your account and all associated data have been permanently deleted. A confirmation email has been sent." 
      });
    } catch (error: any) {
      console.error('Delete account with feedback error:', error);
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

  // =============================================
  // Mobile Auth Endpoints (for iOS/Android apps)
  // =============================================

  // Mobile login - returns access token and refresh token
  app.post("/api/mobile/login", async (req, res) => {
    try {
      const { email, password, deviceName, deviceId } = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        deviceName: z.string().optional(),
        deviceId: z.string().optional(),
      }).parse(req.body);
      
      // Verify credentials using existing auth service
      const result = await authService.login({ email, password });
      
      // Get full user data from storage for complete mobile response
      const fullUser = await storage.getUser(result.user.id);
      if (!fullUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Create refresh token for mobile session
      const refreshTokenData = await storage.createRefreshToken(
        result.user.id,
        deviceName,
        deviceId
      );
      
      res.json({
        accessToken: result.token,
        refreshToken: refreshTokenData.rawToken,
        expiresIn: 900, // 15 minutes in seconds
        refreshExpiresAt: refreshTokenData.expiresAt.toISOString(),
        user: {
          id: fullUser.id,
          email: fullUser.email,
          firstName: fullUser.firstName,
          lastName: fullUser.lastName,
          username: fullUser.username,
          unitPreference: fullUser.unitPreference,
          stravaConnected: fullUser.stravaConnected,
        }
      });
    } catch (error: any) {
      console.error('Mobile login error:', error);
      res.status(401).json({ message: error.message || "Invalid credentials" });
    }
  });

  // Mobile token refresh - exchange refresh token for new access token
  app.post("/api/mobile/refresh", async (req, res) => {
    try {
      const { refreshToken } = z.object({
        refreshToken: z.string(),
      }).parse(req.body);
      
      // Validate refresh token
      const validation = await storage.validateRefreshToken(refreshToken);
      
      if (!validation.valid || !validation.userId || !validation.tokenId) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
      }
      
      // Get user and generate new access token
      const user = await storage.getUser(validation.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Generate new access token
      const newAccessToken = await authService.generateToken(user);
      
      // Update refresh token last used timestamp
      await storage.updateRefreshTokenLastUsed(validation.tokenId);
      
      res.json({
        accessToken: newAccessToken,
        expiresIn: 900, // 15 minutes in seconds
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          unitPreference: user.unitPreference,
          stravaConnected: user.stravaConnected,
        }
      });
    } catch (error: any) {
      console.error('Mobile refresh error:', error);
      res.status(401).json({ message: "Failed to refresh token" });
    }
  });

  // Mobile logout - revoke refresh token
  app.post("/api/mobile/logout", async (req, res) => {
    try {
      const { refreshToken } = z.object({
        refreshToken: z.string(),
      }).parse(req.body);
      
      // Validate and get token ID
      const validation = await storage.validateRefreshToken(refreshToken);
      
      if (validation.valid && validation.tokenId) {
        await storage.revokeRefreshToken(validation.tokenId);
      }
      
      // Always return success (don't reveal if token was valid)
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error: any) {
      console.error('Mobile logout error:', error);
      res.json({ success: true, message: "Logged out successfully" });
    }
  });

  // Get current user profile and settings (mobile-optimized)
  app.get("/api/me", authenticateJWT, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user profile without sensitive data
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        unitPreference: user.unitPreference,
        stravaConnected: user.stravaConnected,
        stravaAthleteId: user.stravaAthleteId,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        lastSyncAt: user.lastSyncAt,
        createdAt: user.createdAt,
      });
    } catch (error: any) {
      console.error('Get /api/me error:', error);
      res.status(500).json({ message: "Failed to get user profile" });
    }
  });

  // Get active mobile sessions for current user
  app.get("/api/mobile/sessions", authenticateJWT, async (req: any, res) => {
    try {
      const sessions = await storage.getActiveRefreshTokens(req.user.id);
      res.json(sessions);
    } catch (error: any) {
      console.error('Get sessions error:', error);
      res.status(500).json({ message: "Failed to get sessions" });
    }
  });

  // Revoke all mobile sessions (logout everywhere)
  app.post("/api/mobile/logout-all", authenticateJWT, async (req: any, res) => {
    try {
      await storage.revokeAllUserRefreshTokens(req.user.id);
      res.json({ success: true, message: "All sessions logged out" });
    } catch (error: any) {
      console.error('Logout all error:', error);
      res.status(500).json({ message: "Failed to logout all sessions" });
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

      // Trigger drip campaign for Strava connection
      try {
        await dripCampaignService.onStravaConnected(userId);
        console.log('Drip campaign triggered for Strava connection');
      } catch (campaignError) {
        console.error('Drip campaign trigger failed:', campaignError);
      }

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
    
    // Check subscription for extended activity sync
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Extended sync (up to 500 activities) is now available to all users
    
    // Clamp maxActivities to prevent abuse (500 max with queue-based rate limiting)
    maxActivities = Math.max(1, Math.min(500, maxActivities));
    
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
          res.write(`data: ${JSON.stringify({ type: 'insights', message: 'Generating insights...' })}\n\n`);
          await aiService.generateInsights(userId);
          res.write(`data: ${JSON.stringify({ type: 'insights_complete', message: 'Insights generated' })}\n\n`);
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

      // Get sync state to determine insights status
      const syncState = await storage.getSyncState(userId);

      // Get activity history limit based on subscription
      const historyLimitDays = getActivityHistoryLimit(user.subscriptionPlan, user.subscriptionStatus);
      let historyLimitDate: Date | undefined;
      if (historyLimitDays !== null) {
        historyLimitDate = new Date();
        historyLimitDate.setDate(historyLimitDate.getDate() - historyLimitDays);
        historyLimitDate.setHours(0, 0, 0, 0);
      }

      // Get activities (filtered by date for free users)
      let activities = await storage.getActivitiesByUserId(userId, 10);
      if (historyLimitDate) {
        activities = activities.filter(a => new Date(a.startDate) >= historyLimitDate!);
      }
      
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
      
      // Get usage stats for the response
      const usageStats = await getUserUsageStats(userId);
      
      const dashboardData = {
        user: {
          name: user.username,
          stravaConnected: user.stravaConnected,
          stravaHasWriteScope: user.stravaHasWriteScope || false,
          stravaBrandingEnabled: user.stravaBrandingEnabled || false,
          stravaBrandingTemplate: user.stravaBrandingTemplate || "🏃 Runner Score: {score} | {insight} — Analyzed with AITracker.run",
          unitPreference: user.unitPreference || "km",
          lastSyncAt: user.lastSyncAt,
          subscriptionPlan: user.subscriptionPlan || 'free',
          subscriptionStatus: user.subscriptionStatus || 'free',
          activityHistoryLimitDays: historyLimitDays,
          coachOnboardingCompleted: user.coachOnboardingCompleted || false,
          coachGoal: user.coachGoal,
          coachRaceDate: user.coachRaceDate,
          coachTargetTime: user.coachTargetTime,
          coachDaysAvailable: user.coachDaysAvailable,
          coachWeeklyMileageCap: user.coachWeeklyMileageCap,
          coachTone: user.coachTone,
          coachNotifyRecap: user.coachNotifyRecap ?? true,
          coachNotifyWeeklySummary: user.coachNotifyWeeklySummary ?? true,
          coachQuietHoursStart: user.coachQuietHoursStart,
          coachQuietHoursEnd: user.coachQuietHoursEnd,
        },
        usage: usageStats,
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
        activities: (() => {
          // Calculate fallback averages for activities without cached grade
          const avgDistance = activities.length > 0 
            ? activities.reduce((sum, a) => sum + (a.distance || 0), 0) / activities.length 
            : 0;
          const validPaceActivities = activities.filter(a => a.distance > 0 && a.movingTime > 0);
          const avgPaceValue = validPaceActivities.length > 0
            ? validPaceActivities.reduce((sum, a) => {
                const distKm = a.distance / 1000;
                return sum + (a.movingTime / 60) / distKm;
              }, 0) / validPaceActivities.length
            : 0;

          return activities.map(activity => {
            // Use cached grade if available, otherwise calculate fallback
            let grade: "A" | "B" | "C" | "D" | "F" = activity.cachedGrade as any || (() => {
              if (avgDistance <= 0) return "C";
              let score = 70;
              const distanceRatio = activity.distance / avgDistance;
              const distKm = activity.distance / 1000;
              const pacePerKm = distKm > 0 ? (activity.movingTime / 60) / distKm : 0;
              const paceRatio = avgPaceValue > 0 ? avgPaceValue / pacePerKm : 1;
              
              if (paceRatio > 1.1) score += 15;
              else if (paceRatio > 1.05) score += 10;
              else if (paceRatio > 1.0) score += 5;
              else if (paceRatio < 0.9) score -= 10;
              else if (paceRatio < 0.95) score -= 5;
              
              if (distanceRatio > 1.2) score += 10;
              else if (distanceRatio > 1.0) score += 5;
              else if (distanceRatio < 0.5) score -= 15;
              else if (distanceRatio < 0.8) score -= 5;
              
              if (score >= 85) return "A";
              if (score >= 75) return "B";
              if (score >= 65) return "C";
              if (score >= 55) return "D";
              return "F";
            })();
            
            return {
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
              grade,
            };
          });
        })(),
        insights: {
          performance: insights.find(i => i.type === 'performance'),
          pattern: insights.find(i => i.type === 'pattern'),
          recovery: insights.find(i => i.type === 'recovery'),
          motivation: insights.find(i => i.type === 'motivation'),
          technique: insights.find(i => i.type === 'technique'),
          recommendations: insights.filter(i => i.type === 'recommendation'),
        },
        // Insights status: syncing | generating | ready
        // - syncing: activities are still being synced from Strava
        // - generating: sync complete but insights not yet generated (just synced, waiting for AI)
        // - ready: insights exist or no activities to analyze
        insightsStatus: (() => {
          if (syncState.syncStatus === 'running') return 'syncing';
          // If sync completed recently (within 2 minutes) and no insights yet, AI is generating
          const hasActivities = activities.length > 0;
          const hasInsights = insights.length > 0;
          const syncCompletedRecently = syncState.lastSyncAt && 
            (Date.now() - new Date(syncState.lastSyncAt).getTime()) < 2 * 60 * 1000;
          if (hasActivities && !hasInsights && syncCompletedRecently) return 'generating';
          return 'ready';
        })(),
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
          weekStart.setDate(activityDate.getDate() - ((activityDate.getDay() + 6) % 7)); // Start of week (Monday)
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

  // Generate AI insights (with rate limiting)
  app.post("/api/ai/insights/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Verify the user owns this resource
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check rate limit for free users
      const rateLimit = await checkInsightRateLimit(userId);
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          message: rateLimit.message,
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          resetAt: rateLimit.resetAt
        });
      }

      await aiService.generateInsights(userId);
      
      // Increment usage count after successful generation
      await incrementInsightCount(userId);
      
      res.json({ success: true, remaining: rateLimit.remaining - 1 });
    } catch (error: any) {
      console.error('AI insights error:', error);
      res.status(500).json({ message: error.message || "Failed to generate insights" });
    }
  });

  // Generate AI insights (with rate limiting)
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

      // Check rate limit for free users
      const rateLimit = await checkInsightRateLimit(userId);
      if (!rateLimit.allowed) {
        return res.status(429).json({ 
          message: rateLimit.message,
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          resetAt: rateLimit.resetAt
        });
      }

      await aiService.generateInsights(userId);
      
      // Increment usage count after successful generation
      await incrementInsightCount(userId);
      
      res.json({ success: true, message: "Insights generated successfully", remaining: rateLimit.remaining - 1 });
    } catch (error: any) {
      console.error('Insights generation error:', error);
      res.status(500).json({ message: error.message || "Failed to generate insights" });
    }
  });

  // Get user usage stats
  app.get("/api/usage/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const usage = await getUserUsageStats(userId);
      res.json(usage);
    } catch (error: any) {
      console.error('Usage stats error:', error);
      res.status(500).json({ message: error.message || "Failed to get usage stats" });
    }
  });

  // ===== AI Running Coach Chat Endpoints =====
  
  // Create a new conversation
  app.post("/api/chat/conversations", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { title } = req.body;
      
      const conversation = await storage.createConversation({
        userId,
        title: title || "New Conversation"
      });
      
      res.json(conversation);
    } catch (error: any) {
      console.error('Create conversation error:', error);
      res.status(500).json({ message: error.message || "Failed to create conversation" });
    }
  });

  // Get user's conversations
  app.get("/api/chat/conversations/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Verify the user owns this resource
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error: any) {
      console.error('Get conversations error:', error);
      res.status(500).json({ message: error.message || "Failed to get conversations" });
    }
  });

  // Get conversation messages
  app.get("/api/chat/:conversationId/messages", authenticateJWT, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      const messages = await storage.getMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error: any) {
      console.error('Get messages error:', error);
      res.status(500).json({ message: error.message || "Failed to get messages" });
    }
  });

  // Send a chat message with streaming response
  app.post("/api/chat/:conversationId/messages", authenticateJWT, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const { message, context } = req.body;
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      const userId = req.user.id;

      // Save user message
      const userMessage = await storage.addMessage({
        conversationId,
        role: "user",
        content: message
      });

      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      
      // Send initial connection confirmation
      res.write(': connected\n\n');

      const chatService = new ChatService();
      
      // Stream AI response
      let fullResponse = '';
      const onStream = (chunk: string) => {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      };

      try {
        const aiResponse = await chatService.chat(userId, conversationId, message, onStream, context);
        
        // Save AI message
        await storage.addMessage({
          conversationId,
          role: "assistant",
          content: aiResponse
        });

        // Send completion event
        res.write(`data: ${JSON.stringify({ type: 'complete', messageId: userMessage.id })}\n\n`);
        res.end();
      } catch (error: any) {
        console.error('Chat error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Failed to generate response' })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      console.error('Chat message error:', error);
      
      // If headers not sent yet, send JSON error
      if (!res.headersSent) {
        res.status(500).json({ message: error.message || "Failed to send message" });
      } else {
        // If streaming already started, send SSE error
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Failed to send message' })}\n\n`);
        res.end();
      }
    }
  });

  // Get conversation summaries with message counts
  app.get("/api/chat/summaries", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const summaries = await storage.getConversationSummaries(userId, limit);
      res.json(summaries);
    } catch (error: any) {
      console.error('Get conversation summaries error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch conversation summaries" });
    }
  });

  // Update conversation title
  app.patch("/api/chat/conversations/:conversationId", authenticateJWT, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const { title } = req.body;
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ message: "Title is required" });
      }

      const updated = await storage.updateConversationTitle(conversationId, title);
      if (!updated) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error('Update conversation title error:', error);
      res.status(500).json({ message: error.message || "Failed to update conversation title" });
    }
  });

  // Delete a conversation
  app.delete("/api/chat/conversations/:conversationId", authenticateJWT, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: "Invalid conversation ID" });
      }

      await storage.deleteConversation(conversationId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete conversation error:', error);
      res.status(500).json({ message: error.message || "Failed to delete conversation" });
    }
  });

  // Update message feedback (thumbs up/down)
  app.patch("/api/chat/messages/:messageId/feedback", authenticateJWT, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { feedback } = req.body;
      const userId = req.user.id;
      
      if (isNaN(messageId)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }

      // Validate feedback value
      if (feedback !== null && feedback !== "positive" && feedback !== "negative") {
        return res.status(400).json({ message: "Feedback must be 'positive', 'negative', or null" });
      }

      // Verify ownership: check the message belongs to a conversation owned by this user
      const ownsMessage = await storage.verifyMessageOwnership(messageId, userId);
      if (!ownsMessage) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await storage.updateMessageFeedback(messageId, feedback);
      if (!updated) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.json(updated);
    } catch (error: any) {
      console.error('Update message feedback error:', error);
      res.status(500).json({ message: error.message || "Failed to update message feedback" });
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

  // Audit Report endpoint - provides user-specific audit data for the paywall page
  app.get("/api/audit-report/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Verify the user owns this resource
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get runner score data
      const runnerScore = await runnerScoreService.calculateRunnerScore(userId);
      
      // Get activities for additional analysis
      const activities = await storage.getActivitiesByUserId(userId, 100);
      const runningActivities = activities.filter(a => 
        ['Run', 'TrailRun', 'VirtualRun'].includes(a.type)
      );
      
      // Calculate training load change using calendar weeks (Monday-Sunday)
      const now = new Date();
      
      // Get start of current week (Monday at 00:00:00)
      const startOfThisWeek = new Date(now);
      const dayOfWeek = startOfThisWeek.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days back, otherwise dayOfWeek - 1
      startOfThisWeek.setDate(startOfThisWeek.getDate() - daysToMonday);
      startOfThisWeek.setHours(0, 0, 0, 0);
      
      // Get start of last week (previous Monday)
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      
      const thisWeekActivities = runningActivities.filter(a => 
        new Date(a.startDate) >= startOfThisWeek
      );
      const lastWeekActivities = runningActivities.filter(a => 
        new Date(a.startDate) >= startOfLastWeek && new Date(a.startDate) < startOfThisWeek
      );
      
      const thisWeekLoad = thisWeekActivities.length * 85;
      const lastWeekLoad = lastWeekActivities.length * 85;
      const loadChange = lastWeekLoad > 0 
        ? Math.round(((thisWeekLoad - lastWeekLoad) / lastWeekLoad) * 100) 
        : null;
      
      // Calculate grey zone analysis - runs that are too fast for easy, too slow for tempo
      const activitiesWithHR = runningActivities.filter(a => a.averageHeartrate && a.averageHeartrate > 0);
      let greyZonePercentage = 30; // Default fallback
      let easyRunsAreTooFast = false;
      let optimalEasyPaceMin = 5.75; // Default 5:45/km
      let optimalEasyPaceMax = 6.25; // Default 6:15/km
      let currentAvgEasyPace = 5.42; // Default current easy pace (min/km)
      
      if (activitiesWithHR.length > 5) {
        // Estimate max HR (220 - age, or use highest recorded)
        const maxRecordedHR = Math.max(...activitiesWithHR.map(a => a.maxHeartrate || a.averageHeartrate || 0));
        const estimatedMaxHR = Math.max(maxRecordedHR, 180);
        
        // Count grey zone runs (70-80% of max HR)
        const greyZoneRuns = activitiesWithHR.filter(a => {
          const hrPercent = (a.averageHeartrate! / estimatedMaxHR) * 100;
          return hrPercent >= 70 && hrPercent <= 80;
        });
        greyZonePercentage = Math.round((greyZoneRuns.length / activitiesWithHR.length) * 100);
        
        // Check if easy runs are too fast
        const easyRuns = activitiesWithHR.filter(a => {
          const hrPercent = (a.averageHeartrate! / estimatedMaxHR) * 100;
          return hrPercent < 70;
        });
        
        if (easyRuns.length > 0) {
          const validEasyRuns = easyRuns.filter(a => a.averageSpeed && a.averageSpeed > 0);
          if (validEasyRuns.length > 0) {
            currentAvgEasyPace = validEasyRuns.reduce((sum, a) => {
              return sum + (1000 / a.averageSpeed!) / 60; // min/km
            }, 0) / validEasyRuns.length;
            
            easyRunsAreTooFast = currentAvgEasyPace < 5.5;
            optimalEasyPaceMin = currentAvgEasyPace + 0.33;
            optimalEasyPaceMax = currentAvgEasyPace + 0.67;
          }
        }
      }
      
      // Format pace for display
      const formatPace = (pace: number) => {
        const minutes = Math.floor(pace);
        const seconds = Math.round((pace - minutes) * 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };
      
      // Convert km pace to miles pace (1 mile = 1.60934 km)
      const kmToMilesPace = (kmPace: number) => kmPace * 1.60934;
      
      const optimalEasyPaceMinMiles = kmToMilesPace(optimalEasyPaceMin);
      const optimalEasyPaceMaxMiles = kmToMilesPace(optimalEasyPaceMax);
      const currentAvgEasyPaceMiles = kmToMilesPace(currentAvgEasyPace);
      
      // Determine volume vs performance gap
      const volumeGrade = runnerScore.components.volume >= 20 ? 'A' : 
                          runnerScore.components.volume >= 15 ? 'B' : 
                          runnerScore.components.volume >= 10 ? 'C' : 'D';
      const performanceGrade = runnerScore.components.performance >= 20 ? 'A' : 
                               runnerScore.components.performance >= 15 ? 'B' : 
                               runnerScore.components.performance >= 10 ? 'C' : 'D';
      
      res.json({
        runnerIQ: {
          score: runnerScore.totalScore,
          grade: runnerScore.grade,
          components: runnerScore.components,
          volumeGrade,
          performanceGrade,
          hasGap: volumeGrade < performanceGrade || (volumeGrade === 'A' && performanceGrade !== 'A'),
        },
        trainingLoad: {
          change: loadChange,
          isCritical: loadChange !== null && loadChange > 20,
          thisWeekActivities: thisWeekActivities.length,
          lastWeekActivities: lastWeekActivities.length,
        },
        greyZone: {
          percentage: greyZonePercentage,
          activityCount: runningActivities.length,
          easyRunsAreTooFast,
          optimalEasyPaceKm: `${formatPace(optimalEasyPaceMin)} - ${formatPace(optimalEasyPaceMax)}`,
          optimalEasyPaceMiles: `${formatPace(optimalEasyPaceMinMiles)} - ${formatPace(optimalEasyPaceMaxMiles)}`,
          currentEasyPaceKm: formatPace(currentAvgEasyPace),
          currentEasyPaceMiles: formatPace(currentAvgEasyPaceMiles),
        }
      });
    } catch (error: any) {
      console.error('Audit report error:', error);
      res.status(500).json({ message: error.message || "Failed to generate audit report" });
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

  // Update user branding settings
  app.patch("/api/users/:userId/branding", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { stravaBrandingEnabled, stravaBrandingTemplate } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Verify the user owns this resource
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedUser = await storage.updateUser(userId, { 
        stravaBrandingEnabled,
        stravaBrandingTemplate
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Invalidate cached dashboard
      deleteCachedResponse(`dashboard:${userId}`);
      console.log(`[Branding] Updated branding settings for user ${userId}: enabled=${stravaBrandingEnabled}`);

      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error('Branding settings update error:', error);
      res.status(500).json({ message: error.message || "Failed to update branding settings" });
    }
  });

  // Update AI Coach preferences (Premium feature)
  app.patch("/api/users/:userId/coach-preferences", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Verify the user owns this resource
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Verify user has Premium subscription
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.subscriptionPlan !== "premium") {
        return res.status(403).json({ message: "AI Coach is a Premium feature" });
      }

      const {
        coachGoal,
        coachRaceDate,
        coachTargetTime,
        coachDaysAvailable,
        coachWeeklyMileageCap,
        coachTone,
        coachNotifyRecap,
        coachNotifyWeeklySummary,
        coachQuietHoursStart,
        coachQuietHoursEnd,
        coachOnboardingCompleted
      } = req.body;

      // Build update object with only provided fields
      const updates: Record<string, any> = {};
      
      if (coachGoal !== undefined) {
        const validGoals = ["5k", "10k", "half_marathon", "marathon", "general_fitness"];
        if (!validGoals.includes(coachGoal)) {
          return res.status(400).json({ message: "Invalid coach goal" });
        }
        updates.coachGoal = coachGoal;
      }
      
      if (coachRaceDate !== undefined) {
        if (coachRaceDate) {
          const parsed = new Date(coachRaceDate);
          if (isNaN(parsed.getTime())) {
            return res.status(400).json({ message: "Invalid race date format" });
          }
          updates.coachRaceDate = parsed;
        } else {
          updates.coachRaceDate = null;
        }
      }
      
      if (coachTargetTime !== undefined) {
        updates.coachTargetTime = coachTargetTime || null;
      }
      
      if (coachDaysAvailable !== undefined) {
        updates.coachDaysAvailable = coachDaysAvailable;
      }
      
      if (coachWeeklyMileageCap !== undefined) {
        updates.coachWeeklyMileageCap = coachWeeklyMileageCap;
      }
      
      if (coachTone !== undefined) {
        const validTones = ["gentle", "direct", "data_nerd"];
        if (!validTones.includes(coachTone)) {
          return res.status(400).json({ message: "Invalid coach tone" });
        }
        updates.coachTone = coachTone;
      }
      
      if (coachNotifyRecap !== undefined) {
        updates.coachNotifyRecap = coachNotifyRecap;
      }
      
      if (coachNotifyWeeklySummary !== undefined) {
        updates.coachNotifyWeeklySummary = coachNotifyWeeklySummary;
      }
      
      if (coachQuietHoursStart !== undefined) {
        updates.coachQuietHoursStart = coachQuietHoursStart;
      }
      
      if (coachQuietHoursEnd !== undefined) {
        updates.coachQuietHoursEnd = coachQuietHoursEnd;
      }
      
      if (coachOnboardingCompleted !== undefined) {
        updates.coachOnboardingCompleted = coachOnboardingCompleted;
      }

      const updatedUser = await storage.updateUser(userId, updates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Invalidate cached dashboard
      deleteCachedResponse(`dashboard:${userId}`);
      console.log(`[Coach] Updated coach preferences for user ${userId}`);

      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error('Coach preferences update error:', error);
      res.status(500).json({ message: error.message || "Failed to update coach preferences" });
    }
  });

  // Get coach recaps for user (Premium feature)
  app.get("/api/users/:userId/coach-recaps", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Authorization check: user can only fetch their own recaps
      if (req.user?.id !== userId && !req.user?.isAdmin) {
        return res.status(403).json({ message: "Not authorized to view this user's recaps" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.subscriptionPlan !== "premium" || user.subscriptionStatus !== "active") {
        return res.status(403).json({ message: "Premium subscription required for coach recaps" });
      }

      const recaps = await storage.getCoachRecapsByUserId(userId, limit);
      res.json({ recaps });
    } catch (error: any) {
      console.error('Coach recaps fetch error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch coach recaps" });
    }
  });

  // Get coach recap for specific activity (Premium feature)
  app.get("/api/activities/:activityId/coach-recap", authenticateJWT, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.activityId);
      
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }
      
      const activity = await storage.getActivityById(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Authorization check: user can only fetch recaps for their own activities
      if (req.user?.id !== activity.userId && !req.user?.isAdmin) {
        return res.status(403).json({ message: "Not authorized to view this activity's recap" });
      }
      
      const user = await storage.getUser(activity.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.subscriptionPlan !== "premium" || user.subscriptionStatus !== "active") {
        return res.status(403).json({ message: "Premium subscription required for coach recaps" });
      }

      const recap = await storage.getCoachRecapByActivityId(activityId);
      res.json({ recap: recap || null });
    } catch (error: any) {
      console.error('Coach recap fetch error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch coach recap" });
    }
  });

  // Get coach recaps for a user (Premium feature)
  app.get("/api/coach-recaps", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.subscriptionPlan !== "premium" || user.subscriptionStatus !== "active") {
        return res.status(403).json({ message: "Premium subscription required for coach recaps" });
      }
      
      const recaps = await storage.getCoachRecapsByUserId(userId, limit);
      res.json({ recaps });
    } catch (error: any) {
      console.error('Coach recaps list error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch coach recaps" });
    }
  });

  // Mark coach recap as viewed (Premium feature)
  app.patch("/api/coach-recaps/:recapId/viewed", authenticateJWT, async (req: any, res) => {
    try {
      const recapId = parseInt(req.params.recapId);
      
      if (isNaN(recapId)) {
        return res.status(400).json({ message: "Invalid recap ID" });
      }
      
      // Get the recap to verify ownership
      const recaps = await storage.getCoachRecapsByUserId(req.user?.id, 100);
      const recap = recaps.find(r => r.id === recapId);
      if (!recap && !req.user?.isAdmin) {
        return res.status(403).json({ message: "Not authorized to update this recap" });
      }
      
      await storage.markCoachRecapViewed(recapId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Coach recap mark viewed error:', error);
      res.status(500).json({ message: error.message || "Failed to mark recap as viewed" });
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

      // Clear backend caches for this user
      deleteCachedResponse(`dashboard:${userId}`);
      deleteCachedResponse(`chart:${userId}:7days`);
      deleteCachedResponse(`chart:${userId}:30days`);
      deleteCachedResponse(`chart:${userId}:90days`);
      deleteCachedResponse(`fitness:${userId}:30`);
      deleteCachedResponse(`fitness:${userId}:90`);
      deleteCachedResponse(`fitness:${userId}:180`);
      deleteCachedResponse(`fitness:${userId}:365`);
      console.log(`[CACHE] Cleared caches for user ${userId} after Strava disconnect`);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Strava disconnect error:', error);
      res.status(500).json({ message: error.message || "Failed to disconnect Strava" });
    }
  });

  // Strava queue status and rate limiter monitoring (admin only)
  app.get("/api/strava/queue/status", authenticateAdmin, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const queueStats = jobQueue.getStats();
      const rateLimitState = stravaClient.getRateLimitState();
      const userJobs = jobQueue.getJobsForUser(userId);
      const metricsSnapshot = metrics.getSnapshot();
      
      res.json({
        queue: queueStats,
        rateLimit: {
          shortTermUsage: rateLimitState.shortTermUsage,
          shortTermLimit: rateLimitState.shortTermLimit,
          longTermUsage: rateLimitState.longTermUsage,
          longTermLimit: rateLimitState.longTermLimit,
          isPaused: rateLimitState.isPaused,
          pauseUntil: rateLimitState.pauseUntil,
          lastUpdated: rateLimitState.lastUpdated,
        },
        userJobs: {
          pending: userJobs.pending.length,
          processing: userJobs.processing.length,
          completed: userJobs.completed.length,
          failed: userJobs.failed.length,
        },
        metrics: metricsSnapshot,
      });
    } catch (error: any) {
      console.error('Queue status error:', error);
      res.status(500).json({ message: error.message || "Failed to get queue status" });
    }
  });

  // User sync status endpoint - for frontend progress polling
  app.get("/api/strava/sync-status", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const syncState = await storage.getSyncState(userId);
      
      if (!syncState) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Also get current queue state for this user
      const userJobs = jobQueue.getJobsForUser(userId);
      
      res.json({
        syncStatus: syncState.syncStatus,
        syncProgress: syncState.syncProgress,
        syncTotal: syncState.syncTotal,
        syncError: syncState.syncError,
        lastSyncAt: syncState.lastSyncAt,
        lastIncrementalSince: syncState.lastIncrementalSince,
        queueState: {
          pendingJobs: userJobs.pending.length,
          processingJobs: userJobs.processing.length,
          completedJobs: userJobs.completed.length,
          failedJobs: userJobs.failed.length,
        },
      });
    } catch (error: any) {
      console.error('Sync status error:', error);
      res.status(500).json({ message: error.message || "Failed to get sync status" });
    }
  });

  // Repair endpoint to requeue activities missing hydration data
  // Now smarter: checks sync state to decide between full re-list vs just hydrate
  app.post("/api/strava/queue/repair/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.query?.limit as string) || 500;
      const forceRelist = req.body?.forceRelist === true;
      
      if (isNaN(userId) || req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check sync state to decide repair strategy
      const syncState = await storage.getSyncState(userId);
      const user = await storage.getUser(userId);
      
      if (!user || !user.stravaAccessToken) {
        return res.status(400).json({ message: "User not connected to Strava" });
      }
      
      // If sync is currently running, don't allow repair
      if (syncState?.syncStatus === 'running') {
        return res.status(409).json({ 
          message: "Sync is currently in progress. Please wait for it to complete.",
          syncStatus: syncState.syncStatus,
        });
      }
      
      // If last sync failed or never completed, or forceRelist requested, do a full re-list
      const needsRelist = forceRelist || 
        syncState?.syncStatus === 'error' || 
        !syncState?.lastSyncAt;
      
      if (needsRelist) {
        // Full re-list: queue LIST_ACTIVITIES job to fetch all activities
        const { createListActivitiesJob } = await import("./services/queue/jobTypes");
        
        const hasProPlan = user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'premium';
        const hasActiveStatus = user.subscriptionStatus === 'active' || 
                                user.subscriptionStatus === 'trialing' || 
                                user.subscriptionStatus === 'past_due';
        const maxActivities = hasProPlan && hasActiveStatus ? 500 : 50;
        
        const job = jobQueue.addJob(createListActivitiesJob(
          userId,
          1,       // Start from page 1
          200,     // Per page
          maxActivities,
          undefined, // No 'after' - fetch from beginning
          1        // Priority
        ));
        
        return res.json({ 
          success: true, 
          message: `Started full activity re-sync${syncState?.syncError ? ` (previous error: ${syncState.syncError})` : ''}`,
          strategy: 'relist',
          jobId: job.id,
        });
      }
      
      // Otherwise, just hydrate activities missing streams/laps
      const activitiesNeedingHydration = await storage.getActivitiesNeedingHydration(userId, limit);
      
      if (activitiesNeedingHydration.length === 0) {
        return res.json({ 
          success: true, 
          message: "All activities are fully hydrated", 
          strategy: 'hydrate',
          requeued: 0,
        });
      }
      
      const { createHydrateActivityJob } = await import("./services/queue/jobTypes");
      
      for (const activity of activitiesNeedingHydration) {
        const needsStreams = !activity.streamsData || !activity.streamsData.includes('"status":"not_available"');
        const needsLaps = !activity.lapsData || !activity.lapsData.includes('"status":"not_available"');
        
        if (needsStreams || needsLaps) {
          jobQueue.addJob(createHydrateActivityJob(
            userId,
            activity.id,
            activity.stravaId,
            needsStreams,
            needsLaps,
            3
          ));
        }
      }
      
      res.json({ 
        success: true, 
        message: `Requeued ${activitiesNeedingHydration.length} activities for hydration`,
        strategy: 'hydrate',
        requeued: activitiesNeedingHydration.length,
      });
    } catch (error: any) {
      console.error('Queue repair error:', error);
      res.status(500).json({ message: error.message || "Failed to repair queue" });
    }
  });

  // Queue-based Strava sync (alternative to direct sync)
  app.post("/api/strava/queue/sync/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      let maxActivities = parseInt(req.body?.maxActivities) || 500;
      
      if (isNaN(userId) || req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || !user.stravaAccessToken) {
        return res.status(400).json({ message: "User not connected to Strava" });
      }

      // Check subscription for activity limit
      const hasProPlan = user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'premium';
      const hasActiveStatus = user.subscriptionStatus === 'active' || 
                              user.subscriptionStatus === 'trialing' || 
                              user.subscriptionStatus === 'past_due';
      if (!hasProPlan || !hasActiveStatus) {
        maxActivities = Math.min(maxActivities, 50);
      }

      // Get most recent activity for incremental sync
      const mostRecentActivity = await storage.getMostRecentActivityByUserId(userId);
      let afterTimestamp: number | undefined;
      
      if (mostRecentActivity?.startDate) {
        const recentStartDate = new Date(mostRecentActivity.startDate);
        afterTimestamp = Math.floor(recentStartDate.getTime() / 1000) - 3600;
      }

      // Add the initial LIST_ACTIVITIES job to the queue
      const job = jobQueue.addJob(createListActivitiesJob(
        userId,
        1,
        200,
        maxActivities,
        afterTimestamp,
        1
      ));

      res.json({ 
        success: true, 
        message: "Sync job queued", 
        jobId: job.id,
        incremental: !!afterTimestamp,
      });
    } catch (error: any) {
      console.error('Queue sync error:', error);
      res.status(500).json({ message: error.message || "Failed to queue sync" });
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

  // Get activities heatmap data (GitHub-style contribution graph)
  app.get("/api/activities/heatmap", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const range = (req.query.range as string) || "3m"; // "3m" or "6m"
      
      const user = await storage.getUser(userId);
      const unitPreference = user?.unitPreference || 'km';
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      if (range === "6m") {
        startDate.setMonth(startDate.getMonth() - 6);
      } else {
        startDate.setMonth(startDate.getMonth() - 3);
      }
      
      // Fetch activities within the date range
      const activities = await storage.getActivitiesByUserId(userId, 1000, startDate);
      
      // Aggregate activities by day
      const dailyData: Map<string, { totalDistanceKm: number; activities: Array<{ id: number; name: string; distanceKm: number; grade?: string }> }> = new Map();
      
      for (const activity of activities) {
        if (activity.type !== 'Run') continue;
        
        const activityDate = new Date(activity.startDate);
        if (activityDate < startDate || activityDate > endDate) continue;
        
        const dateKey = activityDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const distanceKm = activity.distance / 1000;
        
        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, { totalDistanceKm: 0, activities: [] });
        }
        
        const dayData = dailyData.get(dateKey)!;
        dayData.totalDistanceKm += distanceKm;
        dayData.activities.push({
          id: activity.id,
          name: activity.name,
          distanceKm: distanceKm,
          grade: activity.cachedGrade || undefined
        });
      }
      
      // Generate all days in range with empty days filled
      const result: Array<{ date: string; totalDistanceKm: number; activities: Array<{ id: number; name: string; distanceKm: number; grade?: string }> }> = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const dateKey = current.toISOString().split('T')[0];
        const dayData = dailyData.get(dateKey);
        
        result.push({
          date: dateKey,
          totalDistanceKm: dayData?.totalDistanceKm || 0,
          activities: dayData?.activities || []
        });
        
        current.setDate(current.getDate() + 1);
      }
      
      // Calculate max distance for color scaling
      const maxDistance = Math.max(...result.map(d => d.totalDistanceKm), 0);
      
      res.json({
        days: result,
        maxDistance,
        rangeStart: startDate.toISOString().split('T')[0],
        rangeEnd: endDate.toISOString().split('T')[0],
        unitPreference
      });
    } catch (error: any) {
      console.error('Get activities heatmap error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch heatmap data" });
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

      // Use cached grades from verdicts, calculate fallback if not available
      const activitiesWithGrades = (() => {
        const allActivities = result.activities || [];
        if (allActivities.length === 0) return allActivities;

        // Calculate averages for fallback grade calculation
        const avgDistance = allActivities.reduce((sum: number, a: any) => sum + (a.distance || 0), 0) / allActivities.length;
        const validPaceActivities = allActivities.filter((a: any) => a.distance > 0 && a.movingTime > 0);
        const avgPaceValue = validPaceActivities.length > 0
          ? validPaceActivities.reduce((sum: number, a: any) => {
              const distKm = a.distance / 1000;
              return sum + (a.movingTime / 60) / distKm;
            }, 0) / validPaceActivities.length
          : 0;

        return allActivities.map((activity: any) => {
          // Use cached grade if available, otherwise calculate fallback
          const grade = activity.cachedGrade || (() => {
            if (avgDistance <= 0) return "C";
            let score = 70;
            const distanceRatio = activity.distance / avgDistance;
            const distKm = activity.distance / 1000;
            const pacePerKm = distKm > 0 ? (activity.movingTime / 60) / distKm : 0;
            const paceRatio = avgPaceValue > 0 ? avgPaceValue / pacePerKm : 1;
            
            if (paceRatio > 1.1) score += 15;
            else if (paceRatio > 1.05) score += 10;
            else if (paceRatio > 1.0) score += 5;
            else if (paceRatio < 0.9) score -= 10;
            else if (paceRatio < 0.95) score -= 5;
            
            if (distanceRatio > 1.2) score += 10;
            else if (distanceRatio > 1.0) score += 5;
            else if (distanceRatio < 0.5) score -= 15;
            else if (distanceRatio < 0.8) score -= 5;
            
            if (score >= 85) return "A";
            if (score >= 75) return "B";
            if (score >= 65) return "C";
            if (score >= 55) return "D";
            return "F";
          })();
          return { ...activity, grade };
        });
      })();

      res.json({ ...result, activities: activitiesWithGrades });
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

  // 2025 Running Wrapped - Year in Review stats
  app.get("/api/wrapped/2025", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all activities for 2025
      const activities = await storage.getActivitiesByUserId(userId);
      const runningTypes = ['Run', 'TrailRun', 'VirtualRun'];
      
      // Filter to 2025 running activities only
      const activities2025 = activities.filter(a => {
        const activityDate = new Date(a.startDate);
        return activityDate.getFullYear() === 2025 && runningTypes.includes(a.type);
      });

      if (activities2025.length === 0) {
        return res.json({
          hasData: false,
          message: "No running activities found for 2025"
        });
      }

      // Calculate stats
      const totalDistanceMeters = activities2025.reduce((sum, a) => sum + (a.distance || 0), 0);
      const totalTimeSeconds = activities2025.reduce((sum, a) => sum + (a.movingTime || 0), 0);
      const totalRuns = activities2025.length;
      
      // Longest run
      const longestRun = activities2025.reduce((max, a) => 
        (a.distance || 0) > (max.distance || 0) ? a : max, activities2025[0]);
      
      // Fastest pace (lowest min/km for runs over 1km)
      const runsOver1km = activities2025.filter(a => (a.distance || 0) >= 1000);
      let fastestPace = null;
      let fastestPaceActivity = null;
      if (runsOver1km.length > 0) {
        fastestPaceActivity = runsOver1km.reduce((fastest, a) => {
          const paceA = a.movingTime / (a.distance / 1000);
          const paceFastest = fastest.movingTime / (fastest.distance / 1000);
          return paceA < paceFastest ? a : fastest;
        }, runsOver1km[0]);
        fastestPace = fastestPaceActivity.movingTime / (fastestPaceActivity.distance / 1000);
      }

      // Most active month
      const monthCounts: Record<number, number> = {};
      activities2025.forEach(a => {
        const month = new Date(a.startDate).getMonth();
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });
      const mostActiveMonth = Object.entries(monthCounts).reduce((max, [month, count]) => 
        count > max.count ? { month: parseInt(month), count } : max, { month: 0, count: 0 });
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];

      // Favorite day of week
      const dayCounts: Record<number, number> = {};
      activities2025.forEach(a => {
        const day = new Date(a.startDate).getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const favoriteDay = Object.entries(dayCounts).reduce((max, [day, count]) => 
        count > max.count ? { day: parseInt(day), count } : max, { day: 0, count: 0 });
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      // Average distance per run
      const avgDistanceMeters = totalDistanceMeters / totalRuns;

      // Total elevation gain
      const totalElevationGain = activities2025.reduce((sum, a) => sum + (a.totalElevationGain || 0), 0);

      // Calculate percentile compared to all platform users (simplified)
      const platformStats = await storage.getPlatformStats();
      const avgMilesPerUser = platformStats.totalDistance / 1609.34 / Math.max(platformStats.totalUsers, 1);
      const userMiles = totalDistanceMeters / 1609.34;
      const percentile = Math.min(99, Math.round((userMiles / Math.max(avgMilesPerUser * 2, 1)) * 50));

      // Fetch top AI insights for the user
      const allInsights = await storage.getAIInsightsByUserId(userId);
      const topInsights = allInsights
        .filter(i => ['performance', 'recommendation', 'pattern'].includes(i.type))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 2)
        .map(i => ({
          type: i.type,
          title: i.title,
          content: i.content.length > 100 ? i.content.substring(0, 100) + '...' : i.content
        }));

      // Unit conversions
      const unitPref = user.unitPreference || 'km';
      const distanceMultiplier = unitPref === 'miles' ? 0.000621371 : 0.001;
      const distanceUnit = unitPref === 'miles' ? 'mi' : 'km';
      const elevationUnit = unitPref === 'miles' ? 'ft' : 'm';
      const elevationMultiplier = unitPref === 'miles' ? 3.28084 : 1;

      res.json({
        hasData: true,
        year: 2025,
        stats: {
          totalDistance: Math.round(totalDistanceMeters * distanceMultiplier * 10) / 10,
          totalDistanceUnit: distanceUnit,
          totalHours: Math.round(totalTimeSeconds / 3600 * 10) / 10,
          totalRuns,
          longestRun: {
            distance: Math.round((longestRun.distance || 0) * distanceMultiplier * 10) / 10,
            name: longestRun.name,
            date: longestRun.startDate
          },
          fastestPace: fastestPace ? {
            paceMinutes: Math.floor(fastestPace / 60),
            paceSeconds: Math.round(fastestPace % 60),
            activityName: fastestPaceActivity?.name,
            date: fastestPaceActivity?.startDate
          } : null,
          mostActiveMonth: {
            name: monthNames[mostActiveMonth.month],
            runCount: mostActiveMonth.count
          },
          favoriteDay: {
            name: dayNames[favoriteDay.day],
            runCount: favoriteDay.count
          },
          avgDistancePerRun: Math.round(avgDistanceMeters * distanceMultiplier * 10) / 10,
          totalElevationGain: Math.round(totalElevationGain * elevationMultiplier),
          elevationUnit,
          percentile,
          unitPreference: unitPref
        },
        userName: user.firstName || user.username || 'Runner',
        aiInsights: topInsights
      });
    } catch (error: any) {
      console.error('Wrapped 2025 error:', error);
      res.status(500).json({ message: error.message || "Failed to generate wrapped stats" });
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

  // On-demand activity hydration - fetches streams/laps when needed
  app.post("/api/activities/:activityId/hydrate", authenticateJWT, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.activityId);
      
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      const activity = await storage.getActivityById(activityId);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Verify ownership
      if (activity.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if already hydrated
      if (activity.hydrationStatus === 'complete') {
        return res.json({ 
          success: true, 
          message: "Activity already hydrated",
          activity 
        });
      }

      // Enqueue immediate hydration with highest priority
      const needsStreams = !activity.streamsData || activity.streamsData === 'null';
      const needsLaps = !activity.lapsData || activity.lapsData === 'null';
      
      if (needsStreams || needsLaps) {
        jobQueue.addJob(createHydrateActivityJob(
          activity.userId,
          activity.id,
          activity.stravaId,
          needsStreams,
          needsLaps,
          0 // Priority 0 = highest
        ));
      }

      res.json({ 
        success: true, 
        message: "Hydration queued",
        needsStreams,
        needsLaps,
        queuePosition: jobQueue.getStats().pendingJobs
      });
    } catch (error: any) {
      console.error('Activity hydration error:', error);
      res.status(500).json({ message: error.message || "Failed to hydrate activity" });
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

      // Parse state - may include "_audit" suffix for tracking source
      const stateStr = state as string;
      const isFromAudit = stateStr.endsWith('_audit');
      const userIdStr = isFromAudit ? stateStr.replace('_audit', '') : stateStr;
      const userId = parseInt(userIdStr);
      
      if (isNaN(userId)) {
        return res.redirect("/?error=invalid_user");
      }

      const tokenData = await stravaService.exchangeCodeForTokens(code as string);
      
      await storage.updateUser(userId, {
        stravaAccessToken: tokenData.access_token,
        stravaRefreshToken: tokenData.refresh_token,
        stravaAthleteId: tokenData.athlete.id.toString(),
        stravaConnected: true,
        stravaHasWriteScope: true,
      });

      // Trigger initial activity sync after Strava connection
      try {
        jobQueue.addJob(createListActivitiesJob(
          userId,
          1,      // page
          200,    // perPage (Strava API max)
          200     // maxActivities
        ));
        console.log(`[Strava] Queued initial activity sync for user ${userId}`);
      } catch (syncError) {
        console.error('Failed to queue initial sync:', syncError);
      }

      // Trigger drip campaign transition from segment_a to segment_b
      try {
        await dripCampaignService.onStravaConnected(userId);
        console.log(`[DripCampaign] Strava callback triggered segment transition for user ${userId}`);
      } catch (campaignError) {
        console.error('Drip campaign trigger failed in Strava callback:', campaignError);
      }

      // Redirect based on where they came from
      const redirectUrl = isFromAudit ? "/audit-report?connected=true" : "/dashboard?connected=true";
      res.redirect(redirectUrl);
    } catch (error: any) {
      console.error('Strava callback error:', error);
      res.redirect("/dashboard?error=connection_failed");
    }
  });

  // Manual Strava activity sync endpoint
  app.post("/api/strava/sync-activities", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { maxActivities = 500 } = req.body;

      const user = await storage.getUser(userId);
      if (!user || !user.stravaConnected) {
        return res.status(400).json({ message: "Strava not connected" });
      }

      // Extended sync (up to 500 activities) is now available to all users

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
      
      // Invalidate batch analytics cache so it includes the new plan
      deleteCachedResponse(`analytics-batch:${userId}`);
      console.log(`[Training Plan] Invalidated batch cache for user ${userId}`);
      
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

  // Delete training plans
  app.delete("/api/ml/training-plan/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      await storage.deleteTrainingPlans(userId);
      res.json({ success: true, message: "Training plan deleted" });
    } catch (error: any) {
      console.error('Error deleting training plan:', error);
      res.status(500).json({ message: error.message || "Failed to delete training plan" });
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

  // Get user performance baseline (6-week rolling averages)
  app.get("/api/performance/baseline/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const cacheKey = `baseline:${userId}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const baseline = await effortScoreService.calculateUserBaseline(userId, 42);
      
      setCachedResponse(cacheKey, baseline);
      res.json(baseline);
    } catch (error: any) {
      console.error('Error calculating baseline:', error);
      res.status(500).json({ message: error.message || "Failed to calculate baseline" });
    }
  });

  // Get user recovery state (time-aware freshness and injury risk)
  app.get("/api/performance/recovery/:userId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const cacheKey = `recovery:${userId}`;
      const cached = getCachedResponse(cacheKey, 30);
      if (cached) {
        return res.json(cached);
      }

      const recoveryState = await getRecoveryState(userId);
      
      if (!recoveryState) {
        return res.status(404).json({ message: "User not found" });
      }

      setCachedResponse(cacheKey, recoveryState);
      res.json(recoveryState);
    } catch (error: any) {
      console.error('Error getting recovery state:', error);
      res.status(500).json({ message: error.message || "Failed to get recovery state" });
    }
  });

  // Get coach verdict for an activity (Pro tier feature)
  app.get("/api/activities/:activityId/verdict", authenticateJWT, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.activityId);
      const userId = req.user.id;
      
      if (isNaN(activityId)) {
        return res.status(400).json({ message: "Invalid activity ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const now = new Date();
      const isInTrial = user.trialEndsAt && new Date(user.trialEndsAt) > now && !user.stripeSubscriptionId;
      const isPro = user.subscriptionPlan === 'pro' || user.subscriptionPlan === 'premium' || isInTrial;
      
      if (!isPro) {
        return res.status(403).json({ 
          message: "Coach Verdict requires Pro subscription",
          requiresPro: true
        });
      }

      const unitPreference = user.unitPreference || 'km';
      const cacheKey = `verdict:${activityId}:${userId}:${unitPreference}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const verdict = await coachVerdictService.generateVerdict(activityId, userId, unitPreference);
      
      if (!verdict) {
        return res.status(404).json({ message: "Activity not found or not accessible" });
      }

      // Cache the grade on the activity for dashboard consistency
      try {
        await storage.updateActivityGrade(activityId, verdict.grade);
      } catch (e) {
        console.error('Failed to cache activity grade:', e);
      }

      setCachedResponse(cacheKey, verdict);
      res.json(verdict);
    } catch (error: any) {
      console.error('Error generating verdict:', error);
      res.status(500).json({ message: error.message || "Failed to generate verdict" });
    }
  });

  // Get data quality analysis for an activity
  app.get("/api/activities/:activityId/quality", authenticateJWT, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.activityId);
      const userId = req.user.id;

      const activity = await storage.getActivityById(activityId);
      if (!activity || activity.userId !== userId) {
        return res.status(404).json({ message: "Activity not found" });
      }

      const cacheKey = `quality:${activityId}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const streams = await storage.getActivityStreams(activityId);
      if (!streams) {
        return res.json({
          score: 0,
          flags: [],
          hrQuality: 0,
          gpsQuality: 0,
          pauseQuality: 0,
          totalDataPoints: 0,
          affectedPercentage: 0
        });
      }

      const qualityResult = dataQualityService.analyzeStreamQuality(
        streams,
        activity.movingTime || 0,
        activity.elapsedTime || activity.movingTime || 0
      );

      setCachedResponse(cacheKey, qualityResult);
      res.json(qualityResult);
    } catch (error: any) {
      console.error('Error analyzing data quality:', error);
      res.status(500).json({ message: error.message || "Failed to analyze data quality" });
    }
  });

  // Get efficiency metrics for an activity
  app.get("/api/activities/:activityId/efficiency", authenticateJWT, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.activityId);
      const userId = req.user.id;

      const activity = await storage.getActivityById(activityId);
      if (!activity || activity.userId !== userId) {
        return res.status(404).json({ message: "Activity not found" });
      }

      const cacheKey = `efficiency:${activityId}`;
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const rawStreams = await storage.getActivityStreams(activityId);
      if (!rawStreams) {
        return res.json({
          aerobicDecoupling: null,
          decouplingLabel: "unknown",
          paceHrEfficiency: null,
          pacingStability: 50,
          pacingLabel: "variable",
          cadenceDrift: null,
          firstHalfPace: null,
          secondHalfPace: null,
          firstHalfHr: null,
          secondHalfHr: null,
          splitVariance: 0
        });
      }

      // Normalize streams format - Strava stores as { streamType: { data: [...] } }
      // but efficiency service expects { streamType: [...] }
      const normalizedStreams: any = {};
      for (const key of Object.keys(rawStreams)) {
        normalizedStreams[key] = rawStreams[key]?.data || rawStreams[key];
      }

      const efficiencyResult = efficiencyService.calculateEfficiencyMetrics(
        normalizedStreams,
        activity.distance || 0
      );

      setCachedResponse(cacheKey, efficiencyResult);
      res.json(efficiencyResult);
    } catch (error: any) {
      console.error('Error calculating efficiency:', error);
      res.status(500).json({ message: error.message || "Failed to calculate efficiency" });
    }
  });

  // Update user preferences (including activityViewMode)
  app.patch("/api/user/preferences", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { activityViewMode } = req.body;
      
      const validModes = ['story', 'deep_dive', 'minimal'];
      if (activityViewMode && !validModes.includes(activityViewMode)) {
        return res.status(400).json({ message: "Invalid view mode" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.updateUser(userId, { activityViewMode });
      res.json(updatedUser);
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      res.status(500).json({ message: error.message || "Failed to update preferences" });
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

      // Execute all calculations in parallel (include user for unit preference)
      const [user, predictions, injuryRisk, trainingPlan, vo2Max, efficiency, hrZones] = await Promise.all([
        storage.getUser(userId).catch(err => {
          console.error('[Batch] User error:', err.message);
          return null;
        }),
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
        trainingPlan: trainingPlan?.planData || null,
        vo2Max,
        efficiency,
        hrZones: hrZones ? { heartRateZones: hrZones } : null,
        unitPreference: user?.unitPreference || 'miles'
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

  // Admin: Agent runs statistics
  app.get("/api/admin/agent-stats", authenticateAdmin, async (req, res) => {
    try {
      const agentStats = await storage.getAgentRunStats();
      res.json(agentStats);
    } catch (error: any) {
      console.error('Admin agent stats error:', error);
      res.status(500).json({ message: error.message || "Failed to get agent stats" });
    }
  });

  // ================== RUNNING SHOES API ==================

  // Get all shoes with optional filtering
  app.get("/api/shoes", async (req, res) => {
    try {
      const { brand, category, minPrice, maxPrice, hasCarbonPlate, stability } = req.query;
      
      const filters: any = {};
      if (brand) filters.brand = brand as string;
      if (category) filters.category = category as string;
      if (minPrice) filters.minPrice = parseFloat(minPrice as string);
      if (maxPrice) filters.maxPrice = parseFloat(maxPrice as string);
      if (hasCarbonPlate !== undefined) filters.hasCarbonPlate = hasCarbonPlate === 'true';
      if (stability) filters.stability = stability as string;

      const shoes = await storage.getShoes(filters);
      res.json(shoes);
    } catch (error: any) {
      console.error('Get shoes error:', error);
      res.status(500).json({ message: error.message || "Failed to get shoes" });
    }
  });

  // Get unique brands for filtering
  app.get("/api/shoes/brands", async (req, res) => {
    try {
      const shoes = await storage.getShoes({});
      const brands = [...new Set(shoes.map(s => s.brand))].sort();
      res.json(brands);
    } catch (error: any) {
      console.error('Get shoe brands error:', error);
      res.status(500).json({ message: error.message || "Failed to get brands" });
    }
  });

  // Get personalized shoe recommendations based on user profile
  app.get("/api/shoes/recommend", async (req, res) => {
    try {
      const { weight, height, weeklyMileage, goal, footType } = req.query;
      
      const userWeight = weight ? parseInt(weight as string) : 160;
      const userGoal = (goal as string) || 'general';
      const userFootType = (footType as string) || 'neutral';
      
      const allShoes = await storage.getShoes({});
      
      // Filter and score shoes based on user profile
      const recommendations = allShoes
        .map(shoe => {
          let score = 0;
          
          // Weight compatibility (higher score if within recommended range)
          if (shoe.minRunnerWeight && shoe.maxRunnerWeight) {
            if (userWeight >= shoe.minRunnerWeight && userWeight <= shoe.maxRunnerWeight) {
              score += 30;
            } else if (userWeight > shoe.maxRunnerWeight) {
              // Heavier runners need more cushion/durability
              if (shoe.cushioningLevel === 'soft' || shoe.durabilityRating >= 4) {
                score += 15;
              }
            }
          } else {
            score += 10; // No weight restriction
          }
          
          // Goal matching
          if (userGoal === 'racing' && shoe.category === 'racing') {
            score += 25;
          } else if (userGoal === 'marathon' && (shoe.category === 'long_run' || shoe.category === 'racing')) {
            score += 25;
          } else if (userGoal === 'speed' && (shoe.category === 'speed_training' || shoe.category === 'racing')) {
            score += 25;
          } else if (userGoal === 'recovery' && shoe.category === 'recovery') {
            score += 25;
          } else if (userGoal === 'daily' && shoe.category === 'daily_trainer') {
            score += 25;
          } else if (userGoal === 'general') {
            score += 15;
          }
          
          // Foot type / stability matching
          if (userFootType === 'neutral' && shoe.stability === 'neutral') {
            score += 20;
          } else if (userFootType === 'overpronator' && shoe.stability !== 'neutral') {
            score += 20;
          } else if (userFootType === 'supinator' && shoe.stability === 'neutral') {
            score += 15;
          }
          
          // Quality ratings bonus
          score += shoe.comfortRating * 2;
          score += shoe.durabilityRating * 1.5;
          score += shoe.responsivenessRating * 1.5;
          
          return { shoe, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(r => ({ ...r.shoe, matchScore: Math.round(r.score) }));
      
      res.json(recommendations);
    } catch (error: any) {
      console.error('Shoe recommendations error:', error);
      res.status(500).json({ message: error.message || "Failed to get recommendations" });
    }
  });

  // Get shoe rotation recommendation based on user profile
  app.get("/api/shoes/rotation", async (req, res) => {
    try {
      const { weight, weeklyMileage } = req.query;
      const userWeight = weight ? parseInt(weight as string) : 160;
      const mileage = weeklyMileage ? parseInt(weeklyMileage as string) : 30;
      
      const allShoes = await storage.getShoes({});
      
      // Helper function to find best shoe for category
      const findBestForCategory = (category: string, preference: 'cushion' | 'responsive' | 'balanced') => {
        return allShoes
          .filter(s => s.category === category)
          .filter(s => {
            // For heavier runners, prefer more durable/cushioned options
            if (userWeight > 180) {
              return s.durabilityRating >= 3.5 || s.cushioningLevel === 'soft';
            }
            return true;
          })
          .sort((a, b) => {
            if (preference === 'cushion') {
              return b.comfortRating - a.comfortRating;
            } else if (preference === 'responsive') {
              return b.responsivenessRating - a.responsivenessRating;
            }
            return (b.comfortRating + b.responsivenessRating + b.durabilityRating) - 
                   (a.comfortRating + a.responsivenessRating + a.durabilityRating);
          })[0];
      };
      
      const rotation: { role: string; shoe: RunningShoe | null; usage: string; description: string }[] = [
        {
          role: "Daily Trainer",
          shoe: findBestForCategory('daily_trainer', 'balanced'),
          usage: "60-70% of runs",
          description: "Your go-to shoe for most training runs. Versatile and durable."
        },
        {
          role: "Long Run",
          shoe: findBestForCategory('long_run', 'cushion') || findBestForCategory('recovery', 'cushion'),
          usage: "Weekly long runs",
          description: "Extra cushioning for those longer efforts when your legs need protection."
        },
        {
          role: "Speed Work",
          shoe: findBestForCategory('speed_training', 'responsive'),
          usage: "Tempo runs & intervals",
          description: "Lighter and more responsive for faster workouts and track sessions."
        },
        {
          role: "Race Day",
          shoe: findBestForCategory('racing', 'responsive'),
          usage: "Races & time trials",
          description: "Maximum performance for when it counts. Save these for race day."
        },
        {
          role: "Recovery",
          shoe: findBestForCategory('recovery', 'cushion'),
          usage: "Easy/recovery days",
          description: "Ultra-cushioned for recovery runs when your legs need a break."
        }
      ];
      
      // Filter out null shoes
      const validRotation = rotation.filter(r => r.shoe !== null);
      
      res.json({
        rotation: validRotation,
        userProfile: { weight: userWeight, weeklyMileage: mileage },
        tip: userWeight > 200 
          ? "As a heavier runner, prioritize cushioning and durability in your rotation."
          : userWeight < 140
          ? "As a lighter runner, you can benefit from responsive, lighter shoes."
          : "Focus on a balanced rotation that covers all your training needs."
      });
    } catch (error: any) {
      console.error('Shoe rotation error:', error);
      res.status(500).json({ message: error.message || "Failed to get rotation" });
    }
  });

  // Get multiple shoes by slugs (for comparison page)
  app.get("/api/shoes/compare", async (req, res) => {
    try {
      const { slugs } = req.query;
      
      if (!slugs || typeof slugs !== 'string') {
        return res.status(400).json({ message: "slugs query parameter is required" });
      }
      
      const slugList = slugs.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
      if (slugList.length === 0) {
        return res.status(400).json({ message: "No valid slugs provided" });
      }
      
      if (slugList.length > 10) {
        return res.status(400).json({ message: "Maximum 10 shoes can be compared at once" });
      }
      
      // Fetch all shoes by their slugs
      const shoes = await Promise.all(
        slugList.map(slug => storage.getShoeBySlug(slug))
      );
      
      // Filter out nulls (invalid slugs)
      const validShoes = shoes.filter((shoe): shoe is RunningShoe => shoe !== null);
      
      res.json({
        shoes: validShoes,
        requestedCount: slugList.length,
        foundCount: validShoes.length
      });
    } catch (error: any) {
      console.error('Shoe comparison error:', error);
      res.status(500).json({ message: error.message || "Failed to get shoes for comparison" });
    }
  });

  // Get a single shoe by slug (for SEO-friendly URLs)
  app.get("/api/shoes/by-slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const shoe = await storage.getShoeBySlug(slug);
      
      if (!shoe) {
        return res.status(404).json({ message: "Shoe not found" });
      }
      
      // Get related shoes in the same series for comparison charts
      let seriesShoes: RunningShoe[] = [];
      if (shoe.seriesName) {
        const allSeriesShoes = await storage.getShoesBySeries(shoe.brand, shoe.seriesName);
        // Sort by version number (or release year as fallback)
        seriesShoes = allSeriesShoes.sort((a, b) => {
          if (a.versionNumber && b.versionNumber) {
            return a.versionNumber - b.versionNumber;
          }
          return (a.releaseYear || 0) - (b.releaseYear || 0);
        });
      }
      
      res.json({
        shoe,
        seriesShoes,
        hasSeriesData: seriesShoes.length > 1
      });
    } catch (error: any) {
      console.error('Get shoe by slug error:', error);
      res.status(500).json({ message: error.message || "Failed to get shoe" });
    }
  });

  // Shoe Comparison endpoints (pre-generated comparisons for SEO)
  app.get("/api/shoes/comparisons", async (req, res) => {
    try {
      const { type, limit } = req.query;
      const comparisons = await storage.getShoeComparisons({
        type: type as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      
      // Fetch shoe details for each comparison
      const comparisonsWithShoes = await Promise.all(
        comparisons.map(async (comparison) => {
          const [shoe1, shoe2] = await Promise.all([
            storage.getShoeById(comparison.shoe1Id),
            storage.getShoeById(comparison.shoe2Id)
          ]);
          return { ...comparison, shoe1, shoe2 };
        })
      );
      
      res.json(comparisonsWithShoes);
    } catch (error: any) {
      console.error('Get shoe comparisons error:', error);
      res.status(500).json({ message: error.message || "Failed to get comparisons" });
    }
  });

  app.get("/api/shoes/comparisons/by-slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const comparison = await storage.getShoeComparisonBySlug(slug);
      
      if (!comparison) {
        return res.status(404).json({ message: "Comparison not found" });
      }
      
      // Increment view count
      await storage.incrementComparisonViewCount(comparison.id);
      
      // Fetch full shoe details
      const [shoe1, shoe2] = await Promise.all([
        storage.getShoeById(comparison.shoe1Id),
        storage.getShoeById(comparison.shoe2Id)
      ]);
      
      res.json({ ...comparison, shoe1, shoe2 });
    } catch (error: any) {
      console.error('Get comparison by slug error:', error);
      res.status(500).json({ message: error.message || "Failed to get comparison" });
    }
  });

  app.get("/api/shoes/comparisons/for-shoe/:shoeId", async (req, res) => {
    try {
      const shoeId = parseInt(req.params.shoeId);
      const comparisons = await storage.getShoeComparisonsByShoeId(shoeId);
      
      // Fetch shoe details for each comparison
      const comparisonsWithShoes = await Promise.all(
        comparisons.map(async (comparison) => {
          const [shoe1, shoe2] = await Promise.all([
            storage.getShoeById(comparison.shoe1Id),
            storage.getShoeById(comparison.shoe2Id)
          ]);
          return { ...comparison, shoe1, shoe2 };
        })
      );
      
      res.json(comparisonsWithShoes);
    } catch (error: any) {
      console.error('Get comparisons for shoe error:', error);
      res.status(500).json({ message: error.message || "Failed to get comparisons" });
    }
  });

  // Get a single shoe by ID (must be after specific routes like /recommend and /rotation)
  app.get("/api/shoes/:id", async (req, res) => {
    try {
      const shoeId = parseInt(req.params.id);
      const shoe = await storage.getShoeById(shoeId);
      
      if (!shoe) {
        return res.status(404).json({ message: "Shoe not found" });
      }
      
      res.json(shoe);
    } catch (error: any) {
      console.error('Get shoe error:', error);
      res.status(500).json({ message: error.message || "Failed to get shoe" });
    }
  });

  // Seed shoes database (admin only for security)
  app.post("/api/shoes/seed", authenticateAdmin, async (req: any, res) => {
    try {
      const force = req.query.force === 'true';
      
      // Check if shoes already exist
      const existingShoes = await storage.getShoes({});
      
      if (existingShoes.length > 0 && !force) {
        return res.json({ 
          message: `Database already has ${existingShoes.length} shoes. Use ?force=true to reseed.`,
          count: existingShoes.length 
        });
      }

      // If force, clear existing shoes first
      if (force && existingShoes.length > 0) {
        await storage.clearAllShoes();
      }

      // Seed the database with enriched shoe data (including AI fields)
      const enrichedShoes = getEnrichedShoeData();
      let seededCount = 0;
      for (const shoe of enrichedShoes) {
        await storage.createShoe(shoe);
        seededCount++;
      }

      res.json({ 
        message: `Successfully seeded ${seededCount} shoes with AI data${force ? ' (force reseed)' : ''}`,
        count: seededCount 
      });
    } catch (error: any) {
      console.error('Seed shoes error:', error);
      res.status(500).json({ message: error.message || "Failed to seed shoes" });
    }
  });

  // Generate shoe comparisons (admin only)
  app.post("/api/shoes/comparisons/generate", authenticateAdmin, async (req: any, res) => {
    try {
      const { generateAllComparisons } = await import("./services/shoeComparisonGenerator");
      const result = await generateAllComparisons();
      
      res.json({
        message: "Successfully generated shoe comparisons",
        ...result
      });
    } catch (error: any) {
      console.error('Generate comparisons error:', error);
      res.status(500).json({ message: error.message || "Failed to generate comparisons" });
    }
  });

  // Get pipeline stats from database (admin only)
  app.get("/api/shoes/pipeline/stats", authenticateAdmin, async (req: any, res) => {
    try {
      // Fetch shoes from database (live data)
      const dbShoes = await storage.getShoes({});
      const shoes = getShoesWithMetadataFromStorage(dbShoes as any);
      const stats = getPipelineStats(shoes);
      const duplicates = findDuplicates(shoes);
      
      res.json({
        stats,
        duplicates,
        databaseCount: dbShoes.length,
        seedDataCount: shoeData.length
      });
    } catch (error: any) {
      console.error('Pipeline stats error:', error);
      res.status(500).json({ message: error.message || "Failed to get pipeline stats" });
    }
  });

  // Validate all shoe data from database (admin only)
  app.get("/api/shoes/pipeline/validate", authenticateAdmin, async (req: any, res) => {
    try {
      // Fetch shoes from database for validation
      const dbShoes = await storage.getShoes({});
      const shoes = getShoesWithMetadataFromStorage(dbShoes as any);
      
      const valid: typeof shoes = [];
      const invalid: { shoe: typeof shoes[0]; errors: string[] }[] = [];
      
      const { validateShoeData } = await import("./shoe-pipeline");
      
      shoes.forEach(shoe => {
        const validation = validateShoeData(shoe);
        if (validation.valid) {
          valid.push(shoe);
        } else {
          invalid.push({ shoe, errors: validation.errors });
        }
      });
      
      res.json({
        totalShoes: valid.length + invalid.length,
        validShoes: valid.length,
        invalidShoes: invalid.length,
        stats: getPipelineStats(shoes),
        errors: invalid.map(i => ({
          brand: i.shoe.brand,
          model: i.shoe.model,
          errors: i.errors
        }))
      });
    } catch (error: any) {
      console.error('Pipeline validation error:', error);
      res.status(500).json({ message: error.message || "Failed to validate shoes" });
    }
  });

  // ============== REVERSE TRIAL EMAIL PROCESSING ==============
  // This endpoint can be called by a cron job or on app startup to send trial emails
  app.post("/api/admin/process-trial-emails", authenticateAdmin, async (req: any, res) => {
    try {
      const results = {
        remindersSent: 0,
        expiredSent: 0,
        errors: [] as string[]
      };

      // 1. Send reminder emails (2 days before expiry)
      const usersNearingExpiry = await storage.getUsersWithTrialEndingSoon(2);
      for (const user of usersNearingExpiry) {
        try {
          await emailService.sendTrialReminderEmail(user.email, user.firstName || undefined, 2);
          results.remindersSent++;
          console.log(`📧 Sent trial reminder to ${user.email}`);
        } catch (err: any) {
          results.errors.push(`Reminder to ${user.email}: ${err.message}`);
        }
      }

      // 2. Send expiry emails (trial just ended)
      const usersWithExpiredTrials = await storage.getUsersWithExpiredTrials();
      for (const user of usersWithExpiredTrials) {
        try {
          await emailService.sendTrialExpiredEmail(user.email, user.firstName || undefined);
          results.expiredSent++;
          console.log(`📧 Sent trial expired email to ${user.email}`);
        } catch (err: any) {
          results.errors.push(`Expiry to ${user.email}: ${err.message}`);
        }
      }

      console.log(`[Trial Emails] Reminders: ${results.remindersSent}, Expired: ${results.expiredSent}`);
      res.json({
        success: true,
        ...results,
        usersNearingExpiry: usersNearingExpiry.length,
        usersWithExpiredTrials: usersWithExpiredTrials.length
      });
    } catch (error: any) {
      console.error('Trial email processing error:', error);
      res.status(500).json({ message: error.message || "Failed to process trial emails" });
    }
  });

  // Get users in trial for admin dashboard
  app.get("/api/admin/trial-users", authenticateAdmin, async (req: any, res) => {
    try {
      const now = new Date();
      
      // Get all users with active trials
      const allUsers = await storage.getAllUsers();
      const trialUsers = allUsers.filter(u => 
        u.trialEndsAt && 
        new Date(u.trialEndsAt) > now && 
        !u.stripeSubscriptionId &&
        u.subscriptionPlan === 'free'
      );
      
      res.json({
        count: trialUsers.length,
        users: trialUsers.map(u => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          trialEndsAt: u.trialEndsAt,
          daysRemaining: Math.ceil((new Date(u.trialEndsAt!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }))
      });
    } catch (error: any) {
      console.error('Trial users error:', error);
      res.status(500).json({ message: error.message || "Failed to get trial users" });
    }
  });

  // ============== WAITLIST LAUNCH EMAIL BLAST ==============
  // Get count of pending launch emails
  app.get("/api/admin/launch-emails/pending", authenticateAdmin, async (req: any, res) => {
    try {
      const pendingEmails = await db.select()
        .from(emailWaitlist)
        .where(isNull(emailWaitlist.launchEmailSentAt));
      
      res.json({
        count: pendingEmails.length,
        emails: pendingEmails.map(e => e.email)
      });
    } catch (error: any) {
      console.error('Pending launch emails error:', error);
      res.status(500).json({ message: error.message || "Failed to get pending emails" });
    }
  });

  // Send launch announcement emails to all waitlist subscribers who haven't received it
  app.post("/api/admin/send-launch-emails", authenticateAdmin, async (req: any, res) => {
    try {
      const pendingEmails = await db.select()
        .from(emailWaitlist)
        .where(isNull(emailWaitlist.launchEmailSentAt));

      const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const subscriber of pendingEmails) {
        try {
          const success = await emailService.sendLaunchAnnouncementEmail(subscriber.email);
          if (success) {
            // Mark as sent
            await db.update(emailWaitlist)
              .set({ launchEmailSentAt: new Date() })
              .where(eq(emailWaitlist.id, subscriber.id));
            results.sent++;
            console.log(`📧 Launch email sent to ${subscriber.email}`);
          } else {
            results.failed++;
            results.errors.push(`${subscriber.email}: Send failed`);
          }
        } catch (err: any) {
          results.failed++;
          results.errors.push(`${subscriber.email}: ${err.message}`);
        }
      }

      console.log(`[Launch Emails] Sent: ${results.sent}, Failed: ${results.failed}`);
      res.json({
        success: true,
        totalPending: pendingEmails.length,
        ...results
      });
    } catch (error: any) {
      console.error('Launch email error:', error);
      res.status(500).json({ message: error.message || "Failed to send launch emails" });
    }
  });

  // Year End Recap - Get stats for a specific year
  app.get("/api/year-recap/:userId/stats", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();

      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Fetch ALL user activities (no limit) for accurate year recap
      const activities = await storage.getActivitiesByUserId(userId, 10000);
      const stats = calculateYearlyStats(activities, year);

      // Enhance location with reverse geocoding if available
      if (stats.mostRunLocation) {
        const locationName = await reverseGeocode(
          stats.mostRunLocation.latitude,
          stats.mostRunLocation.longitude
        );
        stats.mostRunLocation.name = locationName;
        stats.mostRunLocation.description = `You ran here ${stats.mostRunLocation.runCount} times in ${year}`;
      }

      // Calculate favorite day of the week
      const yearActivities = activities.filter(a => {
        const activityYear = new Date(a.startDate).getFullYear();
        return activityYear === year && a.type === "Run";
      });
      
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayCounts: Record<string, number> = {};
      yearActivities.forEach(a => {
        const day = dayNames[new Date(a.startDate).getDay()];
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const favoriteDayEntry = Object.entries(dayCounts).reduce((a, b) => b[1] > a[1] ? b : a, ["", 0]);
      const favoriteDay = favoriteDayEntry[0] ? { day: favoriteDayEntry[0], count: favoriteDayEntry[1] } : undefined;

      // Get AI insights for the infographic - use content (the actual insight), not title (category name)
      const aiInsightsList = await storage.getAIInsightsByUserId(userId, undefined, 5);
      const aiInsights = aiInsightsList
        .filter(i => i.content && i.content.length > 10)
        .map(i => i.content)
        .slice(0, 2);

      // Calculate percentile (simple estimation based on distance)
      const percentile = Math.min(99, Math.max(1, Math.round(
        50 + (stats.totalDistanceMiles / 500) * 30
      )));

      res.json({
        ...stats,
        favoriteDay,
        aiInsights,
        percentile,
      });
    } catch (error: any) {
      console.error("Year recap stats error:", error);
      res.status(500).json({ message: error.message || "Failed to get year recap stats" });
    }
  });

  // ============================================================
  // Training Plan V2 Routes (Normalized Schema)
  // ============================================================
  
  // Import plan generator lazily to avoid circular dependencies
  const { planGeneratorService } = await import("./services/planGenerator");
  const { athleteProfileService } = await import("./services/athleteProfile");
  
  // Get or compute athlete profile
  app.get("/api/training/profile", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const maxAgeHours = parseInt(req.query.maxAgeHours) || 24;
      
      const profile = await athleteProfileService.getOrComputeProfile(userId, maxAgeHours);
      res.json(profile);
    } catch (error: any) {
      console.error("Get athlete profile error:", error);
      res.status(500).json({ message: error.message || "Failed to get athlete profile" });
    }
  });
  
  // Force recompute athlete profile
  app.post("/api/training/profile/refresh", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await athleteProfileService.computeProfile(userId);
      res.json(profile);
    } catch (error: any) {
      console.error("Refresh athlete profile error:", error);
      res.status(500).json({ message: error.message || "Failed to refresh athlete profile" });
    }
  });
  
  // Generate training plan (instant version with background enrichment)
  app.post("/api/training/plans/generate", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Get user's unit preference (fallback to "km" to match frontend behavior when null)
      const user = await storage.getUser(userId);
      const unitPreference = user?.unitPreference || "km";
      
      const request = {
        userId,
        unitPreference,
        ...req.body,
      };
      
      // Use instant generation - returns immediately, enrichment happens in background
      const result = await planGeneratorService.generatePlanInstant(request);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      // Return with enrichment info
      res.json({
        success: true,
        plan: result.plan,
        planId: result.planId,
        totalWeeks: result.totalWeeks,
        enrichmentStatus: result.enrichmentStatus,
      });
    } catch (error: any) {
      console.error("Generate training plan error:", error);
      res.status(500).json({ message: error.message || "Failed to generate training plan" });
    }
  });
  
  // SSE endpoint for enrichment progress
  // Note: SSE can't send Authorization headers, so we accept token from query param
  app.get("/api/training/plans/:planId/enrichment-stream", async (req: any, res) => {
    try {
      // Check both header and query param for token (SSE needs query param)
      const authHeader = req.headers.authorization;
      const queryToken = req.query.token as string | undefined;
      const token = (authHeader && authHeader.split(' ')[1]) || queryToken;
      
      if (!token) {
        return res.status(401).json({ message: "Access token required" });
      }
      
      const user = await authService.verifyToken(token);
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }
      
      const userId = user.id;
      const planId = parseInt(req.params.planId);
      
      // Verify ownership
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Training plan not found" });
      }
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      
      // Send initial status
      res.write(`data: ${JSON.stringify({
        planId,
        enrichedWeeks: plan.enrichedWeeks || 0,
        totalWeeks: plan.totalWeeks,
        status: plan.enrichmentStatus || 'pending'
      })}\n\n`);
      
      // If already complete, close connection
      if (plan.enrichmentStatus === 'complete' || plan.enrichmentStatus === 'failed' || plan.enrichmentStatus === 'partial') {
        res.write(`data: ${JSON.stringify({ done: true, status: plan.enrichmentStatus })}\n\n`);
        res.end();
        return;
      }
      
      // Subscribe to enrichment updates
      const { subscribeToEnrichment } = await import("./services/planGenerator");
      const unsubscribe = subscribeToEnrichment(planId, (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        
        // Close on completion
        if (event.status === 'complete' || event.status === 'failed' || event.status === 'partial') {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          setTimeout(() => {
            unsubscribe();
            res.end();
          }, 100);
        }
      });
      
      // Handle client disconnect
      req.on('close', () => {
        unsubscribe();
      });
      
    } catch (error: any) {
      console.error("Enrichment stream error:", error);
      res.status(500).json({ message: error.message || "Failed to stream enrichment status" });
    }
  });
  
  // Get enrichment status (polling alternative)
  app.get("/api/training/plans/:planId/enrichment-status", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planId = parseInt(req.params.planId);
      
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Training plan not found" });
      }
      
      res.json({
        planId,
        enrichmentStatus: plan.enrichmentStatus || 'pending',
        enrichedWeeks: plan.enrichedWeeks || 0,
        totalWeeks: plan.totalWeeks,
        enrichmentError: plan.enrichmentError,
      });
    } catch (error: any) {
      console.error("Get enrichment status error:", error);
      res.status(500).json({ message: error.message || "Failed to get enrichment status" });
    }
  });
  
  // Get user's training plans
  app.get("/api/training/plans", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const plans = await storage.getTrainingPlansByUserId(userId);
      res.json(plans);
    } catch (error: any) {
      console.error("Get training plans error:", error);
      res.status(500).json({ message: error.message || "Failed to get training plans" });
    }
  });
  
  // Get a specific training plan with weeks and days
  app.get("/api/training/plans/:planId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planId = parseInt(req.params.planId);
      
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Training plan not found" });
      }
      
      // Get weeks and days
      const weeks = await storage.getPlanWeeks(planId);
      const weeksWithDays = await Promise.all(
        weeks.map(async (week: any) => {
          const days = await storage.getPlanDays(week.id);
          return { ...week, days };
        })
      );
      
      res.json({ ...plan, weeks: weeksWithDays });
    } catch (error: any) {
      console.error("Get training plan error:", error);
      res.status(500).json({ message: error.message || "Failed to get training plan" });
    }
  });
  
  // Update plan status (archive, complete, etc.)
  app.patch("/api/training/plans/:planId/status", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planId = parseInt(req.params.planId);
      const { status } = req.body;
      
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Training plan not found" });
      }
      
      const updated = await storage.updateTrainingPlan(planId, { status });
      res.json(updated);
    } catch (error: any) {
      console.error("Update training plan status error:", error);
      res.status(500).json({ message: error.message || "Failed to update training plan status" });
    }
  });
  
  // Delete a training plan
  app.delete("/api/training/plans/:planId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planId = parseInt(req.params.planId);
      
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Training plan not found" });
      }
      
      await storage.deleteTrainingPlanById(planId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete training plan error:", error);
      res.status(500).json({ message: error.message || "Failed to delete training plan" });
    }
  });
  
  // Get current week's workouts
  app.get("/api/training/plans/:planId/current-week", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planId = parseInt(req.params.planId);
      
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Training plan not found" });
      }
      
      // Find current week based on date
      const now = new Date();
      const weeks = await storage.getPlanWeeks(planId);
      const currentWeek = weeks.find((w: any) => {
        const start = new Date(w.weekStartDate);
        const end = new Date(w.weekEndDate);
        return now >= start && now <= end;
      });
      
      if (!currentWeek) {
        return res.status(404).json({ message: "No current week found" });
      }
      
      const days = await storage.getPlanDays(currentWeek.id);
      res.json({ ...currentWeek, days });
    } catch (error: any) {
      console.error("Get current week error:", error);
      res.status(500).json({ message: error.message || "Failed to get current week" });
    }
  });
  
  // Mark workout as completed/skipped
  app.patch("/api/training/days/:dayId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const dayId = parseInt(req.params.dayId);
      
      const day = await storage.getPlanDayById(dayId);
      if (!day) {
        return res.status(404).json({ message: "Workout day not found" });
      }
      
      // Verify ownership
      const plan = await storage.getTrainingPlanById(day.planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      const updates = req.body;
      const updated = await storage.updatePlanDay(dayId, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Update workout day error:", error);
      res.status(500).json({ message: error.message || "Failed to update workout" });
    }
  });
  
  // Link an activity to a planned workout
  app.post("/api/training/days/:dayId/link-activity", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const dayId = parseInt(req.params.dayId);
      const { activityId } = req.body;
      
      const day = await storage.getPlanDayById(dayId);
      if (!day) {
        return res.status(404).json({ message: "Workout day not found" });
      }
      
      // Verify ownership
      const plan = await storage.getTrainingPlanById(day.planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Workout not found" });
      }
      
      // Get activity data
      const activity = await storage.getActivityByStravaId(activityId.toString());
      if (!activity || activity.userId !== userId) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Update day with activity data
      const updated = await storage.updatePlanDay(dayId, {
        linkedActivityId: activity.id,
        status: "completed",
        actualDistanceKm: activity.distance ? activity.distance / 1000 : undefined,
        actualDurationMins: activity.movingTime ? Math.round(activity.movingTime / 60) : undefined,
        actualPace: activity.averageSpeed ? 
          `${Math.floor(1000 / activity.averageSpeed / 60)}:${String(Math.floor((1000 / activity.averageSpeed) % 60)).padStart(2, '0')}` : 
          undefined,
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Link activity error:", error);
      res.status(500).json({ message: error.message || "Failed to link activity" });
    }
  });
  
  // Adapt training plan based on adherence
  app.post("/api/training/plans/:planId/adapt", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planId = parseInt(req.params.planId);
      const { reason } = req.body;
      
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Training plan not found" });
      }
      
      const result = await planGeneratorService.adaptPlan(planId, reason);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("Adapt training plan error:", error);
      res.status(500).json({ message: error.message || "Failed to adapt training plan" });
    }
  });
  
  // Get adherence statistics for a plan
  app.get("/api/training/plans/:planId/adherence", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planId = parseInt(req.params.planId);
      
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Training plan not found" });
      }
      
      const stats = await planGeneratorService.getAdherenceStats(planId);
      res.json(stats);
    } catch (error: any) {
      console.error("Get adherence stats error:", error);
      res.status(500).json({ message: error.message || "Failed to get adherence stats" });
    }
  });
  
  // Auto-link activities to plan days with adherence summary
  app.post("/api/training/plans/:planId/auto-link", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planId = parseInt(req.params.planId);
      
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Training plan not found" });
      }
      
      const results = await autoLinkActivitiesForPlan(planId, userId);
      
      // Calculate adherence summary for last 7 days
      const weeks = await storage.getPlanWeeks(planId);
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      let plannedLast7Days = 0;
      let completedLast7Days = 0;
      let plannedDistanceKm = 0;
      let completedDistanceKm = 0;
      const missedKeyWorkouts: string[] = [];
      
      for (const week of weeks) {
        const days = await storage.getPlanDays(week.id);
        for (const day of days) {
          const dayDate = new Date(day.date);
          if (dayDate >= sevenDaysAgo && dayDate <= now) {
            if (day.workoutType !== "rest") {
              plannedLast7Days++;
              plannedDistanceKm += day.plannedDistanceKm || 0;
              
              if (day.status === "completed" || day.linkedActivityId) {
                completedLast7Days++;
                completedDistanceKm += day.actualDistanceKm || day.plannedDistanceKm || 0;
              } else if (dayDate < now) {
                // Past workout not completed - check if it was a key workout
                const keyTypes = ["tempo", "intervals", "long_run", "hills", "fartlek", "progression"];
                if (day.workoutType && keyTypes.includes(day.workoutType)) {
                  const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });
                  missedKeyWorkouts.push(`${day.workoutType.replace("_", " ")} (${dayName})`);
                }
              }
            }
          }
        }
      }
      
      const adherenceRate = plannedLast7Days > 0 
        ? Math.round((completedLast7Days / plannedLast7Days) * 100) 
        : 100;
      
      // Generate summary message
      let summary = `Synced ${results.length} activities. Last 7 days: ${completedLast7Days}/${plannedLast7Days} workouts (${adherenceRate}%).`;
      
      // Add callout for missed key workouts
      let callout: string | null = null;
      if (missedKeyWorkouts.length > 0) {
        callout = `Missed key workout${missedKeyWorkouts.length > 1 ? "s" : ""}: ${missedKeyWorkouts.join(", ")}. Feeling tired? Consider using the recovery button.`;
      } else if (adherenceRate >= 90) {
        callout = "Excellent adherence! You're crushing it.";
      } else if (adherenceRate < 50) {
        callout = "Training consistency has been low. Consider adjusting your plan.";
      }
      
      res.json({
        success: true,
        linkedCount: results.length,
        links: results.map(r => ({
          dayId: r.dayId,
          activityId: r.activityId,
          status: r.status,
          matchScore: r.matchScore,
        })),
        adherenceSummary: {
          last7Days: {
            planned: plannedLast7Days,
            completed: completedLast7Days,
            adherenceRate,
            plannedDistanceKm: Math.round(plannedDistanceKm * 10) / 10,
            completedDistanceKm: Math.round(completedDistanceKm * 10) / 10,
          },
          missedKeyWorkouts,
          summary,
          callout,
        },
      });
    } catch (error: any) {
      console.error("Auto-link activities error:", error);
      res.status(500).json({ message: error.message || "Failed to auto-link activities" });
    }
  });
  
  // Adjust training plan - deterministic coach-like adjustments
  app.post("/api/training/plans/:planId/adjust", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planId = parseInt(req.params.planId);
      const { feeling, skipSync } = req.body; // "tired" or "strong", optionally skip pre-sync
      
      if (!feeling || !["tired", "strong"].includes(feeling)) {
        return res.status(400).json({ message: "Invalid feeling. Use 'tired' or 'strong'" });
      }
      
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Training plan not found" });
      }
      
      // Mini-sync check: if last sync was > 24 hours ago, run auto-link first
      const user = await storage.getUser(userId);
      let syncPerformed = false;
      const SYNC_THRESHOLD_HOURS = 24;
      
      if (!skipSync && user?.stravaAccessToken) {
        const lastSync = user.lastSyncAt ? new Date(user.lastSyncAt) : null;
        const hoursSinceSync = lastSync ? (Date.now() - lastSync.getTime()) / (1000 * 60 * 60) : Infinity;
        
        if (hoursSinceSync > SYNC_THRESHOLD_HOURS) {
          // Auto-link activities to ground adjustments in recent training
          try {
            await autoLinkActivitiesForPlan(planId, userId);
            syncPerformed = true;
            console.log(`[Adjust] Pre-adjustment sync completed for plan ${planId}`);
          } catch (syncErr) {
            console.warn(`[Adjust] Pre-sync failed, continuing with adjustment:`, syncErr);
          }
        }
      }
      
      const weeks = await storage.getPlanWeeks(planId);
      const now = new Date();
      
      // Find the next week(s) to adjust (next 7-14 days from now)
      const nextWeeks = weeks.filter((w: any) => {
        const weekStart = new Date(w.weekStartDate);
        const weekEnd = new Date(w.weekEndDate);
        // Week starts in the future or is current week
        return weekEnd >= now;
      }).slice(0, 2); // Only adjust next 1-2 weeks
      
      if (nextWeeks.length === 0) {
        return res.json({
          success: true,
          feeling,
          adaptedWeeks: 0,
          changes: ["No future weeks to adjust"],
          coachNote: "Your plan is complete - no adjustments needed!"
        });
      }
      
      const changes: string[] = [];
      const adjustedDayIds: number[] = [];
      
      for (const week of nextWeeks) {
        const days = await storage.getPlanDays(week.id);
        const originalWeekDistance = week.plannedDistanceKm || 0;
        let newWeekDistance = originalWeekDistance;
        
        if (feeling === "tired") {
          // TIRED: Reduce volume 10-20%, soften quality workouts, shorten long run
          const volumeReduction = 0.85; // 15% reduction
          newWeekDistance = originalWeekDistance * volumeReduction;
          
          let qualitySoftened = false;
          
          for (const day of days) {
            if (day.workoutType === "rest") continue;
            
            const originalDistance = day.plannedDistanceKm;
            const originalType = day.workoutType;
            let updates: any = {};
            
            // Soften ONE quality workout per week
            if (!qualitySoftened && ["intervals", "tempo", "hills", "fartlek"].includes(day.workoutType)) {
              updates.originalWorkoutType = day.workoutType;
              updates.originalDistanceKm = day.plannedDistanceKm;
              updates.workoutType = "easy";
              updates.intensity = "low";
              updates.title = "Easy Run (adjusted)";
              updates.description = `Originally ${day.workoutType}. Converted to easy run to allow recovery.`;
              if (day.plannedDistanceKm) {
                updates.plannedDistanceKm = Math.round(day.plannedDistanceKm * 0.9 * 10) / 10;
              }
              updates.wasAdjusted = true;
              qualitySoftened = true;
              changes.push(`Week ${week.weekNumber}: ${originalType} → easy run`);
            }
            // Shorten long run by 10-20%
            else if (day.workoutType === "long_run" && day.plannedDistanceKm) {
              updates.originalDistanceKm = day.plannedDistanceKm;
              updates.plannedDistanceKm = Math.round(day.plannedDistanceKm * 0.85 * 10) / 10;
              updates.wasAdjusted = true;
              changes.push(`Week ${week.weekNumber}: Long run ${originalDistance?.toFixed(1)}km → ${updates.plannedDistanceKm}km`);
            }
            // Reduce easy/recovery runs slightly
            else if (["easy", "recovery"].includes(day.workoutType) && day.plannedDistanceKm) {
              updates.originalDistanceKm = day.plannedDistanceKm;
              updates.plannedDistanceKm = Math.round(day.plannedDistanceKm * 0.9 * 10) / 10;
              updates.wasAdjusted = true;
            }
            
            if (Object.keys(updates).length > 0) {
              await storage.updatePlanDay(day.id, updates);
              adjustedDayIds.push(day.id);
            }
          }
          
          // Update week with adjustment metadata
          await storage.updatePlanWeek(week.id, {
            plannedDistanceKm: Math.round(newWeekDistance * 10) / 10,
            wasAdjusted: true,
            adjustmentReason: "tired",
            adjustedAt: new Date(),
            coachNotes: `Recovery adjustment: You indicated fatigue, so we reduced volume by ~15% and converted a quality session to an easy run. Listen to your body - consistent easy running beats pushing through fatigue.`
          });
          
        } else if (feeling === "strong") {
          // STRONG: Modest increase 5-10% (cap at 15%), progress existing quality session slightly
          const volumeIncrease = 1.08; // 8% increase (conservative)
          newWeekDistance = Math.min(originalWeekDistance * 1.15, originalWeekDistance * volumeIncrease);
          
          let qualityProgressed = false;
          
          for (const day of days) {
            if (day.workoutType === "rest") continue;
            
            let updates: any = {};
            
            // Slightly progress ONE quality workout
            if (!qualityProgressed && ["intervals", "tempo"].includes(day.workoutType)) {
              updates.originalDistanceKm = day.plannedDistanceKm;
              if (day.plannedDistanceKm) {
                updates.plannedDistanceKm = Math.round(day.plannedDistanceKm * 1.1 * 10) / 10;
              }
              updates.wasAdjusted = true;
              qualityProgressed = true;
              changes.push(`Week ${week.weekNumber}: ${day.workoutType} slightly extended`);
            }
            // Modest long run increase (+1-2km max)
            else if (day.workoutType === "long_run" && day.plannedDistanceKm) {
              const increase = Math.min(1.5, day.plannedDistanceKm * 0.08); // 8% or 1.5km max
              updates.originalDistanceKm = day.plannedDistanceKm;
              updates.plannedDistanceKm = Math.round((day.plannedDistanceKm + increase) * 10) / 10;
              updates.wasAdjusted = true;
              changes.push(`Week ${week.weekNumber}: Long run +${increase.toFixed(1)}km`);
            }
            
            if (Object.keys(updates).length > 0) {
              await storage.updatePlanDay(day.id, updates);
              adjustedDayIds.push(day.id);
            }
          }
          
          // Update week with adjustment metadata
          await storage.updatePlanWeek(week.id, {
            plannedDistanceKm: Math.round(newWeekDistance * 10) / 10,
            wasAdjusted: true,
            adjustmentReason: "strong",
            adjustedAt: new Date(),
            coachNotes: `Progressive adjustment: You're feeling strong! We've slightly increased your quality session and long run to build on this momentum. Stay consistent and keep listening to your body.`
          });
        }
      }
      
      const coachNote = feeling === "tired"
        ? `Recovery Mode: Next week eased by ~15%. We converted a hard workout to easy running and shortened your long run. This helps you recover while maintaining fitness.`
        : `Building Momentum: Next week progressed by ~8%. Your tempo/interval session is slightly longer and your long run increased modestly. Great work - keep it rolling!`;
      
      res.json({
        success: true,
        feeling,
        adaptedWeeks: nextWeeks.length,
        adjustedDays: adjustedDayIds.length,
        changes,
        coachNote,
        syncPerformed,
      });
    } catch (error: any) {
      console.error("Adjust training plan error:", error);
      res.status(500).json({ message: error.message || "Failed to adjust training plan" });
    }
  });

  // Delete training plan (cascade delete weeks and days)
  app.delete("/api/training/plans/:planId", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const planId = parseInt(req.params.planId);
      
      const plan = await storage.getTrainingPlanById(planId);
      if (!plan || plan.userId !== userId) {
        return res.status(404).json({ message: "Training plan not found" });
      }
      
      // Delete plan - days and weeks will cascade if properly set up
      await storage.deleteTrainingPlans(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete training plan error:", error);
      res.status(500).json({ message: error.message || "Failed to delete training plan" });
    }
  });

  // ===== ROUTE MATCHING & COMPARISON ENDPOINTS (Premium) =====
  
  // Get route comparison data for an activity
  app.get("/api/activities/:activityId/comparison", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const activityId = parseInt(req.params.activityId);
      
      // Check Premium tier for full comparison features
      const user = await storage.getUser(userId);
      const isPremium = user?.subscriptionPlan === 'premium';
      
      // Import services dynamically to avoid circular deps
      const { getOrComputeComparison, getWhatChanged } = await import('./services/comparableRunsService');
      const { assignRouteToActivity, getActivityRoute } = await import('./services/routeClusteringService');
      
      // Ensure activity has a route assigned
      await assignRouteToActivity(activityId);
      
      // Get comparison data
      const comparison = await getOrComputeComparison(userId, activityId);
      if (!comparison) {
        return res.json({ 
          hasComparison: false,
          message: "Not enough comparable runs found"
        });
      }
      
      // Get what changed analysis
      const whatChanged = await getWhatChanged(activityId, comparison);
      
      // Get route info
      const routeInfo = await getActivityRoute(activityId);
      
      // For non-premium users, limit the data
      if (!isPremium) {
        return res.json({
          hasComparison: true,
          isPremium: false,
          comparableCount: comparison.comparableRuns.length,
          deltas: comparison.deltas,
          routeMatch: routeInfo ? {
            runCount: routeInfo.route.runCount,
            hasHistory: routeInfo.history.length > 1
          } : null,
          upgradeMessage: "Upgrade to Premium for full run comparison, route trends, and detailed history"
        });
      }
      
      res.json({
        hasComparison: true,
        isPremium: true,
        comparableRuns: comparison.comparableRuns.slice(0, 10),
        baseline: comparison.baseline,
        deltas: comparison.deltas,
        whatChanged,
        routeMatch: comparison.routeMatch ? {
          routeId: comparison.routeMatch.routeId,
          lastRunOnRoute: comparison.routeMatch.lastRunOnRoute,
          routeHistory: comparison.routeMatch.routeHistory.slice(0, 10)
        } : null,
        route: routeInfo ? {
          id: routeInfo.route.id,
          name: routeInfo.route.name,
          runCount: routeInfo.route.runCount,
          avgDistance: routeInfo.route.avgDistance,
          avgElevationGain: routeInfo.route.avgElevationGain
        } : null
      });
    } catch (error: any) {
      console.error("Get activity comparison error:", error);
      res.status(500).json({ message: error.message || "Failed to get comparison data" });
    }
  });
  
  // Get route history for an activity
  app.get("/api/activities/:activityId/route-history", authenticateJWT, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.activityId);
      
      const { getActivityRoute } = await import('./services/routeClusteringService');
      const routeInfo = await getActivityRoute(activityId);
      
      if (!routeInfo) {
        return res.json({ hasRoute: false });
      }
      
      res.json({
        hasRoute: true,
        route: {
          id: routeInfo.route.id,
          name: routeInfo.route.name,
          runCount: routeInfo.route.runCount
        },
        history: routeInfo.history.slice(0, 20)
      });
    } catch (error: any) {
      console.error("Get route history error:", error);
      res.status(500).json({ message: error.message || "Failed to get route history" });
    }
  });
  
  // Manually trigger route assignment for an activity
  app.post("/api/activities/:activityId/assign-route", authenticateJWT, async (req: any, res) => {
    try {
      const activityId = parseInt(req.params.activityId);
      
      const { assignRouteToActivity } = await import('./services/routeClusteringService');
      const success = await assignRouteToActivity(activityId);
      
      res.json({ success });
    } catch (error: any) {
      console.error("Assign route error:", error);
      res.status(500).json({ message: error.message || "Failed to assign route" });
    }
  });

  // ============= NOTIFICATION ENDPOINTS =============
  
  // Admin: Process pending notifications (trigger email delivery)
  app.post("/api/admin/notifications/process", authenticateAdmin, async (req: any, res) => {
    try {
      const { processNotifications } = await import('./services/notificationProcessor');
      const limit = parseInt(req.query?.limit as string) || 50;
      const result = await processNotifications(limit);
      res.json(result);
    } catch (error: any) {
      console.error("Notification processing error:", error);
      res.status(500).json({ message: error.message || "Failed to process notifications" });
    }
  });

  // Get user's in-app notifications
  app.get("/api/notifications", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query?.limit as string) || 20;
      const notifications = await storage.getNotificationsByUserId(userId, limit);
      const unreadCount = await storage.getUnreadNotificationsCount(userId);
      res.json({ notifications, unreadCount });
    } catch (error: any) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: error.message || "Failed to get notifications" });
    }
  });

  // Get unread notification count (for badge)
  app.get("/api/notifications/unread-count", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadNotificationsCount(userId);
      res.json({ count });
    } catch (error: any) {
      console.error("Get unread count error:", error);
      res.status(500).json({ message: error.message || "Failed to get unread count" });
    }
  });

  // Mark single notification as read
  app.post("/api/notifications/:notificationId/read", authenticateJWT, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.notificationId);
      const userId = req.user!.id;
      
      const success = await storage.markNotificationReadForUser(notificationId, userId);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: error.message || "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/read-all", authenticateJWT, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ message: error.message || "Failed to mark notifications as read" });
    }
  });

  // ============= DRIP CAMPAIGN ENDPOINTS =============

  // Track email click (public endpoint with token validation)
  app.get("/api/track/click", async (req: any, res) => {
    try {
      const { userId, campaign, step, redirect, source } = req.query;
      
      if (userId && campaign && step) {
        await storage.createEmailClick({
          userId: parseInt(userId),
          campaign,
          step,
          source: source || null,
          ctaKey: null,
        });
      }
      
      // Redirect to the target URL or dashboard
      const targetUrl = redirect || '/dashboard';
      res.redirect(302, targetUrl);
    } catch (error) {
      console.error("Track click error:", error);
      res.redirect(302, '/dashboard');
    }
  });

  // Admin: Get campaign analytics
  app.get("/api/admin/campaigns/analytics", authenticateAdmin, async (req: any, res) => {
    try {
      const analytics = await storage.getCampaignAnalytics();
      res.json(analytics);
    } catch (error: any) {
      console.error("Campaign analytics error:", error);
      res.status(500).json({ message: error.message || "Failed to get analytics" });
    }
  });

  // Admin: Get drip campaign worker status
  app.get("/api/admin/campaigns/worker-status", authenticateAdmin, async (req: any, res) => {
    try {
      const status = dripCampaignWorker.getStatus();
      res.json(status);
    } catch (error: any) {
      console.error("Worker status error:", error);
      res.status(500).json({ message: error.message || "Failed to get worker status" });
    }
  });

  // Admin: Trigger manual drip campaign worker run
  app.post("/api/admin/campaigns/process", authenticateAdmin, async (req: any, res) => {
    try {
      await dripCampaignWorker.runNow();
      res.json({ success: true, message: "Worker run triggered" });
    } catch (error: any) {
      console.error("Worker trigger error:", error);
      res.status(500).json({ message: error.message || "Failed to trigger worker" });
    }
  });

  // Admin: Toggle drip campaigns ON/OFF
  app.post("/api/admin/campaigns/toggle", authenticateAdmin, async (req: any, res) => {
    try {
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }
      
      await dripCampaignWorker.setCampaignsEnabled(enabled);
      
      res.json({ 
        success: true, 
        campaignsEnabled: dripCampaignWorker.isCampaignsEnabled(),
        message: `Drip campaigns ${enabled ? 'ENABLED' : 'DISABLED'}`
      });
    } catch (error: any) {
      console.error("Campaign toggle error:", error);
      res.status(500).json({ message: error.message || "Failed to toggle campaigns" });
    }
  });

  // Admin: Get segment stats for campaigns (reads from user_campaigns table)
  app.get("/api/admin/campaigns/segment-stats", authenticateAdmin, async (req: any, res) => {
    try {
      // Get actual enrollment counts from user_campaigns table
      const segmentStats = await storage.getSegmentStatsFromCampaigns();
      
      // Get user counts using proper count queries (no limit)
      const userCounts = await storage.getUserCountsBySubscription();
      
      res.json({
        segment_a: segmentStats.segment_a || 0,
        segment_b: segmentStats.segment_b || 0,
        segment_c: segmentStats.segment_c || 0,
        segment_d: segmentStats.segment_d || 0,
        paid: userCounts.paid,
        total: userCounts.total,
      });
    } catch (error: any) {
      console.error("Segment stats error:", error);
      res.status(500).json({ message: error.message || "Failed to get segment stats" });
    }
  });

  // Admin: Get pending email jobs
  app.get("/api/admin/campaigns/pending-jobs", authenticateAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query?.limit as string) || 50;
      const jobs = await storage.getPendingEmailJobs(limit);
      res.json({ jobs, count: jobs.length });
    } catch (error: any) {
      console.error("Pending jobs error:", error);
      res.status(500).json({ message: error.message || "Failed to get pending jobs" });
    }
  });

  // Admin: Get welcome email campaign stats
  app.get("/api/admin/welcome-campaign/stats", authenticateAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getWelcomeCampaignStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Welcome campaign stats error:", error);
      res.status(500).json({ message: error.message || "Failed to get stats" });
    }
  });

  // Admin: Send test welcome email to current admin
  app.post("/api/admin/welcome-campaign/test", authenticateAdmin, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.id);
      if (!adminUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const success = await emailService.sendFoundersWelcomeEmail(adminUser.email);
      res.json({ 
        success, 
        message: success ? `Test email sent to ${adminUser.email}` : "Failed to send email" 
      });
    } catch (error: any) {
      console.error("Test welcome email error:", error);
      res.status(500).json({ message: error.message || "Failed to send test email" });
    }
  });

  // Admin: Send welcome emails to all users (rate-limited batch)
  app.post("/api/admin/welcome-campaign/send-all", authenticateAdmin, async (req: any, res) => {
    try {
      // Get all users who haven't received the welcome email yet
      const users = await storage.getUsersWithoutWelcomeEmail();
      
      if (users.length === 0) {
        return res.json({ 
          success: true, 
          sent: 0, 
          failed: 0, 
          total: 0,
          message: "No users need the welcome email" 
        });
      }
      
      let sent = 0;
      let failed = 0;
      const batchSize = 5;
      const delayMs = 1500; // 1.5 seconds between batches
      
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        // Process batch in parallel
        const results = await Promise.all(
          batch.map(async (user: { id: number; email: string }) => {
            try {
              const success = await emailService.sendFoundersWelcomeEmail(user.email);
              if (success) {
                await storage.updateUser(user.id, { welcomeEmailSentAt: new Date() });
                return true;
              }
              return false;
            } catch (err) {
              console.error(`Failed to send welcome email to ${user.email}:`, err);
              return false;
            }
          })
        );
        
        sent += results.filter((r: boolean) => r).length;
        failed += results.filter((r: boolean) => !r).length;
        
        // Delay between batches (except for last batch)
        if (i + batchSize < users.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
      
      res.json({ 
        success: true, 
        sent, 
        failed, 
        total: users.length,
        message: `Sent ${sent} welcome emails, ${failed} failed` 
      });
    } catch (error: any) {
      console.error("Bulk welcome email error:", error);
      res.status(500).json({ message: error.message || "Failed to send emails" });
    }
  });

  // User: Opt out of marketing emails
  app.post("/api/users/:userId/marketing-optout", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.updateUser(userId, { marketingOptOut: true });
      await dripCampaignService.exitCampaignForUser(userId, "user_optout");
      
      res.json({ success: true, message: "Successfully unsubscribed from marketing emails" });
    } catch (error: any) {
      console.error("Marketing optout error:", error);
      res.status(500).json({ message: error.message || "Failed to opt out" });
    }
  });

  // Update user's last seen timestamp on dashboard load
  app.post("/api/users/:userId/heartbeat", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await dripCampaignService.recordLastSeen(userId);
      res.json({ success: true });
    } catch (error: any) {
      // Silent failure for heartbeat
      res.json({ success: false });
    }
  });

  // Record user activation event
  app.post("/api/users/:userId/activation", authenticateJWT, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { activationType } = req.body;
      
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await dripCampaignService.recordActivation(userId, activationType || "dashboard_view");
      res.json({ success: true });
    } catch (error: any) {
      console.error("Activation recording error:", error);
      res.status(500).json({ message: error.message || "Failed to record activation" });
    }
  });

  // Start the drip campaign worker (async, loads settings from DB)
  dripCampaignWorker.start().catch(err => 
    console.error("[DripWorker] Failed to start:", err)
  );

  const httpServer = createServer(app);
  return httpServer;
}

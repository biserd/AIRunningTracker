/**
 * Pre-render Script for SEO
 * 
 * This script generates static HTML files for SEO-critical pages.
 * These files can be deployed alongside the SPA for better search engine crawling.
 * 
 * Usage: npx tsx scripts/prerender.ts
 * 
 * The generated files are placed in dist/prerender/ directory.
 * Configure your web server to serve these for crawler user agents.
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = "https://aitracker.run";
const OUTPUT_DIR = path.join(process.cwd(), 'dist', 'prerender');

// SEO page definitions (mirrors server/routes.ts)
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
  }
};

function generateSEOHtml(pageMeta: { title: string; description: string; keywords?: string }, url: string): string {
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
  <link rel="canonical" href="${BASE_URL}${url}" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${BASE_URL}${url}" />
  <meta property="og:title" content="${pageMeta.title}" />
  <meta property="og:description" content="${pageMeta.description}" />
  <meta property="og:image" content="${BASE_URL}/og-image.jpg" />
  <meta property="og:site_name" content="RunAnalytics" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${BASE_URL}${url}" />
  <meta name="twitter:title" content="${pageMeta.title}" />
  <meta name="twitter:description" content="${pageMeta.description}" />
  <meta name="twitter:image" content="${BASE_URL}/og-image.jpg" />
  
  <!-- Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "${pageMeta.title}",
    "description": "${pageMeta.description}",
    "url": "${BASE_URL}${url}",
    "publisher": {
      "@type": "Organization",
      "name": "RunAnalytics",
      "url": "${BASE_URL}"
    }
  }
  </script>
  
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=optional" rel="stylesheet">
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
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

function routeToFilePath(route: string): string {
  if (route === '/') {
    return 'index.html';
  }
  return route.slice(1).replace(/\//g, '-') + '.html';
}

async function prerender() {
  console.log('🚀 Starting pre-render process...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}\n`);
  }

  let count = 0;
  for (const [route, meta] of Object.entries(SEO_PAGES)) {
    const html = generateSEOHtml(meta, route);
    const fileName = routeToFilePath(route);
    const filePath = path.join(OUTPUT_DIR, fileName);
    
    fs.writeFileSync(filePath, html, 'utf-8');
    console.log(`✅ Generated: ${fileName} (${route})`);
    count++;
  }

  console.log(`\n🎉 Pre-rendered ${count} pages to ${OUTPUT_DIR}`);
  console.log('\nNote: These files are used by the dynamic rendering middleware in server/routes.ts');
  console.log('Crawlers receive SEO-optimized HTML automatically.');
}

prerender().catch(console.error);

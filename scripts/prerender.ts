/**
 * Pre-render Script for Static Site Generation (SSG)
 * 
 * This script generates static HTML files for SEO-critical pages at build time.
 * Pages are pre-rendered with full content for fastest possible load times.
 * 
 * Usage: npx tsx scripts/prerender.ts
 * 
 * The generated files are placed in dist/prerender/ directory.
 * Configure your web server to serve these static files.
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = "https://aitracker.run";
const OUTPUT_DIR = path.join(process.cwd(), 'dist', 'prerender');

import { renderHomepage } from '../server/ssr/renderer';
import { renderBlogPost } from '../server/ssr/renderer';
import { getAllBlogPosts } from '../server/ssr/blogContent';

interface PageMeta {
  title: string;
  description: string;
  keywords?: string;
}

const STATIC_PAGES: Record<string, PageMeta> = {
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
  }
};

function generateSimpleSeoHtml(pageMeta: PageMeta, url: string): string {
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
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${BASE_URL}${url}" />
  <meta property="og:title" content="${pageMeta.title}" />
  <meta property="og:description" content="${pageMeta.description}" />
  <meta property="og:image" content="${BASE_URL}/og-image.jpg" />
  <meta property="og:site_name" content="RunAnalytics" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${BASE_URL}${url}" />
  <meta name="twitter:title" content="${pageMeta.title}" />
  <meta name="twitter:description" content="${pageMeta.description}" />
  <meta name="twitter:image" content="${BASE_URL}/og-image.jpg" />
  
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
</head>
<body>
  <div id="root">
    <main style="max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: system-ui, sans-serif;">
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
  console.log('Starting Static Site Generation (SSG)...\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}\n`);
  }

  let count = 0;

  // 1. Generate homepage with FULL content
  console.log('=== Generating Homepage (Full SSG) ===');
  try {
    const homepageHtml = renderHomepage();
    const homepagePath = path.join(OUTPUT_DIR, 'index.html');
    fs.writeFileSync(homepagePath, homepageHtml, 'utf-8');
    console.log(`Generated: index.html (/) - FULL CONTENT`);
    count++;
  } catch (error) {
    console.error('Error generating homepage:', error);
  }

  // 2. Generate all blog posts with FULL content
  console.log('\n=== Generating Blog Posts (Full SSG) ===');
  const blogPosts = getAllBlogPosts();
  for (const post of blogPosts) {
    try {
      const blogHtml = renderBlogPost(post.slug);
      if (blogHtml) {
        const fileName = `blog-${post.slug}.html`;
        const filePath = path.join(OUTPUT_DIR, fileName);
        fs.writeFileSync(filePath, blogHtml, 'utf-8');
        console.log(`Generated: ${fileName} (/blog/${post.slug}) - FULL CONTENT`);
        count++;
      }
    } catch (error) {
      console.error(`Error generating blog post ${post.slug}:`, error);
    }
  }

  // 3. Generate static pages (meta-only, React hydrates)
  console.log('\n=== Generating Static Pages (Meta + Hydration) ===');
  for (const [route, meta] of Object.entries(STATIC_PAGES)) {
    const html = generateSimpleSeoHtml(meta, route);
    const fileName = routeToFilePath(route);
    const filePath = path.join(OUTPUT_DIR, fileName);
    
    fs.writeFileSync(filePath, html, 'utf-8');
    console.log(`Generated: ${fileName} (${route})`);
    count++;
  }

  console.log(`\n=== SSG Complete ===`);
  console.log(`Generated ${count} static HTML files to ${OUTPUT_DIR}`);
  console.log('\nFull SSG pages (complete content):');
  console.log('  - Homepage (/)');
  console.log('  - Blog posts (/blog/*)');
  console.log('\nNote: Shoe pages and comparisons use SSR for dynamic data.');
  console.log('Configure your server to serve these files for fastest load times.');
}

prerender().catch(console.error);

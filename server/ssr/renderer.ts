import { getBlogPostBySlug, BlogPostContent } from './blogContent';
import { homepageContent, HomepageContent } from './homepageContent';
import { getToolBySlug, ToolContent } from './toolsContent';

const BASE_URL = "https://aitracker.run";

interface PageMeta {
  title: string;
  description: string;
  keywords?: string;
  type?: 'website' | 'article';
  datePublished?: string;
  dateModified?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncateMetadata(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function generateStructuredData(meta: PageMeta, url: string, type: 'BlogPosting' | 'Product' | 'WebPage' = 'WebPage', extra: any = {}): string {
  if (type === 'BlogPosting') {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": meta.title,
      "description": meta.description,
      "image": `${BASE_URL}/og-image.jpg`,
      "author": { "@type": "Organization", "name": "RunAnalytics" },
      "publisher": {
        "@type": "Organization",
        "name": "RunAnalytics",
        "logo": { "@type": "ImageObject", "url": `${BASE_URL}/og-image.jpg` }
      },
      "datePublished": meta.datePublished || new Date().toISOString().split('T')[0],
      "dateModified": meta.dateModified || new Date().toISOString().split('T')[0],
      "mainEntityOfPage": { "@type": "WebPage", "@id": `${BASE_URL}${url}` },
      "keywords": meta.keywords,
      ...extra
    }, null, 2);
  }
  
  if (type === 'Product') {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": meta.title.split('|')[0].trim(),
      "description": meta.description,
      "image": extra.image || `${BASE_URL}/og-image.jpg`,
      "brand": { "@type": "Brand", "name": extra.brand || "Unknown" },
      "category": "Running Shoes",
      ...extra
    }, null, 2);
  }
  
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": meta.title,
    "description": meta.description,
    "url": `${BASE_URL}${url}`,
    "publisher": { "@type": "Organization", "name": "RunAnalytics", "url": BASE_URL }
  }, null, 2);
}

function generateHtmlHead(meta: PageMeta, url: string, structuredData: string): string {
  const title = truncateMetadata(meta.title, 60);
  const description = truncateMetadata(meta.description, 160);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5, user-scalable=yes" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  ${meta.keywords ? `<meta name="keywords" content="${escapeHtml(meta.keywords)}" />` : ''}
  <meta name="author" content="RunAnalytics" />
  <meta name="theme-color" content="#fc4c02" />
  <link rel="canonical" href="${BASE_URL}${url}" />
  
  <meta property="og:type" content="${meta.type || 'website'}" />
  <meta property="og:url" content="${BASE_URL}${url}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${BASE_URL}/og-image.jpg" />
  <meta property="og:site_name" content="RunAnalytics" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${BASE_URL}${url}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${BASE_URL}/og-image.jpg" />
  
  <script type="application/ld+json">
  ${structuredData}
  </script>
  
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .ssr-container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .ssr-header { background: linear-gradient(135deg, #fc4c02, #ff6b35); color: white; padding: 40px 20px; text-align: center; }
    .ssr-header h1 { margin: 0; font-size: 2rem; }
    .ssr-meta { color: rgba(255,255,255,0.9); font-size: 0.9rem; margin-top: 10px; }
    .ssr-content { padding: 40px 20px; }
    .ssr-content h2 { color: #1a1a2e; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #eee; }
    .ssr-content ul { padding-left: 1.5rem; }
    .ssr-content li { margin-bottom: 0.5rem; }
    .ssr-toc { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .ssr-toc h3 { margin-top: 0; }
    .ssr-toc a { color: #fc4c02; text-decoration: none; display: block; padding: 5px 0; }
    .ssr-toc a:hover { text-decoration: underline; }
    .ssr-specs { background: #f8f9fa; padding: 20px; border-radius: 8px; }
    .ssr-specs dt { font-weight: bold; color: #666; }
    .ssr-specs dd { margin: 0 0 15px 0; font-size: 1.1rem; }
    .ssr-cta { background: linear-gradient(135deg, #fc4c02, #ff6b35); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-top: 40px; }
    .ssr-cta a { color: white; font-weight: bold; }
    .ssr-comparison-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .ssr-comparison-table th, .ssr-comparison-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    .ssr-comparison-table th { background: #f8f9fa; }
    @media (max-width: 600px) {
      .ssr-header h1 { font-size: 1.5rem; }
      .ssr-content { padding: 20px 15px; }
    }
  </style>
</head>`;
}

export function renderBlogPost(slug: string): string | null {
  const post = getBlogPostBySlug(slug);
  if (!post) return null;

  const url = `/blog/${slug}`;
  const meta: PageMeta = {
    title: `${post.title} | RunAnalytics`,
    description: post.description,
    keywords: `running, ${post.category.toLowerCase()}, training, ${post.title.toLowerCase().split(' ').slice(0, 3).join(', ')}`,
    type: 'article',
    datePublished: post.date
  };

  const structuredData = generateStructuredData(meta, url, 'BlogPosting', post.sources?.length
    ? { citation: post.sources.filter(source => /^https?:\/\//.test(source.href)).map(source => source.href) }
    : {});
  const head = generateHtmlHead(meta, url, structuredData);

  const tocHtml = post.tableOfContents 
    ? `<nav class="ssr-toc">
        <h3>Table of Contents</h3>
        ${post.tableOfContents.map(item => `<a href="#${item.id}">${item.title}</a>`).join('\n        ')}
      </nav>`
    : '';

  // Emit a second FAQPage JSON-LD block when the post defines FAQs.
  // This gives crawlers the same structured Q&A signals the React page exposes.
  const faqSchemaHtml = post.faqs?.length
    ? `<script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": post.faqs.map(f => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": { "@type": "Answer", "text": f.answer }
    }))
  }, null, 2)}
  </script>`
    : '';

  const faqHtml = post.faqs?.length
    ? `<section class="ssr-faq">
        <h2>Frequently Asked Questions</h2>
        ${post.faqs.map(f => `
        <details>
          <summary><strong>${escapeHtml(f.question)}</strong></summary>
          <p>${escapeHtml(f.answer)}</p>
        </details>`).join('')}
      </section>`
    : '';

  // Pick relevant tool/shoe links based on the post's category & title so each
  // post sends a unique mix of authority signals to the right destinations.
  const relatedHtml = generateRelatedToolsForBlog(post.title, post.category);
  const editorialUpdateHtml = generateEditorialUpdateForBlog(post.slug);

  return `${head}
${faqSchemaHtml}
<body>
  <div id="root">
    <header class="ssr-header">
      <div class="ssr-meta">${post.category} &bull; ${post.date} &bull; ${post.readTime}</div>
      <h1>${escapeHtml(post.title)}</h1>
    </header>
    
    <main class="ssr-container">
      <article class="ssr-content">
        <aside class="ssr-byline" aria-label="Article editorial information">
          <p><strong>By the RunAnalytics Editorial Team</strong> &bull; Product and data claims reviewed &bull; Updated August 7, 2026</p>
          <p>Educational content only. Training estimates depend on data quality and are not medical diagnosis.</p>
          <p><a href="/faq">Methodology and limitations</a> &bull; <a href="https://www.who.int/news-room/fact-sheets/detail/physical-activity" rel="nofollow noopener noreferrer">WHO physical activity guidance</a></p>
        </aside>
        ${editorialUpdateHtml}
        ${tocHtml}
        ${post.content}

        ${faqHtml}

        ${relatedHtml}

        <div class="ssr-cta">
          <h3>Ready to improve your running?</h3>
          <p>Get AI-powered insights from your Strava data.</p>
          <a href="/auth">Start Free &rarr;</a>
        </div>
      </article>
    </main>
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

function generateEditorialUpdateForBlog(slug: string): string {
  const updates: Record<string, { title: string; intro: string; rows: Array<[string, string]>; link: string; label: string }> = {
    "best-strava-analytics-tools-2026": {
      title: "How this comparison was evaluated",
      intro: "Products are compared by current use case, price visibility, data depth, setup friction and disclosed limitations, not by unsupported claims that one product is best for everyone.",
      rows: [["Post-run explanation", "Verify whether the product explains why a metric changed."], ["Long-term exploration", "Check filters, comparable periods and export options."], ["Free use", "Confirm what works before connecting an account or paying."], ["Adaptive next step", "Check whether the runner's context survives signup and checkout."]],
      link: "/tools", label: "Try the current free tools",
    },
    "how-to-improve-running-pace": {
      title: "Diagnose the limiter before adding speed",
      intro: "A pace plateau can reflect aerobic durability, excessive moderate intensity, stale workout targets, recovery or conditions. Several comparable weeks are more useful than one slow run.",
      rows: [["Pace slows while heart rate rises", "Compare similar runs with the aerobic-decoupling calculator."], ["Most training is moderate", "Review four to six weeks in the Training Split Analyzer."], ["Race fitness changed", "Recalculate broad training pace ranges."], ["Cadence changed", "Compare it at the same pace and terrain before altering form."]],
      link: "/tools/training-pace-calculator", label: "Calculate training pace ranges",
    },
    "how-to-pick-a-training-plan": {
      title: "Choose the least aggressive plan that fits",
      intro: "Plan selection should begin with current consistency, available days and goal-date feasibility, not the finish time a runner hopes to achieve.",
      rows: [["New or returning", "Begin near current weekly volume with mostly easy running."], ["Consistent intermediate", "Protect recovery around one or two purposeful sessions."], ["Race focused", "Add event-specific work only on a stable baseline."], ["Changing schedule", "Use adaptation without stacking missed workouts."]],
      link: "/blog/ai-running-coach-vs-training-plan", label: "Compare static plans and AI coaching",
    },
    "ai-running-coach-complete-guide-2026": {
      title: "Recorded evidence versus missing context",
      intro: "An AI coach may use pace, heart rate, cadence, elevation, volume and goals when available. It cannot safely infer pain, illness, sleep, life stress or why a workout was missed.",
      rows: [["Recorded run data", "Useful for summaries and comparable trends."], ["Training history", "Useful only when activities are complete and correctly synced."], ["Symptoms and health", "Must come from the runner and qualified professionals."], ["Life constraints", "Must be supplied before a recommendation can reflect them."]],
      link: "/faq", label: "Read methodology and limitations",
    },
    "ai-agent-coach-proactive-coaching": {
      title: "What should trigger proactive coaching",
      intro: "A useful proactive message identifies the evidence, states what is unknown and gives one proportionate action.",
      rows: [["Return after inactivity", "Recommend an easy return without claiming readiness."], ["Sudden volume increase", "Flag the load change without diagnosing injury risk."], ["Missed planned run", "Ask why before moving or stacking training."], ["Race preparation gap", "Explain the evidence and offer a safer goal or timeline."]],
      link: "/proactive-running-coach", label: "See the proactive Telegram coach",
    },
    "ultra-marathon-training-plan-100-miler-guide": {
      title: "Scope and readiness",
      intro: "This is a planning framework, not an individualized 100-mile prescription. Terrain, altitude, climate, cutoff times and medical context can materially change preparation.",
      rows: [["Training consistency", "Review several months of repeatable training and recovery."], ["Course specificity", "Practice the surface, climbing and descending demands."], ["Fueling", "Use only products and timing rehearsed in training."], ["Safety", "Set stop criteria and follow race medical guidance."]],
      link: "/blog/marathon-fueling-calculator-guide", label: "Build and rehearse a fueling plan",
    },
  };
  const update = updates[slug];
  if (!update) return "";
  return `<section class="ssr-editorial-update"><h2>${escapeHtml(update.title)}</h2><p>${escapeHtml(update.intro)}</p><table><tbody>${update.rows.map(([question, action]) => `<tr><th>${escapeHtml(question)}</th><td>${escapeHtml(action)}</td></tr>`).join("")}</tbody></table><p><a href="${update.link}">${escapeHtml(update.label)} &rarr;</a></p></section>`;
}

// Build a "Related tools & resources" block for blog posts. The set of links
// is chosen by category + title keywords so Google sees topical relevance,
// not boilerplate. Every post gets links to the shoe hub + a coaching tool.
function generateRelatedToolsForBlog(title: string, category: string): string {
  const haystack = `${title} ${category}`.toLowerCase();
  const links: { href: string; label: string; blurb: string }[] = [];

  const push = (href: string, label: string, blurb: string) => {
    if (!links.some((l) => l.href === href)) links.push({ href, label, blurb });
  };

  // Topical matches first
  if (/race|marathon|half|10k|5k|pace|predict/.test(haystack)) {
    push("/tools/race-predictor", "Race Time Predictor", "predict your finish time from a recent effort");
    push("/tools/race-split-calculator", "Race Split Calculator", "turn a goal time into exact course checkpoints");
    push("/tools/training-pace-calculator", "Training Pace Calculator", "derive broad workout pace ranges from a recent race");
  }
  if (/marathon|fuel|carb|nutrition|gel/.test(haystack)) {
    push("/tools/marathon-fueling", "Marathon Fueling Planner", "build a personalized race-day fuel strategy");
  }
  if (/aerobic|decoupling|efficiency|easy|zone 2/.test(haystack)) {
    push("/tools/aerobic-decoupling-calculator", "Aerobic Decoupling Calculator", "measure your aerobic efficiency on long runs");
  }
  if (/training plan|plan|workout|split|periodization/.test(haystack)) {
    push("/tools/training-split-analyzer", "Training Split Analyzer", "see whether your easy/hard balance is sustainable");
  }
  if (/cadence|form|stride|stability/.test(haystack)) {
    push("/tools/cadence-analyzer", "Cadence Analyzer", "analyze your stride and form stability");
  }
  if (/coach|ai|insight|chat|agent/.test(haystack)) {
    push("/ai-running-coach", "AI Running Coach", "ask questions about your training and get instant analysis");
    push("/ai-agent-coach", "AI Agent Coach", "proactive post-activity coaching for Premium members");
    push("/proactive-running-coach", "Proactive Telegram Coach", "see how private runner-scoped coaching can reach you after a run");
  }
  if (/shoe|footwear|carbon|drop|stack|cushion/.test(haystack)) {
    push("/tools/shoes", "Running Shoe Database", "browse sourced shoe specifications and editorial insights");
    push("/tools/shoe-finder", "Shoe Finder", "get matched to the right shoe for your stride");
    push("/tools/rotation-planner", "Rotation Planner", "build a smart multi-shoe rotation");
  }

  // Always-on baseline link keeps the information architecture connected
  // without forcing unrelated shoe links into every training article.
  push("/tools", "Running Tools", "use free calculators with transparent methods and limitations");
  push("/blog", "More from the RunAnalytics blog", "training tips, AI insights, and shoe reviews");

  return `<section class="ssr-related">
        <h2>Related tools &amp; resources</h2>
        <ul>
          ${links.slice(0, 6).map(l => `<li><a href="${l.href}"><strong>${l.label}</strong></a>: ${l.blurb}.</li>`).join('\n          ')}
        </ul>
      </section>`;
}

interface ShoeData {
  brand: string;
  model: string;
  category: string;
  weight: number | null;
  heelToToeDrop: number | null;
  heelStackHeight: number | null;
  forefootStackHeight: number | null;
  description: string | null;
  cushioningLevel: string | null;
  stability: string | null;
  bestFor: string[] | null;
  price: number | null;
  hasCarbonPlate?: boolean | null;
  hasSuperFoam?: boolean | null;
  imageUrl?: string | null;
  comfortRating?: number | null;
  durabilityRating?: number | null;
  responsivenessRating?: number | null;
}

export function renderShoePage(slug: string, shoe: ShoeData, similarShoes?: { brand: string; model: string; slug: string; weight: number | null; price: number | null }[]): string {
  const shoeName = `${shoe.brand} ${shoe.model}`;
  const url = `/tools/shoes/${slug}`;
  
  const meta: PageMeta = {
    title: `${shoeName} | Running Shoe Review & Specs | RunAnalytics`,
    description: `${shoeName}. ${shoe.category} running shoe with ${shoe.weight || 'N/A'}oz weight, ${shoe.heelToToeDrop || 'N/A'}mm drop. ${shoe.description?.substring(0, 120) || 'See detailed specs, reviews, and AI insights.'}`,
    keywords: `${shoeName}, ${shoe.brand} running shoes, ${shoe.category} shoes, running shoe review`
  };

  const productImage = shoe.imageUrl
    ? (shoe.imageUrl.startsWith('http') ? shoe.imageUrl : `${BASE_URL}${shoe.imageUrl}`)
    : undefined;

  const structuredData = generateStructuredData(meta, url, 'Product', {
    brand: shoe.brand,
    ...(productImage ? { image: productImage } : {}),
    offers: shoe.price ? {
      "@type": "Offer",
      "price": shoe.price,
      "priceCurrency": "USD"
    } : undefined
  });

  const head = generateHtmlHead(meta, url, structuredData);

  return `${head}
<body>
  <div id="root">
    <header class="ssr-header">
      <div class="ssr-meta">${shoe.brand} &bull; ${shoe.category}</div>
      <h1>${escapeHtml(shoeName)}</h1>
    </header>
    
    <main class="ssr-container">
      <article class="ssr-content">
        <section>
          <h2>Overview</h2>
          <p>${escapeHtml(shoe.description || `The ${shoeName} is a ${shoe.category} running shoe designed for runners.`)}</p>
        </section>
        
        <section>
          <h2>Specifications</h2>
          <dl class="ssr-specs">
            <dt>Brand</dt>
            <dd>${escapeHtml(shoe.brand)}</dd>
            <dt>Model</dt>
            <dd>${escapeHtml(shoe.model)}</dd>
            <dt>Category</dt>
            <dd>${escapeHtml(shoe.category.replace(/_/g, ' '))}</dd>
            ${shoe.weight ? `<dt>Weight</dt><dd>${shoe.weight} oz</dd>` : ''}
            ${shoe.heelToToeDrop != null ? `<dt>Heel-to-Toe Drop</dt><dd>${shoe.heelToToeDrop}mm</dd>` : ''}
            ${shoe.heelStackHeight && shoe.forefootStackHeight ? `<dt>Stack Height</dt><dd>${shoe.heelStackHeight}mm / ${shoe.forefootStackHeight}mm (heel/forefoot)</dd>` : ''}
            ${shoe.cushioningLevel ? `<dt>Cushioning</dt><dd>${escapeHtml(shoe.cushioningLevel)}</dd>` : ''}
            ${shoe.stability ? `<dt>Stability</dt><dd>${escapeHtml(shoe.stability.replace(/_/g, ' '))}</dd>` : ''}
            ${shoe.hasCarbonPlate ? `<dt>Carbon Plate</dt><dd>Yes</dd>` : ''}
            ${shoe.hasSuperFoam ? `<dt>Super Foam</dt><dd>Yes</dd>` : ''}
            ${shoe.price ? `<dt>Price</dt><dd>$${shoe.price}</dd>` : ''}
          </dl>
        </section>
        
        ${shoe.bestFor && shoe.bestFor.length > 0 ? `
        <section>
          <h2>Best For</h2>
          <ul>${shoe.bestFor.map(b => `<li>${escapeHtml(b.replace(/_/g, ' '))}</li>`).join('')}</ul>
        </section>` : ''}
        
        ${similarShoes && similarShoes.length > 0 ? `
        <section>
          <h2>Similar Shoes</h2>
          <ul>${similarShoes.map(s => `<li><a href="/tools/shoes/${s.slug}">${escapeHtml(s.brand)} ${escapeHtml(s.model)}</a>${s.weight || s.price ? `: ${s.weight ? s.weight + ' oz' : ''}${s.weight && s.price ? ', ' : ''}${s.price ? '$' + s.price : ''}` : ''}</li>`).join('')}</ul>
        </section>` : ''}
        
        <div class="ssr-cta">
          <h3>Find your perfect shoe</h3>
          <p>Use our AI-powered shoe finder to get personalized recommendations.</p>
          <a href="/tools/shoe-finder">Try Shoe Finder &rarr;</a>
        </div>
      </article>
    </main>
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

interface ComparisonShoe {
  brand: string;
  model: string;
  weight: number | null;
  heelToToeDrop: number | null;
  category: string;
  price: number | null;
  // Optional richer fields used by the editorial generator. The route may
  // pass these from the runningShoes table when available.
  slug?: string | null;
  heelStackHeight?: number | null;
  forefootStackHeight?: number | null;
  cushioningLevel?: string | null;
  stability?: string | null;
  hasCarbonPlate?: boolean | null;
  hasSuperFoam?: boolean | null;
  bestFor?: string[] | null;
}

interface ComparisonData {
  title: string;
  metaDescription: string | null;
  verdict: string | null;
  shoe1: ComparisonShoe | null;
  shoe2: ComparisonShoe | null;
}

// ---------------------------------------------------------------------------
// Spec-driven editorial copy generator for shoe comparison pages.
//
// Each comparison page used to be a thin spec table: Google flagged ~17 of
// them as "Crawled - currently not indexed" because they looked templated.
// This generator builds unique 2-paragraph editorial copy + an FAQ from the
// actual spec deltas of each pair. Because every pair has different weights,
// drops, stacks, and pricing, every page gets unique prose.
// ---------------------------------------------------------------------------
function fmtCategory(cat: string): string {
  return cat.replace(/_/g, " ").toLowerCase();
}

function fmtOz(n: number | null | undefined): string {
  return n != null ? `${n} oz` : "Not available";
}

function describeStack(s: ComparisonShoe): string {
  if (s.heelStackHeight && s.forefootStackHeight) {
    return `${s.heelStackHeight}mm/${s.forefootStackHeight}mm`;
  }
  return "stack not listed";
}

function generateComparisonNarrative(s1: ComparisonShoe, s2: ComparisonShoe): string {
  // Names interpolated into HTML: must be escaped because brand/model come
  // from a user-editable database table.
  const n1 = escapeHtml(`${s1.brand} ${s1.model}`);
  const n2 = escapeHtml(`${s2.brand} ${s2.model}`);
  const brand1 = escapeHtml(s1.brand);
  const cat1 = escapeHtml(fmtCategory(s1.category));
  const cat2 = escapeHtml(fmtCategory(s2.category));
  const sameCategory = s1.category === s2.category;
  const sameBrand = s1.brand.toLowerCase() === s2.brand.toLowerCase();

  // --- Paragraph 1: framing ---
  const framing: string[] = [];
  if (sameBrand) {
    framing.push(
      `The ${n1} and the ${n2} are both ${cat1} shoes from ${brand1}, which makes this a classic same-line comparison: same design language, similar fit philosophy, but meaningful changes in feel and intended use.`
    );
  } else if (sameCategory) {
    framing.push(
      `The ${n1} and the ${n2} sit in the same ${cat1} bucket, so the question isn't <em>what</em> you'd use them for: it's which one matches your stride, your weekly mileage, and your budget.`
    );
  } else {
    framing.push(
      `The ${n1} (${cat1}) and the ${n2} (${cat2}) live in different parts of a runner's rotation. This comparison is most useful if you're deciding which slot to fill next: a versatile workhorse, a race-day weapon, or a recovery cruiser.`
    );
  }

  // --- Paragraph 2: spec-by-spec deltas (only mention real differences) ---
  const deltas: string[] = [];
  if (s1.weight && s2.weight && s1.weight !== s2.weight) {
    const lighter = s1.weight < s2.weight ? n1 : n2;
    const diff = Math.abs(s1.weight - s2.weight).toFixed(1);
    deltas.push(
      `the <strong>${lighter}</strong> comes in roughly ${diff} oz lighter (${fmtOz(s1.weight)} vs ${fmtOz(s2.weight)}), which becomes noticeable on faster turnover and longer efforts`
    );
  }
  if (s1.heelToToeDrop != null && s2.heelToToeDrop != null && s1.heelToToeDrop !== s2.heelToToeDrop) {
    deltas.push(
      `the drop differs (${s1.heelToToeDrop}mm on the ${n1}, ${s2.heelToToeDrop}mm on the ${n2}): higher-drop shoes tend to feel friendlier to heel strikers and tight calves, while lower drops favor a midfoot landing`
    );
  }
  const stack1 = s1.heelStackHeight ?? null;
  const stack2 = s2.heelStackHeight ?? null;
  if (stack1 && stack2 && Math.abs(stack1 - stack2) >= 2) {
    const taller = stack1 > stack2 ? n1 : n2;
    deltas.push(
      `the <strong>${taller}</strong> rides on the taller stack (${describeStack(s1)} vs ${describeStack(s2)}), giving it more under-foot cushioning at the cost of a slightly less stable platform`
    );
  }
  if (s1.hasCarbonPlate !== s2.hasCarbonPlate && (s1.hasCarbonPlate || s2.hasCarbonPlate)) {
    const plated = s1.hasCarbonPlate ? n1 : n2;
    deltas.push(
      `only the <strong>${plated}</strong> uses a carbon plate, which adds noticeable propulsion at marathon pace and below but isn't really worth the premium for easy days`
    );
  }
  if (s1.hasSuperFoam !== s2.hasSuperFoam && (s1.hasSuperFoam || s2.hasSuperFoam)) {
    const foamed = s1.hasSuperFoam ? n1 : n2;
    deltas.push(
      `the <strong>${foamed}</strong> uses a modern super-foam (PEBA or similar), which gives a livelier, more responsive ride than traditional EVA`
    );
  }
  if (s1.price && s2.price && s1.price !== s2.price) {
    const cheaper = s1.price < s2.price ? n1 : n2;
    const diff = Math.abs(s1.price - s2.price);
    deltas.push(
      `the <strong>${cheaper}</strong> is $${diff} cheaper at MSRP ($${s1.price} vs $${s2.price})`
    );
  }

  let p2: string;
  if (deltas.length === 0) {
    p2 = `On paper the two shoes are remarkably close: same category, similar weight, similar drop. The buying decision comes down to fit, brand history, and which one feels better on a short test run.`;
  } else if (deltas.length === 1) {
    p2 = `The headline difference: ${deltas[0]}. Everything else (fit, outsole geometry, upper) is close enough that it comes down to personal preference.`;
  } else {
    const last = deltas.pop();
    p2 = `Where they actually differ: ${deltas.join("; ")}; and ${last}.`;
  }

  return `<p>${framing.join(" ")}</p>\n<p>${p2}</p>`;
}

function generateComparisonFaq(s1: ComparisonShoe, s2: ComparisonShoe): { q: string; a: string }[] {
  // q goes through escapeHtml in the renderer; a contains intentional <a>
  // markup, so dynamic text inside it must be escaped here.
  const n1 = escapeHtml(`${s1.brand} ${s1.model}`);
  const n2 = escapeHtml(`${s2.brand} ${s2.model}`);
  const faq: { q: string; a: string }[] = [];

  if (s1.weight && s2.weight) {
    const lighter = s1.weight <= s2.weight ? n1 : n2;
    faq.push({
      q: `Which is lighter, the ${n1} or the ${n2}?`,
      a: `The ${lighter} is the lighter shoe at ${Math.min(s1.weight, s2.weight)} oz versus ${Math.max(s1.weight, s2.weight)} oz.`,
    });
  }
  if (s1.price && s2.price) {
    const cheaper = s1.price <= s2.price ? n1 : n2;
    faq.push({
      q: `Which costs less?`,
      a: `The ${cheaper} is the more affordable option at $${Math.min(s1.price, s2.price)} compared to $${Math.max(s1.price, s2.price)}.`,
    });
  }
  if (s1.heelToToeDrop != null && s2.heelToToeDrop != null && s1.heelToToeDrop !== s2.heelToToeDrop) {
    faq.push({
      q: `Do they have the same heel-to-toe drop?`,
      a: `No. The ${n1} has a ${s1.heelToToeDrop}mm drop and the ${n2} has a ${s2.heelToToeDrop}mm drop, which can change how each shoe loads your calves and Achilles.`,
    });
  }
  if (s1.hasCarbonPlate || s2.hasCarbonPlate) {
    if (s1.hasCarbonPlate && s2.hasCarbonPlate) {
      faq.push({
        q: `Are these carbon-plated racing shoes?`,
        a: `Yes: both the ${n1} and the ${n2} use a carbon plate, so they're built primarily for race day and key workouts rather than daily mileage.`,
      });
    } else {
      const plated = s1.hasCarbonPlate ? n1 : n2;
      const not = s1.hasCarbonPlate ? n2 : n1;
      faq.push({
        q: `Is either shoe carbon-plated?`,
        a: `Only the ${plated} uses a carbon plate. The ${not} relies on foam geometry alone, which makes it more versatile for daily training.`,
      });
    }
  }
  faq.push({
    q: `Can I rotate both shoes in the same training block?`,
    a: `Yes: many runners pair complementary shoes like these to spread load across different muscles and tendons. Use our <a href="/tools/rotation-planner">rotation planner</a> to build a mileage split that fits your schedule.`,
  });
  return faq.slice(0, 5);
}

function generateFaqStructuredData(faq: { q: string; a: string }[]): string {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map((item) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        // Strip HTML for the schema text: keep prose only.
        "text": item.a.replace(/<[^>]+>/g, ""),
      },
    })),
  };
  // Escape "</script" so the JSON payload can never close the surrounding
  // <script> tag, and emit the full <script> wrapper so the caller can
  // inject this as a sibling tag (NOT nested inside another JSON-LD block).
  const safe = JSON.stringify(json, null, 2).replace(/<\/script/gi, "<\\/script");
  return `<script type="application/ld+json">\n${safe}\n</script>`;
}

export function renderComparisonPage(slug: string, comparison: ComparisonData): string {
  const url = `/tools/shoes/compare/${slug}`;
  const shoe1Name = comparison.shoe1 ? `${comparison.shoe1.brand} ${comparison.shoe1.model}` : 'Shoe 1';
  const shoe2Name = comparison.shoe2 ? `${comparison.shoe2.brand} ${comparison.shoe2.model}` : 'Shoe 2';
  
  const meta: PageMeta = {
    title: `${comparison.title} | Running Shoe Comparison | RunAnalytics`,
    description: comparison.metaDescription || `Compare ${shoe1Name} vs ${shoe2Name}. See detailed specs, features, pros and cons to find the best shoe for your running.`,
    keywords: `compare running shoes, ${shoe1Name}, ${shoe2Name}, running shoe comparison, shoe vs shoe`
  };

  const structuredData = generateStructuredData(meta, url, 'WebPage');
  // Spec-driven editorial copy: unique per pair, helps Google index the page
  // instead of treating it as boilerplate.
  const narrativeHtml =
    comparison.shoe1 && comparison.shoe2
      ? generateComparisonNarrative(comparison.shoe1, comparison.shoe2)
      : "";
  const faq =
    comparison.shoe1 && comparison.shoe2
      ? generateComparisonFaq(comparison.shoe1, comparison.shoe2)
      : [];
  const faqJsonLd = faq.length > 0 ? generateFaqStructuredData(faq) : "";
  const head = generateHtmlHead(meta, url, structuredData);

  // Per-shoe deep links back to the shoe detail pages: gives Google clear
  // outbound internal links from each comparison.
  const shoeLink = (s: ComparisonShoe | null): string => {
    if (!s) return "";
    const name = `${s.brand} ${s.model}`;
    return s.slug ? `<a href="/tools/shoes/${s.slug}">${escapeHtml(name)}</a>` : escapeHtml(name);
  };

  return `${head}
<body>
  ${faqJsonLd}
  <div id="root">
    <header class="ssr-header">
      <div class="ssr-meta">Shoe Comparison</div>
      <h1>${escapeHtml(comparison.title)}</h1>
    </header>
    
    <main class="ssr-container">
      <article class="ssr-content">
        <section>
          <h2>Comparison Overview</h2>
          <p>${escapeHtml(comparison.verdict || `A detailed comparison between ${shoe1Name} and ${shoe2Name} to help you choose the right shoe for your running needs.`)}</p>
        </section>

        ${narrativeHtml ? `<section>
          <h2>How the ${escapeHtml(shoe1Name)} and ${escapeHtml(shoe2Name)} differ</h2>
          ${narrativeHtml}
        </section>` : ''}

        <section>
          <h2>Head-to-Head Comparison</h2>
          <table class="ssr-comparison-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>${escapeHtml(shoe1Name)}</th>
                <th>${escapeHtml(shoe2Name)}</th>
              </tr>
            </thead>
            <tbody>
              ${comparison.shoe1 && comparison.shoe2 ? `
              <tr>
                <td>Brand</td>
                <td>${escapeHtml(comparison.shoe1.brand)}</td>
                <td>${escapeHtml(comparison.shoe2.brand)}</td>
              </tr>
              <tr>
                <td>Model</td>
                <td>${escapeHtml(comparison.shoe1.model)}</td>
                <td>${escapeHtml(comparison.shoe2.model)}</td>
              </tr>
              <tr>
                <td>Category</td>
                <td>${escapeHtml(comparison.shoe1.category.replace(/_/g, ' '))}</td>
                <td>${escapeHtml(comparison.shoe2.category.replace(/_/g, ' '))}</td>
              </tr>
              <tr>
                <td>Weight</td>
                <td>${comparison.shoe1.weight || 'N/A'} oz</td>
                <td>${comparison.shoe2.weight || 'N/A'} oz</td>
              </tr>
              <tr>
                <td>Drop</td>
                <td>${comparison.shoe1.heelToToeDrop != null ? comparison.shoe1.heelToToeDrop + 'mm' : 'N/A'}</td>
                <td>${comparison.shoe2.heelToToeDrop != null ? comparison.shoe2.heelToToeDrop + 'mm' : 'N/A'}</td>
              </tr>
              <tr>
                <td>Price</td>
                <td>${comparison.shoe1.price ? '$' + comparison.shoe1.price : 'N/A'}</td>
                <td>${comparison.shoe2.price ? '$' + comparison.shoe2.price : 'N/A'}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
        </section>
        
        ${faq.length > 0 ? `<section>
          <h2>Frequently Asked Questions</h2>
          <dl class="ssr-faq">
            ${faq.map(item => `<dt><strong>${escapeHtml(item.q)}</strong></dt><dd>${item.a}</dd>`).join('\n            ')}
          </dl>
        </section>` : ''}

        <section>
          <h2>Read the full reviews</h2>
          <ul>
            ${comparison.shoe1 ? `<li>${shoeLink(comparison.shoe1)}: full specs, AI insights, and verdict.</li>` : ''}
            ${comparison.shoe2 ? `<li>${shoeLink(comparison.shoe2)}: full specs, AI insights, and verdict.</li>` : ''}
            <li><a href="/tools/shoes">Browse the full running shoe database</a></li>
            <li><a href="/tools/shoes/compare">See more shoe comparisons</a></li>
          </ul>
        </section>

        <div class="ssr-cta">
          <h3>Not sure which is right for you?</h3>
          <p>Use our AI-powered <a href="/tools/shoe-finder">shoe finder</a> for personalized recommendations, or build a smart shoe rotation with the <a href="/tools/rotation-planner">rotation planner</a>.</p>
        </div>
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderHomepage(): string {
  const content = homepageContent;
  const meta: PageMeta = {
    title: "RunAnalytics - AI Running Coach & Performance Analytics",
    description: "Chat with your personal AI Running Coach powered by GPT-5.5. Get instant training advice, race predictions, Runner Score (0-100), and comprehensive performance analytics. Free with Strava integration.",
    keywords: "AI running coach, running analytics, Strava analytics, runner score, race predictions, VO2 max, running performance, training insights, running app, marathon training, AI coach chat",
    type: 'website'
  };
  
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "RunAnalytics",
        "applicationCategory": "HealthApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "description": "AI-powered running analytics platform with Runner Score, race predictions, and personalized training insights"
      },
      {
        "@type": "Organization",
        "name": "RunAnalytics",
        "url": "https://aitracker.run",
        "logo": "https://aitracker.run/logo.png",
        "description": "AI-powered running analytics and coaching platform"
      }
    ]
  }, null, 2);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5, user-scalable=yes" />
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}" />
  <meta name="keywords" content="${escapeHtml(meta.keywords || '')}" />
  <meta name="author" content="RunAnalytics" />
  <meta name="theme-color" content="#fc4c02" />
  <link rel="canonical" href="${BASE_URL}/" />
  
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${BASE_URL}/" />
  <meta property="og:title" content="${escapeHtml(meta.title)}" />
  <meta property="og:description" content="${escapeHtml(meta.description)}" />
  <meta property="og:image" content="${BASE_URL}/og-image.jpg" />
  <meta property="og:site_name" content="RunAnalytics" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${BASE_URL}/" />
  <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
  <meta name="twitter:image" content="${BASE_URL}/og-image.jpg" />
  
  <script type="application/ld+json">
  ${structuredData}
  </script>
  
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 0; }
    .ssg-hero { background: linear-gradient(135deg, #eff6ff, #fff, #fff7ed); padding: 60px 20px; text-align: center; }
    .ssg-hero h1 { font-size: 2.5rem; font-weight: 700; margin: 0 0 1rem; }
    .ssg-hero h1 span { color: #fc4c02; }
    .ssg-hero p { font-size: 1.1rem; color: #4b5563; max-width: 600px; margin: 0 auto 1.5rem; }
    .ssg-cta { display: inline-block; background: linear-gradient(135deg, #fc4c02, #ea580c); color: white; padding: 16px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 1.1rem; }
    .ssg-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(252, 76, 2, 0.3); }
    .ssg-trust { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; margin-top: 30px; font-size: 0.9rem; color: #6b7280; }
    .ssg-trust span { display: flex; align-items: center; gap: 6px; }
    .ssg-section { padding: 60px 20px; max-width: 1200px; margin: 0 auto; }
    .ssg-section-alt { background: #f9fafb; }
    .ssg-section h2 { font-size: 2rem; text-align: center; margin-bottom: 1rem; }
    .ssg-section-subtitle { text-align: center; font-size: 1.1rem; color: #6b7280; max-width: 700px; margin: 0 auto 2rem; }
    .ssg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 30px; }
    .ssg-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .ssg-card h3 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    .ssg-card p { color: #6b7280; margin: 0; }
    .ssg-features-list { list-style: none; padding: 0; margin: 1rem 0; }
    .ssg-features-list li { padding: 8px 0; display: flex; align-items: flex-start; gap: 8px; }
    .ssg-features-list li::before { content: "✓"; color: #22c55e; font-weight: bold; }
    .ssg-pricing { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .ssg-plan { background: white; border-radius: 12px; padding: 30px; text-align: center; border: 2px solid #e5e7eb; }
    .ssg-plan.highlighted { border-color: #fc4c02; box-shadow: 0 4px 20px rgba(252, 76, 2, 0.15); }
    .ssg-plan h3 { font-size: 1.5rem; margin: 0; }
    .ssg-plan .price { font-size: 2.5rem; font-weight: 700; color: #1a1a2e; margin: 10px 0; }
    .ssg-plan p { color: #6b7280; margin-bottom: 1rem; }
    .ssg-testimonials { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .ssg-testimonial { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .ssg-testimonial blockquote { font-style: italic; margin: 0 0 1rem; }
    .ssg-testimonial cite { display: block; font-weight: 600; font-style: normal; }
    .ssg-testimonial .role { color: #6b7280; font-size: 0.9rem; }
    .ssg-final-cta { background: linear-gradient(135deg, #fc4c02, #ea580c); color: white; padding: 60px 20px; text-align: center; }
    .ssg-final-cta h2 { color: white; margin-bottom: 1rem; }
    .ssg-final-cta p { color: rgba(255,255,255,0.9); max-width: 500px; margin: 0 auto 1.5rem; }
    .ssg-final-cta a { display: inline-block; background: white; color: #fc4c02; padding: 16px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; }
    .ssg-tools { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
    .ssg-tool { display: block; background: white; border-radius: 8px; padding: 16px; text-decoration: none; color: inherit; border: 1px solid #e5e7eb; transition: all 0.2s; }
    .ssg-tool:hover { border-color: #fc4c02; box-shadow: 0 4px 12px rgba(252, 76, 2, 0.1); }
    .ssg-tool h4 { margin: 0 0 4px; color: #1a1a2e; }
    .ssg-tool p { margin: 0; font-size: 0.9rem; color: #6b7280; }
    @media (max-width: 768px) {
      .ssg-hero h1 { font-size: 1.75rem; }
      .ssg-section h2 { font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  <div id="root">
    <section class="ssg-hero">
      <h1>${escapeHtml(content.hero.title.replace('for Strava', ''))}<span>for Strava</span></h1>
      <p><strong>${escapeHtml(content.hero.subtitle)}</strong></p>
      <p>${escapeHtml(content.hero.description)}</p>
      <a href="${content.hero.cta.href}" class="ssg-cta">${escapeHtml(content.hero.cta.text)}</a>
      <div class="ssg-trust">
        ${content.hero.trustIndicators.map(t => `<span>✓ ${escapeHtml(t)}</span>`).join('')}
      </div>
    </section>
    
    <section class="ssg-section">
      <h2>${escapeHtml(content.aiCoach.title)}</h2>
      <p class="ssg-section-subtitle"><strong>${escapeHtml(content.aiCoach.subtitle)}</strong> ${escapeHtml(content.aiCoach.description)}</p>
      <ul class="ssg-features-list" style="max-width: 600px; margin: 0 auto;">
        ${content.aiCoach.features.map(f => `<li><strong>${escapeHtml(f.title)}</strong>${f.description ? ' ' + escapeHtml(f.description) : ''}</li>`).join('')}
      </ul>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${content.aiCoach.cta.href}" class="ssg-cta" style="background: linear-gradient(135deg, #3b82f6, #06b6d4);">${escapeHtml(content.aiCoach.cta.text)}</a>
      </div>
    </section>

    <section class="ssg-section ssg-section-alt">
      <h2>Your next useful coaching message can find you</h2>
      <p class="ssg-section-subtitle">Run as usual and let Strava sync. RunAnalytics can turn the pattern that mattered into a concise, runner-specific coaching message in a private chat.</p>
      <div class="ssg-grid">
        <article class="ssg-card">
          <h3>Telegram available now</h3>
          <p>Premium and trial runners can opt in to post-run verdicts and natural follow-up in a private Telegram conversation.</p>
        </article>
        <article class="ssg-card">
          <h3>Private by design</h3>
          <p>Read-only access is scoped to the connected runner. The coach cannot change activities, plans, accounts, or subscriptions.</p>
        </article>
        <article class="ssg-card">
          <h3>WhatsApp coming next</h3>
          <p>WhatsApp and weather-aware, day-before messaging are planned capabilities and are not presented as generally available today.</p>
        </article>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="/proactive-running-coach" class="ssg-cta" style="background:linear-gradient(135deg,#229ED9,#1679a8);">See the proactive messaging coach</a>
      </div>
    </section>

    <section class="ssg-section">
      <h2>${escapeHtml(content.runnerScore.title)}</h2>
      <p class="ssg-section-subtitle"><strong>${escapeHtml(content.runnerScore.subtitle)}</strong> ${escapeHtml(content.runnerScore.description)}</p>
      <ul class="ssg-features-list" style="max-width: 600px; margin: 0 auto;">
        ${content.runnerScore.features.map(f => `<li><strong>${escapeHtml(f.title)}</strong>${f.description ? ' ' + escapeHtml(f.description) : ''}</li>`).join('')}
      </ul>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${content.runnerScore.cta.href}" class="ssg-cta">${escapeHtml(content.runnerScore.cta.text)}</a>
      </div>
    </section>
    
    <section class="ssg-section">
      <h2>Why Runners Love Us</h2>
      <div class="ssg-grid">
        ${content.coreFeatures.map(f => `
        <article class="ssg-card">
          <h3>${escapeHtml(f.title)}</h3>
          <p>${escapeHtml(f.description)}</p>
          ${f.sample ? `<p style="margin-top: 12px; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 0.9rem;"><em>${escapeHtml(f.sample)}</em></p>` : ''}
        </article>
        `).join('')}
      </div>
    </section>
    
    <section class="ssg-section ssg-section-alt">
      <h2>Free Running Tools</h2>
      <p class="ssg-section-subtitle">Powerful calculators and analyzers, no signup required</p>
      <div class="ssg-tools">
        ${content.freeTools.map(t => `
        <a href="${t.href}" class="ssg-tool">
          <h4>${escapeHtml(t.title)}${t.badge ? ` <span style="background: #fc4c02; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">${escapeHtml(t.badge)}</span>` : ''}</h4>
          <p>${escapeHtml(t.description)}</p>
        </a>
        `).join('')}
      </div>
    </section>
    
    <section class="ssg-section">
      <h2>${escapeHtml(content.pricing.title)}</h2>
      <p class="ssg-section-subtitle">${escapeHtml(content.pricing.subtitle)}</p>
      <div class="ssg-pricing">
        ${content.pricing.plans.map(plan => `
        <div class="ssg-plan${plan.highlighted ? ' highlighted' : ''}">
          <h3>${escapeHtml(plan.name)}</h3>
          <div class="price">${escapeHtml(plan.price)}</div>
          <p>${escapeHtml(plan.description)}</p>
          <ul class="ssg-features-list">
            ${plan.features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
          </ul>
          <a href="${plan.cta.href}" class="ssg-cta" style="${plan.highlighted ? '' : 'background: #1a1a2e;'}">${escapeHtml(plan.cta.text)}</a>
        </div>
        `).join('')}
      </div>
    </section>
    
    <section class="ssg-section ssg-section-alt">
      <h2>What Runners Are Saying</h2>
      <div class="ssg-testimonials">
        ${content.testimonials.map(t => `
        <article class="ssg-testimonial">
          <blockquote>"${escapeHtml(t.quote)}"</blockquote>
          <cite>${escapeHtml(t.author)}</cite>
          <span class="role">${escapeHtml(t.role)}</span>
        </article>
        `).join('')}
      </div>
    </section>
    
    <section class="ssg-final-cta">
      <h2>${escapeHtml(content.finalCta.title)}</h2>
      <p>${escapeHtml(content.finalCta.description)}</p>
      <a href="${content.finalCta.href}">${escapeHtml(content.finalCta.buttonText)}</a>
    </section>
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

function generateSoftwareApplicationSchema(tool: ToolContent, url: string): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": tool.title.split('|')[0].trim(),
    "description": tool.description,
    "applicationCategory": "HealthApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "publisher": {
      "@type": "Organization",
      "name": "RunAnalytics",
      "url": BASE_URL
    },
    "url": `${BASE_URL}${url}`,
    "featureList": tool.features.join(", ")
  }, null, 2);
}

export function renderToolPage(slug: string): string | null {
  const tool = getToolBySlug(slug);
  if (!tool) return null;

  const url = `/tools/${slug}`;
  const meta: PageMeta = {
    title: `${tool.title} | RunAnalytics`,
    description: tool.description,
    keywords: tool.keywords,
    type: 'website'
  };

  const structuredData = generateSoftwareApplicationSchema(tool, url);
  const head = generateHtmlHead(meta, url, structuredData);

  const faqHtml = tool.faq && tool.faq.length > 0
    ? `<section class="ssr-faq">
        <h2>Frequently Asked Questions</h2>
        ${tool.faq.map(item => `
        <details>
          <summary>${escapeHtml(item.question)}</summary>
          <p>${escapeHtml(item.answer)}</p>
        </details>
        `).join('')}
      </section>`
    : '';

  const faqSchema = tool.faq && tool.faq.length > 0
    ? `<script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": tool.faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  }, null, 2)}
  </script>`
    : '';

  return `${head}
${faqSchema}
<body>
  <div id="root">
    <header class="ssr-header">
      <div class="ssr-meta">Free Running Tool</div>
      <h1>${escapeHtml(tool.title.split('|')[0].trim())}</h1>
      <p style="opacity: 0.9; margin-top: 10px;">${escapeHtml(tool.description)}</p>
    </header>
    
    <main class="ssr-container">
      <article class="ssr-content">
        <section class="ssr-features">
          <h2>Features</h2>
          <ul>
            ${tool.features.map(f => `<li>${escapeHtml(f)}</li>`).join('\n            ')}
          </ul>
        </section>
        
        <section class="ssr-how-it-works">
          <h2>How It Works</h2>
          <p>${escapeHtml(tool.howItWorks)}</p>
        </section>
        
        <section class="ssr-benefits">
          <h2>Benefits</h2>
          <ul>
            ${tool.benefits.map(b => `<li>${escapeHtml(b)}</li>`).join('\n            ')}
          </ul>
        </section>
        
        ${faqHtml}
        
        <div class="ssr-cta">
          <h3>Try ${escapeHtml(tool.title.split('|')[0].trim())} Free</h3>
          <p>Manual calculators work immediately. Connected analysis requires sign-in and available Strava data.</p>
          <a href="${url}">Use This Tool &rarr;</a>
        </div>
      </article>
    </main>
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

export { getAllToolSlugs } from './toolsContent';

// ─── Per-route SSR renderers ─────────────────────────────────────────────────
// Each function produces crawler-ready HTML that mirrors the real React page
// content. Regular users always get the SPA (the route handler calls next()).

export function renderFaqPage(): string {
  const url = '/faq';
  const meta: PageMeta = {
    title: "FAQ | Frequently Asked Questions | RunAnalytics",
    description: "Get answers to common questions about RunAnalytics, Strava integration, AI coaching, subscriptions, and how to get the most from your training data.",
    keywords: "FAQ, frequently asked questions, help, support, running analytics help"
  };
  const faqItems = [
    { q: "What is RunAnalytics?", a: "RunAnalytics is an AI-powered running analytics platform that integrates with Strava to provide personalized insights, performance tracking, and training recommendations. We use advanced machine learning algorithms to analyze your running data and help you improve your performance." },
    { q: "Do I need a Strava account?", a: "While you can create an account without Strava, connecting your Strava account unlocks the full potential of our platform. Strava integration provides access to your historical running data, which enables more accurate AI insights and personalized recommendations." },
    { q: "Is RunAnalytics free to use?", a: "RunAnalytics offers a 14-day free trial with full access to all Premium features: AI coaching, race predictions, training plans, and advanced analytics. After the trial, Premium is $7.99/month or $79.99/year. You can cancel anytime before the trial ends and you won't be charged." },
    { q: "What kind of insights do you provide?", a: "Our AI analyzes your running data to provide insights on performance trends, pace analysis, training load, recovery recommendations, race predictions, injury risk assessment, and personalized training plans. Each insight is tailored to your specific running patterns and goals." },
    { q: "How accurate are the race time predictions?", a: "Race predictions are modeled estimates based on the activity data available. Weather, terrain, pacing, distance from the input effort and data quality can materially change the result; the displayed range is not a calibrated probability interval." },
    { q: "What is the Runner Score?", a: "The Runner Score is our comprehensive fitness metric that evaluates multiple aspects of your running performance including endurance, speed, consistency, and efficiency. It's displayed on a radar chart with scores from 0-100 across different categories." },
    { q: "What do CTL, ATL, and TSB mean?", a: "CTL (Chronic Training Load) is your Fitness: a 42-day rolling average showing your long-term training buildup. ATL (Acute Training Load) is your Fatigue: a 7-day rolling average showing your recent training stress. TSB (Training Stress Balance) is your Form: calculated as CTL minus ATL, showing your race readiness." },
    { q: "How do you calculate VO2 Max?", a: "We use Jack Daniels' formula combined with your recent running performance data to estimate VO2 Max. This calculation considers your best recent race times or time trial performances across different distances to provide an accurate fitness assessment." },
    { q: "What is AI Agent Coach?", a: "AI Agent Coach is a Premium feature that proactively analyzes every run after it syncs from Strava. Instead of waiting for you to check dashboards, it delivers personalized coaching recaps, observations, and next-step recommendations automatically." },
    { q: "How is AI Agent Coach different from the AI Coach Chat?", a: "AI Coach Chat is reactive: you ask questions and get answers. AI Agent Coach is proactive: it analyzes your runs automatically and delivers coaching insights without you asking. Think of it as having a coach who reviews every run and leaves you notes." },
    { q: "Is my running data secure?", a: "Absolutely. We use enterprise-grade security measures including data encryption, secure authentication, and trusted cloud infrastructure. Your data is never shared with third parties without your explicit consent." },
    { q: "What happens if I delete my account?", a: "When you delete your account, all your personal data, analytics, and insights are permanently removed from our systems within 30 days. Your original Strava data remains unaffected in your Strava account." },
  ];
  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a }
    }))
  }, null, 2);
  const webPageSchema = generateStructuredData(meta, url, 'WebPage');
  const head = generateHtmlHead(meta, url, webPageSchema);
  return `${head}
<script type="application/ld+json">
${faqSchema}
</script>
<body>
  <div id="root">
    <header class="ssr-header">
      <h1>Frequently Asked Questions</h1>
      <p style="opacity:0.9;margin-top:10px;">Find answers to common questions about RunAnalytics.</p>
    </header>
    <main class="ssr-container">
      <article class="ssr-content">
        ${faqItems.map(f => `<details>
          <summary><strong>${escapeHtml(f.q)}</strong></summary>
          <p>${escapeHtml(f.a)}</p>
        </details>`).join('\n        ')}
        <div class="ssr-cta">
          <h3>Still have questions?</h3>
          <p>Our support team is here to help.</p>
          <a href="/contact">Contact Support &rarr;</a>
        </div>
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderBlogIndex(): string {
  const url = '/blog';
  const meta: PageMeta = {
    title: "Running Blog | Training Tips & AI Coaching Insights | RunAnalytics",
    description: "Expert running advice, training tips, and AI coaching insights. Learn how to improve your pace, pick training plans, and run smarter.",
    keywords: "running blog, training tips, running advice, AI running coach"
  };
  const posts = [
    { slug: "ultra-marathon-training-plan-100-miler-guide", title: "Ultra Marathon Training Plan: The Complete Guide to Training for a 100 Miler", description: "Everything you need to know about creating an ultra marathon training plan for your first 100 mile race. Covers periodization, back-to-back long runs, fueling, tapering, and race day execution.", date: "February 11, 2026", category: "Ultra Running", readTime: "20 min read" },
    { slug: "ai-agent-coach-proactive-coaching", title: "AI Agent Coach: How Proactive AI Coaching Transforms Your Running", description: "Discover how AI Agent Coach analyzes every run and delivers personalized coaching recaps, next-step recommendations, and training insights without you asking.", date: "January 18, 2026", category: "Premium Features", readTime: "10 min read" },
    { slug: "how-to-pick-a-training-plan", title: "How to Pick a Training Plan: Complete Guide", description: "Learn how to choose the right training plan for your running goals. Discover why AI-personalized plans outperform generic schedules.", date: "January 12, 2026", category: "Training Plans", readTime: "15 min read" },
    { slug: "ai-running-coach-complete-guide-2026", title: "AI Running Coach: Complete Guide 2026", description: "Everything you need to know about AI-powered running coaches, how they work, and how to use them to improve your training.", date: "January 15, 2026", category: "AI & Technology", readTime: "8 min read" },
    { slug: "best-strava-analytics-tools-2026", title: "Best Strava Analytics Tools 2026", description: "Comprehensive comparison of the top Strava analytics platforms to help you choose the right tool for your training needs.", date: "January 15, 2026", category: "Tools & Reviews", readTime: "10 min read" },
    { slug: "how-to-improve-running-pace", title: "How to Improve Running Pace: Complete Guide", description: "Practical pace training with intervals, tempo running, strength work, recovery and safety context.", date: "January 15, 2026", category: "Training Tips", readTime: "12 min read" },
  ];
  const listSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "RunAnalytics Running Blog",
    "description": meta.description,
    "url": `${BASE_URL}${url}`,
    "itemListElement": posts.map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `${BASE_URL}/blog/${p.slug}`,
      "name": p.title
    }))
  }, null, 2);
  const webPageSchema = generateStructuredData(meta, url, 'WebPage');
  const head = generateHtmlHead(meta, url, webPageSchema);
  return `${head}
<script type="application/ld+json">
${listSchema}
</script>
<body>
  <div id="root">
    <header class="ssr-header">
      <h1>Running Blog</h1>
      <p style="opacity:0.9;margin-top:10px;">Training tips, AI coaching insights, and running science: from the RunAnalytics team.</p>
    </header>
    <main class="ssr-container">
      <article class="ssr-content">
        ${posts.map(p => `<section style="margin-bottom:2rem;padding-bottom:2rem;border-bottom:1px solid #eee;">
          <span style="font-size:0.8rem;color:#fc4c02;font-weight:600;text-transform:uppercase;">${escapeHtml(p.category)}</span>
          <h2 style="margin:0.5rem 0;"><a href="/blog/${p.slug}" style="color:#1a1a2e;text-decoration:none;">${escapeHtml(p.title)}</a></h2>
          <p style="color:#555;margin:0.5rem 0;">${escapeHtml(p.description)}</p>
          <small style="color:#888;">${escapeHtml(p.date)} &bull; ${escapeHtml(p.readTime)}</small>
        </section>`).join('\n        ')}
        <div class="ssr-cta">
          <h3>Get AI-powered running insights</h3>
          <p>Connect your Strava account and start training smarter.</p>
          <a href="/auth">Get Started Free &rarr;</a>
        </div>
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderPricingPage(): string {
  const url = '/pricing';
  const meta: PageMeta = {
    title: "Pricing | Free & Premium Plans | RunAnalytics",
    description: "Start free with basic analytics. Upgrade to Premium for AI insights, training plans, Coach Chat, and unlimited features.",
    keywords: "running app pricing, strava analytics cost, AI coach pricing"
  };
  const webPageSchema = generateStructuredData(meta, url, 'WebPage');
  const head = generateHtmlHead(meta, url, webPageSchema);
  return `${head}
<body>
  <div id="root">
    <header class="ssr-header">
      <h1>Simple, Transparent Pricing</h1>
      <p style="opacity:0.9;margin-top:10px;">Start free. Upgrade when you're ready for AI-powered coaching.</p>
    </header>
    <main class="ssr-container">
      <article class="ssr-content">
        <section>
          <h2>Free Plan</h2>
          <p>Get started with no credit card required. Free includes:</p>
          <ul>
            <li>Strava integration &amp; activity sync</li>
            <li>Runner Score calculation</li>
            <li>Basic running analytics</li>
            <li>Free calculator tools (race predictor, marathon fueling, and more)</li>
            <li>Route maps with key moments</li>
          </ul>
        </section>
        <section>
          <h2>Premium: $7.99/month or $79.99/year</h2>
          <p>Everything in Free, plus the full AI coaching suite:</p>
          <h3>Activity Analysis</h3>
          <ul>
            <li>Full AI Coach verdict (grade + in-depth summary)</li>
            <li>Performance metrics (drift, pacing, baseline comparisons)</li>
            <li>Interactive run timeline</li>
            <li>Detailed splits analysis</li>
            <li>Heart rate, cadence &amp; power charts</li>
            <li>Activity comparison tool</li>
            <li>Ask AI Coach about any run</li>
          </ul>
          <h3>Training &amp; Coaching</h3>
          <ul>
            <li>AI-generated training plans (5K to 100-mile ultramarathon)</li>
            <li>Race predictions for all standard distances</li>
            <li>Injury risk analysis</li>
            <li>Fitness / fatigue / form charts (CTL, ATL, TSB)</li>
            <li>AI Coach Chat: conversational coaching across your training</li>
            <li>AI Agent Coach: proactive post-run recaps sent automatically</li>
          </ul>
          <h3>Benchmarking &amp; Comparisons</h3>
          <ul>
            <li>Personal benchmarks (similar-run matching)</li>
            <li>Same route trends (performance over time on your favourite routes)</li>
            <li>Compare runs (overlay two runs, split-by-split diffs)</li>
            <li>Form stability analysis (cadence and power stability over time)</li>
          </ul>
          <p><a href="/proactive-running-coach"><strong>See how private Telegram coaching works</strong></a>: available to Premium and trial runners; WhatsApp is coming next.</p>
        </section>
        <section>
          <h2>Frequently Asked Questions about Pricing</h2>
          <details>
            <summary><strong>Is there a free trial?</strong></summary>
            <p>Yes: eligible new accounts can start a 14-day Premium trial. A payment card is required, you pay $0 today, and you can cancel before the trial ends to avoid a charge.</p>
          </details>
          <details>
            <summary><strong>Can I cancel anytime?</strong></summary>
            <p>Absolutely. Cancel your subscription at any time from your billing settings. You keep access until the end of your billing period.</p>
          </details>
          <details>
            <summary><strong>Is there an annual discount?</strong></summary>
            <p>Yes. The annual plan is $79.99/year: equivalent to $6.67/month, saving you about 17% compared to the monthly plan.</p>
          </details>
        </section>
        <div class="ssr-cta">
          <h3>Start your free 14-day trial</h3>
          <p>Card required. $0 today. Full Premium access during the trial; cancel before it ends to avoid a charge.</p>
          <a href="/auth">Get Started Free &rarr;</a>
        </div>
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderProactiveRunningCoachPage(): string {
  const url = '/proactive-running-coach';
  const meta: PageMeta = {
    title: "Proactive Running Coach on Telegram | RunAnalytics",
    description: "Get concise, runner-specific post-run coaching in Telegram through a private, read-only connection. Available with Premium and the 14-day trial.",
    keywords: "Telegram running coach, proactive running coach, WhatsApp running coach, Strava Telegram coach"
  };
  const structuredData = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "RunAnalytics Proactive Running Coach",
        "applicationCategory": "HealthApplication",
        "operatingSystem": "Web, Telegram",
        "description": meta.description,
        "offers": {
          "@type": "Offer",
          "price": "7.99",
          "priceCurrency": "USD",
          "description": "Included with RunAnalytics Premium after a 14-day trial"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is the proactive running coach available on Telegram?",
            "acceptedAnswer": { "@type": "Answer", "text": "Telegram is available to runners with an active Premium subscription or trial. Connect from AI Coach Settings." }
          },
          {
            "@type": "Question",
            "name": "Is WhatsApp available?",
            "acceptedAnswer": { "@type": "Answer", "text": "WhatsApp is the next planned messaging channel and is not yet generally available." }
          },
          {
            "@type": "Question",
            "name": "Can the coach change my RunAnalytics or Strava data?",
            "acceptedAnswer": { "@type": "Answer", "text": "No. The messaging coach has a runner-scoped, read-only connection and cannot edit activities, plans, goals, accounts, or subscriptions." }
          }
        ]
      }
    ]
  }, null, 2);
  const head = generateHtmlHead(meta, url, structuredData);
  return `${head}
<body>
  <div id="root">
    <header class="ssr-header">
      <p class="ssr-meta">Staged early access &bull; Telegram first &bull; WhatsApp planned</p>
      <h1>A Proactive Running Coach in Your Messages</h1>
      <p style="opacity:0.9;margin-top:10px;">Run, sync, and receive one useful next step without hunting through another dashboard.</p>
    </header>
    <main class="ssr-container">
      <article class="ssr-content">
        <section>
          <h2>What works in Telegram early access</h2>
          <p>RunAnalytics connects your Strava training history to a runner-specific coaching conversation. After an eligible activity syncs, the coach can deliver a concise post-run verdict, explain the evidence behind it, and answer a natural follow-up using your authorized training context.</p>
          <ul>
            <li><strong>Post-run guidance:</strong> the pattern that mattered and one executable next action</li>
            <li><strong>Your own context:</strong> authorized activities, trends, recovery signals, goals, and training-plan summaries</li>
            <li><strong>Natural follow-up:</strong> ask how the run fits the week without copying metrics into a generic chatbot</li>
          </ul>
          <p><strong>Availability:</strong> Telegram is available to Premium and trial runners. Connecting from AI Coach Settings is an explicit runner-owned opt-in.</p>
        </section>
        <section>
          <h2>Telegram now; WhatsApp planned next</h2>
          <p>Telegram is the first messaging channel in controlled early access. WhatsApp is shown as the next planned channel, but it is not described as live before its connection, tenant-isolation, revocation, and delivery controls are production-ready.</p>
        </section>
        <section>
          <h2>How the private connection works</h2>
          <ol>
            <li><strong>Connect in AI Coach Settings.</strong> RunAnalytics creates a short-lived, single-use Telegram link for the signed-in runner.</li>
            <li><strong>Open the bot privately.</strong> Group, channel, and supergroup connections are rejected.</li>
            <li><strong>Run and receive context.</strong> The coach uses a dedicated, read-only connection scoped to that runner.</li>
            <li><strong>Disconnect whenever you want.</strong> Disconnecting revokes the channel binding and its MCP access.</li>
          </ol>
        </section>
        <section>
          <h2>A private coach, not a shared chatbot</h2>
          <p>The model does not choose a runner by name, Telegram ID, or a user ID supplied in a prompt. RunAnalytics derives the runner from the secure connection and enforces ownership for every private read.</p>
          <p>The messaging coach cannot:</p>
          <ul>
            <li>Read another runner's profile, activities, goals, analytics, or plans</li>
            <li>Change activities, training plans, goals, preferences, or account details</li>
            <li>Start a Strava sync, send email, or alter a subscription</li>
            <li>Access Stripe, Strava, session, magic-link, or internal provider credentials</li>
          </ul>
        </section>
        <section>
          <h2>What proactive coaching is planned to become</h2>
          <p>The beta roadmap focuses on timely, low-volume messages: a weather heads-up before tomorrow's run, a day-before long-run or race-week check-in, and a conservative schedule adjustment when life interrupts the plan. These capabilities are planned and are not presented as generally available today.</p>
        </section>
        <section>
          <h2>Frequently asked questions</h2>
          <h3>Is Telegram available to every runner today?</h3>
          <p>Sign in with an active Premium subscription or trial, open AI Coach Settings, and choose Connect Telegram. The single-use link opens a private bot conversation.</p>
          <h3>Is WhatsApp live?</h3>
          <p>No. WhatsApp is the next planned messaging channel.</p>
          <h3>Can the coach modify my data?</h3>
          <p>No. Its RunAnalytics connection is deliberately read-only.</p>
          <h3>Is this medical advice?</h3>
          <p>No. The coach summarizes training patterns and encourages conservative decisions, but it does not diagnose injury or replace a qualified coach or clinician.</p>
        </section>
        <div class="ssr-cta">
          <h2>Start with your own training data</h2>
          <p>Try RunAnalytics Premium for 14 days, connect Strava, then opt in to Telegram from AI Coach Settings. Premium is $7.99/month after the trial.</p>
          <a href="/pricing?source=proactive_coach_landing&amp;capability=ai_coach&amp;benefitKey=coach_chat">Start 14 days free &rarr;</a>
        </div>
        <p style="margin-top:24px;text-align:center;"><a href="/blog/ai-agent-coach-proactive-coaching">Read how proactive AI coaching works</a> &bull; <a href="/ai-agent-coach">Explore AI Agent Coach</a></p>
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderFeaturesPage(): string {
  const url = '/features';
  const meta: PageMeta = {
    title: "Features | AI Analytics & Coaching | RunAnalytics",
    description: "Explore RunAnalytics features: Runner Score, AI insights, race predictions, training plans, shoe tracking, and proactive AI coaching.",
    keywords: "running app features, AI running features, Strava analytics features"
  };
  const webPageSchema = generateStructuredData(meta, url, 'WebPage');
  const head = generateHtmlHead(meta, url, webPageSchema);
  return `${head}
<body>
  <div id="root">
    <header class="ssr-header">
      <h1>Powerful Features for Serious Runners</h1>
      <p style="opacity:0.9;margin-top:10px;">Discover how RunAnalytics transforms your Strava data into actionable insights with AI-powered analytics.</p>
    </header>
    <main class="ssr-container">
      <article class="ssr-content">
        <section>
          <h2>AI-Powered Insights</h2>
          <p>Get personalized performance analysis powered by advanced AI that understands your unique running patterns. Every activity is automatically graded and summarized by an AI coach.</p>
          <ul>
            <li><strong>Performance Analysis:</strong> Deep dive into pace, heart rate, cadence, and efficiency trends</li>
            <li><strong>Race Predictions:</strong> AI-powered finish time predictions for 5K, 10K, half, and full marathon</li>
            <li><strong>Training-load signals:</strong> Flags abrupt workload and fatigue patterns for review; it does not diagnose or prevent injury</li>
            <li><strong>Effort Score:</strong> Understand how hard each run truly was relative to your fitness</li>
          </ul>
        </section>
        <section>
          <h2>AI Agent Coach: Proactive Coaching</h2>
          <p>AI Agent Coach proactively analyzes every run after it syncs from Strava and sends you personalized coaching recaps without you having to ask. Think of it as a dedicated running coach who reviews every workout and leaves you detailed notes.</p>
          <ul>
            <li>Post-activity coaching recaps delivered automatically</li>
            <li>Personalized next-step recommendations (rest, easy run, workout, long run)</li>
            <li>Training plan integration and goal tracking</li>
            <li>Customizable coaching tone (gentle, balanced, or direct)</li>
          </ul>
        </section>
        <section>
          <h2>AI Coach Chat</h2>
          <p>Have a real conversation with an AI coach that knows your full training history. Ask anything, from "why do I feel tired?" to "am I ready for my upcoming race?", and get contextual, data-driven answers.</p>
        </section>
        <section>
          <h2>Personalized Training Plans</h2>
          <p>Get AI-generated training plans built specifically for your fitness level, race goals, and schedule. Plans cover every distance from 5K to 100-mile ultramarathons and adapt as your training progresses.</p>
          <ul>
            <li>True periodization with base, build, peak, and taper phases</li>
            <li>Adaptive plans that adjust for missed workouts or life events</li>
            <li>Integration with recovery and fatigue metrics (CTL/ATL/TSB)</li>
            <li>Personalized target paces for every workout type</li>
          </ul>
        </section>
        <section>
          <h2>Runner Score</h2>
          <p>Your Runner Score is a comprehensive performance index that combines endurance, speed, consistency, and efficiency into a single number. Track your score over time to see how your fitness evolves.</p>
        </section>
        <section>
          <h2>Running Shoe Hub</h2>
          <p>Browse and compare the current running-shoe catalog with detailed specifications and editorial insights. Use the shoe finder, rotation planner, and side-by-side comparison tools to narrow the options.</p>
        </section>
        <section>
          <h2>Free Running Tools</h2>
          <ul>
            <li><a href="/tools/race-predictor">Race Time Predictor</a>: predict 5K to marathon finish times from a recent effort</li>
            <li><a href="/tools/marathon-fueling">Marathon Fueling Planner</a>: turn practiced intake targets into a race schedule</li>
            <li><a href="/tools/aerobic-decoupling-calculator">Aerobic Decoupling Calculator</a>: measure aerobic efficiency on long runs</li>
            <li><a href="/tools/training-split-analyzer">Training Split Analyzer</a>: analyze your easy/hard intensity balance</li>
            <li><a href="/tools/cadence-analyzer">Cadence Analyzer</a>: review cadence stability and late-run change</li>
          </ul>
        </section>
        <div class="ssr-cta">
          <h3>Try all features free for 14 days</h3>
          <p>Connect Strava, review your current data, and inspect the trial terms before starting.</p>
          <a href="/auth">Get Started Free &rarr;</a>
        </div>
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderAboutPage(): string {
  const url = '/about';
  const meta: PageMeta = {
    title: "About RunAnalytics | AI-Powered Running Analytics",
    description: "Learn about RunAnalytics - the AI-powered platform helping runners improve with personalized insights, training analytics, and smart coaching.",
    keywords: "about RunAnalytics, running analytics company, AI running platform"
  };
  const orgSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "RunAnalytics",
    "url": BASE_URL,
    "description": meta.description,
    "logo": `${BASE_URL}/favicon.svg`
  }, null, 2);
  const webPageSchema = generateStructuredData(meta, url, 'WebPage');
  const head = generateHtmlHead(meta, url, webPageSchema);
  return `${head}
<script type="application/ld+json">
${orgSchema}
</script>
<body>
  <div id="root">
    <header class="ssr-header">
      <h1>About RunAnalytics</h1>
      <p style="opacity:0.9;margin-top:10px;">AI-powered running analytics for Strava athletes.</p>
    </header>
    <main class="ssr-container">
      <article class="ssr-content">
        <section>
          <h2>Our Mission</h2>
          <p>RunAnalytics exists to make elite-level running coaching accessible to every runner. We believe that the insights previously available only to professional athletes: detailed performance analysis, personalized training plans, injury risk signals, and proactive coaching: should be available to anyone who laces up their shoes.</p>
        </section>
        <section>
          <h2>What We Do</h2>
          <p>RunAnalytics is an AI-powered running analytics platform that connects to your Strava account to deliver personalized insights, AI-generated training plans, race predictions, and proactive coaching. We analyze every run you complete and turn raw GPS and heart rate data into actionable guidance you can apply to your next workout.</p>
          <ul>
            <li>AI Coach Chat: ask questions about your training any time</li>
            <li>AI Agent Coach: proactive post-run coaching recaps sent automatically</li>
            <li>Race time predictions for 5K to ultramarathon distances</li>
            <li>Personalized training plans with true periodization</li>
            <li>Runner Score: a comprehensive fitness performance index</li>
            <li>Running Shoe Hub: compare 280+ shoes with AI insights</li>
            <li>Free tools: race predictor, marathon fueling planner, aerobic decoupling calculator, and more</li>
          </ul>
        </section>
        <section>
          <h2>Why Choose RunAnalytics</h2>
          <p>Unlike generic fitness apps, RunAnalytics is built specifically for runners. Every feature: from the aerobic decoupling calculator to the shoe rotation planner: is designed around the real needs of runners training for events from parkrun 5Ks to 100-mile ultramarathons.</p>
          <p>We integrate deeply with Strava so you never have to log your workouts manually. Our AI processes your full training history to give you advice that is always grounded in your actual data, not generic templates.</p>
        </section>
        <div class="ssr-cta">
          <h3>Start your free trial</h3>
          <p>Connect your Strava account and experience AI-powered coaching for yourself.</p>
          <a href="/auth">Get Started Free &rarr;</a>
        </div>
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderEbookLandingPage(): string {
  const url = '/ai-running-coaching-guide';
  const meta: PageMeta = {
    title: "Free AI Running Coaching Ebook | RunAnalytics",
    description: "Start a 14-day RunAnalytics Premium trial and get the $49 Runner's Guide to AI Coaching free. Learn what AI does well and where it fails.",
    keywords: "AI running coaching ebook, AI running coach guide, running analytics guide"
  };
  const bookSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "name": "The Runner's Guide to AI Coaching",
        "description": meta.description,
        "url": `${BASE_URL}${url}`
      },
      {
        "@type": "Book",
        "name": "The Runner's Guide to AI Coaching",
        "author": { "@type": "Person", "name": "Biser" },
        "publisher": { "@type": "Organization", "name": "RunAnalytics" },
        "numberOfPages": 33,
        "bookFormat": "https://schema.org/EBook",
        "inLanguage": "en",
        "image": `${BASE_URL}/ebook/ai-coaching-guide-cover.webp`
      }
    ]
  }, null, 2);
  const head = generateHtmlHead(meta, url, bookSchema)
    .replaceAll(`${BASE_URL}/og-image.jpg`, `${BASE_URL}/ebook/ai-coaching-guide-cover.webp`);

  return `${head}
<body>
  <div id="root">
    <header class="ssr-header">
      <div class="ssr-meta">33 pages &bull; 17 chapters &bull; 15 research sources</div>
      <h1>The Runner's Guide to AI Coaching</h1>
      <p style="opacity:0.9;margin-top:10px;">Start a 14-day Premium trial and get the $49 ebook free.</p>
    </header>
    <main class="ssr-container">
      <article class="ssr-content">
        <section>
          <h2>Use AI to train smarter. Keep the runner in control.</h2>
          <p>Learn what AI running coaches can do, what they commonly get wrong, and how to make safer decisions with pace, heart rate, perceived effort, recovery, and real-life context.</p>
          <p><strong>$0 today.</strong> Card required. Cancel anytime. Premium is $7.99 per month or $79.99 per year after the trial.</p>
        </section>
        <section>
          <h2>What is inside the guide</h2>
          <ul>
            <li>A visual explanation of how running data becomes a recommendation</li>
            <li>A 20-point AI Coach Scorecard</li>
            <li>Practical guidance for load, intensity, recovery, strength, tapering, and race preparation</li>
            <li>A runner briefing template, weekly review, and worked 10K adaptation</li>
            <li>Privacy, uncertainty, safety, and stop-rule checklists</li>
          </ul>
        </section>
        <section>
          <h2>Written by a runner, for runners</h2>
          <p>Biser created RunAnalytics after wanting running data to produce better decisions, not simply more charts. Trial readers receive the complete guide and a personal welcome message from the author.</p>
        </section>
        <section>
          <h2>How the offer works</h2>
          <ol>
            <li>Create a RunAnalytics account with Strava or email.</li>
            <li>Activate the 14-day Premium trial through secure Stripe checkout.</li>
            <li>Download the complete PDF and apply it to your own training.</li>
          </ol>
        </section>
        <div class="ssr-cta">
          <h3>Start the trial. Keep the guide.</h3>
          <p>Get the complete $49 ebook at no additional cost.</p>
          <a href="/auth?mode=signup&amp;redirect=%2Fpricing%3Fsource%3Debook_landing%26capability%3Debook_bundle%26benefitKey%3Debook_bundle%26returnTo%3D%252Fai-running-coaching-guide%253Fdownload%253D1%26pendingResourceId%3Dai-coaching-ebook%26experimentVariant%3Debook_bundle_v1">Start 14 days free &rarr;</a>
        </div>
        <p style="text-align:center;margin-top:24px;">Prefer the ebook without a trial? <a href="https://airunning.gumroad.com/l/the_running_guide_to_ai_coaching" rel="nofollow noopener noreferrer">Buy the standalone edition for $49 on Gumroad</a>.</p>
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderDevelopersPage(): string {
  const url = '/developers';
  const meta: PageMeta = {
    title: "Developer Portal | RunAnalytics API",
    description: "Build with RunAnalytics. Access our API documentation, integration guides, and developer resources for running analytics.",
    keywords: "API, developers, integration, running API, developer portal"
  };
  const webPageSchema = generateStructuredData(meta, url, 'WebPage');
  const head = generateHtmlHead(meta, url, webPageSchema);
  return `${head}
<body>
  <div id="root">
    <header class="ssr-header">
      <h1>RunAnalytics Developer Portal</h1>
      <p style="opacity:0.9;margin-top:10px;">Build integrations with the RunAnalytics API. Access running activities, AI insights, training plans, and goals programmatically.</p>
    </header>
    <main class="ssr-container">
      <article class="ssr-content">
        <section>
          <h2>What You Can Build</h2>
          <ul>
            <li>Custom dashboards that display your RunAnalytics data</li>
            <li>Integrations with other fitness platforms and tools</li>
            <li>Automated training log analysis workflows</li>
            <li>Personal apps that query your running activities, AI insights, and goals</li>
          </ul>
        </section>
        <section>
          <h2>API Features</h2>
          <ul>
            <li><strong>Secure Authentication:</strong> API key-based access with per-key permissions</li>
            <li><strong>Fast &amp; Reliable:</strong> REST API with consistent response shapes and pagination</li>
            <li><strong>Easy Integration:</strong> Standard JSON responses compatible with any programming language</li>
          </ul>
        </section>
        <section>
          <h2>Getting Started</h2>
          <p>Generate an API key from your RunAnalytics account settings, then make authenticated requests to the REST API endpoints. Full documentation is available on the <a href="/developers/api">API documentation page</a>.</p>
        </section>
        <div class="ssr-cta">
          <h3>Ready to build?</h3>
          <p>Create a free account to get your API key and start integrating.</p>
          <a href="/auth">Get Started &rarr;</a>
        </div>
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderDevelopersApiPage(): string {
  const url = '/developers/api';
  const meta: PageMeta = {
    title: "API Documentation | RunAnalytics Developers",
    description: "Complete API documentation for RunAnalytics. Learn how to integrate running analytics, access activity data, and build custom solutions.",
    keywords: "API documentation, REST API, running data API, developer docs"
  };
  const webPageSchema = generateStructuredData(meta, url, 'WebPage');
  const head = generateHtmlHead(meta, url, webPageSchema);
  return `${head}
<body>
  <div id="root">
    <header class="ssr-header">
      <h1>RunAnalytics API Documentation</h1>
      <p style="opacity:0.9;margin-top:10px;">Complete reference for the RunAnalytics REST API. Integrate running analytics into your own tools and workflows.</p>
    </header>
    <main class="ssr-container">
      <article class="ssr-content">
        <section>
          <h2>Authentication</h2>
          <p>All API requests require an API key passed in the <code>Authorization</code> header:</p>
          <pre style="background:#f4f4f4;padding:12px;border-radius:4px;overflow-x:auto;"><code>Authorization: Bearer YOUR_API_KEY</code></pre>
          <p>Generate your API key from your RunAnalytics account settings page.</p>
        </section>
        <section>
          <h2>Base URL</h2>
          <pre style="background:#f4f4f4;padding:12px;border-radius:4px;overflow-x:auto;"><code>https://aitracker.run/api</code></pre>
        </section>
        <section>
          <h2>Key Endpoints</h2>
          <h3>Activities</h3>
          <ul>
            <li><code>GET /api/activities</code>: List your synced running activities with pagination</li>
            <li><code>GET /api/activities/:id</code>: Get detailed data for a specific activity</li>
          </ul>
          <h3>AI Insights</h3>
          <ul>
            <li><code>GET /api/insights</code>: Get AI-generated insights for your recent activities</li>
          </ul>
          <h3>Training Plans</h3>
          <ul>
            <li><code>GET /api/training-plans</code>: Get your current AI-generated training plan</li>
          </ul>
          <h3>Runner Profile</h3>
          <ul>
            <li><code>GET /api/runner-score</code>: Get your current Runner Score and component metrics</li>
          </ul>
        </section>
        <section>
          <h2>Response Format</h2>
          <p>All responses are JSON. Successful responses include a <code>data</code> field. Errors include a <code>message</code> field and an appropriate HTTP status code.</p>
        </section>
        <div class="ssr-cta">
          <h3>Get your API key</h3>
          <p>Create a free account to start building with the RunAnalytics API.</p>
          <a href="/auth">Get Started &rarr;</a>
        </div>
      </article>
    </main>
  </div>
</body>
</html>`;
}

export function renderMcpLandingPage(): string {
  const url = '/mcp-server';
  const meta: PageMeta = {
    title: "Read-Only Running Data MCP Server | RunAnalytics",
    description: "Connect authorized AI clients to your RunAnalytics activities, trends, goals, plans, and public running-shoe catalog through secure read-only MCP tools.",
    keywords: "running MCP server, read-only MCP, AI running data, Model Context Protocol running"
  };
  const head = generateHtmlHead(meta, url, generateStructuredData(meta, url, 'WebPage'));
  return `${head}
<body><div id="root"><header class="ssr-header"><h1>Read-Only Running Data for Your AI Coach</h1><p class="ssr-meta">OAuth-protected private runner data and a separate open public catalog.</p></header>
<main class="ssr-container"><article class="ssr-content">
<section><h2>Useful context without account control</h2><p>RunAnalytics MCP lets an authorized client read bounded profile, activity, analytics, goal, and training-plan data for the signed-in runner. The OAuth subject determines ownership; a client cannot request a different runner by supplying a user ID.</p></section>
<section><h2>Private runner tools</h2><ul><li>Profile and preferences</li><li>Paginated activities and bounded activity details</li><li>Dashboard trends, fitness, recovery, and Runner Score</li><li>Goals and training-plan summaries or details</li><li>Coach snapshots and post-run briefs</li></ul><p>Private access requires an active Premium subscription or trial.</p></section>
<section><h2>Open public catalog</h2><p>The separate <code>https://aitracker.run/mcp/public</code> endpoint requires no private-account access. It can search the running-shoe database, read shoe specifications, list catalog filters, compare two to four shoes, and discover public RunAnalytics tools.</p></section>
<section><h2>A strict read-only boundary</h2><p>No MCP tool can create, update, delete, sync, email, change billing, invoke arbitrary routes, or execute arbitrary SQL. Tokens are short-lived, refresh grants rotate, responses are bounded, and access can be revoked.</p></section>
<div class="ssr-cta"><h2>Connect your running data</h2><p>Start a 14-day Premium trial, then authorize your preferred MCP client.</p><a href="/pricing?source=mcp_landing&amp;capability=mcp_access&amp;benefitKey=mcp_access&amp;returnTo=%2Fmcp-server">Start 14 days free &rarr;</a><p><a href="/developers/mcp">Read the MCP documentation</a></p></div>
</article></main></div></body></html>`;
}

export function renderMcpDocsPage(): string {
  const url = '/developers/mcp';
  const meta: PageMeta = {
    title: "RunAnalytics MCP Documentation | Read-Only Running Data",
    description: "Production endpoints, OAuth scopes, read-only tools, limits, and setup details for the RunAnalytics Model Context Protocol server.",
    keywords: "RunAnalytics MCP documentation, MCP OAuth, Streamable HTTP MCP, running data tools"
  };
  const head = generateHtmlHead(meta, url, generateStructuredData(meta, url, 'WebPage'));
  return `${head}
<body><div id="root"><header class="ssr-header"><h1>RunAnalytics MCP Documentation</h1><p class="ssr-meta">Production endpoints, OAuth scopes, tools, limits, and security boundaries.</p></header>
<main class="ssr-container"><article class="ssr-content">
<section><h2>Endpoints</h2><p><strong>Private:</strong> <code>https://aitracker.run/mcp</code>: OAuth plus active Premium or trial access.</p><p><strong>Public:</strong> <code>https://aitracker.run/mcp/public</code>: public shoe and tool catalog only.</p></section>
<section><h2>OAuth discovery</h2><ul><li><code>/.well-known/oauth-authorization-server</code></li><li><code>/.well-known/oauth-protected-resource/mcp</code></li><li><code>/mcp/oauth/register</code></li><li><code>/mcp/oauth/authorize</code></li><li><code>/mcp/oauth/token</code></li><li><code>/mcp/oauth/revoke</code></li></ul><p>Clients use authorization code with PKCE S256 and exact registered redirect URIs. Web-session and magic-link tokens are not accepted as MCP bearer tokens.</p></section>
<section><h2>Private scopes</h2><ul><li><code>mcp:profile.read</code></li><li><code>mcp:activities.read</code></li><li><code>mcp:analytics.read</code></li><li><code>mcp:goals.read</code></li><li><code>mcp:plans.read</code></li></ul></section>
<section><h2>Public running-shoe tools</h2><ul><li><code>search_running_shoes</code></li><li><code>get_running_shoe</code></li><li><code>list_running_shoe_filters</code></li><li><code>compare_running_shoes</code></li><li><code>list_runanalytics_tools</code></li></ul></section>
<section><h2>Operational limits</h2><p>Activity ranges are capped at 365 days, pages at 100 records, plan details at 32 weeks, shoe search at 50 results, comparison at four shoes, and tool execution at eight seconds. Private and public requests have separate distributed rate limits.</p></section>
<div class="ssr-cta"><h2>Get private runner access</h2><p>Private MCP access is included during the trial and with Premium.</p><a href="/pricing?source=mcp_docs&amp;capability=mcp_access&amp;benefitKey=mcp_access&amp;returnTo=%2Fdevelopers%2Fmcp">Start 14 days free &rarr;</a><p><a href="/mcp-server">See the runner-friendly overview</a></p></div>
</article></main></div></body></html>`;
}

export function renderToolsHubPage(): string {
  const url = '/tools';
  const meta: PageMeta = {
    title: "Free Running Tools & Calculators | RunAnalytics",
    description: "Free running calculators for pacing, splits and fueling, plus connected Strava analyzers for cadence, training balance and aerobic drift.",
    keywords: "running tools, running calculators, free running apps, marathon calculator, running analysis"
  };
  const listSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Free Running Tools: RunAnalytics",
    "description": meta.description,
    "url": `${BASE_URL}${url}`,
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "url": `${BASE_URL}/tools/race-predictor`, "name": "Race Time Predictor" },
      { "@type": "ListItem", "position": 2, "url": `${BASE_URL}/tools/marathon-fueling`, "name": "Marathon Fueling Planner" },
      { "@type": "ListItem", "position": 3, "url": `${BASE_URL}/tools/aerobic-decoupling-calculator`, "name": "Aerobic Decoupling Calculator" },
      { "@type": "ListItem", "position": 4, "url": `${BASE_URL}/tools/training-split-analyzer`, "name": "Training Split Analyzer" },
      { "@type": "ListItem", "position": 5, "url": `${BASE_URL}/tools/cadence-analyzer`, "name": "Running Cadence Analyzer" },
      { "@type": "ListItem", "position": 6, "url": `${BASE_URL}/tools/training-pace-calculator`, "name": "Training Pace Calculator" },
      { "@type": "ListItem", "position": 7, "url": `${BASE_URL}/tools/race-split-calculator`, "name": "Race Split Calculator" },
      { "@type": "ListItem", "position": 8, "url": `${BASE_URL}/tools/heatmap`, "name": "Running Heatmap" },
      { "@type": "ListItem", "position": 9, "url": `${BASE_URL}/tools/shoes`, "name": "Running Shoe Database" },
      { "@type": "ListItem", "position": 10, "url": `${BASE_URL}/tools/shoe-finder`, "name": "Running Shoe Finder" },
      { "@type": "ListItem", "position": 11, "url": `${BASE_URL}/tools/rotation-planner`, "name": "Shoe Rotation Planner" },
    ]
  }, null, 2);
  const webPageSchema = generateStructuredData(meta, url, 'WebPage');
  const head = generateHtmlHead(meta, url, webPageSchema);
  return `${head}
<script type="application/ld+json">
${listSchema}
</script>
<body>
  <div id="root">
    <header class="ssr-header">
      <h1>Free Running Tools &amp; Calculators</h1>
      <p style="opacity:0.9;margin-top:10px;">Use manual calculators instantly. Sign in only for tools that analyze your Strava history.</p>
    </header>
    <main class="ssr-container">
      <article class="ssr-content">
        <section>
          <h2>Performance Calculators</h2>
          <ul>
            <li><a href="/tools/race-predictor"><strong>Race Time Predictor</strong></a>: predict your 5K, 10K, half marathon, and marathon finish times from a recent effort using the Riegel formula. Import your Strava data for personalized predictions.</li>
            <li><a href="/tools/marathon-fueling"><strong>Marathon Fueling Planner</strong></a>: turn a practiced carbohydrate target and product serving size into a simple race schedule. Sodium and fluid remain individualized.</li>
            <li><a href="/tools/aerobic-decoupling-calculator"><strong>Aerobic Decoupling Calculator</strong></a>: compare pace-to-heart-rate efficiency across two halves of a suitable steady run.</li>
            <li><a href="/tools/training-pace-calculator"><strong>Training Pace Calculator</strong></a>: turn a recent race into broad workout pace ranges with a usefulness rating.</li>
            <li><a href="/tools/race-split-calculator"><strong>Race Split Calculator</strong></a>: create exact mile or kilometer checkpoints for three modest pacing strategies.</li>
          </ul>
        </section>
        <section>
          <h2>Training Analysis</h2>
          <ul>
            <li><a href="/tools/training-split-analyzer"><strong>Training Split Analyzer</strong></a>: analyze whether your recent intensity distribution is polarized, pyramidal, or threshold-heavy.</li>
            <li><a href="/tools/cadence-analyzer"><strong>Running Cadence Analyzer</strong></a>: review cadence stability and late-run change while keeping pace, terrain and device quality in context.</li>
            <li><a href="/tools/heatmap"><strong>Running Heatmap</strong></a>: visualize your most-run routes on an interactive map. Discover training patterns and favourite paths from all your Strava activities.</li>
          </ul>
        </section>
        <section>
          <h2>Running Shoe Hub</h2>
          <ul>
            <li><a href="/tools/shoes"><strong>Running Shoe Database</strong></a>: browse detailed specs, source and verification dates, and clearly labeled editorial insights.</li>
            <li><a href="/tools/shoe-finder"><strong>Running Shoe Finder</strong></a>: answer a few questions about your running style and get AI-matched shoe recommendations from our full database.</li>
            <li><a href="/tools/rotation-planner"><strong>Shoe Rotation Planner</strong></a>: build a smart multi-shoe rotation optimized for your training volume, race goals, and surface preferences.</li>
            <li><a href="/tools/shoes/compare"><strong>Shoe Comparison Tool</strong></a>: compare any two running shoes side-by-side with specs, pros/cons, and an AI verdict.</li>
          </ul>
        </section>
        <div class="ssr-cta">
          <h3>Connect Strava for personalized insights</h3>
          <p>Manual calculators work without an account. Tools that analyze your training history require sign-in and a Strava connection.</p>
          <a href="/auth">Get Started Free &rarr;</a>
        </div>
      </article>
    </main>
  </div>
</body>
</html>`;
}

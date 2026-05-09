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
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5, user-scalable=yes" />
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}" />
  ${meta.keywords ? `<meta name="keywords" content="${escapeHtml(meta.keywords)}" />` : ''}
  <meta name="author" content="RunAnalytics" />
  <meta name="theme-color" content="#fc4c02" />
  <link rel="canonical" href="${BASE_URL}${url}" />
  
  <meta property="og:type" content="${meta.type || 'website'}" />
  <meta property="og:url" content="${BASE_URL}${url}" />
  <meta property="og:title" content="${escapeHtml(meta.title)}" />
  <meta property="og:description" content="${escapeHtml(meta.description)}" />
  <meta property="og:image" content="${BASE_URL}/og-image.jpg" />
  <meta property="og:site_name" content="RunAnalytics" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${BASE_URL}${url}" />
  <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
  <meta name="twitter:image" content="${BASE_URL}/og-image.jpg" />
  
  <script type="application/ld+json">
  ${structuredData}
  </script>
  
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
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

  const structuredData = generateStructuredData(meta, url, 'BlogPosting');
  const head = generateHtmlHead(meta, url, structuredData);

  const tocHtml = post.tableOfContents 
    ? `<nav class="ssr-toc">
        <h3>Table of Contents</h3>
        ${post.tableOfContents.map(item => `<a href="#${item.id}">${item.title}</a>`).join('\n        ')}
      </nav>`
    : '';

  // Pick relevant tool/shoe links based on the post's category & title so each
  // post sends a unique mix of authority signals to the right destinations.
  const relatedHtml = generateRelatedToolsForBlog(post.title, post.category);

  return `${head}
<body>
  <div id="root">
    <header class="ssr-header">
      <div class="ssr-meta">${post.category} &bull; ${post.date} &bull; ${post.readTime}</div>
      <h1>${escapeHtml(post.title)}</h1>
    </header>
    
    <main class="ssr-container">
      <article class="ssr-content">
        ${tocHtml}
        ${post.content}

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
  }
  if (/shoe|footwear|carbon|drop|stack|cushion/.test(haystack)) {
    push("/tools/shoes", "Running Shoe Database", "browse 280+ shoes with AI insights");
    push("/tools/shoe-finder", "Shoe Finder", "get matched to the right shoe for your stride");
    push("/tools/rotation-planner", "Rotation Planner", "build a smart multi-shoe rotation");
  }

  // Always-on baseline links so every blog post sends some authority to the hubs.
  push("/tools/shoes", "Running Shoe Database", "browse 280+ shoes with AI insights");
  push("/runner-score", "Runner Score", "get your personal running performance index");
  push("/blog", "More from the RunAnalytics blog", "training tips, AI insights, and shoe reviews");

  return `<section class="ssr-related">
        <h2>Related tools &amp; resources</h2>
        <ul>
          ${links.slice(0, 6).map(l => `<li><a href="${l.href}"><strong>${l.label}</strong></a> — ${l.blurb}.</li>`).join('\n          ')}
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
}

export function renderShoePage(slug: string, shoe: ShoeData, similarShoes?: { brand: string; model: string; slug: string; weight: number | null; price: number | null }[]): string {
  const shoeName = `${shoe.brand} ${shoe.model}`;
  const url = `/tools/shoes/${slug}`;
  
  const meta: PageMeta = {
    title: `${shoeName} | Running Shoe Review & Specs | RunAnalytics`,
    description: `${shoeName}. ${shoe.category} running shoe with ${shoe.weight || 'N/A'}oz weight, ${shoe.heelToToeDrop || 'N/A'}mm drop. ${shoe.description?.substring(0, 120) || 'See detailed specs, reviews, and AI insights.'}`,
    keywords: `${shoeName}, ${shoe.brand} running shoes, ${shoe.category} shoes, running shoe review`
  };

  const structuredData = generateStructuredData(meta, url, 'Product', {
    brand: shoe.brand,
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
          <ul>${similarShoes.map(s => `<li><a href="/tools/shoes/${s.slug}">${escapeHtml(s.brand)} ${escapeHtml(s.model)}</a>${s.weight || s.price ? ` — ${s.weight ? s.weight + ' oz' : ''}${s.weight && s.price ? ', ' : ''}${s.price ? '$' + s.price : ''}` : ''}</li>`).join('')}</ul>
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
// Each comparison page used to be a thin spec table — Google flagged ~17 of
// them as "Crawled - currently not indexed" because they looked templated.
// This generator builds unique 2-paragraph editorial copy + an FAQ from the
// actual spec deltas of each pair. Because every pair has different weights,
// drops, stacks, and pricing, every page gets unique prose.
// ---------------------------------------------------------------------------
function fmtCategory(cat: string): string {
  return cat.replace(/_/g, " ").toLowerCase();
}

function fmtOz(n: number | null | undefined): string {
  return n != null ? `${n} oz` : "—";
}

function describeStack(s: ComparisonShoe): string {
  if (s.heelStackHeight && s.forefootStackHeight) {
    return `${s.heelStackHeight}mm/${s.forefootStackHeight}mm`;
  }
  return "stack not listed";
}

function generateComparisonNarrative(s1: ComparisonShoe, s2: ComparisonShoe): string {
  // Names interpolated into HTML — must be escaped because brand/model come
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
      `The ${n1} and the ${n2} sit in the same ${cat1} bucket, so the question isn't <em>what</em> you'd use them for — it's which one matches your stride, your weekly mileage, and your budget.`
    );
  } else {
    framing.push(
      `The ${n1} (${cat1}) and the ${n2} (${cat2}) live in different parts of a runner's rotation. This comparison is most useful if you're deciding which slot to fill next — a versatile workhorse, a race-day weapon, or a recovery cruiser.`
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
      `the drop differs (${s1.heelToToeDrop}mm on the ${n1}, ${s2.heelToToeDrop}mm on the ${n2}) — higher-drop shoes tend to feel friendlier to heel strikers and tight calves, while lower drops favor a midfoot landing`
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
    p2 = `On paper the two shoes are remarkably close — same category, similar weight, similar drop. The buying decision comes down to fit, brand history, and which one feels better on a short test run.`;
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
        a: `Yes — both the ${n1} and the ${n2} use a carbon plate, so they're built primarily for race day and key workouts rather than daily mileage.`,
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
    a: `Yes — many runners pair complementary shoes like these to spread load across different muscles and tendons. Use our <a href="/tools/rotation-planner">rotation planner</a> to build a mileage split that fits your schedule.`,
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
        // Strip HTML for the schema text — keep prose only.
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
  // Spec-driven editorial copy — unique per pair, helps Google index the page
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

  // Per-shoe deep links back to the shoe detail pages — gives Google clear
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
            ${comparison.shoe1 ? `<li>${shoeLink(comparison.shoe1)} — full specs, AI insights, and verdict.</li>` : ''}
            ${comparison.shoe2 ? `<li>${shoeLink(comparison.shoe2)} — full specs, AI insights, and verdict.</li>` : ''}
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
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

export function renderHomepage(): string {
  const content = homepageContent;
  const meta: PageMeta = {
    title: "RunAnalytics - AI Running Coach & Performance Analytics",
    description: "Chat with your personal AI Running Coach powered by GPT-5.1. Get instant training advice, race predictions, Runner Score (0-100), and comprehensive performance analytics. Free with Strava integration.",
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
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "ratingCount": "1250"
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
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
          <p>No signup required. Connect Strava for personalized insights.</p>
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

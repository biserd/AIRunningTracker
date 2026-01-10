import { getBlogPostBySlug, BlogPostContent } from './blogContent';

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

export function renderShoePage(slug: string, shoe: ShoeData): string {
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

interface ComparisonData {
  title: string;
  metaDescription: string | null;
  verdict: string | null;
  shoe1: {
    brand: string;
    model: string;
    weight: number | null;
    heelToToeDrop: number | null;
    category: string;
    price: number | null;
  } | null;
  shoe2: {
    brand: string;
    model: string;
    weight: number | null;
    heelToToeDrop: number | null;
    category: string;
    price: number | null;
  } | null;
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
  const head = generateHtmlHead(meta, url, structuredData);

  return `${head}
<body>
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
        
        <div class="ssr-cta">
          <h3>Not sure which is right for you?</h3>
          <p>Use our AI-powered shoe finder for personalized recommendations.</p>
          <a href="/tools/shoe-finder">Try Shoe Finder &rarr;</a>
        </div>
      </article>
    </main>
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

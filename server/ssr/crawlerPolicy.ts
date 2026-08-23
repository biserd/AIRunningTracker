const CRAWLER_PATTERNS = [
  // Traditional search engines
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baiduspider/i,
  /duckduckbot/i,
  /slurp/i,
  /applebot/i,
  /developers\.google\.com/i,
  /google-inspectiontool/i,
  // Social / link-preview bots
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterest/i,
  // SEO tools
  /semrush/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /rogerbot/i,
  /dataforseo/i,
  // OpenAI crawlers. OAI-AdsBot validates ad landing pages,
  // OAI-SearchBot supports search discovery, ChatGPT-User fetches pages at a
  // user's request, and GPTBot is the separately controllable training bot.
  /OAI-AdsBot/i,
  /OAI-SearchBot/i,
  /ChatGPT-User/i,
  /GPTBot/i,
  // Other AI crawlers
  /ClaudeBot/i,
  /PerplexityBot/i,
  /Applebot-Extended/i,
  /anthropic-ai/i,
  /cohere-ai/i,
  /meta-externalagent/i,
];

// Authenticated, account-specific, administrative, and OAuth paths should not
// be crawled even though their application handlers also enforce access.
export const PRIVATE_CRAWLER_PATHS = [
  "/api/",
  "/dashboard",
  "/admin",
  "/settings",
  "/billing",
  "/activities",
  "/activity/",
  "/performance",
  "/ml-insights",
  "/chat-history",
  "/year-recap",
  "/training-plans",
  "/coach/",
  "/coach-settings",
  "/runner-score/",
  "/audit-report",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/magic-link",
  "/mcp/oauth/",
] as const;

const EXPLICIT_OPENAI_CRAWLERS = [
  "OAI-AdsBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
] as const;

export function isCrawler(userAgent: string): boolean {
  return CRAWLER_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function isPrivateCrawlerPath(pathname: string): boolean {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return PRIVATE_CRAWLER_PATHS.some((path) => {
    if (path.endsWith("/")) return normalized.startsWith(path);
    return normalized === path || normalized.startsWith(`${path}/`);
  });
}

function crawlerGroup(userAgent: string): string {
  return [
    `User-agent: ${userAgent}`,
    "Allow: /",
    ...PRIVATE_CRAWLER_PATHS.map((path) => `Disallow: ${path}`),
  ].join("\n");
}

export function buildRobotsTxt(baseUrl = "https://aitracker.run"): string {
  const groups = [
    ...EXPLICIT_OPENAI_CRAWLERS.map(crawlerGroup),
    crawlerGroup("*"),
  ];
  return [
    "Content-Signal: ai-train=yes, search=yes, ai-input=yes",
    "",
    groups.join("\n\n"),
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join("\n");
}


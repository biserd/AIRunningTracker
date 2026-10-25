import type { Express } from 'express';
import { toolsContent } from './toolsContent';
import { authMarkdown } from '../mcp/discovery';

// An allowlist, not a generic response converter: authenticated pages and APIs
// must never become public via content negotiation or a shared cache.
export function publicMarkdown(path: string): string | null {
  if (path === '/') return `# RunAnalytics
Your AI running coach, wherever you run. Talk by voice or chat, continue on WhatsApp, and review guidance based on your synced Strava runs. The iOS/iPad app is coming soon.

## Explore
- [Features](https://aitracker.run/features)
- [Current trial and subscription terms](https://aitracker.run/pricing)
- [iOS and iPad app](https://aitracker.run/ios-app)
- [Running tools](https://aitracker.run/tools)
- [Shoe comparisons](https://aitracker.run/tools/shoes/compare)
- [MCP documentation](https://aitracker.run/developers/mcp)

## Privacy and access
Public shoe research is read-only. Private runner analytics requires authentication and explicit consent. See [Privacy](https://aitracker.run/privacy) and [agent authentication](https://aitracker.run/auth.md).
`;
  if (path === '/developers/mcp') return authMarkdown;
  if (path === '/tools') return '# Free running tools\n\n' + toolsContent.map(t => `- [${t.title}](https://aitracker.run/tools/${t.slug}): ${t.description}`).join('\n');
  const tool = toolsContent.find(t => path === `/tools/${t.slug}`);
  if (!tool) return null;
  return `# ${tool.title}\n\n${tool.description}\n\n## How it works\n${tool.howItWorks}\n\n${tool.features.map(f => `- ${f}`).join('\n')}\n\n## Questions\n${(tool.faq || []).map(f => `### ${f.question}\n${f.answer}`).join('\n\n')}\n\n[Open the interactive calculator](https://aitracker.run/tools/${tool.slug})\n`;
}

export function registerPublicMarkdown(app: Express) {
  app.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next();
    const markdown = publicMarkdown(req.path);
    if (!markdown) return next();
    res.vary('Accept');
    // HTML wins for */* and normal browsers; honor explicit media preferences.
    if (req.accepts(['html', 'text/markdown']) !== 'text/markdown') return next();
    res.set({ 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' });
    res.append('Link', `<https://aitracker.run${req.path}>; rel="canonical"`);
    return res.type('text/markdown').send(markdown);
  });
}

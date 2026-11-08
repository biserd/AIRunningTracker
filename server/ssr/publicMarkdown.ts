import type { Express } from 'express';
import { toolsContent } from './toolsContent';
import { authMarkdown } from '../mcp/discovery';
import { runningSources } from '../../shared/runningSources';

// An allowlist, not a generic response converter: authenticated pages and APIs
// must never become public via content negotiation or a shared cache.
export function publicMarkdown(path: string): string | null {
  if (path === '/') return `# RunAnalytics
Your AI running coach, wherever you run. Connect Strava for analytics and eligible voice, chat and WhatsApp coaching. Connect Garmin directly for new run summaries and optional health and sleep trends with separate consent. Garmin and eligible Strava runs appear together on the dashboard and in Activities; clear matches count once. Garmin summaries remain outside AI coaching and Runner Score. The iOS/iPad app is coming soon.

## Explore
- [Garmin and Strava connections](https://aitracker.run/integrations)
- [Garmin Connect sync](https://aitracker.run/garmin)
- [Strava analytics](https://aitracker.run/strava)
- [Features](https://aitracker.run/features)
- [Current trial and subscription terms](https://aitracker.run/pricing)
- [iOS and iPad app](https://aitracker.run/ios-app)
- [Running tools](https://aitracker.run/tools)
- [Shoe comparisons](https://aitracker.run/tools/shoes/compare)
- [MCP documentation](https://aitracker.run/developers/mcp)

## Privacy and access
Public shoe research is read-only. Private runner analytics requires authentication and explicit consent. See [Privacy](https://aitracker.run/privacy) and [agent authentication](https://aitracker.run/auth.md).
`;
  const source = Object.values(runningSources).find(s => s.path === path);
  if (source) return `# ${source.headline}\n\n${source.intro}\n\n## Current scope\n${source.scope}\n\n## Setup\n${source.steps.map((s,i)=>`${i+1}. ${s.title}: ${s.text}`).join('\n')}\n\n## Questions\n${source.faqs.map(f=>`### ${f.question}\n${f.answer}`).join('\n\n')}\n\n[Compare connections](https://aitracker.run/integrations) · [Pricing](https://aitracker.run/pricing) · [Privacy](https://aitracker.run/privacy)\n`;
  if (path === '/integrations') return '# Garmin and Strava connections\n\n' + Object.values(runningSources).map(s=>`## [${s.name}](https://aitracker.run${s.path})\n${s.summary}\n\n${s.scope}`).join('\n\n');
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

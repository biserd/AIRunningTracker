import type { Express, Response } from 'express';
import { MCP_ISSUER, MCP_RESOURCE, MCP_PUBLIC_RESOURCE, MCP_SERVER_VERSION, MCP_SCOPE_NAMES } from './contract';

export const discoveryLinks = [
  `<${MCP_ISSUER}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
  `<${MCP_ISSUER}/.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/json"`,
  `<${MCP_ISSUER}/auth.md>; rel="service-doc"; type="text/markdown"`,
].join(', ');

// Server Card v1 discovery proposal. Runtime tools/list remains authoritative.
export function mcpServerCard(isPublic = false) {
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    name: `run.aitracker/${isPublic ? 'public-catalog' : 'runner-read-only'}`,
    title: isPublic ? 'RunAnalytics public running catalog' : 'RunAnalytics private runner analytics',
    description: isPublic ? 'Read-only running shoe catalog and public tool discovery. No runner data.' : 'Read-only runner analytics with explicit OAuth consent and an active Premium plan or trial.',
    version: MCP_SERVER_VERSION,
    websiteUrl: `${MCP_ISSUER}/developers/mcp`,
    remotes: [{ type: 'streamable-http', url: isPublic ? MCP_PUBLIC_RESOURCE : MCP_RESOURCE }],
  };
}

export const aiCatalog = {
  specVersion: '1.0',
  host: { displayName: 'RunAnalytics', documentationUrl: `${MCP_ISSUER}/developers/mcp` },
  entries: [
    { identifier: 'urn:air:aitracker.run:mcp:public-catalog', displayName: 'Public running catalog', type: 'application/mcp-server-card+json', url: `${MCP_PUBLIC_RESOURCE}/server-card`, description: 'Public read-only shoes and running tools; no login required.', representativeQueries: ['Compare two running shoes using verified catalog specifications.', 'Find a running pace or marathon fueling calculator.'] },
    { identifier: 'urn:air:aitracker.run:mcp:runner-read-only', displayName: 'Private runner analytics', type: 'application/mcp-server-card+json', url: `${MCP_RESOURCE}/server-card`, description: 'Scoped, read-only runner data. OAuth consent and active Premium or trial required.', representativeQueries: ['Summarize my recent running activity after I authorize access.', 'Read my current training plan and coaching insights.'] },
  ],
};

export const apiCatalog = { linkset: [MCP_PUBLIC_RESOURCE, MCP_RESOURCE].map(anchor => ({
  anchor,
  'service-desc': [{ href: `${anchor}/server-card`, type: 'application/json' }],
  'service-doc': [{ href: `${MCP_ISSUER}/developers/mcp`, type: 'text/html' }, { href: `${MCP_ISSUER}/auth.md`, type: 'text/markdown' }],
})) };

export const authMarkdown = `# RunAnalytics agent authentication

## Public access
Connect a Streamable HTTP MCP client to ${MCP_PUBLIC_RESOURCE}. No sign-in is needed for public shoe research and tool discovery. Call tools/list for the current tool schemas. Public access never includes runner data.

## Private runner data
Connect to ${MCP_RESOURCE}. Discover protected-resource metadata at ${MCP_ISSUER}/.well-known/oauth-protected-resource/mcp and authorization-server metadata at ${MCP_ISSUER}/.well-known/oauth-authorization-server.
Register a public OAuth client using /mcp/oauth/register with exact redirect URIs. Use authorization-code flow with PKCE S256, the exact resource ${MCP_RESOURCE}, and only the read scopes needed for the task. The runner signs in and explicitly approves consent in their browser. An active Premium subscription or trial is required.

Available scopes: ${MCP_SCOPE_NAMES.join(', ')}.

Send the resulting bearer access token only to the intended resource over HTTPS. Website session tokens, magic links and Strava tokens are not MCP credentials. Never request a runner's password or bypass consent. OAuth errors and rate limits must be respected; do not retry indefinitely.

## Revocation
Revoke through ${MCP_ISSUER}/mcp/oauth/revoke. Never store tokens in public URLs or logs.

## Limits
These MCP servers are read-only. They cannot create or edit plans, make payments, change subscriptions, or send messages. A2A, agent checkout and machine payment protocols are not offered.
`;

export function registerAgentDiscovery(app: Express) {
  app.use((req, res, next) => { if (req.method === 'GET' || req.method === 'HEAD') res.append('Link', discoveryLinks); next(); });
  const json = (value: object) => (_req: unknown, res: Response) => res.set({ 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' }).json(value);
  app.get(['/.well-known/ai-catalog.json', '/ai-catalog.json'], json(aiCatalog));
  app.get('/.well-known/api-catalog', (_req, res) => res.set({ 'Cache-Control': 'public, max-age=3600', 'Content-Type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"' }).send(JSON.stringify(apiCatalog)));
  app.get(['/.well-known/mcp/server-card.json', '/mcp/server-card'], json(mcpServerCard()));
  app.get('/mcp/public/server-card', json(mcpServerCard(true)));
  app.get('/auth.md', (_req, res) => res.set('Cache-Control', 'public, max-age=3600').type('text/markdown').send(authMarkdown));
}

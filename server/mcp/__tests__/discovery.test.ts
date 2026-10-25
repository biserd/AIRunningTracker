import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import express from 'express';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { aiCatalog, apiCatalog, mcpServerCard, registerAgentDiscovery } from '../discovery';
import { registerPublicMarkdown } from '../../ssr/publicMarkdown';
// Upstream schemas pinned on 2026-10-25:
// https://github.com/ards-project/ard-spec/blob/main/spec/schemas/ai-catalog.schema.json
// https://github.com/modelcontextprotocol/experimental-ext-server-card/blob/main/schema.json

test('AI catalog and MCP cards conform to upstream discovery schemas', () => {
  const ajv = new Ajv2020({ strict: false });
  addFormats(ajv);
  const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.schema.json`, import.meta.url), 'utf8'));
  const validateCatalog = ajv.compile(load('ai-catalog'));
  assert.ok(validateCatalog(aiCatalog), JSON.stringify(validateCatalog.errors));
  const validateCard = ajv.compile({ ...load('mcp-server-card'), $ref: '#/$defs/ServerCard' });
  for (const card of [mcpServerCard(), mcpServerCard(true)]) assert.ok(validateCard(card), JSON.stringify(validateCard.errors));
  assert.equal(apiCatalog.linkset.length, 2);
  assert.equal(mcpServerCard().remotes[0].url, 'https://aitracker.run/mcp');
  assert.equal(mcpServerCard(true).remotes[0].url, 'https://aitracker.run/mcp/public');
});

test('discovery serves JSON; Markdown negotiation is explicit and never includes private paths', async t => {
  const app = express();
  registerAgentDiscovery(app);
  registerPublicMarkdown(app);
  app.get('/', (_req,res) => res.type('html').send('<h1>Website</h1>'));
  app.use((_req,res) => res.status(404).send('Not found'));
  const server = app.listen(0, '127.0.0.1');
  t.after(() => server.close());
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as {port:number}).port;
  const get = (path:string, accept='*/*') => fetch(`http://127.0.0.1:${port}${path}`, {headers:{accept}});
  for (const path of ['/.well-known/ai-catalog.json', '/ai-catalog.json', '/mcp/server-card', '/mcp/public/server-card', '/.well-known/api-catalog']) {
    const r = await get(path); assert.equal(r.status,200); assert.match(r.headers.get('content-type')!,/json/); await r.json();
  }
  assert.match((await get('/')).headers.get('content-type')!, /html/);
  const markdown = await get('/', 'text/markdown');
  assert.match(markdown.headers.get('content-type')!, /text\/markdown/);
  assert.match(markdown.headers.get('vary')!, /Accept/);
  assert.match(markdown.headers.get('link')!, /api-catalog/);
  assert.match(await markdown.text(), /^# RunAnalytics/);
  assert.match((await get('/', 'text/markdown;q=0,text/html;q=1')).headers.get('content-type')!, /html/);
  for (const path of ['/dashboard','/api/activities','/coach','/auth','/api/auth/user']) assert.equal((await get(path,'text/markdown')).status,404);
  assert.match(await (await get('/auth.md')).text(), /explicitly approves consent/);
});

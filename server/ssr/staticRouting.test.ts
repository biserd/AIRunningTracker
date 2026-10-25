import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import React from 'react';
import { serveStatic } from '../vite';
(globalThis as any).React = React;

test('production static middleware preserves homepage SSR and returns real missing-resource statuses', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'runanalytics-ssr-'));
  await writeFile(join(dir, 'index.html'), '<html><head><title>Generic</title></head><body><div id="root"></div></body></html>');
  const app = express();
  serveStatic(app, dir);
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); await rm(dir, {recursive:true, force:true}); });
  await new Promise<void>(resolve => server.once('listening',resolve));
  const base = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const home = await fetch(base);
  assert.equal(home.status,200);
  assert.match(await home.text(), /<main>/);
  for (const path of ['/release-notes','/.well-known/unknown-resource','/ai-catalog.json']) {
    const result = await fetch(base + path);
    assert.equal(result.status,404);
    assert.match(result.headers.get('x-robots-tag')!,/noindex/);
  }
});

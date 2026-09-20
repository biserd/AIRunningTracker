import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import {
  Miniflare,
  convertV4MiniflareOptions,
} from "../../api-cloudflare/node_modules/miniflare/dist/src/index.js";

test("runner agent caches and isolates production context", async () => {
  const bundle = await build({
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    external: ["cloudflare:*", "node:*", "path"],
    stdin: {
      resolveDir: fileURLToPath(new URL("..", import.meta.url)),
      loader: "ts",
      contents: `
        export {RunnerCoachAgent} from './worker/runner-agent';
        const key='a'.repeat(64), fingerprint='b'.repeat(64);
        const snapshot={source:'production_account',today:'2026-09-20',goal:'test',days:[],activities:[]};
        export default {async fetch(request,env){
          const agent=env.RUNNER_COACH.getByName(key), now=1000;
          if(new URL(request.url).pathname==='/put')return Response.json(await agent.putSnapshot(key,fingerprint,snapshot,now,300));
          if(new URL(request.url).pathname==='/get')return Response.json(await agent.getSnapshot(key,fingerprint,now+1));
          if(new URL(request.url).pathname==='/wrong'){
            try {await agent.getSnapshot('c'.repeat(64),fingerprint,now+1);return new Response('unsafe',{status:500});}
            catch{return new Response('isolated');}
          }
          return new Response('missing',{status:404});
        }};`,
    },
  });
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      workers: [
        {
          name: "runner-agent-test",
          compatibilityDate: "2026-09-18",
          compatibilityFlags: ["nodejs_compat"],
          modules: true,
          script: bundle.outputFiles[0].text,
          durableObjects: {
            RUNNER_COACH: { className: "RunnerCoachAgent", useSQLite: true },
          },
        },
      ],
    }),
  );
  try {
    const put = await mf.dispatchFetch("https://test.local/put");
    const putText = await put.text();
    assert.equal(put.status, 200, putText);
    const cached = await (
      await mf.dispatchFetch("https://test.local/get")
    ).json();
    assert.equal(cached.source, "production_account");
    assert.equal(cached.goal, "test");
    assert.equal(
      await (await mf.dispatchFetch("https://test.local/wrong")).text(),
      "isolated",
    );
  } finally {
    await mf.dispose();
  }
});

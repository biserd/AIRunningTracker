// Diagnostic only: never print request headers, URLs, bearer tokens or bodies.
import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['apps/api-cloudflare/node_modules/wrangler/bin/wrangler.js',
  'tail', 'aitracker-main', '--format', 'json'], {stdio:['ignore','pipe','pipe']});
let buffer = '', depth = 0, quoted = false, escaped = false;
child.stdout.on('data', chunk => {
  for (const character of chunk.toString()) {
    if (!depth && character !== '{') continue;
    buffer += character;
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
    } else if (character === '"') quoted = true;
    else if (character === '{') depth++;
    else if (character === '}' && --depth === 0) {
      try {
        const record = JSON.parse(buffer);
        for (const log of record.logs ?? []) for (const message of log.message ?? []) {
          try {
            const detail = JSON.parse(message);
            if (['stripe_callback_rejected','stripe_webhook_failed'].includes(detail.event)) {
              const allowed = new Set(['event','failure','status','signaturePresent','responseClass']);
              console.log(JSON.stringify(Object.fromEntries(Object.entries(detail).filter(([key]) => allowed.has(key)))));
            }
          } catch { /* Ignore unrelated logs. */ }
        }
        const url = record.event?.request?.url;
        if (typeof url === 'string' && new URL(url).pathname.startsWith('/api/stripe/webhook/')) {
          console.log(JSON.stringify({event:'stripe_callback',status:record.event?.response?.status,outcome:record.outcome}));
        }
      } catch { /* Skip CLI metadata, never echo it. */ }
      buffer = '';
    }
    if (buffer.length > 2_000_000) { child.kill(); process.exitCode=1; }
  }
});
child.stderr.on('data', () => {});
child.on('exit', code => console.log(JSON.stringify({event:'tail_closed',code})));
setTimeout(() => child.kill(), 55_000);

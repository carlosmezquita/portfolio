// Keep public contact surfaces free of personal inbox addresses and mail links.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
for (const file of ['index.html', 'direction-b.html', 'contact.js', 'analytics.js', 'site.js', 'scripts/build_cv.py', 'contact-worker/worker.mjs', 'contact-worker/handler.mjs', 'contact-worker/wrangler.jsonc', 'analytics-worker/events.mjs', 'analytics-worker/worker.mjs', 'analytics-worker/wrangler.jsonc']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert(!/mailto:/i.test(source), `${file} exposes a mail link`);
  assert(!/[A-Z0-9._%+-]+@(?:gmail|hotmail|outlook|yahoo)\.[A-Z.]+/i.test(source), `${file} exposes a personal inbox`);
}
console.log('PASS: pages, client/server source, config and CV generator expose no personal inbox or mail links.');

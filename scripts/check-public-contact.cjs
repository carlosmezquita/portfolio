// Only the public hello alias may appear in mail links; private inboxes stay private.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const publicMailto = 'mailto:hello@carlosmezquita.dev';
function checkContact(source, file) {
  for (const match of source.matchAll(/\bmailto:[^\s"'<>`]*/gi)) {
    assert.equal(match[0], publicMailto, `${file} exposes an unapproved mail link`);
  }
  assert(!/[A-Z0-9._%+-]+@(?:gmail|hotmail|outlook|yahoo)\.[A-Z.]+/i.test(source), `${file} exposes a personal inbox`);
}

// Regression checks: an alias must not hide a different recipient or a private CC.
assert.doesNotThrow(() => checkContact(`<a href="${publicMailto}">Email</a>`, 'fixture'));
for (const source of [
  '<a href="mailto:private@example.org">Email</a>',
  `<a href="${publicMailto}?cc=private@example.org">Email</a>`,
  '<a href="MAILTO:private@example.org">Email</a>',
  '<a href="mailto:">Email</a>',
  'private@gmail.com',
]) assert.throws(() => checkContact(source, 'fixture'));
for (const file of ['index.html', 'direction-b.html', 'contact.js', 'analytics.js', 'site-content.js', 'site.js', 'scripts/build_cv.py', 'contact-worker/worker.mjs', 'contact-worker/handler.mjs', 'contact-worker/wrangler.jsonc', 'analytics-worker/events.mjs', 'analytics-worker/content.mjs', 'analytics-worker/worker.mjs', 'analytics-worker/wrangler.jsonc', 'dashboard-worker/auth.mjs', 'dashboard-worker/handler.mjs', 'dashboard-worker/admin.mjs', 'dashboard-worker/report.mjs']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  checkContact(source, file);
}

for (const file of ['privacy.html', 'privacy.js', 'performance-analytics.js', 'analytics-worker/traffic.mjs', 'dashboard-worker/traffic-report.mjs']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  checkContact(source, file);
}
console.log('PASS: public contact surfaces allow only the hello alias in mail links and expose no personal inbox.');

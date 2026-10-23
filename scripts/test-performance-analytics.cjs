const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function client({ allowed = true, missing = false, visibility = 'visible', existing = false, search = '', hash = '', appendFails = false, optedOut = false, gpc = false, dnt } = {}) {
  const scripts = []; const listeners = {};
  const document = {
    visibilityState: visibility, querySelector: () => existing ? {} : null,
    addEventListener: (name, handler) => { listeners[name] = handler; },
    createElement: () => ({ attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } }),
    head: { append(script) { if (appendFails) throw new Error('blocked'); scripts.push(script); } },
  };
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '..', 'performance-analytics.js'), 'utf8'), {
    window: missing ? {} : { localStorage: { getItem: () => optedOut ? '1' : null }, portfolioAnalytics: { page: () => allowed ? '/' : null } }, document, location: { search, hash }, navigator: { globalPrivacyControl: gpc, doNotTrack: dnt },
  });
  return { scripts, document, show() { document.visibilityState = 'visible'; listeners.visibilitychange(); } };
}
test('manual performance beacon loads once using the shared privacy gate and disables SPA measurement', () => {
  const c = client(); c.show();
  assert.equal(c.scripts.length, 1);
  assert.equal(c.scripts[0].src, 'https://static.cloudflareinsights.com/beacon.min.js');
  assert.equal(c.scripts[0].type, 'module');
  assert.equal(JSON.parse(c.scripts[0].attributes['data-cf-beacon']).spa, false);
});
test('opt-outs/privacy signals, absent tracker, existing beacon and private URL values prevent loading', () => {
  for (const options of [{ allowed: false }, { missing: true }, { existing: true }, { search: '?secret=private' }, { hash: '#private-value' }]) assert.equal(client(options).scripts.length, 0);
});
test('hidden pages wait for visibility and blocked performance loading never throws', () => {
  const c = client({ visibility: 'hidden' }); assert.equal(c.scripts.length, 0); c.show(); assert.equal(c.scripts.length, 1);
  assert.doesNotThrow(() => client({ appendFails: true }));
});

test('a cached older tracker cannot bypass explicit opt-out, GPC or DNT', () => {
  for (const options of [{ optedOut: true }, { gpc: true }, { dnt: '1' }]) assert.equal(client({ allowed: true, ...options }).scripts.length, 0);
});

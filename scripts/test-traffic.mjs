import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { handleTraffic, recordTraffic } from '../analytics-worker/traffic.mjs';
import { readReport, renderReport } from '../dashboard-worker/report.mjs';
import worker from '../analytics-worker/worker.mjs';

const origin = 'https://carlosmezquita.dev';
const view = { page: '/', type: 'view', values: { source: 'github', viewport: 'large' } };
function fixture() {
  const sql = new DatabaseSync(':memory:');
  for (const file of fs.readdirSync(new URL('../analytics-worker/migrations/', import.meta.url)).sort()) {
    sql.exec(fs.readFileSync(new URL(`../analytics-worker/migrations/${file}`, import.meta.url), 'utf8'));
  }
  const db = { prepare(query) {
    const bound = (args = []) => {
      const stmt = sql.prepare(query);
      const values = Object.fromEntries(args.map((value, i) => [String(i + 1), value]));
      const invoke = method => args.length ? stmt[method](values) : stmt[method]();
      return { run: async () => ({ success: true, meta: invoke('run') }), all: async () => ({ success: true, results: invoke('all') }) };
    };
    return { ...bound(), bind: (...args) => bound(args) };
  } };
  let limitCalls = 0;
  const env = { EVENTS_DB: db, EVENT_ORIGINS: origin, EVENT_LIMITER: { limit: async () => { limitCalls++; return { success: true }; } } };
  const request = (data = view, headers = {}) => {
    const req = new Request('https://events.example/api/traffic', { method: 'POST', headers: {
      Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1',
      'User-Agent': 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36', ...headers,
    }, body: JSON.stringify(data) });
    Object.defineProperty(req, 'cf', { value: { country: 'GB', city: 'PRIVATE CITY' } });
    return req;
  };
  return { sql, db, env, request, limitCalls: () => limitCalls, rows: () => sql.prepare('SELECT * FROM traffic_counts').all() };
}

test('page views fan out to separate marginal totals with no raw identifiers or joined dimensions', async () => {
  const f = fixture();
  assert.equal((await worker.fetch(f.request(), f.env)).status, 202);
  assert.equal((await handleTraffic(f.request(), f.env)).status, 202);
  assert.equal(f.rows().length, 7);
  assert(f.rows().every(row => row.count === 2));
  assert.deepEqual(Object.keys(f.rows()[0]).sort(), ['bucket', 'count', 'day', 'metric', 'page']);
  const stored = JSON.stringify(f.rows());
  for (const value of ['192.0.2.1', 'Mozilla', 'PRIVATE CITY', 'session', 'visitor']) assert(!stored.includes(value));
  assert.equal(f.sql.prepare("SELECT bucket FROM traffic_counts WHERE metric='country'").get().bucket, 'GB');
  f.sql.close();
});

test('reject arbitrary properties, URLs, identifiers, unknown dimensions, wrong types and oversized streamed bodies', async () => {
  const f = fixture();
  for (const data of [null, [], { ...view, email: 'SECRET' }, { ...view, page: '/?email=SECRET' },
    { ...view, values: { source: 'https://secret.example', viewport: 'large' } },
    { ...view, values: { ...view.values, visitor: 'SECRET' } },
    { ...view, type: '__proto__' }, { ...view, type: 'toString' },
    { ...view, type: 'scroll', values: 25 }, { ...view, type: 'scroll', values: '26' },
    { ...view, values: 'x'.repeat(513) }]) {
    assert.equal((await handleTraffic(f.request(data), f.env)).status, 400);
  }
  const streamed = new Request('https://events.example/api/traffic', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', 'Content-Length': '2' },
    body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('x'.repeat(513))); controller.close(); } }), duplex: 'half',
  });
  assert.equal((await handleTraffic(streamed, f.env)).status, 400);
  assert.equal(f.rows().length, 0);
  f.sql.close();
});

test('origin, method, privacy headers, bot filtering and limiter checks prevent writes', async () => {
  const f = fixture();
  assert.equal((await handleTraffic(f.request(view, { Origin: 'https://evil.example' }), f.env)).status, 403);
  assert.equal((await handleTraffic(f.request(view, { 'Content-Type': 'text/plain' }), f.env)).status, 415);
  for (const headers of [{ DNT: '1' }, { 'Sec-GPC': '1' }]) assert.equal((await handleTraffic(f.request(view, headers), f.env)).status, 202);
  assert.equal(f.limitCalls(), 0);
  assert.equal((await handleTraffic(f.request(view, { 'User-Agent': 'Googlebot' }), f.env)).status, 202);
  const missingIp = f.request(); missingIp.headers.delete('CF-Connecting-IP');
  assert.equal((await handleTraffic(missingIp, f.env)).status, 403);
  assert.equal((await handleTraffic(new Request('https://events.example/api/traffic', { headers: { Origin: origin } }), f.env)).status, 405);
  const preflight = await handleTraffic(new Request('https://events.example/api/traffic', { method: 'OPTIONS', headers: { Origin: origin } }), f.env);
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  f.env.EVENT_LIMITER.limit = async () => ({ success: false });
  assert.equal((await handleTraffic(f.request(), f.env)).status, 429);
  assert.equal(f.rows().length, 0);
  f.sql.close();
});

test('daily budget admits the final whole measurement and resets at UTC midnight independently of action counts', async () => {
  const f = fixture(); const now = new Date('2026-10-23T23:59:00Z');
  await recordTraffic(f.db, view, f.request(), now);
  f.sql.exec("UPDATE traffic_counts SET count=4999 WHERE metric='requests'");
  assert.equal(await recordTraffic(f.db, view, f.request(), now), true);
  assert.equal(await recordTraffic(f.db, view, f.request(), now), false);
  assert.equal(f.sql.prepare("SELECT count FROM traffic_counts WHERE metric='views'").get().count, 2);
  assert.equal(await recordTraffic(f.db, view, f.request(), new Date('2026-10-24T00:00:00Z')), true);
  f.sql.close();
});

test('partial SQL failure rolls back every dimension and never acknowledges successful storage', async () => {
  const f = fixture();
  f.sql.exec("CREATE TRIGGER fail_country BEFORE INSERT ON traffic_counts WHEN NEW.metric='country' BEGIN SELECT RAISE(ABORT, 'SECRET'); END");
  const result = await handleTraffic(f.request(), f.env);
  assert.equal(result.status, 503); assert.equal(await result.text(), '');
  assert.equal(f.rows().length, 0);
  f.sql.close();
});

test('traffic retention and bounded report totals preserve existing actions and flag capped days', async () => {
  const f = fixture();
  await recordTraffic(f.db, view, f.request(), new Date());
  f.sql.exec("UPDATE traffic_counts SET count=5000 WHERE metric='requests'");
  f.sql.exec("INSERT INTO traffic_counts VALUES(date('now','-90 days'),'/', 'views','all',3)");
  f.sql.exec("INSERT INTO traffic_counts VALUES(date('now','+1 day'),'/', 'views','all',9)");
  f.sql.exec("INSERT INTO event_counts VALUES(date('now'),'cv_download','cv','/',2)");
  await worker.scheduled({}, f.env);
  const report = await readReport(f.db, 7);
  assert.equal(report.traffic.views, 1); assert.equal(report.totals.cv_download, 2);
  assert.equal(report.traffic.capped.length, 1);
  assert.equal(report.traffic.groups.source[0].bucket, 'github');
  const html = renderReport(report);
  for (const value of ['Traffic and engagement', 'Approximate countries', 'Visible-time milestones', 'Those days are incomplete', '2 recorded actions']) assert(html.includes(value));
  assert(!f.rows().some(row => row.count === 3));
  f.sql.close();
});

function client({ visibility = 'visible', referrer = 'https://github.com/user?secret=PRIVATE#PRIVATE', stored, gpc = false, throwingStorage = false } = {}) {
  const docListeners = {}; const windowListeners = {}; const calls = []; const intervals = new Map();
  let clock = 0; let id = 0;
  const storage = { getItem() { if (throwingStorage) throw new Error('blocked'); return stored; } };
  const window = { innerWidth: 1280, innerHeight: 800, scrollY: 0, localStorage: storage, addEventListener: (event, handler) => { windowListeners[event] = handler; } };
  const document = { visibilityState: visibility, readyState: 'complete', referrer, documentElement: { scrollHeight: 2800 }, addEventListener: (event, handler) => { docListeners[event] = handler; } };
  vm.runInNewContext(fs.readFileSync(new URL('../analytics.js', import.meta.url), 'utf8'), {
    window, document, URL, location: { hostname: 'carlosmezquita.dev', pathname: '/', origin, href: `${origin}/?PRIVATE#PRIVATE` },
    navigator: { globalPrivacyControl: gpc }, performance: { now: () => clock, getEntriesByType: () => [{ loadEventEnd: 1250 }] },
    setInterval: handler => { intervals.set(++id, handler); return id; }, clearInterval: value => intervals.delete(value), setTimeout: fn => fn(),
    fetch: (url, options) => { calls.push({ url, options, data: JSON.parse(options.body) }); return Promise.resolve(); },
  });
  return { calls, window, document, docListeners, tick(seconds) { for (let i = 0; i < seconds; i++) { clock += 1000; for (const fn of intervals.values()) fn(); } },
    visible(value) { document.visibilityState = value; docListeners.visibilitychange(); },
    optOut() { stored = '1'; }, scroll(y) { window.scrollY = y; docListeners.scroll({ isTrusted: true }); }, intervals };
}

test('client sends only fixed categories; view is once per visible load and referrer/query secrets never leave the browser', () => {
  const c = client();
  assert.equal(c.calls.length, 2);
  assert.deepEqual(c.calls[0].data, view);
  assert.equal(c.calls[1].data.type, 'load'); assert.equal(c.calls[1].data.values, 'moderate');
  c.visible('hidden'); c.visible('visible'); assert.equal(c.calls.length, 2);
  assert(!JSON.stringify(c.calls).includes('PRIVATE'));
  assert(c.calls.every(({ options }) => options.credentials === 'omit' && options.referrerPolicy === 'no-referrer' && options.keepalive));
  for (const referrer of ['https://github.com.evil.example/', 'https://evil.example/?github.com']) assert.equal(client({ referrer }).calls[0].data.values.source, 'other');
});

test('visible time excludes background time, milestones are bounded and scrolling thresholds count once', () => {
  const c = client();
  c.tick(5); c.visible('hidden'); c.tick(60); c.visible('visible'); c.tick(5);
  assert.deepEqual(c.calls.filter(x => x.data.type === 'visible').map(x => x.data.values), ['10']);
  c.tick(50); assert.equal(c.intervals.size, 0);
  assert.deepEqual(c.calls.filter(x => x.data.type === 'visible').map(x => x.data.values), ['10', '30', '60']);
  c.scroll(1600); c.scroll(1600); c.scroll(2000);
  assert.deepEqual(c.calls.filter(x => x.data.type === 'scroll').map(x => x.data.values), ['25', '50', '75', '100']);
});

test('prerendered views wait for visibility and both privacy preferences and late opt-outs stop collection', () => {
  const hidden = client({ visibility: 'hidden' }); assert.equal(hidden.calls.length, 0);
  hidden.visible('visible'); assert.equal(hidden.calls.length, 2);
  for (const options of [{ stored: '1' }, { gpc: true }]) {
    const c = client(options); c.tick(65); c.scroll(2000); assert.equal(c.calls.length, 0);
    assert.equal(c.window.portfolioAnalytics.page(), null);
  }
  const c = client(); c.optOut(); c.tick(65); c.scroll(2000);
  assert.equal(c.calls.length, 2); assert.equal(c.window.portfolioAnalytics.page(), null);
  assert.doesNotThrow(() => client({ throwingStorage: true }));
});

test('privacy choice writes only on explicit action, persists opt-out and never overrides GPC', () => {
  let stored = null; let writes = 0; let handler;
  const status = { textContent: '' };
  const buttons = ['off', 'on'].map(choice => ({ dataset: { analyticsChoice: choice }, addEventListener(_event, callback) { this.click = callback; } }));
  vm.runInNewContext(fs.readFileSync(new URL('../privacy.js', import.meta.url), 'utf8'), {
    navigator: { globalPrivacyControl: true }, window: { addEventListener(_event, callback) { handler = callback; } },
    localStorage: { getItem: () => stored, setItem(key, value) { assert.equal(key, 'portfolio.analytics.disabled'); stored = value; writes++; }, removeItem() { stored = null; writes++; } },
    document: { querySelector: () => status, querySelectorAll: () => buttons },
  });
  assert.equal(writes, 0); assert.match(status.textContent, /privacy signal disables/);
  buttons[0].click(); assert.equal(stored, '1'); assert.match(status.textContent, /disabled in this browser/);
  buttons[1].click(); assert.equal(stored, null); assert.match(status.textContent, /privacy signal disables/);
  stored = '1'; handler(); assert.match(status.textContent, /disabled in this browser/);
});

test('privacy choice explains storage failure instead of claiming a saved opt-out', () => {
  const status = { textContent: '' }; let click;
  vm.runInNewContext(fs.readFileSync(new URL('../privacy.js', import.meta.url), 'utf8'), {
    navigator: {}, window: { addEventListener() {} },
    localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } },
    document: { querySelector: () => status, querySelectorAll: () => [{ dataset: { analyticsChoice: 'off' }, addEventListener(_event, callback) { click = callback; } }] },
  });
  assert.match(status.textContent, /blocks preference storage/);
  click(); assert.match(status.textContent, /could not be saved/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { handleEvent, recordEvent } from '../analytics-worker/events.mjs';
import worker from '../analytics-worker/worker.mjs';

const origin = 'https://carlosmezquita.dev';
const valid = { event: 'cv_download', target: 'cv', page: '/' };
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(fs.readFileSync(new URL('../analytics-worker/migrations/0001_events.sql', import.meta.url), 'utf8'));
  sql.exec(fs.readFileSync(new URL('../analytics-worker/migrations/0002_admin.sql', import.meta.url), 'utf8'));
  const db = { prepare: (query) => ({
    bind: (...args) => ({ run: async () => ({ success: true, meta: sql.prepare(query).run(Object.fromEntries(args.map((value, index) => [String(index + 1), value]))) }) }),
    run: async () => ({ success: true, meta: sql.prepare(query).run() }),
  }) };
  const env = { EVENTS_DB: db, EVENT_ORIGINS: origin, EVENT_LIMITER: { limit: async () => ({ success: true }) } };
  const request = (data = valid, headers = {}) => new Request('https://events.example/api/events', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers }, body: JSON.stringify(data),
  });
  return { sql, db, env, request, rows: () => sql.prepare('SELECT * FROM event_counts').all() };
}

test('accepted events increment daily aggregates with no visitor data columns', async () => {
  const f = fixture();
  assert.equal((await handleEvent(f.request(), f.env)).status, 202);
  assert.equal((await handleEvent(f.request(), f.env)).status, 202);
  const [row] = f.rows();
  assert.equal(row.count, 2);
  assert.equal(row.day, new Date().toISOString().slice(0, 10));
  assert.deepEqual(Object.keys(row).sort(), ['count', 'day', 'event', 'page', 'target']);
  assert.equal(f.sql.prepare('SELECT total FROM events_last_30_days').get().total, 2);
  f.sql.close();
});

test('reject arbitrary fields, raw URLs, forged successes, prototype names and mismatched targets', async () => {
  const f = fixture();
  for (const data of [
    { ...valid, email: 'secret@example.net' }, { ...valid, event: 'contact_success', target: 'contact' },
    { ...valid, page: '/?email=secret@example.net' }, { ...valid, target: 'https://github.com/private' },
    { ...valid, event: '__proto__' }, { ...valid, event: 'toString' }, { ...valid, target: ['cv'] },
    null, [], 'cv_download',
  ]) assert.equal((await handleEvent(f.request(data), f.env)).status, 400);
  assert.equal(f.rows().length, 0);
  assert.equal(await recordEvent(f.db, '__proto__', 'cv', '/'), false);
  f.sql.close();
});

test('origin, JSON, streamed size, rate limit and privacy preference checks precede writes', async () => {
  const f = fixture();
  assert.equal((await handleEvent(f.request(valid, { Origin: 'https://evil.example' }), f.env)).status, 403);
  assert.equal((await handleEvent(f.request(valid, { 'Content-Type': 'text/plain' }), f.env)).status, 415);
  assert.equal((await handleEvent(f.request({ ...valid, extra: 'x'.repeat(513) }), f.env)).status, 400);
  for (const headers of [{ 'Sec-GPC': '1' }, { DNT: '1' }]) assert.equal((await handleEvent(f.request(valid, headers), f.env)).status, 202);
  const noIp = f.request(); noIp.headers.delete('CF-Connecting-IP');
  assert.equal((await handleEvent(noIp, f.env)).status, 403);
  f.env.EVENT_LIMITER.limit = async () => ({ success: false });
  assert.equal((await handleEvent(f.request(), f.env)).status, 429);
  assert.equal(f.rows().length, 0);
  f.sql.close();
});

test('daily cap applies atomically across different event types and server successes', async () => {
  const f = fixture();
  const now = new Date('2026-10-22T23:59:00Z');
  await recordEvent(f.db, 'cv_download', 'cv', '/', now);
  f.sql.exec('UPDATE event_counts SET count = 4999');
  assert.equal(await recordEvent(f.db, 'contact_success', 'contact', '/', now), true);
  assert.equal(await recordEvent(f.db, 'github_click', 'profile', '/', now), false);
  assert.equal(f.sql.prepare('SELECT SUM(count) AS n FROM event_counts').get().n, 5000);
  assert.equal(await recordEvent(f.db, 'github_click', 'profile', '/', new Date('2026-10-23T00:00:00Z')), true);
  f.sql.close();
});

test('retention removes counters older than 90 UTC calendar days', async () => {
  const f = fixture();
  f.sql.exec("INSERT INTO event_counts VALUES (date('now','-90 days'),'cv_download','cv','/',1), (date('now','-89 days'),'cv_download','cv','/',1)");
  await worker.scheduled({}, f.env);
  assert.equal(f.rows().length, 1);
  f.sql.close();
});

test('database failures return a non-sensitive error; preflight never writes', async () => {
  const f = fixture();
  const options = new Request('https://events.example/api/events', { method: 'OPTIONS', headers: { Origin: origin } });
  const preflight = await handleEvent(options, f.env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  f.env.EVENTS_DB.prepare = () => { throw new Error('private provider detail'); };
  const response = await handleEvent(f.request(), f.env);
  assert.equal(response.status, 503);
  assert.equal(await response.text(), '');
  f.sql.close();
});

function client({ hostname = 'carlosmezquita.dev', pathname = '/', dnt, gpc, fetchError = false } = {}) {
  const listeners = {}; const calls = []; const window = {};
  const location = { hostname, pathname, href: `https://${hostname}${pathname}`, origin: `https://${hostname}` };
  vm.runInNewContext(fs.readFileSync(new URL('../analytics.js', import.meta.url), 'utf8'), {
    window, location, navigator: { doNotTrack: dnt, globalPrivacyControl: gpc }, URL,
    document: { addEventListener: (name, handler) => { listeners[name] = handler; } },
    fetch: (...args) => { calls.push(args); return fetchError ? Promise.reject(new Error('blocked')) : Promise.resolve(); },
  });
  const click = (href, project, trusted = true) => {
    const link = { href: new URL(href, location.href).href, closest: (selector) => selector === 'a[href]' ? link : project ? { id: project } : null };
    listeners.click({ isTrusted: trusted, target: link });
  };
  const input = (matches = true, trusted = true) => listeners.input({ isTrusted: trusted, target: { matches: () => matches, value: 'SECRET MUST NOT LEAK' } });
  return { calls, window, click, input, payloads: () => calls.map(([, options]) => JSON.parse(options.body)) };
}

test('client classifies downloads, project and GitHub clicks without cancelling navigation', () => {
  const c = client();
  c.click('./Carlos-Mezquita-CV.pdf'); c.click('https://github.com/carlosmezquita');
  c.click('https://github.com/carlosmezquita/surfay'); c.click('./img/surfay-forecast.png', 'surfay');
  c.click('#contact', 'urbot'); c.click('https://unrelated.example', 'surfay');
  c.click('https://github.com/unrelated'); c.click('./Carlos-Mezquita-CV.pdf', null, false);
  assert.deepEqual(c.payloads(), [
    { event: 'cv_download', target: 'cv', page: '/' }, { event: 'github_click', target: 'profile', page: '/' },
    { event: 'github_click', target: 'surfay', page: '/' }, { event: 'project_click', target: 'surfay', page: '/' },
    { event: 'project_click', target: 'urbot', page: '/' },
  ]);
  assert(c.calls.every(([, options]) => options.keepalive && options.credentials === 'omit' && options.referrerPolicy === 'no-referrer'));
});

test('contact starts count once on real input, never on focus or honeypot input', () => {
  const c = client(); c.input(false); c.input(true, false); c.input(); c.input();
  assert.deepEqual(c.payloads(), [{ event: 'contact_start', target: 'contact', page: '/' }]);
  assert(!JSON.stringify(c.calls).includes('SECRET'));
});

test('privacy signals, preview/local hosts and unknown paths disable all client collection', () => {
  for (const options of [{ dnt: '1' }, { gpc: true }, { hostname: 'localhost' }, { hostname: 'portfolio-review-20261022.cadeiraai.workers.dev' }, { pathname: '/private' }]) {
    const c = client(options); c.click('./Carlos-Mezquita-CV.pdf'); c.input();
    assert.equal(c.calls.length, 0); assert.equal(c.window.portfolioAnalytics.page(), null);
  }
});

test('blocked telemetry is swallowed and click volume is bounded', async () => {
  const c = client({ fetchError: true });
  for (let i = 0; i < 40; i++) c.click('./Carlos-Mezquita-CV.pdf');
  await Promise.resolve();
  assert.equal(c.calls.length, 30);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { configurationReady, verifyOwner } from '../auth.mjs';
import { handleDashboard } from '../handler.mjs';
import { readReport, renderReport, rangeDays } from '../report.mjs';

const pair = await generateKeyPair('RS256');
const jwk = { ...await exportJWK(pair.publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' };
const keys = createLocalJWKSet({ keys: [jwk] });
const env = {
  ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com', ACCESS_AUD: 'a'.repeat(64),
  OWNER_EMAIL: 'owner@example.org', DASHBOARD_HOST: 'admin.carlosmezquita.dev',
};
const claims = { email: env.OWNER_EMAIL, type: 'app' };
const sign = (payload = claims, options = {}) => new SignJWT(payload)
  .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
  .setIssuer(options.issuer || `https://${env.ACCESS_TEAM_DOMAIN}`)
  .setAudience(options.audience || env.ACCESS_AUD).setSubject('test-owner').setIssuedAt()
  .setExpirationTime(options.expiration || '10m').sign(options.privateKey || pair.privateKey);
function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(fs.readFileSync(new URL('../../analytics-worker/migrations/0001_events.sql', import.meta.url), 'utf8'));
  sql.exec(fs.readFileSync(new URL('../../analytics-worker/migrations/0003_traffic.sql', import.meta.url), 'utf8'));
  return { sql, binding: { prepare: query => ({ bind: (...args) => ({ all: async () => ({ success: true, results: sql.prepare(query).all(Object.fromEntries(args.map((value, index) => [String(index + 1), value]))) }) }) }) } };
}
const request = (token, path = '/', options = {}) => new Request(`https://${env.DASHBOARD_HOST}${path}`, { ...options, headers: { ...(token ? { 'Cf-Access-Jwt-Assertion': token } : {}), ...options.headers } });

test('only a cryptographically valid app token for the configured owner is accepted', async () => {
  assert.equal(await verifyOwner(await sign(), env, keys), true);
  assert.equal(await verifyOwner(await sign({ ...claims, email: 'OWNER@example.org' }), env, keys), true);
  for (const token of [
    await sign({ ...claims, email: 'other@example.org' }), await sign({ ...claims, email: undefined }),
    await sign({ ...claims, type: 'service' }), await sign(claims, { issuer: 'https://attacker.example' }),
    await sign(claims, { audience: 'b'.repeat(64) }), await sign(claims, { expiration: Math.floor(Date.now() / 1000) - 60 }),
    '', 'not.a.jwt', `${'x'.repeat(16001)}`,
  ]) assert.equal(await verifyOwner(token, env, keys), false);
  const otherPair = await generateKeyPair('RS256');
  assert.equal(await verifyOwner(await sign(claims, { privateKey: otherPair.privateKey }), env, keys), false);
  const unsigned = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.`;
  assert.equal(await verifyOwner(unsigned, env, keys), false);
});

test('missing, invalid or attacker-controlled Access config always fails closed', async () => {
  const token = await sign();
  for (const change of [{ OWNER_EMAIL: '' }, { ACCESS_AUD: '' }, { ACCESS_TEAM_DOMAIN: 'attacker.example' }, { ACCESS_TEAM_DOMAIN: 'good.cloudflareaccess.com/evil' }]) {
    assert.equal(configurationReady({ ...env, ...change }), false);
    assert.equal(await verifyOwner(token, { ...env, ...change }, keys), false);
  }
});

test('unauthenticated, forged-header and wrong-owner requests cannot reach D1 or render metrics', async () => {
  let queried = false;
  const configured = { ...env, EVENTS_DB: { prepare: () => { queried = true; throw new Error('should not query'); } } };
  for (const req of [request(), request(null, '/', { headers: { 'Cf-Access-Authenticated-User-Email': env.OWNER_EMAIL } }), request('forged'), request(await sign({ ...claims, email: 'other@example.org' })), request(null, '/requests'), request(null, '/content'), request(null, '/content', { method: 'POST' }), request(null, '/dashboard.css')]) {
    const response = await handleDashboard(req, configured, '', keys);
    assert.equal(response.status, 403);
    assert(!String(await response.text()).includes('CV clicks'));
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(queried, false);
});

test('preview hostnames and incomplete config cannot query the database', async () => {
  const token = await sign();
  assert.equal((await handleDashboard(new Request('https://preview.cadeiraai.workers.dev/', { headers: { 'Cf-Access-Jwt-Assertion': token } }), env, '', keys)).status, 404);
  assert.equal((await handleDashboard(request(token), { ...env, OWNER_EMAIL: '' }, '', keys)).status, 503);
});

test('report uses bounded UTC dates, fills zero days and aggregates the five event types', async () => {
  const db = database();
  db.sql.exec(`INSERT INTO event_counts VALUES
    ('2026-10-22','cv_download','cv','/',3),
    ('2026-10-21','contact_start','contact','/',2),
    ('2026-10-22','contact_success','contact','/',1),
    ('2026-09-01','cv_download','cv','/',9),
    ('2026-10-23','cv_download','cv','/',8)`);
  const report = await readReport(db.binding, 7, new Date('2026-10-22T23:30:00Z'));
  assert.equal(report.start, '2026-10-16'); assert.equal(report.end, '2026-10-22');
  assert.equal(report.daily.length, 7); assert.equal(report.daily[0].total, 0);
  assert.equal(report.totals.cv_download, 3); assert.equal(report.totals.project_click, 0);
  assert.equal(report.totals.contact_success, 1); assert.equal(report.breakdown.length, 3);
  const html = renderReport(report);
  assert(html.includes('Last 7 days')); assert(html.includes('Daily activity'));
  assert(html.includes('View daily numbers')); assert(html.includes('not unique visitors'));
  assert(!html.includes(env.OWNER_EMAIL));
  db.sql.close();
});

test('authenticated report is private and filters accept only 7, 30 or 90 days', async () => {
  const db = database(); const token = await sign();
  const configured = { ...env, EVENTS_DB: db.binding };
  for (const days of ['7', '30', '90']) {
    const response = await handleDashboard(request(token, `/?days=${days}`), configured, '', keys);
    assert.equal(response.status, 200);
    assert((await response.text()).includes('No recorded actions in this period.'));
    assert.equal(response.headers.get('CDN-Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Referrer-Policy'), 'same-origin');
    assert.match(response.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  }
  for (const days of ['0', '-1', '365', '30 OR 1=1', '07']) {
    assert.equal(rangeDays(`https://example.org/?days=${encodeURIComponent(days)}`), null);
    assert.equal((await handleDashboard(request(token, `/?days=${encodeURIComponent(days)}`), configured, '', keys)).status, 400);
  }
  assert.equal((await handleDashboard(request(token, '/api/report'), configured, '', keys)).status, 404);
  assert.equal((await handleDashboard(request(token, '/', { method: 'POST' }), configured, '', keys)).status, 405);
  const css = await handleDashboard(request(token, '/dashboard.css'), configured, 'body{color:teal}', keys);
  assert.equal(css.status, 200); assert.equal(await css.text(), 'body{color:teal}');
  db.sql.close();
});

test('database outages render an explicit error instead of false zero totals or provider details', async () => {
  const response = await handleDashboard(request(await sign()), { ...env, EVENTS_DB: { prepare: () => { throw new Error('SECRET provider details'); } } }, '', keys);
  assert.equal(response.status, 503);
  const html = await response.text();
  assert(html.includes('The report couldn’t load.')); assert(!html.includes('SECRET'));
  assert(!html.includes('No recorded actions'));
});

test('HTML escapes even malicious values unexpectedly present in the database', () => {
  const report = { days: 7, start: '2026-10-16', end: '2026-10-22', updated: '2026-10-22T22:00:00Z', totals: { cv_download: 1, project_click: 0, github_click: 0, contact_start: 0, contact_success: 0 }, daily: [], breakdown: [{ event: 'cv_download', target: '<script>alert(1)</script>', page: '" onmouseover="bad', count: 1 }] };
  const html = renderReport(report);
  assert(!html.includes('<script>')); assert(html.includes('&lt;script&gt;'));
  assert(!html.includes('" onmouseover="bad'));
});

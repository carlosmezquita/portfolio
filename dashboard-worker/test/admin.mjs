import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { DEFAULT_CONTENT, validateContent, getContent, handleContent } from '../../analytics-worker/content.mjs';
import { storeRequest } from '../../contact-worker/inbox.mjs';
import { handleAdmin, readForm, saveContent, requestsPage } from '../admin.mjs';

const origin = 'https://portfolio-dashboard.cadeiraai.workers.dev';
function fixture() {
  const sql = new DatabaseSync(':memory:');
  for (const migration of ['0001_events.sql', '0002_admin.sql']) sql.exec(fs.readFileSync(new URL(`../../analytics-worker/migrations/${migration}`, import.meta.url), 'utf8'));
  const prepare = query => {
    const bound = (args = []) => {
      const stmt = sql.prepare(query);
      const values = Object.fromEntries(args.map((value, index) => [String(index + 1), value]));
      const invoke = method => args.length ? stmt[method](values) : stmt[method]();
      return { all: async () => ({ success: true, results: invoke('all') }), first: async () => invoke('get') || null, run: async () => ({ success: true, meta: invoke('run') }) };
    };
    return { ...bound(), bind: (...args) => bound(args) };
  };
  const db = { prepare };
  const env = { EVENTS_DB: db, EVENT_ORIGINS: 'https://carlosmezquita.dev' };
  const post = (path, values, headers = {}) => new Request(`${origin}${path}`, {
    method: 'POST', headers: { Origin: origin, ...headers }, body: new URLSearchParams(values),
  });
  const run = request => handleAdmin(request, env, new URL(request.url));
  return { sql, db, env, post, run };
}

test('private inbox stores accepted prose, escapes it in HTML and supports non-destructive status changes', async () => {
  const f = fixture();
  await storeRequest(f.db, { name: 'Visitor <script>', email: 'visitor@example.org', message: 'A detailed <script>alert(1)</script> enquiry.' });
  const row = f.sql.prepare('SELECT * FROM contact_requests').get();
  assert.equal(row.status, 'new');
  const html = await requestsPage(f.db, new URL(`${origin}/requests`));
  assert(html.includes('&lt;script&gt;')); assert(!html.includes('<script>'));
  assert(html.includes('visitor@example.org'));
  const response = await f.run(f.post('/requests/status', { id: row.id, status: 'archived' }));
  assert.equal(response.redirect, '/requests?status=all&updated=1');
  assert.equal(f.sql.prepare('SELECT status FROM contact_requests').get().status, 'archived');
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM contact_requests').get().n, 1);
  f.sql.close();
});

test('inbox handles unicode messages accepted by the contact form and bounds stored requests', async () => {
  const f = fixture();
  await storeRequest(f.db, { name: 'Visitor', email: 'visitor@example.org', message: '🌊🌊🌊🌊🌊' });
  f.sql.exec(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<999)
    INSERT INTO contact_requests(id,received_at,name,email,message) SELECT CAST(x AS TEXT),'2026-10-22T00:00:00Z','Setup','setup@example.org','Fixture message' FROM n`);
  await assert.rejects(() => storeRequest(f.db, { name: 'Visitor', email: 'visitor@example.org', message: 'A bounded message.' }));
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM contact_requests').get().n, 1000);
  f.sql.close();
});

test('admin writes reject cross-site/missing origins before touching storage', async () => {
  const f = fixture();
  for (const headers of [{ Origin: 'https://evil.example' }, { Origin: 'null' }, { Origin: '' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.equal((await f.run(f.post('/content', { ...DEFAULT_CONTENT, revision: '' }, headers))).status, 403);
  }
  assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM site_content').get().n, 0);
  f.sql.close();
});

test('content edits publish plain text with safe links, enforce optimistic revision and can restore defaults', async () => {
  const f = fixture();
  assert.deepEqual((await getContent(f.db)).content, DEFAULT_CONTENT);
  const content = { ...DEFAULT_CONTENT, intro: '<script>plain text, never markup</script>', urbot_link: 'https://example.org/urbot' };
  assert.equal((await f.run(f.post('/content', { ...content, revision: '' }))).redirect, '/content?saved=1');
  const saved = await getContent(f.db);
  assert.equal(saved.content.intro, content.intro);
  assert.equal(await saveContent(f.db, DEFAULT_CONTENT, ''), false);
  assert.equal((await f.run(f.post('/content', { ...DEFAULT_CONTENT, revision: '' }))).status, 409);
  assert.equal((await f.run(f.post('/content/reset', { revision: saved.revision }))).redirect, '/content?saved=1');
  assert.deepEqual((await getContent(f.db)).content, DEFAULT_CONTENT);
  f.sql.close();
});

test('unsafe links, oversized text and unrecognised content keys cannot be published', () => {
  for (const change of [
    { surfay_code: 'javascript:alert(1)' }, { urbot_link: '//evil.example' }, { contact: '' },
    { intro: 'x'.repeat(601) }, { surfay_code: 'https://user:password@example.org/' },
    { contact: 'Line\r\ncontrol' }, { extra: 'secret' }, { surfay_code: '#contact' },
  ]) assert.equal(validateContent({ ...DEFAULT_CONTENT, ...change }), null);
});

test('public content endpoint returns only editable copy and links, never requests or owner identity', async () => {
  const f = fixture();
  await storeRequest(f.db, { name: 'PRIVATE VISITOR', email: 'private@example.org', message: 'Private form enquiry body.' });
  const request = new Request('https://portfolio-events.cadeiraai.workers.dev/api/content', { headers: { Origin: 'https://carlosmezquita.dev' } });
  const response = await handleContent(request, f.env);
  assert.equal(response.status, 200);
  const data = await response.json(); assert.deepEqual(data, DEFAULT_CONTENT);
  assert(!JSON.stringify(data).includes('PRIVATE')); assert(!Object.hasOwn(data, 'revision'));
  assert.equal((await handleContent(new Request(request.url, { headers: { Origin: 'https://evil.example' } }), f.env)).status, 403);
  f.sql.close();
});

test('admin forms reject duplicate keys, extra fields, arbitrary content types and overlong bodies', async () => {
  const f = fixture();
  for (const body of ['id=one&id=two&status=new', 'id=one&status=new&extra=private']) {
    assert.equal(await readForm(new Request(origin, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), ['id', 'status']), null);
  }
  assert.equal(await readForm(new Request(origin, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), []), null);
  assert.equal(await readForm(f.post('/', { id: 'x'.repeat(24001), status: 'new' }), ['id', 'status']), null);
  f.sql.close();
});

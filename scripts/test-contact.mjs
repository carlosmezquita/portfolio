import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleContact } from '../contact-worker/handler.mjs';

const origin = 'https://carlosmezquita.dev';
const valid = { name: 'Visitor Pérez', email: 'visitor@example.net', message: 'Hello Carlos, I would like to discuss a software project.', website: '', 'cf-turnstile-response': 'fresh-token' };
function fixture(overrides = {}) {
  const sent = [];
  const verified = [];
  const redeemed = new Set();
  const env = {
    CONTACT_ORIGINS: `${origin},https://www.carlosmezquita.dev`,
    CONTACT_FROM: 'portfolio@example.org', CONTACT_TO: 'private@example.org',
    TURNSTILE_SITEKEY: 'public-sitekey', TURNSTILE_SECRET: 'private-secret',
    CONTACT_EMAIL: {}, CONTACT_LIMITER: { limit: async () => ({ success: true }) },
    ...overrides,
  };
  const services = {
    verify: async (body) => {
      verified.push(body);
      const token = body.get('response');
      const success = !redeemed.has(token);
      redeemed.add(token);
      return Response.json({ success, action: 'contact', hostname: 'carlosmezquita.dev' });
    },
    deliver: async (...args) => { sent.push(args); },
  };
  const request = (fields = valid, options = {}) => new Request('https://contact.example.org/api/contact', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...options.headers },
    body: JSON.stringify(fields),
  });
  return { env, services, sent, verified, request, run: (request) => handleContact(request, env, services) };
}

test('verified message goes only to the server recipient, with UTF-8 body and Reply-To', async () => {
  const f = fixture();
  const response = await f.run(f.request({ ...valid, to: 'attacker@example.net', from: 'spoof@example.net' }));
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(f.verified[0].get('secret'), 'private-secret');
  assert.equal(f.verified[0].get('remoteip'), '192.0.2.1');
  const [from, to, raw] = f.sent[0];
  assert.equal(from, f.env.CONTACT_FROM);
  assert.equal(to, f.env.CONTACT_TO);
  assert.match(raw, /Reply-To: <visitor@example.net>\r\n/);
  assert(!raw.includes('attacker@example.net'));
  const body = Buffer.from(raw.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64').toString('utf8');
  assert(body.includes(valid.name));
  assert(body.includes(valid.message));
});

test('redeemed token cannot send a second email', async () => {
  const f = fixture();
  assert.equal((await f.run(f.request())).status, 202);
  assert.equal((await f.run(f.request())).status, 403);
  assert.equal(f.sent.length, 1);
});

test('successful sends are counted only after acceptance; analytics failure cannot request a resend', async () => {
  for (const analyticsFails of [false, true]) {
    const f = fixture(); const pages = [];
    f.services.recordSuccess = async (page) => {
      assert.equal(f.sent.length, 1);
      pages.push(page);
      if (analyticsFails) throw new Error('database quota');
    };
    const request = f.request({ ...valid, analytics_page: '/' });
    assert.equal((await f.run(request)).status, 202);
    assert.deepEqual(pages, ['/']);
    assert.equal((await f.run(f.request({ ...valid, analytics_page: '/' }))).status, 403);
    assert.equal(pages.length, 1);
  }
});

test('failed sends, opt-outs and unknown pages cannot create success counts', async () => {
  for (const scenario of ['delivery', 'verification', 'no-page', 'unknown-page', 'dnt', 'gpc']) {
    const f = fixture(); let counted = false;
    f.services.recordSuccess = async () => { counted = true; };
    if (scenario === 'delivery') f.services.deliver = async () => { throw new Error('delivery failed'); };
    if (scenario === 'verification') f.services.verify = async () => Response.json({ success: false });
    const fields = { ...valid, analytics_page: scenario === 'no-page' ? null : scenario === 'unknown-page' ? '/?secret' : '/' };
    const headers = scenario === 'dnt' ? { DNT: '1' } : scenario === 'gpc' ? { 'Sec-GPC': '1' } : {};
    await f.run(f.request(fields, { headers }));
    assert.equal(counted, false, scenario);
  }
});

test('inbox receives only accepted submissions and storage failures do not cause duplicate email retries', async () => {
  const f = fixture(); const stored = [];
  f.services.storeRequest = async fields => { assert.equal(f.sent.length, 1); stored.push(fields); throw new Error('quota'); };
  assert.equal((await f.run(f.request())).status, 202);
  assert.deepEqual(stored, [{ name: valid.name, email: valid.email, message: valid.message }]);
  const rejected = fixture(); let saved = false;
  rejected.services.storeRequest = async () => { saved = true; };
  rejected.services.deliver = async () => { throw new Error('mail unavailable'); };
  assert.equal((await rejected.run(rejected.request())).status, 503);
  assert.equal(saved, false);
});

test('rejects missing, forged, cross-action and cross-frontend verification', async () => {
  for (const result of [
    { success: false, action: 'contact', hostname: 'carlosmezquita.dev' },
    { success: 'true', action: 'contact', hostname: 'carlosmezquita.dev' },
    { success: true, action: 'login', hostname: 'carlosmezquita.dev' },
    { success: true, action: 'contact', hostname: 'localhost' },
    { success: true, action: 'contact', hostname: 'www.carlosmezquita.dev' },
    null,
  ]) {
    const f = fixture();
    f.services.verify = async () => Response.json(result);
    const response = await f.run(f.request());
    assert([403, 503].includes(response.status));
    assert.equal(f.sent.length, 0);
  }
  for (const token of ['', null, 'x'.repeat(2049)]) {
    const f = fixture();
    assert.equal((await f.run(f.request({ ...valid, 'cf-turnstile-response': token }))).status, 403);
    assert.equal(f.verified.length, 0);
  }
});

test('provider timeout, non-JSON or failed response never bypass verification', async () => {
  for (const verify of [
    async () => { throw new Error('timeout'); },
    async () => new Response('not JSON'),
    async () => new Response('upstream error', { status: 502 }),
  ]) {
    const f = fixture();
    f.services.verify = verify;
    assert.equal((await f.run(f.request())).status, 503);
    assert.equal(f.sent.length, 0);
  }
});

test('validation blocks header injection, honeypot, overlong and invalid inputs', async () => {
  for (const changes of [
    { name: 'Name\r\nBcc: victim@example.org' }, { name: '' }, { name: 'x'.repeat(101) },
    { email: 'visitor@example.net\r\nBcc: victim@example.org' },
    { email: 'bad address' }, { email: 'a@b.example,c@d.example' },
    { email: '.visitor@example.net' }, { email: 'visitor.@example.net' },
    { email: 'visit..or@example.net' }, { email: `${'a'.repeat(65)}@example.net` },
    { email: `visitor@${'a'.repeat(64)}.net` },
    { name: { toString: 'Visitor' } }, { email: ['visitor@example.net'] }, { message: 12345 },
    { website: 'spam' }, { message: 'short' }, { message: 'x'.repeat(5001) }, { message: '\0hidden message' },
  ]) {
    const f = fixture();
    assert.equal((await f.run(f.request({ ...valid, ...changes }))).status, 400);
    assert.equal(f.sent.length, 0);
    assert.equal(f.verified.length, 0);
  }
});

test('visitor markup and header-like prose remain inert UTF-8 plain text', async () => {
  const f = fixture();
  const message = '<script>alert(1)</script>\r\nBcc: victim@example.net\nA project enquiry & details.';
  const response = await f.run(f.request({ ...valid, name: '  Ana <Pérez>  ', message, cc: 'victim@example.net' }));
  assert.equal(response.status, 202);
  assert.equal(f.sent.length, 1);
  const raw = f.sent[0][2];
  const [headers, encoded] = raw.split('\r\n\r\n');
  assert.match(headers, /Content-Type: text\/plain; charset=UTF-8/);
  assert(!headers.includes('Bcc:'));
  assert(!headers.includes('<script>'));
  const body = Buffer.from(encoded.replace(/\r\n/g, ''), 'base64').toString('utf8');
  assert(body.includes('Name: Ana <Pérez>\n'));
  assert(body.includes(message));
});

test('malformed JSON and invalid UTF-8 never reach verification or delivery', async () => {
  for (const body of ['{"name":', 'null', '[]', new Uint8Array([0xff, 0xfe])]) {
    const f = fixture();
    const request = new Request('https://contact.example.org/api/contact', {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' }, body,
    });
    assert.equal((await f.run(request)).status, 400);
    assert.equal(f.verified.length, 0);
    assert.equal(f.sent.length, 0);
  }
});

test('request body is bounded even without Content-Length', async () => {
  const f = fixture();
  const request = f.request({ ...valid, message: '🌊'.repeat(10000) });
  assert.equal(request.headers.get('Content-Length'), null);
  assert.equal((await f.run(request)).status, 413);
  assert.equal(f.verified.length, 0);
});

test('rate limiting rejects before verification or delivery', async () => {
  let key;
  const f = fixture({ CONTACT_LIMITER: { limit: async (options) => { key = options.key; return { success: false }; } } });
  const response = await f.run(f.request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal(key, 'contact:192.0.2.1');
  assert.equal(f.verified.length, 0);
  assert.equal(f.sent.length, 0);
});

test('missing configuration and client IP fail closed', async () => {
  for (const key of ['CONTACT_TO', 'CONTACT_FROM', 'TURNSTILE_SECRET', 'TURNSTILE_SITEKEY', 'CONTACT_EMAIL', 'CONTACT_LIMITER']) {
    const f = fixture({ [key]: '' });
    assert.equal((await f.run(f.request())).status, 503);
    assert.equal(f.sent.length, 0);
  }
  const f = fixture();
  const request = f.request(); request.headers.delete('CF-Connecting-IP');
  assert.equal((await f.run(request)).status, 403);
});

test('origin restriction and JSON-only submissions reject drive-by requests', async () => {
  for (const headers of [
    { Origin: 'https://evil.example.org' }, { Origin: 'null' },
    { Origin: 'https://carlosmezquita.dev.evil.example.org' },
    { 'Content-Type': 'application/x-www-form-urlencoded' },
  ]) {
    const f = fixture();
    const response = await f.run(f.request(valid, { headers }));
    assert([403, 415].includes(response.status));
    assert.equal(f.sent.length, 0);
    if (response.status === 403) assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
});

test('delivery failure stays a failure and does not expose provider details', async () => {
  const f = fixture();
  f.services.deliver = async () => { throw new Error('private@example.org: provider credential detail'); };
  const response = await f.run(f.request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { success: false, error: 'delivery_unavailable' });
});

test('configuration response exposes only the public sitekey; preflight never sends mail', async () => {
  const f = fixture();
  const response = await f.run(new Request('https://contact.example.org/api/contact/config', { headers: { Origin: origin } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { sitekey: 'public-sitekey' });
  const preflight = await f.run(new Request('https://contact.example.org/api/contact', { method: 'OPTIONS', headers: { Origin: origin } }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(f.sent.length, 0);
});

const MAX_BYTES = 24000;
const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
const singleLine = (value, max) => typeof value === 'string' && value.trim().length > 0
  && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const validEmail = (value) => singleLine(value, 254) && emailPattern.test(value);

function reply(status, data, origin, extra = {}) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex', Vary: 'Origin',
      ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}), ...extra,
    },
  });
}

async function readJson(request) {
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) throw new RangeError('Too large');
  if (!request.body) throw new SyntaxError('Empty body');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new RangeError('Too large');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

// Encode visitor prose in the body. Only the validated email enters Reply-To.
function rawEmail(from, to, visitor, message) {
  const body = `New message from your portfolio\n\nName: ${visitor.name}\nEmail: ${visitor.email}\n\n${message}\n`;
  const bytes = new TextEncoder().encode(body);
  const base64 = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
  return [
    `From: Carlos Mezquita portfolio <${from}>`, `To: <${to}>`,
    `Reply-To: <${visitor.email}>`, 'Subject: New portfolio enquiry',
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${from.split('@')[1]}>`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64', '', base64.match(/.{1,76}/g).join('\r\n'), '',
  ].join('\r\n');
}

export async function handleContact(request, env, services) {
  const url = new URL(request.url);
  const allowedOrigins = new Set((env.CONTACT_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean));
  const origin = request.headers.get('Origin');
  const approved = allowedOrigins.has(origin) ? origin : null;
  const fail = (status, code) => reply(status, { success: false, error: code }, approved);

  if (!['/api/contact', '/api/contact/config'].includes(url.pathname)) return fail(404, 'not_found');
  if (!approved) return fail(403, 'forbidden');
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': approved, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin',
    } });
  }

  // Fail closed until the entire private configuration is present.
  if (!env.TURNSTILE_SITEKEY || !env.TURNSTILE_SECRET || !validEmail(env.CONTACT_TO)
      || !validEmail(env.CONTACT_FROM) || !env.CONTACT_EMAIL || !env.CONTACT_LIMITER) {
    return fail(503, 'unavailable');
  }
  if (url.pathname === '/api/contact/config') {
    return request.method === 'GET'
      ? reply(200, { sitekey: env.TURNSTILE_SITEKEY }, approved)
      : fail(405, 'method_not_allowed');
  }
  if (request.method !== 'POST') return fail(405, 'method_not_allowed');
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return fail(415, 'unsupported_content_type');
  }

  try {
    const clientIp = request.headers.get('CF-Connecting-IP');
    if (!clientIp) return fail(403, 'forbidden');
    const limit = await env.CONTACT_LIMITER.limit({ key: `contact:${clientIp}` });
    if (!limit.success) return reply(429, { success: false, error: 'rate_limited' }, approved, { 'Retry-After': '60' });

    let fields;
    try { fields = await readJson(request); }
    catch (error) { return fail(error instanceof RangeError ? 413 : 400, 'invalid_body'); }
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return fail(400, 'invalid_body');
    if (fields.website !== undefined && fields.website !== '') return fail(400, 'invalid_fields');
    const { name, email, message } = fields;
    if (!singleLine(name, 100) || !validEmail(email) || typeof message !== 'string'
        || message.trim().length < 10 || message.length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) {
      return fail(400, 'invalid_fields');
    }
    const token = fields['cf-turnstile-response'];
    if (typeof token !== 'string' || !token || token.length > 2048) return fail(403, 'verification_failed');

    let verification;
    try {
      const response = await services.verify(new URLSearchParams({
        secret: env.TURNSTILE_SECRET, response: token, remoteip: clientIp,
      }));
      if (!response.ok) return fail(503, 'verification_unavailable');
      verification = await response.json();
    } catch { return fail(503, 'verification_unavailable'); }
    // Bind each token to the exact requesting frontend, not merely any widget domain.
    if (verification?.success !== true || verification.action !== 'contact'
        || verification.hostname !== new URL(approved).hostname) {
      return fail(403, 'verification_failed');
    }

    await services.deliver(env.CONTACT_FROM, env.CONTACT_TO,
      rawEmail(env.CONTACT_FROM, env.CONTACT_TO, { name: name.trim(), email }, message.trim()));
    return reply(202, { success: true }, approved);
  } catch {
    // Do not log messages, names, email addresses, tokens or provider errors.
    console.error(JSON.stringify({ event: 'contact_delivery_failed' }));
    return fail(503, 'delivery_unavailable');
  }
}

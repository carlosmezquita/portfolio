export const PAGES = new Set(['/', '/direction-b.html', '/projects/surfay/', '/projects/urbot/', '/projects/cadeira/']);
const TARGETS = {
  cv_download: ['cv'], project_click: ['surfay', 'urbot', 'cadeira'],
  github_click: ['profile', 'surfay', 'surfay-engineering'], contact_start: ['contact'],
};

// One atomic, parameter-bound statement. Both Workers share the same daily cap.
// Only daily counters are retained: no raw events, visitor IDs, IPs or URLs.
export async function recordEvent(db, event, target, page, now = new Date()) {
  if (!PAGES.has(page) || !((Object.hasOwn(TARGETS, event) && TARGETS[event].includes(target))
      || (event === 'contact_success' && target === 'contact'))) return false;
  const day = now.toISOString().slice(0, 10);
  const result = await db.prepare(`
    INSERT INTO event_counts (day, event, target, page, count)
    SELECT ?1, ?2, ?3, ?4, 1
    WHERE (SELECT COALESCE(SUM(count), 0) FROM event_counts WHERE day = ?1) < 5000
    ON CONFLICT(day, event, target, page) DO UPDATE SET count = count + 1
  `).bind(day, event, target, page).run();
  return result.success && result.meta.changes > 0;
}

function response(status, origin) {
  return new Response(null, { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin',
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    ...(status === 204 ? { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' } : {}),
  } });
}

async function readEvent(request) {
  // Bound streamed input even when Content-Length is absent or dishonest.
  if (!request.body || Number(request.headers.get('Content-Length')) > 512) throw new Error('invalid');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 512) { await reader.cancel(); throw new Error('invalid'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const value of chunks) { bytes.set(value, offset); offset += value.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function handleEvent(request, env) {
  if (new URL(request.url).pathname !== '/api/events') return response(404);
  const origin = request.headers.get('Origin');
  if (!(env.EVENT_ORIGINS || '').split(',').includes(origin)) return response(403);
  if (request.method === 'OPTIONS') return response(204, origin);
  if (request.method !== 'POST') return response(405, origin);
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return response(415, origin);
  if (request.headers.get('Sec-GPC') === '1' || request.headers.get('DNT') === '1') return response(202, origin);
  try {
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return response(403, origin);
    if (!(await env.EVENT_LIMITER.limit({ key: ip })).success) return response(429, origin);
    let data;
    try { data = await readEvent(request); } catch { return response(400, origin); }
    if (!data || Array.isArray(data) || typeof data !== 'object'
        || Object.keys(data).sort().join(',') !== 'event,page,target'
        || !Object.hasOwn(TARGETS, data.event) || !TARGETS[data.event].includes(data.target)
        || !PAGES.has(data.page)) return response(400, origin);
    await recordEvent(env.EVENTS_DB, data.event, data.target, data.page);
    // A full daily allowance intentionally drops events without retry traffic.
    return response(202, origin);
  } catch {
    // Quotas/outages must never break downloads, navigation or the contact form.
    return response(503, origin);
  }
}

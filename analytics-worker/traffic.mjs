import { PAGES, readEvent, response } from './events.mjs';

export const BUCKETS = Object.freeze({
  source: ['direct', 'internal', 'search', 'github', 'linkedin', 'social', 'other'],
  viewport: ['small', 'medium', 'large', 'unknown'],
  scroll: ['25', '50', '75', '100'],
  visible: ['10', '30', '60'],
  load: ['fast', 'moderate', 'slow'],
});
const shape = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === keys;
export function validTraffic(data) {
  if (!shape(data, 'page,type,values') || !PAGES.has(data.page)) return false;
  if (data.type === 'view') return shape(data.values, 'source,viewport')
    && BUCKETS.source.includes(data.values.source) && BUCKETS.viewport.includes(data.values.viewport);
  return ['scroll', 'visible', 'load'].includes(data.type) && typeof data.values === 'string'
    && BUCKETS[data.type].includes(data.values);
}

function device(ua) {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
  return /Mobile|iPhone|iPod/i.test(ua) ? 'mobile' : ua ? 'desktop' : 'unknown';
}
function browser(ua) {
  if (/Edg\//.test(ua)) return 'edge';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'firefox';
  if (/Chrome\/|CriOS\//.test(ua)) return 'chrome';
  return /Safari\//.test(ua) ? 'safari' : 'other';
}

export async function recordTraffic(db, data, request, now = new Date()) {
  if (!validTraffic(data)) return false;
  const day = now.toISOString().slice(0, 10);
  const values = [['requests', 'all']];
  if (data.type === 'view') {
    // Read only broad classifications. Neither raw header nor IP enters SQL.
    const ua = (request.headers.get('User-Agent') || '').slice(0, 512);
    const country = /^[A-Z]{2}$/.test(request.cf?.country || '') ? request.cf.country : 'unknown';
    values.push(['views', 'all'], ['source', data.values.source], ['viewport', data.values.viewport],
      ['device', device(ua)], ['browser', browser(ua)], ['country', country]);
  } else values.push([data.type, data.values]);
  // One atomic statement fans out bounded marginal counters. The requests row
  // reserves budget in the same statement, so dimensions cannot partly commit.
  const result = await db.prepare(`
    INSERT INTO traffic_counts (day, page, metric, bucket, count)
    SELECT ?1, ?2, json_extract(value, '$[0]'), json_extract(value, '$[1]'), 1
    FROM json_each(?3)
    WHERE (SELECT COALESCE(SUM(count), 0) FROM traffic_counts WHERE day = ?1 AND metric = 'requests') < 5000
    ON CONFLICT(day, page, metric, bucket) DO UPDATE SET count = count + 1
  `).bind(day, data.page, JSON.stringify(values)).run();
  return result.success && result.meta.changes > 0;
}

export async function handleTraffic(request, env) {
  if (new URL(request.url).pathname !== '/api/traffic') return response(404);
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
    // Conservative filter only; public telemetry cannot prove human traffic.
    if (/bot|crawler|spider|headless|preview/i.test(request.headers.get('User-Agent') || '')) return response(202, origin);
    let data;
    try { data = await readEvent(request); } catch { return response(400, origin); }
    if (!validTraffic(data)) return response(400, origin);
    return response(await recordTraffic(env.EVENTS_DB, data, request) ? 202 : 429, origin);
  } catch { return response(503, origin); }
}

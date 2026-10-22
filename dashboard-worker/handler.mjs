import { configurationReady, verifyOwner } from './auth.mjs';
import { rangeDays, readReport, renderError, renderReport } from './report.mjs';
import { handleAdmin } from './admin.mjs';

const headers = {
  'Cache-Control': 'private, no-store, max-age=0', 'CDN-Cache-Control': 'no-store', Pragma: 'no-cache',
  // Native form POSTs need their same-origin Origin; no-referrer makes it null.
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow', Vary: 'Cookie, Cf-Access-Jwt-Assertion',
  'Content-Security-Policy': "default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
const respond = (body, status = 200, type = 'text/plain; charset=utf-8') => new Response(body, { status, headers: { ...headers, 'Content-Type': type } });

export async function handleDashboard(request, env, css, keys) {
  const url = new URL(request.url);
  // Version preview URLs and alternate origins cannot serve this database.
  if (url.hostname !== env.DASHBOARD_HOST || url.protocol !== 'https:') return respond('Not found', 404);
  if (!configurationReady(env)) return respond('Private dashboard setup is incomplete.', 503);
  if (!(await verifyOwner(request.headers.get('Cf-Access-Jwt-Assertion'), env, keys))) return respond('Sign in with the authorised owner account.', 403);
  if (['/requests', '/requests/status', '/content', '/content/reset'].includes(url.pathname)) {
    try {
      const result = await handleAdmin(request, env, url);
      if (result.redirect) return new Response(null, { status: 303, headers: { ...headers, Location: result.redirect } });
      return respond(result.body, result.status, result.type);
    } catch { return respond(renderError(), 503, 'text/html; charset=utf-8'); }
  }
  if (!['GET', 'HEAD'].includes(request.method)) return respond('Method not allowed', 405);
  if (url.pathname === '/dashboard.css') return respond(request.method === 'HEAD' ? null : css, 200, 'text/css; charset=utf-8');
  if (url.pathname !== '/') return respond('Not found', 404);
  const days = rangeDays(request.url);
  if (!days) return respond('Choose a 7, 30 or 90 day report.', 400);
  if (request.method === 'HEAD') return respond(null, 200, 'text/html; charset=utf-8');
  try {
    const report = await readReport(env.EVENTS_DB, days);
    return respond(renderReport(report), 200, 'text/html; charset=utf-8');
  } catch { return respond(renderError(), 503, 'text/html; charset=utf-8'); }
}

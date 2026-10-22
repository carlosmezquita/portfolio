export const DEFAULT_CONTENT = Object.freeze({
  intro: 'I build web applications and AI systems. Previously at Denodo, now finishing Computer Science at Portsmouth.',
  contact: 'Have a project or a role in mind? I’d like to hear about it.',
  surfay_code: 'https://github.com/carlosmezquita/surfay',
  surfay_notes: 'https://github.com/carlosmezquita/surfay/blob/main/docs/engineering.md',
  urbot_link: '#contact', cadeira_link: '#contact',
});
export function validateContent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
      || Object.keys(input).sort().join(',') !== Object.keys(DEFAULT_CONTENT).sort().join(',')) return null;
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== 'string' || !value.trim() || value.length > (key === 'intro' ? 600 : key === 'contact' ? 400 : 500)
        || /[\u0000-\u001f\u007f]/.test(value)) return null;
    result[key] = value.trim();
    if (!['intro', 'contact'].includes(key)) {
      if (['urbot_link', 'cadeira_link'].includes(key) && value === '#contact') continue;
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || url.port || url.href.length > 500) return null;
        result[key] = url.href;
      } catch { return null; }
    }
  }
  return result;
}
export async function getContent(db) {
  const row = await db.prepare('SELECT document, revision FROM site_content WHERE id = 1').first();
  if (!row) return { content: DEFAULT_CONTENT, revision: '' };
  const content = validateContent(JSON.parse(row.document));
  if (!content) throw new Error('Invalid stored content');
  return { content, revision: row.revision };
}
export async function handleContent(request, env) {
  const origin = request.headers.get('Origin');
  if (!(env.EVENT_ORIGINS || '').split(',').includes(origin)) return new Response(null, { status: 403 });
  const headers = { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff' };
  if (request.method !== 'GET') return new Response(null, { status: 405, headers });
  try { return Response.json((await getContent(env.EVENTS_DB)).content, { headers }); }
  catch { return new Response(null, { status: 503, headers: { ...headers, 'Cache-Control': 'no-store' } }); }
}

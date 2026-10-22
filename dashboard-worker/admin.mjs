import { DEFAULT_CONTENT, getContent, validateContent } from '../analytics-worker/content.mjs';
import { escapeHtml as e } from './report.mjs';

const states = ['new', 'read', 'archived'];
const fields = [['intro', 'Homepage introduction', 600], ['contact', 'Contact introduction', 400], ['surfay_code', 'Surfay code link', 500], ['surfay_notes', 'Surfay engineering notes link', 500], ['urbot_link', 'Urbot project link', 500], ['cadeira_link', 'CadeiraAI project link', 500]];
export function adminShell(title, body, current) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${e(title)} | Portfolio admin</title><link rel="stylesheet" href="/dashboard.css"></head><body><a class="skip" href="#report">Skip to content</a><div class="shell"><header><a class="identity" href="/">Carlos Mezquita <span>/ admin</span></a><nav class="section-nav" aria-label="Sections"><a href="/">Statistics</a><a href="/requests"${current === 'requests' ? ' aria-current="page"' : ''}>Requests</a><a href="/content"${current === 'content' ? ' aria-current="page"' : ''}>Site content</a></nav><nav aria-label="Account"><span class="private">Owner access</span><a href="/cdn-cgi/access/logout">Sign out</a></nav></header><main id="report">${body}</main><footer><span>Private portfolio admin</span><a href="https://carlosmezquita.dev" rel="noreferrer">View portfolio ↗</a></footer></div></body></html>`;
}

export async function requestsPage(db, url) {
  const status = url.searchParams.get('status') || 'new';
  const offset = Number(url.searchParams.get('offset') || 0);
  if (![...states, 'all'].includes(status) || !Number.isInteger(offset) || offset < 0 || offset > 1000) return null;
  const query = status === 'all'
    ? db.prepare('SELECT id, received_at, name, email, message, status FROM contact_requests ORDER BY received_at DESC LIMIT 26 OFFSET ?1').bind(offset)
    : db.prepare('SELECT id, received_at, name, email, message, status FROM contact_requests WHERE status = ?1 ORDER BY received_at DESC LIMIT 26 OFFSET ?2').bind(status, offset);
  const result = await query.all();
  if (!result.success) throw new Error('Inbox unavailable');
  const counts = await db.prepare('SELECT status, COUNT(*) AS total FROM contact_requests GROUP BY status').all();
  if (!counts.success) throw new Error('Inbox unavailable');
  const totals = Object.fromEntries(counts.results.map(row => [row.status, row.total]));
  const options = [...states, 'all'].map(value => `<option value="${value}"${status === value ? ' selected' : ''}>${value[0].toUpperCase() + value.slice(1)}${value === 'all' ? '' : ` (${totals[value] || 0})`}</option>`).join('');
  const rows = result.results.slice(0, 25).map(row => `<details class="request"><summary><span>${e(row.name)}</span><span class="request-meta">${e(row.received_at.slice(0, 16).replace('T', ' '))} UTC · ${e(row.status)}</span></summary><div class="request-body"><p class="request-email">${e(row.email)}</p><pre>${e(row.message)}</pre><form action="/requests/status" method="post" class="request-status"><input type="hidden" name="id" value="${e(row.id)}"><label for="status-${e(row.id)}">Status</label><select id="status-${e(row.id)}" name="status">${states.map(value => `<option${value === row.status ? ' selected' : ''}>${value}</option>`).join('')}</select><button type="submit">Update status</button></form></div></details>`).join('');
  const link = n => `/requests?status=${status}&offset=${n}`;
  return adminShell('Contact requests', `<div class="heading"><div><p class="eyebrow">PRIVATE INBOX</p><h1>Contact requests.</h1><p class="period">New enquiries are mirrored here after email acceptance.</p></div><form class="filters" method="get"><label for="status">Show requests</label><div><select name="status" id="status">${options}</select><button>Apply filter</button></div></form></div>${url.searchParams.has('updated') ? '<p class="notice" role="status">Request status updated.</p>' : ''}<div class="request-list">${rows || '<div class="empty"><h2>No requests in this view.</h2><p>New contact-form submissions will appear here. Earlier enquiries remain in your email inbox.</p></div>'}</div><nav class="pagination" aria-label="Inbox pages">${offset > 0 ? `<a href="${link(Math.max(0, offset - 25))}">Previous</a>` : ''}${result.results.length > 25 ? `<a href="${link(offset + 25)}">Next</a>` : ''}</nav><aside class="notes"><h2>Private by design</h2><p>Names, email addresses and messages are kept separately from anonymous statistics for up to 90 days, with room for 1,000 requests. If storage is unavailable, the delivered email remains your record. Archiving changes the view; it does not delete a request.</p></aside>`, 'requests');
}

export async function contentPage(db, { saved = false, error = '' } = {}) {
  const { content, revision } = await getContent(db);
  const controls = fields.map(([key, label, max]) => `<div class="editor-field"><label for="${key}">${label}</label>${['intro', 'contact'].includes(key) ? `<textarea id="${key}" name="${key}" rows="3" maxlength="${max}" required>${e(content[key])}</textarea>` : `<input id="${key}" name="${key}" value="${e(content[key])}" maxlength="${max}" spellcheck="false" required>`}</div>`).join('');
  return adminShell('Site content', `<div class="heading"><div><p class="eyebrow">PORTFOLIO CONTENT</p><h1>Make a small change.</h1><p class="period">Edit your introduction, contact copy and project destinations.</p></div></div>${saved ? '<p class="notice" role="status">Changes published. The portfolio picks them up within about a minute once the content loader is deployed.</p>' : ''}${error ? `<p class="notice error-notice" role="alert">${e(error)}</p>` : ''}<form action="/content" method="post" class="editor"><input type="hidden" name="revision" value="${e(revision)}">${controls}<p class="field-hint">Use HTTPS addresses for project links. Urbot and CadeiraAI can also use #contact. Text is published as plain text.</p><button type="submit">Publish changes</button></form><details class="defaults"><summary>Restore the original text and links</summary><p>Restoring replaces the current editable content with the portfolio’s original values.</p><form action="/content/reset" method="post"><input type="hidden" name="revision" value="${e(revision)}"><button type="submit">Restore original content</button></form></details>`, 'content');
}

export async function readForm(request, allowed) {
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/x-www-form-urlencoded') return null;
  if (!request.body || Number(request.headers.get('Content-Length')) > 24000) return null;
  const reader = request.body.getReader(); const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > 24000) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const form = new URLSearchParams(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if ([...form.keys()].sort().join(',') !== [...allowed].sort().join(',')) return null;
  return Object.fromEntries(form);
}

export async function saveContent(db, content, revision) {
  if (revision !== '' && !/^[0-9a-f-]{36}$/.test(revision)) return false;
  const result = await db.prepare(`INSERT INTO site_content (id, document, revision, updated_at)
    SELECT 1, ?1, ?2, ?3 WHERE ?4 = '' OR EXISTS (SELECT 1 FROM site_content WHERE id = 1 AND revision = ?4)
    ON CONFLICT(id) DO UPDATE SET document=excluded.document, revision=excluded.revision, updated_at=excluded.updated_at
    WHERE site_content.revision = ?4`).bind(JSON.stringify(content), crypto.randomUUID(), new Date().toISOString(), revision).run();
  return result.success && result.meta.changes === 1;
}

export async function handleAdmin(request, env, url) {
  const html = body => ({ body, status: 200, type: 'text/html; charset=utf-8' });
  if (request.method === 'GET') {
    if (url.pathname === '/requests') { const page = await requestsPage(env.EVENTS_DB, url); return page ? html(page) : { body: 'Invalid inbox filter', status: 400 }; }
    if (url.pathname === '/content') return html(await contentPage(env.EVENTS_DB, { saved: url.searchParams.has('saved') }));
    return { body: 'Not found', status: 404 };
  }
  if (request.method !== 'POST') return { body: 'Method not allowed', status: 405 };
  if (request.headers.get('Origin') !== url.origin || (request.headers.get('Sec-Fetch-Site') && request.headers.get('Sec-Fetch-Site') !== 'same-origin')) return { body: 'Cross-site changes are forbidden', status: 403 };
  if (url.pathname === '/requests/status') {
    const form = await readForm(request, ['id', 'status']);
    if (!form || !/^[0-9a-f-]{36}$/.test(form.id) || !states.includes(form.status)) return { body: 'Invalid request status', status: 400 };
    const result = await env.EVENTS_DB.prepare('UPDATE contact_requests SET status = ?1 WHERE id = ?2').bind(form.status, form.id).run();
    if (!result.success) throw new Error('Update unavailable');
    return result.meta.changes ? { redirect: '/requests?status=all&updated=1' } : { body: 'Request not found', status: 404 };
  }
  if (['/content', '/content/reset'].includes(url.pathname)) {
    const allowed = url.pathname.endsWith('/reset') ? ['revision'] : [...Object.keys(DEFAULT_CONTENT), 'revision'];
    const form = await readForm(request, allowed);
    if (!form) return { body: 'Invalid content form', status: 400 };
    const { revision, ...input } = form;
    const content = url.pathname.endsWith('/reset') ? DEFAULT_CONTENT : validateContent(input);
    if (!content) return { body: await contentPage(env.EVENTS_DB, { error: 'Check the text lengths and use valid HTTPS project links.' }), status: 400, type: 'text/html; charset=utf-8' };
    if (!(await saveContent(env.EVENTS_DB, content, revision))) return { body: await contentPage(env.EVENTS_DB, { error: 'This content changed in another tab. Review the current values before saving again.' }), status: 409, type: 'text/html; charset=utf-8' };
    return { redirect: '/content?saved=1' };
  }
  return { body: 'Not found', status: 404 };
}

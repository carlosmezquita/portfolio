import { readTraffic, renderTraffic } from './traffic-report.mjs';

export const EVENTS = [
  ['cv_download', 'CV clicks'], ['project_click', 'Project clicks'], ['github_click', 'GitHub clicks'],
  ['contact_start', 'Contact starts'], ['contact_success', 'Successful sends'],
];
const labels = Object.fromEntries(EVENTS);
const targets = { cv: 'CV download', surfay: 'Surfay', urbot: 'Urbot', cadeira: 'CadeiraAI', profile: 'GitHub profile', 'surfay-engineering': 'Surfay engineering notes', contact: 'Contact form' };
const pageNames = { '/': 'Homepage', '/direction-b.html': 'Alternative layout', '/projects/surfay/': 'Surfay legacy page', '/projects/urbot/': 'Urbot legacy page', '/projects/cadeira/': 'CadeiraAI legacy page' };
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function rangeDays(url) {
  const value = new URL(url).searchParams.get('days') || '30';
  return ['7', '30', '90'].includes(value) ? Number(value) : null;
}

export async function readReport(db, days, now = new Date()) {
  const end = now.toISOString().slice(0, 10);
  const startDate = new Date(`${end}T00:00:00Z`);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);
  const start = startDate.toISOString().slice(0, 10);
  // Indexed day bounds and one bounded query; no SQL or identifiers from input.
  const result = await db.prepare(`SELECT day, event, target, page, count FROM event_counts
    WHERE day >= ?1 AND day <= ?2 ORDER BY day, event, target, page`).bind(start, end).all();
  if (!result.success) throw new Error('Report unavailable');
  const totals = Object.fromEntries(EVENTS.map(([event]) => [event, 0]));
  const daily = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate); date.setUTCDate(date.getUTCDate() + i);
    daily.push({ day: date.toISOString().slice(0, 10), total: 0, ...totals });
  }
  const byDay = new Map(daily.map(row => [row.day, row]));
  const groups = new Map();
  for (const row of result.results) {
    if (!Object.hasOwn(totals, row.event) || !byDay.has(row.day) || !Number.isSafeInteger(row.count) || row.count < 1) continue;
    totals[row.event] += row.count;
    byDay.get(row.day).total += row.count;
    byDay.get(row.day)[row.event] += row.count;
    const key = JSON.stringify([row.event, row.target, row.page]);
    const group = groups.get(key) || { event: row.event, target: row.target, page: row.page, count: 0 };
    group.count += row.count; groups.set(key, group);
  }
  const traffic = await readTraffic(db, start, end);
  return { days, start, end, totals, daily, traffic, breakdown: [...groups.values()].sort((a, b) => b.count - a.count), updated: now.toISOString() };
}

const number = value => value.toLocaleString('en-GB');
const dateLabel = value => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export function chart(report, kind = 'actions') {
  const unit = kind === 'views' ? 'page views' : 'actions';
  const max = Math.max(1, ...report.daily.map(row => row.total));
  const width = 1000; const height = 146; const plot = 130;
  const gap = report.days === 90 ? 2 : 5;
  const band = width / report.days;
  const bars = report.daily.map((row, index) => {
    const h = row.total / max * plot;
    return `<rect class="bar" x="${(index * band + gap / 2).toFixed(2)}" y="${(plot - h + 12).toFixed(2)}" width="${Math.max(1, band - gap).toFixed(2)}" height="${h.toFixed(2)}"><title>${escapeHtml(row.day)}: ${number(row.total)} ${unit}</title></rect>`;
  }).join('');
  return `<div class="chart-head"><h2>${kind === 'views' ? 'Daily page views' : 'Daily activity'}</h2><span>All ${unit} · highest day ${number(max === 1 && !report.daily.some(row => row.total) ? 0 : max)}</span></div>
  <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title-${kind} chart-desc-${kind}"><title id="chart-title-${kind}">Daily portfolio ${unit}</title><desc id="chart-desc-${kind}">${report.days} days, from ${report.start} to ${report.end}. The table below provides the exact daily values.</desc>
    <line class="baseline" x1="0" y1="142" x2="1000" y2="142"/>${bars}
  </svg><div class="chart-dates"><span>${dateLabel(report.start)}</span><span>${dateLabel(report.end)}</span></div>`;
}

export function renderReport(report) {
  const total = Object.values(report.totals).reduce((sum, n) => sum + n, 0);
  const options = [7, 30, 90].map(days => `<option value="${days}"${days === report.days ? ' selected' : ''}>Last ${days} days</option>`).join('');
  const summaries = EVENTS.map(([event, label]) => `<div><dt>${label}</dt><dd>${number(report.totals[event])}</dd></div>`).join('');
  const rows = report.breakdown.map(row => `<tr><td>${escapeHtml(labels[row.event])}</td><td>${escapeHtml(targets[row.target] || row.target)}</td><td>${escapeHtml(pageNames[row.page] || row.page)}</td><td class="numeric">${number(row.count)}</td></tr>`).join('');
  const dailyRows = [...report.daily].reverse().map(row => `<tr><th scope="row">${dateLabel(row.day)}</th>${EVENTS.map(([event]) => `<td class="numeric">${number(row[event])}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Portfolio analytics</title><link rel="stylesheet" href="/dashboard.css"></head>
  <body><a class="skip" href="#report">Skip to report</a><div class="shell">
  <header><a class="identity" href="/">Carlos Mezquita <span>/ admin</span></a><nav class="section-nav" aria-label="Sections"><a href="/" aria-current="page">Statistics</a><a href="/requests">Requests</a><a href="/content">Site content</a></nav><nav aria-label="Account"><span class="private">Owner access</span><a href="/cdn-cgi/access/logout">Sign out</a></nav></header>
  <main id="report"><div class="heading"><div><p class="eyebrow">PORTFOLIO REPORT</p><h1>Interest in your work.</h1><p class="period">${dateLabel(report.start)} to ${dateLabel(report.end)} ${report.end.slice(0, 4)} · UTC</p></div>
  <form method="get" action="/" class="filters"><label for="days">Date range</label><div><select name="days" id="days">${options}</select><button type="submit">Update report</button></div></form></div>
  ${report.traffic ? renderTraffic(report.traffic, report.daily) : ''}
  <h2 class="action-heading">Actions and enquiries</h2>
  <dl class="totals" aria-label="Action totals">${summaries}</dl>
  ${!total ? '<div class="empty"><h2>No recorded actions in this period.</h2><p>Once event tracking is published on your portfolio, new clicks and contact activity appear here. Try a longer date range if tracking is already active.</p></div>' : ''}
  <section class="activity" aria-label="Daily activity">${chart(report)}</section>
  <section class="breakdown"><div class="section-head"><h2>What people explored</h2><span>${number(total)} recorded actions</span></div>
  <div class="table-scroll" role="region" aria-label="Actions by target and page" tabindex="0"><table><caption class="sr-only">Action counts by link or project and page</caption><thead><tr><th scope="col">Action</th><th scope="col">Link or project</th><th scope="col">Page</th><th scope="col" class="numeric">Count</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="empty-cell">No actions to list yet.</td></tr>'}</tbody></table></div></section>
  <details class="daily"><summary>View daily numbers</summary><div class="table-scroll" role="region" aria-label="Daily action counts" tabindex="0"><table><caption class="sr-only">Daily values in UTC</caption><thead><tr><th scope="col">Day (UTC)</th>${EVENTS.map(([, label]) => `<th scope="col" class="numeric">${label}</th>`).join('')}</tr></thead><tbody>${dailyRows}</tbody></table></div></details>
  <aside class="notes"><h2>Reading this report</h2><p>These are action counts, not unique visitors. CV clicks show download intent; successful sends mean the email provider accepted the enquiry. Privacy preferences, blockers and free-plan limits can leave some actions uncounted.</p><p>The first day includes one setup-test CV click on the alternative layout. Data is retained for 90 days.</p><a href="https://carlosmezquita.dev/privacy.html" rel="noreferrer">Analytics privacy and choices <span aria-hidden="true">↗</span></a></aside>
  </main><footer><span>Private portfolio analytics</span><span>Updated ${escapeHtml(new Date(report.updated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }))} UTC · <a href="/?days=${report.days}">Refresh</a></span></footer></div></body></html>`;
}

export function renderError() {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Report unavailable</title><link rel="stylesheet" href="/dashboard.css"></head><body><main class="shell error"><p class="eyebrow">PORTFOLIO ANALYTICS</p><h1>The report couldn’t load.</h1><p>The database may be temporarily unavailable or at its free daily limit. Your existing counts have not been replaced with zeros.</p><p><a href="/">Try again</a> · <a href="/cdn-cgi/access/logout">Sign out</a></p></main></body></html>';
}

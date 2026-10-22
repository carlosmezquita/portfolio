import { chart, escapeHtml } from './report.mjs';

const names = {
  source: 'Traffic sources', device: 'Devices', browser: 'Browsers', viewport: 'Viewport widths',
  country: 'Approximate countries', scroll: 'Scroll milestones', visible: 'Visible-time milestones', load: 'Page load time',
};
const labels = {
  source: { direct: 'Direct / unavailable', internal: 'Within this portfolio', search: 'Search engines', github: 'GitHub', linkedin: 'LinkedIn', social: 'Social networks', other: 'Other websites' },
  device: { mobile: 'Mobile', tablet: 'Tablet', desktop: 'Desktop', unknown: 'Unknown' },
  browser: { chrome: 'Chrome family', edge: 'Edge', firefox: 'Firefox', safari: 'Safari', other: 'Other / unknown' },
  viewport: { small: 'Under 768 px', medium: '768–1199 px', large: '1200 px or wider', unknown: 'Unknown' },
  scroll: { 25: 'Reached 25%', 50: 'Reached 50%', 75: 'Reached 75%', 100: 'Reached 100%' },
  visible: { 10: 'Visible for 10 seconds', 30: 'Visible for 30 seconds', 60: 'Visible for 60 seconds' },
  load: { fast: 'Under 1 second', moderate: '1–3 seconds', slow: '3 seconds or longer' },
};
const number = n => n.toLocaleString('en-GB');

export async function readTraffic(db, start, end) {
  // Aggregate in SQL, so a 90-day report never transfers every counter row.
  const dimensions = await db.prepare(`SELECT metric, bucket, SUM(count) AS count FROM traffic_counts
    WHERE day >= ?1 AND day <= ?2 AND metric NOT IN ('requests', 'views')
    GROUP BY metric, bucket ORDER BY metric, count DESC, bucket`).bind(start, end).all();
  const activity = await db.prepare(`SELECT day, page, metric, SUM(count) AS count FROM traffic_counts
    WHERE day >= ?1 AND day <= ?2 AND metric IN ('requests', 'views')
    GROUP BY day, page, metric ORDER BY day, page, metric`).bind(start, end).all();
  if (!dimensions.success || !activity.success) throw new Error('Traffic report unavailable');
  const groups = Object.fromEntries(Object.keys(names).map(key => [key, []]));
  for (const row of dimensions.results) {
    if (Object.hasOwn(groups, row.metric) && Number.isSafeInteger(row.count) && row.count > 0) groups[row.metric].push(row);
  }
  const daily = new Map(); const pages = new Map();
  for (const row of activity.results) {
    if (!Number.isSafeInteger(row.count) || row.count < 1) continue;
    const day = daily.get(row.day) || { views: 0, requests: 0 };
    if (row.metric === 'views') {
      day.views += row.count;
      pages.set(row.page, (pages.get(row.page) || 0) + row.count);
    } else if (row.metric === 'requests') day.requests += row.count;
    daily.set(row.day, day);
  }
  return { groups, daily: Object.fromEntries(daily), pages: [...pages].sort((a, b) => b[1] - a[1]),
    views: [...pages.values()].reduce((a, b) => a + b, 0),
    capped: [...daily].filter(([, value]) => value.requests >= 5000).map(([day]) => day) };
}

export function renderTraffic(traffic, daily) {
  const rows = (values, label) => values.map(([bucket, count]) => `<tr><th scope="row">${escapeHtml(label(bucket))}</th><td class="numeric">${number(count)}</td></tr>`).join('') || '<tr><td colspan="2" class="empty-cell">No measurements in this period.</td></tr>';
  const table = (caption, body, countLabel = 'Page views') => `<div class="table-scroll" role="region" aria-label="${escapeHtml(caption)}" tabindex="0"><table><caption class="sr-only">${escapeHtml(caption)}</caption><thead><tr><th scope="col">${escapeHtml(caption)}</th><th scope="col" class="numeric">${countLabel}</th></tr></thead><tbody>${body}</tbody></table></div>`;
  const panels = Object.entries(names).map(([metric, title]) => {
    const values = traffic.groups[metric].map(row => [row.bucket, row.count]);
    const countLabel = ['scroll', 'visible', 'load'].includes(metric) ? 'Measurements' : 'Page views';
    return `<details class="traffic-detail"${metric === 'source' ? ' open' : ''}><summary>${title}</summary>${table(title, rows(values, bucket => labels[metric]?.[bucket] || bucket), countLabel)}</details>`;
  }).join('');
  const dailyRows = [...daily].reverse().map(row => `<tr><th scope="row">${escapeHtml(row.day)}</th><td class="numeric">${number(traffic.daily[row.day]?.views || 0)}</td></tr>`).join('');
  const dailyChart = daily.length ? chart({ days: daily.length, start: daily[0].day, end: daily.at(-1).day,
    daily: daily.map(row => ({ day: row.day, total: traffic.daily[row.day]?.views || 0 })) }, 'views') : '';
  return `<section class="traffic" aria-labelledby="traffic-heading"><div class="section-head"><h2 id="traffic-heading">Traffic and engagement</h2><span>${number(traffic.views)} recorded page views</span></div>
    <p class="report-context">Reloads count again. Breakdowns are separate totals and cannot be combined into a visitor profile. New measurements begin when this collector is published.</p>
    ${!traffic.views ? '<div class="empty"><h3>No page views recorded yet.</h3><p>Older action counts remain below. This report cannot reconstruct traffic from before collection started.</p></div>' : ''}
    ${traffic.capped.length ? `<p class="collection-warning" role="status">The daily collection limit was reached on ${traffic.capped.map(escapeHtml).join(', ')}. Those days are incomplete.</p>` : ''}
    <div class="activity">${dailyChart}</div>
    ${table('Pages', rows(traffic.pages, bucket => bucket))}
    <div class="traffic-breakdowns">${panels}</div>
    <details class="daily"><summary>View daily page views</summary>${table('Day (UTC)', dailyRows)}</details>
    <p class="report-context">Scroll and visible-time milestones count once each per page load and overlap. Visible time means the tab was in front, not proof of reading. Load time uses the browser navigation timing, not Core Web Vitals. Countries are approximate network locations; browser and device classifications are estimates. Missing referrers appear as direct / unavailable. Known bots are filtered, but forged traffic and unrecognised bots can still count.</p>
  </section>`;
}

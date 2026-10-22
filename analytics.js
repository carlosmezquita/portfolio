// Daily aggregate measurements. No cookies, visitor IDs or form values.
(() => {
  const hosts = new Set(['carlosmezquita.dev', 'www.carlosmezquita.dev']);
  const pages = new Set(['/', '/direction-b.html', '/projects/surfay/', '/projects/urbot/', '/projects/cadeira/']);
  const enabled = () => {
    let optedOut = false;
    try { optedOut = window.localStorage?.getItem('portfolio.analytics.disabled') === '1'; } catch { /* Storage may be blocked. */ }
    return !optedOut && hosts.has(location.hostname) && pages.has(location.pathname)
      && navigator.doNotTrack !== '1' && navigator.globalPrivacyControl !== true;
  };
  const endpoint = 'https://portfolio-events.cadeiraai.workers.dev/api/events';
  let started = false;
  let clicks = 0;
  const track = (event, target) => {
    if (!enabled()) return;
    // No retry queue: a blocked beacon or exhausted free quota loses the count.
    try {
      void fetch(endpoint, {
        method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true,
        referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, target, page: location.pathname }),
      }).catch(() => {});
    } catch { /* Tracking never changes the site's behaviour. */ }
  };
  window.portfolioAnalytics = Object.freeze({
    page: () => enabled() ? location.pathname : null,
  });
  document.addEventListener('input', (event) => {
    if (started || !event.isTrusted || !event.target.matches('[data-contact-form] [name="name"], [data-contact-form] [name="email"], [data-contact-form] [name="message"]')) return;
    started = true;
    track('contact_start', 'contact');
  });
  document.addEventListener('click', (event) => {
    if (!event.isTrusted || clicks >= 30) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    let action;
    if (url.origin === location.origin && url.pathname === '/Carlos-Mezquita-CV.pdf') action = ['cv_download', 'cv'];
    else if (url.hostname === 'github.com') {
      const target = link.dataset?.githubTarget || { '/carlosmezquita': 'profile', '/carlosmezquita/': 'profile', '/carlosmezquita/surfay': 'surfay', '/carlosmezquita/surfay/blob/main/docs/engineering.md': 'surfay-engineering' }[url.pathname];
      if (target) action = ['github_click', target];
    } else if (url.origin === location.origin || (url.protocol === 'https:' && link.dataset?.projectTarget)) {
      const project = link.dataset?.projectTarget || link.closest('[id="surfay"], [id="urbot"], [id="cadeira"]')?.id
        || ({ '#surfay': 'surfay', '#urbot': 'urbot', '#cadeira': 'cadeira' })[url.hash];
      if (project) action = ['project_click', project];
    }
    if (action) { clicks++; track(...action); }
  });

  const traffic = (type, values) => {
    if (!enabled()) return;
    try {
      void fetch(endpoint.replace('/events', '/traffic'), {
        method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true,
        referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, values, page: location.pathname }),
      }).catch(() => {});
    } catch { /* Statistics must never interrupt the portfolio. */ }
  };
  const source = () => {
    if (!document.referrer) return 'direct';
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      const within = domain => host === domain || host.endsWith(`.${domain}`);
      if (hosts.has(host)) return 'internal';
      if (within('github.com')) return 'github';
      if (within('linkedin.com') || within('lnkd.in')) return 'linkedin';
      if (['google.com', 'google.es', 'google.co.uk', 'bing.com', 'duckduckgo.com', 'search.yahoo.com', 'ecosia.org', 'brave.com'].some(within)) return 'search';
      if (['t.co', 'x.com', 'twitter.com', 'facebook.com', 'instagram.com', 'reddit.com', 'bsky.app'].some(within)) return 'social';
    } catch { /* Never transmit a raw referrer. */ }
    return 'other';
  };
  let viewed = false;
  let visibleMs = 0;
  let lastTick = 0;
  let timer;
  const visibleSent = new Set();
  const scrollSent = new Set();
  const show = () => {
    if (viewed || document.visibilityState !== 'visible' || !enabled()) return;
    viewed = true;
    const width = window.innerWidth;
    traffic('view', { source: source(), viewport: !Number.isFinite(width) ? 'unknown' : width < 768 ? 'small' : width < 1200 ? 'medium' : 'large' });
    // In-memory milestones, counted only while visible. Clamp long clock gaps
    // so suspended tabs/computers do not become hours of apparent engagement.
    lastTick = performance.now();
    timer = setInterval(() => {
      const now = performance.now();
      if (document.visibilityState === 'visible') visibleMs += Math.max(0, Math.min(2000, now - lastTick));
      lastTick = now;
      for (const seconds of [10, 30, 60]) {
        if (visibleMs >= seconds * 1000 && !visibleSent.has(seconds)) {
          visibleSent.add(seconds); traffic('visible', String(seconds));
        }
      }
      if (visibleSent.has(60) || !enabled()) clearInterval(timer);
    }, 1000);
    const load = () => {
      const navigation = performance.getEntriesByType?.('navigation')?.[0];
      const duration = navigation?.loadEventEnd;
      if (Number.isFinite(duration) && duration > 0) traffic('load', duration < 1000 ? 'fast' : duration < 3000 ? 'moderate' : 'slow');
    };
    if (document.readyState === 'complete') load();
    else window.addEventListener('load', () => setTimeout(load, 0), { once: true });
  };
  document.addEventListener('visibilitychange', () => {
    lastTick = performance.now();
    show();
  });
  document.addEventListener('scroll', event => {
    if (!event.isTrusted || !viewed || document.visibilityState !== 'visible') return;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    if (height <= 0) return;
    const depth = Math.min(100, Math.round(window.scrollY / height * 100));
    for (const threshold of [25, 50, 75, 100]) {
      if (depth >= threshold && !scrollSent.has(threshold)) {
        scrollSent.add(threshold); traffic('scroll', String(threshold));
      }
    }
  }, { passive: true });
  show();
})();

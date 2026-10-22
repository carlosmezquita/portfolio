// Anonymous daily action totals. No cookies, storage, visitor IDs or form values.
(() => {
  const hosts = new Set(['carlosmezquita.dev', 'www.carlosmezquita.dev']);
  const pages = new Set(['/', '/direction-b.html', '/projects/surfay/', '/projects/urbot/', '/projects/cadeira/']);
  const enabled = hosts.has(location.hostname) && pages.has(location.pathname)
    && navigator.doNotTrack !== '1' && navigator.globalPrivacyControl !== true;
  const endpoint = 'https://portfolio-events.cadeiraai.workers.dev/api/events';
  let started = false;
  let clicks = 0;
  const track = (event, target) => {
    if (!enabled) return;
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
    page: () => enabled ? location.pathname : null,
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
      const target = { '/carlosmezquita': 'profile', '/carlosmezquita/': 'profile', '/carlosmezquita/surfay': 'surfay', '/carlosmezquita/surfay/blob/main/docs/engineering.md': 'surfay-engineering' }[url.pathname];
      if (target) action = ['github_click', target];
    } else if (url.origin === location.origin) {
      const project = link.closest('[id="surfay"], [id="urbot"], [id="cadeira"]')?.id
        || ({ '#surfay': 'surfay', '#urbot': 'urbot', '#cadeira': 'cadeira' })[url.hash];
      if (project) action = ['project_click', project];
    }
    if (action) { clicks++; track(...action); }
  });
})();

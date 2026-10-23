// Cloudflare complements the custom action/engagement report with Web Vitals.
// Automatic injection must stay disabled: both collectors use the same choice.
(() => {
  let loaded = false;
  const load = () => {
    if (loaded || document.visibilityState !== 'visible' || !window.portfolioAnalytics?.page()) return;
    // A previously cached tracker may expose page() without the new preference
    // checks. Enforce privacy here too, independently of that cached script.
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return;
    try { if (window.localStorage?.getItem('portfolio.analytics.disabled') === '1') return; } catch { /* Browser privacy signals still apply when storage is blocked. */ }
    // Do not expose arbitrary query/fragment values to a third-party script.
    if (location.search || !['', '#main', '#projects', '#about', '#contact', '#surfay', '#urbot', '#cadeira'].includes(location.hash)) return;
    loaded = true;
    if (document.querySelector('script[src^="https://static.cloudflareinsights.com/beacon.min.js"]')) return;
    try {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      // Public site token from Cloudflare's own manual-install snippet, not a secret.
      script.setAttribute('data-cf-beacon', JSON.stringify({ token: '16ffcb16aedc49c1adbdfc3b6d34b3ba', spa: false }));
      script.referrerPolicy = 'strict-origin';
      document.head.append(script);
    } catch { /* Performance collection must not affect the site. */ }
  };
  document.addEventListener('visibilitychange', load);
  load();
})();

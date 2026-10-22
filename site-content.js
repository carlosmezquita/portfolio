// Published plain-text overrides; the checked-in portfolio remains the fallback.
(() => {
  const textKeys = ['intro', 'contact'];
  const linkKeys = ['surfay_code', 'surfay_notes', 'urbot_link', 'cadeira_link'];
  void fetch('https://portfolio-events.cadeiraai.workers.dev/api/content', {
    credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(4000),
  }).then(response => response.ok ? response.json() : null).then(content => {
    if (!content) return;
    for (const key of textKeys) {
      const element = document.querySelector(`[data-content="${key}"]`);
      if (element && typeof content[key] === 'string') element.textContent = content[key];
    }
    for (const key of linkKeys) {
      const link = document.querySelector(`[data-content-link="${key}"]`);
      if (!link || typeof content[key] !== 'string') continue;
      const value = content[key];
      if (value !== '#contact') {
        try { const url = new URL(value); if (url.protocol !== 'https:' || url.username || url.password) continue; }
        catch { continue; }
      } else if (!['urbot_link', 'cadeira_link'].includes(key)) continue;
      link.href = value;
      if (value !== '#contact' && ['urbot_link', 'cadeira_link'].includes(key)) {
        link.firstChild.textContent = key === 'urbot_link' ? 'Explore Urbot ' : 'Explore CadeiraAI ';
      }
    }
  }).catch(() => {});
})();

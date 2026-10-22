// This preference is written only after an explicit choice. It is never sent.
(() => {
  const key = 'portfolio.analytics.disabled';
  const status = document.querySelector('[data-analytics-status]');
  const update = () => {
    try {
      const disabled = localStorage.getItem(key) === '1';
      status.textContent = disabled ? 'Optional analytics is disabled in this browser for this site.'
        : navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true
          ? 'Your browser privacy signal disables optional analytics.'
          : 'Optional aggregate analytics is enabled. You can disable it below.';
    } catch { status.textContent = 'Your browser blocks preference storage. Use Global Privacy Control or Do Not Track to disable analytics.'; }
  };
  for (const button of document.querySelectorAll('[data-analytics-choice]')) button.addEventListener('click', () => {
    try {
      if (button.dataset.analyticsChoice === 'off') localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
      update();
    } catch { status.textContent = 'The preference could not be saved. Use Global Privacy Control or Do Not Track to disable analytics.'; }
  });
  window.addEventListener('storage', update);
  update();
})();

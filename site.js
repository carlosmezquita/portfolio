// Preserve links shared by the previous portfolio window interface.
const legacyProjects = { '#project/surfay': '#surfay', '#project/urbot': '#urbot', '#project/cadeira': '#cadeira' };
const destination = legacyProjects[window.location.hash];
if (destination) {
  window.history.replaceState(null, '', destination);
  document.querySelector(destination)?.scrollIntoView();
}

// One footer preference governs decorative motion throughout the page.
(() => {
  const toggle = document.querySelector('.footer-motion-toggle');
  if (!toggle) return;
  const root = document.documentElement;
  const background = document.querySelector('.background');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let visible = !('IntersectionObserver' in window);

  function sync() {
    const stopped = paused || preference.matches;
    root.classList.toggle('motion-paused', stopped);
    // Entrance effects are one-shot; do not hide/replay the form when resuming.
    if (stopped) root.classList.add('motion-settled');
    background?.classList.toggle('ambient-running', visible && !stopped && !document.hidden);
    toggle.hidden = preference.matches;
    toggle.textContent = paused ? 'Resume motion' : 'Pause motion';
  }

  function motionChanged() {
    sync();
    document.dispatchEvent(new Event('portfolio:motionchange'));
  }

  toggle.addEventListener('click', () => { paused = !paused; motionChanged(); });
  preference.addEventListener('change', motionChanged);
  document.addEventListener('visibilitychange', sync);
  if (background && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(background);
  }
  sync();
})();

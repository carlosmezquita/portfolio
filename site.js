// Preserve links shared by the previous portfolio window interface.
const legacyProjects = { '#project/surfay': '#surfay', '#project/urbot': '#urbot', '#project/cadeira': '#cadeira' };
const destination = legacyProjects[window.location.hash];
if (destination) {
  window.history.replaceState(null, '', destination);
  document.querySelector(destination)?.scrollIntoView();
}

// Quiet light beneath the sage band; CSS supplies a still wash without JavaScript.
(() => {
  const background = document.querySelector('.background');
  const toggle = document.querySelector('.background-motion-toggle');
  if (!background || !toggle) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let visible = !('IntersectionObserver' in window);

  function sync() {
    background.classList.toggle('ambient-running', visible && !paused && !preference.matches && !document.hidden);
    toggle.hidden = preference.matches;
    toggle.querySelector('span').textContent = paused ? 'Play glow' : 'Pause glow';
  }

  toggle.addEventListener('click', () => { paused = !paused; sync(); });
  preference.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(background);
  }
  sync();
})();

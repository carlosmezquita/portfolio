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
  const light = document.querySelector('.background-light');
  const surfay = document.querySelector('.surfay-card');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let visible = !('IntersectionObserver' in window);

  function sync() {
    const stopped = paused || preference.matches;
    const running = visible && !stopped && !document.hidden;
    if (!running && light && background?.classList.contains('ambient-running')) {
      // Keep the cursor offset where it is if motion stops while it is easing.
      light.style.setProperty('--background-pointer', getComputedStyle(light, '::before').translate);
    }
    root.classList.toggle('motion-paused', stopped);
    if (stopped) surfay?.style.removeProperty('--surfay-rider-transform');
    // Entrance effects are one-shot; do not hide/replay the form when resuming.
    if (stopped) root.classList.add('motion-settled');
    background?.classList.toggle('ambient-running', running);
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
  if (background && light) {
    const resetLight = () => light.style.removeProperty('--background-pointer');
    background.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !background.classList.contains('ambient-running')) return;
      const bounds = light.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX >= bounds.right ||
          event.clientY < bounds.top || event.clientY >= bounds.bottom) {
        resetLight();
        return;
      }
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      light.style.setProperty('--background-pointer', `${x * 12}px ${y * 8}px`);
    }, { passive: true });
    background.addEventListener('pointerleave', () => {
      if (background.classList.contains('ambient-running')) resetLight();
    }, { passive: true });
  }
  if (surfay) {
    const resetRider = () => surfay.style.removeProperty('--surfay-rider-transform');
    surfay.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || paused || preference.matches) return;
      const bounds = surfay.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      const alongWave = x * 28;
      // Track the painted board angle with a small vertical response to the pointer.
      const downFace = -alongWave * .34 + y * 6;
      surfay.style.setProperty('--surfay-rider-transform', `translate(${alongWave}px, ${downFace}px) rotate(${x * 2}deg)`);
    }, { passive: true });
    surfay.addEventListener('pointerleave', resetRider, { passive: true });
  }
  if (background && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(background);
  }
  sync();
})();

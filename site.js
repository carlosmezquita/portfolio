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
  const cards = document.querySelectorAll('.work-card');
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
    if (stopped) for (const card of cards) card.style.removeProperty('--project-art-transform');
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
  for (const card of cards) {
    const followsWave = card.classList.contains('surfay-card');
    const resetArt = () => card.style.removeProperty('--project-art-transform');
    card.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || paused || preference.matches) return;
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      const across = x * (followsWave ? 28 : 14);
      // The board tracks the wave slope. The other illustrations drift gently.
      const down = y * 6 - (followsWave ? across * .34 : 0);
      card.style.setProperty('--project-art-transform', `translate(${across}px, ${down}px) rotate(${x * 2}deg)`);
    }, { passive: true });
    card.addEventListener('pointerleave', resetArt, { passive: true });
  }
  if (background && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(background);
  }
  sync();
})();

// Keep the scroll rail native and add step controls where the cards overflow.
(() => {
  const rail = document.querySelector('#project-cards');
  const controls = document.querySelector('.work-controls');
  if (!rail || !controls) return;
  const [previous, next] = controls.querySelectorAll('button');
  const [firstCard, secondCard] = rail.children;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const maxScroll = () => rail.scrollWidth - rail.clientWidth;
  const sync = () => {
    const overflow = maxScroll() > 1;
    controls.hidden = !overflow;
    if (overflow) rail.tabIndex = 0;
    else rail.removeAttribute('tabindex');
    previous.setAttribute('aria-disabled', String(rail.scrollLeft < 1));
    next.setAttribute('aria-disabled', String(rail.scrollLeft >= maxScroll() - 1));
  };
  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-work-scroll]');
    if (!button || button.getAttribute('aria-disabled') === 'true') return;
    const step = secondCard.getBoundingClientRect().left - firstCard.getBoundingClientRect().left;
    const still = reducedMotion.matches || document.documentElement.classList.contains('motion-paused');
    const end = maxScroll();
    const target = rail.scrollLeft + Number(button.dataset.workScroll) * step;
    rail.scrollTo({ left: target > end - 32 ? end : Math.max(0, target), behavior: still ? 'auto' : 'smooth' });
  });
  rail.addEventListener('scroll', sync, { passive: true });
  new ResizeObserver(sync).observe(rail);
  sync();
})();

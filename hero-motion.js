// A living version of the blue/teal identity field. No animation dependencies.
(() => {
  const poster = document.querySelector('.hero-poster');
  const canvas = document.querySelector('.identity-motion');
  const toggle = document.querySelector('.motion-toggle');
  if (!poster || !canvas || !toggle) return;
  let context;
  try { context = canvas.getContext('2d', { alpha: false }); } catch { return; }
  if (!context) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let visible = true;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let lastPaint = 0;
  const pointer = { x: .5, y: .35, strength: 0 };
  const pointerTarget = { x: .5, y: .35, strength: 0 };

  function releasePointer() {
    pointerTarget.strength = 0;
  }

  function trackPointer(event) {
    if (paused || reducedMotion.matches || document.hidden || !visible) return;
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const bounds = poster.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointerTarget.x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    pointerTarget.y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    pointerTarget.strength = 1;
  }

  function blob(x, y, radiusX, radiusY, angle, color, opacity = 1) {
    // Pull existing colour fields toward the pointer rather than add a cursor glow.
    const dx = pointer.x - x;
    const dy = pointer.y - y;
    const proximity = Math.exp(-(dx * dx * 3 + dy * dy));
    const pull = pointer.strength * (.055 + proximity * .19);
    x += dx * pull;
    y += dy * pull;
    angle += (pointer.x - .5) * pointer.strength * .12;
    radiusX *= 1 + proximity * pointer.strength * .08;
    context.save();
    context.translate(x * canvas.width, y * canvas.height);
    context.rotate(angle);
    context.scale(radiusX * canvas.width, radiusY * canvas.height);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(${color},${opacity})`);
    gradient.addColorStop(.28, `rgba(${color},${opacity * .86})`);
    gradient.addColorStop(.55, `rgba(${color},${opacity * .44})`);
    gradient.addColorStop(.8, `rgba(${color},${opacity * .1})`);
    gradient.addColorStop(1, `rgba(${color},0)`);
    context.fillStyle = gradient;
    context.fillRect(-1, -1, 2, 2);
    context.restore();
  }

  function paint() {
    const w = canvas.width;
    const h = canvas.height;
    const t = elapsed / 1000;
    // Different long periods keep the composition flowing without a visible reset.
    const a = Math.sin(t / 9);
    const b = Math.sin(t / 13);
    const c = Math.sin(t / 17);
    context.fillStyle = '#020d27';
    context.fillRect(0, 0, w, h);
    blob(.08 + a * .045, -.04 + b * .05, .25, .8, -.12, '9,151,163', .94);
    blob(.59 + b * .065, .02 + a * .08, .37, 1.12, -.08, '12,104,234', .98);
    blob(.68 + a * .06, -.12 + c * .07, .27, 1.0, .08, '75,198,255', 1);
    blob(.99 + c * .04, .02 + b * .11, .23, .78, -.13, '122,221,210', .96);
    blob(.88 + b * .06, .43 + a * .1, .23, .51, -.22, '0,190,158', .88);
    blob(.39 + c * .04, .04 + b * .05, .08, .77, .2, '31,95,205', .5);

    // The soft diagonal ribbon is part of the original artwork's character.
    context.save();
    context.filter = `blur(${w * .017}px)`;
    context.beginPath();
    context.moveTo(-w * .08, h * (.64 + b * .06));
    const bendX = (pointer.x - .5) * pointer.strength * .16;
    const bendY = (pointer.y - .35) * pointer.strength * .18;
    context.bezierCurveTo(w * (.08 + bendX), h * (.49 + bendY), w * (.27 + a * .035 + bendX), h * (.29 + bendY), w * .28, -h * .16);
    context.strokeStyle = 'rgba(174,214,240,.68)';
    context.lineWidth = w * .028;
    context.stroke();
    context.restore();

    // Maintain the deep lower edge and readable name throughout the movement.
    const shade = context.createLinearGradient(0, h * .18, 0, h);
    shade.addColorStop(0, 'rgba(2,13,39,0)');
    shade.addColorStop(.62, 'rgba(2,13,39,.25)');
    shade.addColorStop(1, 'rgba(2,13,39,.88)');
    context.fillStyle = shade;
    context.fillRect(0, 0, w, h);
  }

  function resize() {
    // Soft shapes need no full-resolution canvas; cap work on high-DPI screens.
    const width = Math.max(1, Math.min(1000, Math.round(poster.clientWidth)));
    const height = Math.max(1, Math.round(width * poster.clientHeight / poster.clientWidth));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      paint();
    }
  }

  function tick(time) {
    const delta = lastTime ? Math.min(time - lastTime, 100) : 0;
    elapsed += delta;
    lastTime = time;
    // Respond promptly, then settle more slowly when the pointer leaves.
    const easing = 1 - Math.exp(-delta / (pointerTarget.strength ? 180 : 650));
    pointer.x += (pointerTarget.x - pointer.x) * easing;
    pointer.y += (pointerTarget.y - pointer.y) * easing;
    pointer.strength += (pointerTarget.strength - pointer.strength) * easing;
    // Slow movement stays smooth at 24fps while leaving the rest of the page idle.
    if (time - lastPaint >= 1000 / 24) {
      paint();
      lastPaint = time;
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    const enabled = !reducedMotion.matches;
    if (paused || !enabled || !visible || document.hidden) releasePointer();
    if (!enabled) pointer.strength = 0;
    poster.classList.toggle('motion-ready', enabled);
    toggle.hidden = !enabled;
    if (enabled && !paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.textContent = paused ? 'Play motion' : 'Pause motion';
    sync();
  });
  poster.addEventListener('pointermove', trackPointer, { passive: true });
  poster.addEventListener('pointerleave', releasePointer, { passive: true });
  poster.addEventListener('pointercancel', releasePointer, { passive: true });
  window.addEventListener('blur', releasePointer);
  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(poster);
  else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(poster);
  }
  resize();
  sync();
})();

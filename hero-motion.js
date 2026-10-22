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
  const bubbles = Array.from({ length: 6 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, squash: 0, vs: 0 }));
  let touch = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const interactive = () => !paused && !reducedMotion.matches && !document.hidden && visible;

  function pointAt(event) {
    const bounds = poster.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    return { x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1) };
  }

  function centers() {
    const t = elapsed / 1000;
    const a = Math.sin(t / 9), b = Math.sin(t / 13), c = Math.sin(t / 17);
    return [[.08 + a * .045, -.04 + b * .05], [.59 + b * .065, .02 + a * .08],
      [.68 + a * .06, -.12 + c * .07], [.99 + c * .04, .02 + b * .11],
      [.88 + b * .06, .43 + a * .1], [.39 + c * .04, .04 + b * .05]];
  }

  function nudge(point, moveX = 0, moveY = 0, power = 1) {
    const positions = centers();
    bubbles.forEach((bubble, index) => {
      const dx = positions[index][0] + bubble.x - point.x;
      const dy = positions[index][1] + bubble.y - point.y;
      const weight = Math.exp(-(dx * dx * 3 + dy * dy) * 2.5);
      const distance = Math.max(.12, Math.hypot(dx, dy));
      bubble.vx = clamp(bubble.vx + (dx / distance * .48 * power + moveX * 3) * weight, -1.2, 1.2);
      bubble.vy = clamp(bubble.vy + (dy / distance * .55 * power + moveY * 3) * weight, -1.2, 1.2);
      bubble.vs = clamp(bubble.vs + weight * (1.6 * power + Math.hypot(moveX, moveY) * 8), -3, 3);
    });
  }

  function updateBubbles(delta) {
    const steps = Math.max(1, Math.ceil(delta / 8));
    const dt = delta / 1000 / steps;
    const positions = centers();
    const aspect = canvas.height / canvas.width;
    for (let step = 0; step < steps; step++) {
      // Soft contact only when an interaction compresses neighbours beyond their ambient overlap.
      for (let i = 0; i < bubbles.length; i++) for (let j = i + 1; j < bubbles.length; j++) {
        const restX = positions[j][0] - positions[i][0];
        const restY = (positions[j][1] - positions[i][1]) * aspect;
        const dx = restX + bubbles[j].x - bubbles[i].x;
        const dy = restY + (bubbles[j].y - bubbles[i].y) * aspect;
        const distance = Math.max(.001, Math.hypot(dx, dy));
        const compression = Math.hypot(restX, restY) * .8 - distance;
        if (compression > 0) {
          const force = compression * 65 * dt;
          bubbles[i].vx -= dx / distance * force;
          bubbles[j].vx += dx / distance * force;
          bubbles[i].vy -= dy / distance * force;
          bubbles[j].vy += dy / distance * force;
        }
      }
      for (const bubble of bubbles) {
        bubble.vx += (-62 * bubble.x - 9 * bubble.vx) * dt;
        bubble.vy += (-62 * bubble.y - 9 * bubble.vy) * dt;
        bubble.vs += (-110 * bubble.squash - 11 * bubble.vs) * dt;
        bubble.x += bubble.vx * dt;
        bubble.y += bubble.vy * dt;
        bubble.squash += bubble.vs * dt;
      }
    }
  }

  function endTouch() {
    touch = null;
    releasePointer();
  }

  function startTouch(event) {
    if (event.pointerType !== 'touch') return;
    if (!event.isPrimary) { endTouch(); return; }
    if (!interactive() || event.target.closest('button,a')) return;
    const point = pointAt(event);
    if (!point) return;
    touch = { id: event.pointerId, startX: event.clientX, startY: event.clientY,
      startTime: event.timeStamp, lastTime: event.timeStamp, point, mode: 'pending', vx: 0, vy: 0 };
  }

  function moveTouch(event) {
    if (!touch || touch.id !== event.pointerId || !interactive()) return;
    const dx = event.clientX - touch.startX;
    const dy = event.clientY - touch.startY;
    // Yield before making any change when the gesture is a vertical page scroll.
    if (touch.mode === 'pending' && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { endTouch(); return; }
    if (touch.mode === 'pending' && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) touch.mode = 'drag';
    const point = pointAt(event);
    if (!point) return;
    if (touch.mode === 'drag') {
      const seconds = Math.max(.016, (event.timeStamp - touch.lastTime) / 1000);
      const moveX = point.x - touch.point.x, moveY = point.y - touch.point.y;
      touch.vx = clamp(moveX / seconds, -2, 2);
      touch.vy = clamp(moveY / seconds, -2, 2);
      nudge(point, moveX, moveY, 0);
      pointerTarget.x = point.x;
      pointerTarget.y = point.y;
      pointerTarget.strength = 1;
    }
    touch.point = point;
    touch.lastTime = event.timeStamp;
  }

  function finishTouch(event) {
    if (!touch || touch.id !== event.pointerId) return;
    if (interactive()) {
      const travel = Math.hypot(event.clientX - touch.startX, event.clientY - touch.startY);
      if (touch.mode === 'pending' && travel < 12 && event.timeStamp - touch.startTime < 500) nudge(touch.point);
      if (touch.mode === 'drag') {
        // Old movement is not a fling if the finger stopped before release.
        const fresh = event.timeStamp - touch.lastTime < 100;
        nudge(touch.point, fresh ? touch.vx * .045 : 0, fresh ? touch.vy * .045 : 0, .12);
      }
    }
    endTouch();
  }

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

  function blob(index, x, y, radiusX, radiusY, angle, color, opacity = 1) {
    // Pull existing colour fields toward the pointer rather than add a cursor glow.
    const dx = pointer.x - x;
    const dy = pointer.y - y;
    const proximity = Math.exp(-(dx * dx * 3 + dy * dy));
    const pull = pointer.strength * (.055 + proximity * .19);
    x += dx * pull;
    y += dy * pull;
    angle += (pointer.x - .5) * pointer.strength * .12;
    radiusX *= 1 + proximity * pointer.strength * .08;
    const bubble = bubbles[index];
    x += bubble.x;
    y += bubble.y;
    // Stretch and compress in opposite axes, like a soft volume retaining its area.
    const stretch = Math.exp(clamp(bubble.squash + Math.hypot(bubble.vx, bubble.vy) * .06, -.2, .2));
    radiusX *= stretch;
    radiusY /= stretch;
    angle += bubble.vx * .08;
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
    blob(0, .08 + a * .045, -.04 + b * .05, .25, .8, -.12, '9,151,163', .94);
    blob(1, .59 + b * .065, .02 + a * .08, .37, 1.12, -.08, '12,104,234', .98);
    blob(2, .68 + a * .06, -.12 + c * .07, .27, 1.0, .08, '75,198,255', 1);
    blob(3, .99 + c * .04, .02 + b * .11, .23, .78, -.13, '122,221,210', .96);
    blob(4, .88 + b * .06, .43 + a * .1, .23, .51, -.22, '0,190,158', .88);
    blob(5, .39 + c * .04, .04 + b * .05, .08, .77, .2, '31,95,205', .5);

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
    updateBubbles(delta);
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
    if (paused || !enabled || !visible || document.hidden) endTouch();
    poster.classList.toggle('motion-paused', paused);
    if (!enabled) {
      pointer.strength = 0;
      for (const bubble of bubbles) Object.assign(bubble, { x: 0, y: 0, vx: 0, vy: 0, squash: 0, vs: 0 });
    }
    poster.classList.toggle('motion-ready', enabled);
    toggle.hidden = !enabled;
    if (enabled && !paused && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.textContent = paused ? 'Play motion' : 'Pause motion';
    sync();
  });
  poster.addEventListener('pointerdown', startTouch, { passive: true });
  poster.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') moveTouch(event);
    else trackPointer(event);
  }, { passive: true });
  poster.addEventListener('pointerup', finishTouch, { passive: true });
  poster.addEventListener('pointerleave', releasePointer, { passive: true });
  poster.addEventListener('pointercancel', endTouch, { passive: true });
  window.addEventListener('blur', endTouch);
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

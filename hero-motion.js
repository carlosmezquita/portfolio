// A living version of the blue/teal identity field. No animation dependencies.
(() => {
  const poster = document.querySelector('.hero-poster');
  const canvas = document.querySelector('.identity-motion');
  if (!poster || !canvas) return;
  let context;
  try { context = canvas.getContext('2d', { alpha: false }); } catch { return; }
  if (!context) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isPaused = () => document.documentElement.classList.contains('motion-paused');
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
  const interactive = () => !isPaused() && !reducedMotion.matches && !document.hidden && visible;

  function pointAt(event) {
    const bounds = poster.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    return { x: clamp((event.clientX - bounds.left) / bounds.width, 0, 1),
      y: clamp((event.clientY - bounds.top) / bounds.height, 0, 1) };
  }

  function centers() {
    const t = elapsed / 1000;
    // Buoyant rise/fall paths have different periods, so the wax never resets as a group.
    return [
      [.15 + .04 * Math.sin(t / 12), .35 + .24 * Math.sin(t / 9 - .6)],
      [.48 + .06 * Math.sin(t / 16 + .4), .33 + .24 * Math.sin(t / 12 + .7)],
      [.68 + .05 * Math.sin(t / 14 + 1), .28 + .28 * Math.sin(t / 10 + 2.4)],
      [.92 + .04 * Math.sin(t / 17 + 2), .21 + .27 * Math.sin(t / 13 + 3.2)],
      [.83 + .06 * Math.sin(t / 11 + 3), .44 + .20 * Math.sin(t / 14 - 1.1)],
      [.32 + .05 * Math.sin(t / 19 + 1), .32 + .26 * Math.sin(t / 11 + 4.4)]
    ];
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
    if (isPaused() || reducedMotion.matches || document.hidden || !visible) return;
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
    const breathing = .10 * Math.sin(elapsed / 1000 / (10 + index * 1.7) + index);
    const stretch = Math.exp(clamp(breathing + bubble.squash + Math.hypot(bubble.vx, bubble.vy) * .06, -.25, .25));
    radiusX *= stretch;
    radiusY /= stretch;
    angle += bubble.vx * .08;
    drawGlow(x, y, radiusX, radiusY, angle, color, opacity);
  }

  function drawGlow(x, y, radiusX, radiusY, angle, color, opacity) {
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
    // Keep the original identity's diffuse upper colour behind the moving wax.
    drawGlow(.09, -.13, .31, .97, -.1, '9,151,163', .65);
    drawGlow(.66, -.13, .49, 1.25, -.1, '12,104,234', .62);
    drawGlow(.96, .10, .30, .99, -.15, '0,176,149', .38);
    const positions = centers();
    const aspect = w / h;
    const fields = [
      [.145, 1.10, -.12, '9,151,163', .88],
      [.185, 1.12, -.08, '12,104,234', .96],
      [.145, 1.05, .08, '75,198,255', .95],
      [.13, 1.12, -.13, '122,221,210', .82],
      [.15, 1.10, -.22, '0,190,158', .88],
      [.10, 1.28, .20, '31,95,205', .72]
    ];
    fields.forEach(([radius, vertical, angle, color, opacity], index) => {
      blob(index, positions[index][0], positions[index][1], radius,
        radius * aspect * vertical, angle, color, opacity);
    });

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
    shade.addColorStop(.62, 'rgba(2,13,39,.58)');
    shade.addColorStop(1, 'rgba(2,13,39,.96)');
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
    if (isPaused() || !enabled || !visible || document.hidden) endTouch();
    poster.classList.toggle('motion-paused', isPaused());
    if (!enabled) {
      pointer.strength = 0;
      for (const bubble of bubbles) Object.assign(bubble, { x: 0, y: 0, vx: 0, vy: 0, squash: 0, vs: 0 });
    }
    poster.classList.toggle('motion-ready', enabled);
    if (enabled && !isPaused() && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  document.addEventListener('portfolio:motionchange', sync);
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

// Behaviour checks for the decorative field, without a browser or dependencies.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../hero-motion.js'), 'utf8');

function scene({ reduced = false, unavailable = false, width = 390, height = 250 } = {}) {
  const frames = new Map(), events = {}, classes = new Set(), positions = [], scales = [];
  let sequence = 0, observer, paints = 0, paused = false;
  const gradient = { addColorStop() {} };
  const context = new Proxy({
    createRadialGradient: () => gradient, createLinearGradient: () => gradient,
    translate(x, y) { positions.push([x, y]); }, scale(x, y) { scales.push([x, y]); },
    fillRect() { paints++; }
  }, { get: (o, k) => o[k] ?? (() => {}), set: (o, k, v) => (o[k] = v, true) });
  const poster = {
    clientWidth: width, clientHeight: height,
    getBoundingClientRect: () => ({ left: 10, top: 20, width, height }),
    classList: { toggle(k, v) { v ? classes.add(k) : classes.delete(k); } },
    addEventListener(k, fn) { events[k] = fn; }
  };
  const canvas = { width: 0, height: 0, getContext: () => unavailable ? null : context };
  const media = { matches: reduced, addEventListener(k, fn) { events.media = fn; } };
  const document = {
    hidden: false,
    documentElement: { classList: { contains: () => paused } },
    querySelector: s => ({ '.hero-poster': poster, '.identity-motion': canvas })[s],
    addEventListener(k, fn) { events[k] = fn; }
  };
  const sandbox = {
    document, matchMedia: () => media, addEventListener(k, fn) { events[k] = fn; },
    requestAnimationFrame(fn) { const id = ++sequence; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    ResizeObserver: class { observe() {} },
    IntersectionObserver: class { constructor(fn) { observer = fn; } observe() {} }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox);
  return {
    events, frames, document, media, classes, paints: () => paints,
    geometry: () => ({ positions: positions.slice(-6), scales: scales.slice(-6) }),
    visible: value => observer([{ isIntersecting: value }]),
    pause() { paused = !paused; events['portfolio:motionchange'](); },
    send(type, x, y, time, options = {}) {
      events[type]({ pointerId: 1, pointerType: 'touch', isPrimary: true,
        clientX: 10 + x * width, clientY: 20 + y * height, timeStamp: time,
        target: { closest: () => null }, ...options });
    },
    step(time) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(time)); }
  };
}
function advance(scenes, start, end) { for (let t = start; t <= end; t += 16) scenes.forEach(s => s.step(t)); }
function difference(a, b) { return Math.max(...a.geometry().positions.flat().map((n, i) => Math.abs(n - b.geometry().positions.flat()[i]))); }
function tap(s, options = {}) { s.send('pointerdown', .65, .3, 20, options); s.send('pointerup', .65, .3, 80, options); }

const baseline = scene(), tapped = scene();
advance([baseline, tapped], 16, 16); tap(tapped);
advance([baseline, tapped], 32, 192);
assert(difference(baseline, tapped) > 2, 'tap visibly displaces fields');
assert.notDeepEqual(baseline.geometry().scales, tapped.geometry().scales, 'tap changes soft shape');
const initialOffset = tapped.geometry().positions[4][0] - baseline.geometry().positions[4][0];
advance([baseline, tapped], 208, 800);
assert(initialOffset * (tapped.geometry().positions[4][0] - baseline.geometry().positions[4][0]) < 0, 'spring rebounds past rest');
advance([baseline, tapped], 816, 10800);
assert(difference(baseline, tapped) < .01, 'spring settles to ambient motion');

for (const kind of ['vertical', 'cancel', 'pinch', 'control', 'longpress']) {
  const a = scene(), b = scene(); advance([a, b], 16, 16);
  b.send('pointerdown', .65, .3, 20, kind === 'control' ? { target: { closest: () => ({}) } } : {});
  if (kind === 'vertical') b.send('pointermove', .66, .6, 60);
  if (kind === 'cancel') b.send('pointercancel', .65, .3, 60);
  if (kind === 'pinch') b.send('pointerdown', .7, .3, 60, { pointerId: 2, isPrimary: false });
  b.send('pointerup', .65, .3, kind === 'longpress' ? 800 : 100);
  advance([a, b], 32, 800);
  assert.deepEqual(a.geometry(), b.geometry(), `${kind} does not trigger a tap`);
}
const plain = scene(), dragged = scene(); advance([plain, dragged], 16, 16);
dragged.send('pointerdown', .2, .3, 20);
dragged.send('pointermove', .5, .31, 80);
dragged.send('pointermove', .8, .3, 130);
advance([plain, dragged], 32, 192);
assert(difference(plain, dragged) > 5, 'horizontal sweep stirs fields');
dragged.send('pointerup', .8, .3, 160);
advance([plain, dragged], 208, 10800);
assert(difference(plain, dragged) < .01, 'release settles after horizontal sweep');

const desktop = scene(), mouse = scene();
mouse.send('pointermove', .1, .3, 20, { pointerType: 'mouse' });
advance([desktop, mouse], 16, 800); assert(difference(desktop, mouse) > 10, 'desktop cursor attraction retained');
mouse.pause(); const count = mouse.paints(); tap(mouse); mouse.step(1000);
assert.equal(mouse.paints(), count, 'pause freezes touch and ambient motion');
mouse.pause(); assert(mouse.frames.size);
mouse.visible(false); assert.equal(mouse.frames.size, 0);
mouse.visible(true); mouse.document.hidden = true; mouse.events.visibilitychange(); assert.equal(mouse.frames.size, 0);
mouse.document.hidden = false; mouse.events.visibilitychange(); assert(mouse.frames.size);
mouse.media.matches = true; mouse.events.media(); assert.equal(mouse.frames.size, 0);
const reduced = scene({ reduced: true }); tap(reduced); assert.equal(reduced.frames.size, 0);
const fallback = scene({ unavailable: true }); assert.equal(fallback.frames.size, 0);
console.log('PASS: tap impulse, squash/stretch, spring rebound and settling, horizontal stirring, vertical-scroll cancellation, pinch/cancel/control/long-press guards, desktop cursor, pause, reduced motion and visibility.');

// Desktop wax must move vertically and change shape even when no pointer is present.
const lava = scene({ width: 1200, height: 447 });
advance([lava], 16, 16); const first = lava.geometry();
advance([lava], 32, 8016); const later = lava.geometry();
assert(later.positions.some((position, index) => Math.abs(position[1] - first.positions[index][1]) > 30), 'autonomous desktop rise/fall');
assert.notDeepEqual(first.scales, later.scales, 'autonomous wax deformation');
const rest = scene({ width: 1200, height: 447 }), cursor = scene({ width: 1200, height: 447 });
cursor.send('pointermove', .95, .4, 20, { pointerType: 'mouse' });
advance([rest, cursor], 16, 800);
assert(difference(rest, cursor) > 20, 'cursor affects desktop lava flow');
cursor.events.pointerleave(); advance([rest, cursor], 816, 10800);
assert(difference(rest, cursor) < .01, 'cursor release returns to the lava path');
console.log('PASS: autonomous desktop rise/fall, wax deformation, cursor attraction and release at desktop width.');

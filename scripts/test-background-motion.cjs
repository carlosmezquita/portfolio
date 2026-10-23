const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sources = ['site.js', 'hero-motion.js'].map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));

function classList() {
  const values = new Set();
  return { add: name => values.add(name), contains: name => values.has(name),
    toggle(name, enabled) { enabled ? values.add(name) : values.delete(name); } };
}

// Run the controller and hero together to verify the shared pause state.
function scene({ reduced = false, observer = true, canvasAvailable = true } = {}) {
  const events = {}, mediaEvents = [], observers = new Map(), frames = new Map();
  let nextFrame = 0;
  const root = { classList: classList() }, background = { classList: classList() };
  const toggle = { hidden: true, textContent: '', addEventListener(_, handler) { events.click = handler; } };
  const preference = { matches: reduced, addEventListener(_, handler) { mediaEvents.push(handler); } };
  const gradient = { addColorStop() {} };
  const context = new Proxy({ createRadialGradient: () => gradient, createLinearGradient: () => gradient },
    { get: (object, key) => object[key] ?? (() => {}) });
  const canvas = { width: 0, height: 0, getContext: () => canvasAvailable ? context : null };
  const poster = { clientWidth: 390, clientHeight: 250, classList: classList(),
    addEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 250 }) };
  const document = {
    hidden: false, documentElement: root,
    querySelector: selector => ({ '.footer-motion-toggle': toggle, '.background': background,
      '.hero-poster': poster, '.identity-motion': canvas })[selector],
    addEventListener(name, handler) { (events[name] ??= []).push(handler); },
    dispatchEvent(event) { for (const handler of events[event.type] ?? []) handler(event); },
  };
  const window = { location: { hash: '' }, matchMedia: () => preference, addEventListener() {} };
  if (observer) window.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; }
    observe(target) { observers.set(target, this.callback); }
  };
  const sandbox = { document, window, Event: class { constructor(type) { this.type = type; } },
    IntersectionObserver: window.IntersectionObserver, ResizeObserver: class { observe() {} },
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); } };
  const runtime = vm.createContext(sandbox);
  sources.forEach(source => vm.runInContext(source, runtime));
  return { document, preference, toggle, root,
    visible(value) { for (const callback of observers.values()) callback([{ isIntersecting: value }]); },
    click() { events.click(); },
    hidden(value) { document.hidden = value; document.dispatchEvent({ type: 'visibilitychange' }); },
    reduce(value) { preference.matches = value; mediaEvents.forEach(handler => handler()); },
    running: () => background.classList.contains('ambient-running'),
    heroRunning: () => frames.size > 0,
  };
}

test('one footer action pauses and resumes both fields and retains pause across re-entry', () => {
  const s = scene(); s.visible(true);
  assert(s.running()); assert(s.heroRunning());
  s.click(); assert(!s.running()); assert(!s.heroRunning());
  assert(s.root.classList.contains('motion-paused'));
  assert(s.root.classList.contains('motion-settled'));
  assert.equal(s.toggle.textContent, 'Resume motion');
  s.visible(false); s.visible(true); assert(!s.running()); assert(!s.heroRunning());
  s.click(); assert(s.running()); assert(s.heroRunning());
  assert.equal(s.toggle.textContent, 'Pause motion');
  s.hidden(true); assert(!s.running()); assert(!s.heroRunning());
  s.hidden(false); assert(s.running()); assert(s.heroRunning());
  s.visible(false); assert(!s.running()); assert(!s.heroRunning());
});

test('OS reduced motion takes precedence and preference changes reach both fields', () => {
  const s = scene({ reduced: true }); s.visible(true);
  assert(!s.running()); assert(!s.heroRunning()); assert(s.toggle.hidden);
  s.reduce(false); assert(s.running()); assert(s.heroRunning()); assert(!s.toggle.hidden);
  s.click(); s.reduce(true); s.reduce(false);
  assert(!s.running()); assert(!s.heroRunning());
  assert.equal(s.toggle.textContent, 'Resume motion');
});

test('global control works without canvas or intersection observation', () => {
  const s = scene({ observer: false, canvasAvailable: false });
  assert(s.running()); assert(!s.heroRunning()); assert(!s.toggle.hidden);
  s.click(); assert(!s.running());
  s.hidden(true); s.hidden(false); assert(!s.running());
  s.click(); assert(s.running());
});

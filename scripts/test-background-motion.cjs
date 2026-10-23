const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../site.js'), 'utf8');

function scene({ reduced = false, observer = true } = {}) {
  const classes = new Set(), events = {};
  const label = { textContent: '' };
  const background = { classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } } };
  const toggle = {
    hidden: true, querySelector: () => label,
    addEventListener(name, handler) { events[name] = handler; },
  };
  const preference = { matches: reduced, addEventListener(_, handler) { events.preference = handler; } };
  const document = {
    hidden: false, querySelector: selector => selector === '.background' ? background : toggle,
    addEventListener(_, handler) { events.visibility = handler; },
  };
  let intersect;
  const window = { location: { hash: '' }, matchMedia: () => preference };
  if (observer) window.IntersectionObserver = class {
    constructor(callback) { intersect = callback; }
    observe() {}
  };
  vm.runInNewContext(source, { document, window, IntersectionObserver: window.IntersectionObserver });
  return { document, preference, toggle, label, events,
    visible(value) { intersect([{ isIntersecting: value }]); },
    running: () => classes.has('ambient-running'),
  };
}

test('ambient light follows visibility and retains a user pause across re-entry', () => {
  const s = scene();
  assert.equal(s.running(), false);
  s.visible(true); assert.equal(s.running(), true);
  s.events.click(); assert.equal(s.running(), false);
  assert.equal(s.label.textContent, 'Play glow');
  s.visible(false); s.visible(true); assert.equal(s.running(), false);
  s.events.click(); assert.equal(s.running(), true);
  s.document.hidden = true; s.events.visibility(); assert.equal(s.running(), false);
  s.document.hidden = false; s.events.visibility(); assert.equal(s.running(), true);
  s.visible(false); assert.equal(s.running(), false);
});

test('reduced motion takes precedence, including when the preference changes', () => {
  const s = scene({ reduced: true });
  s.visible(true); assert.equal(s.running(), false); assert.equal(s.toggle.hidden, true);
  s.preference.matches = false; s.events.preference();
  assert.equal(s.running(), true); assert.equal(s.toggle.hidden, false);
  s.preference.matches = true; s.events.preference(); assert.equal(s.running(), false);
});

test('without intersection observation, user pause and tab visibility still work', () => {
  const s = scene({ observer: false });
  assert.equal(s.running(), true);
  s.events.click(); assert.equal(s.running(), false);
  s.document.hidden = true; s.events.visibility();
  s.document.hidden = false; s.events.visibility(); assert.equal(s.running(), false);
});

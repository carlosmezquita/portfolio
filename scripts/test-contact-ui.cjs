const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../contact.js'), 'utf8');

function element(extra = {}) {
  const attrs = new Map();
  const events = new Map();
  const classes = new Set();
  return {
    dataset: {}, textContent: '', hidden: false, disabled: false,
    classList: { add: (v) => classes.add(v), remove: (v) => classes.delete(v) },
    addEventListener: (name, callback) => events.set(name, callback),
    setAttribute: (name, value) => attrs.set(name, value),
    getAttribute: (name) => attrs.get(name) ?? null,
    removeAttribute: (name) => attrs.delete(name),
    events, ...extra,
  };
}
function fixture({ width = 540, reduced = false, post } = {}) {
  let focused;
  const fields = ['name', 'email', 'message'].map((name) => element({
    name, id: `contact-${name}`, value: '', validity: { typeMismatch: false },
    focus() { focused = name; },
  }));
  const errors = Object.fromEntries(fields.map((field) => [`${field.id}-error`, element({ hidden: true })]));
  const button = element(); const label = element({ textContent: 'Send message' });
  const status = element(); const widget = element({ getBoundingClientRect: () => ({ width }) });
  const section = element();
  const form = element({
    action: 'https://contact.example.org/api/contact', closest: () => section,
    elements: { namedItem: (name) => fields.find((f) => f.name === name) },
    reset: () => fields.forEach((field) => { field.value = ''; }),
    querySelector: (selector) => ({
      'button[type="submit"]': button, '[data-submit-label]': label,
      '[data-contact-status]': status, '[data-contact-verification]': widget,
    })[selector],
  });
  const calls = []; const resets = []; const observers = [];
  let renderOptions;
  const document = {
    querySelector: () => form, getElementById: (id) => errors[id],
    createElement: () => element(), head: { append: (script) => script.onload() },
  };
  const window = {
    matchMedia: () => ({ matches: reduced }),
    turnstile: {
      render: (_, options) => { renderOptions = options; return 7; },
      reset: (id) => resets.push(id),
    },
  };
  const fetch = async (url, options) => {
    calls.push({ url, options });
    return options?.method === 'POST'
      ? post ? post(url, options) : Response.json({ success: true }, { status: 202 })
      : Response.json({ sitekey: 'test-sitekey' });
  };
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe() {} disconnect() {}
  }
  window.IntersectionObserver = Observer;
  class FormValues {
    constructor() { this.values = Object.fromEntries(fields.map((f) => [f.name, f.value])); }
    get(key) { return key === 'website' ? '' : this.values[key]; }
  }
  vm.runInNewContext(source, { window, document, IntersectionObserver: Observer, fetch, FormData: FormValues, AbortSignal, console });
  const initialise = () => form.events.get('focusin')();
  const submit = () => form.events.get('submit')({ preventDefault() {} });
  const fill = () => { fields[0].value = 'Visitor'; fields[1].value = 'visitor@example.net'; fields[2].value = 'A sufficiently detailed project enquiry.'; };
  return { fields, errors, button, label, form, status, widget, calls, resets, observers, initialise, submit, fill,
    options: () => renderOptions, focused: () => focused,
  };
}

test('verification loads on intent, only once, and respects narrow layouts', async () => {
  const f = fixture({ width: 272 });
  assert.equal(f.calls.length, 0);
  await f.initialise(); await f.initialise();
  assert.equal(f.calls.length, 1);
  assert.equal(f.options().appearance, 'interaction-only');
  assert.equal(f.options().size, 'compact');
  f.options()['before-interactive-callback']();
  assert.equal(f.status.dataset.state, 'verification');
  f.options().callback('fresh-token');
  assert.equal(f.button.disabled, false);
  assert.equal(f.status.textContent, '');
});

test('inline errors wait for submit, focus the first error, and clear individually', async () => {
  const f = fixture(); await f.initialise(); f.options().callback('fresh-token');
  assert.equal(f.fields[0].getAttribute('aria-invalid'), null);
  await f.submit();
  assert.equal(f.focused(), 'name');
  assert.equal(f.fields[0].getAttribute('aria-invalid'), 'true');
  assert.equal(f.errors['contact-name-error'].hidden, false);
  f.fields[0].value = 'Visitor'; f.fields[0].events.get('input')();
  assert.equal(f.fields[0].getAttribute('aria-invalid'), null);
  assert.equal(f.errors['contact-name-error'].hidden, true);
  assert.equal(f.fields[1].getAttribute('aria-invalid'), 'true');
  assert.equal(f.calls.filter((c) => c.options?.method === 'POST').length, 0);
});

test('failed send preserves content and requires a new token before retry', async () => {
  const f = fixture({ post: async () => Response.json({ success: false }, { status: 503 }) });
  await f.initialise(); f.options().callback('first-token'); f.fill();
  await f.submit();
  assert.equal(f.fields[2].value, 'A sufficiently detailed project enquiry.');
  assert(f.fields.every((field) => !field.disabled));
  assert.equal(f.form.getAttribute('aria-busy'), null);
  assert.equal(f.status.dataset.state, 'error');
  assert.equal(f.label.textContent, 'Try again');
  assert.equal(f.button.disabled, true);
  assert.deepEqual(f.resets, [7]);
  await f.submit();
  assert.equal(f.calls.filter((c) => c.options?.method === 'POST').length, 1);
  f.options().callback('second-token');
  await f.submit();
  const sends = f.calls.filter((c) => c.options?.method === 'POST');
  assert.equal(JSON.parse(sends[1].options.body)['cf-turnstile-response'], 'second-token');
});

test('success survives token refresh, clears content and allows a new message after typing', async () => {
  const f = fixture(); await f.initialise(); f.options().callback('first-token'); f.fill();
  await f.submit();
  assert.equal(f.form.dataset.state, 'success');
  assert.equal(f.label.textContent, 'Message sent');
  assert(f.fields.every((field) => field.value === ''));
  f.options()['before-interactive-callback']();
  f.options().callback('second-token');
  assert.equal(f.form.dataset.state, 'success');
  assert.equal(f.button.disabled, true);
  f.fields[0].value = 'New visitor'; f.fields[0].events.get('input')();
  assert.equal(f.form.dataset.state, '');
  assert.equal(f.label.textContent, 'Send message');
  assert.equal(f.button.disabled, false);
});

test('sending locks the form and duplicate submissions do not send twice', async () => {
  let finish;
  const f = fixture({ post: () => new Promise((resolve) => { finish = resolve; }) });
  await f.initialise(); f.options().callback('first-token'); f.fill();
  const pending = f.submit();
  assert.equal(f.form.dataset.state, 'sending');
  assert.equal(f.form.getAttribute('aria-busy'), 'true');
  assert(f.fields.every((field) => field.disabled));
  await f.submit();
  assert.equal(f.calls.filter((c) => c.options?.method === 'POST').length, 1);
  finish(Response.json({ success: true }, { status: 202 })); await pending;
  assert(f.fields.every((field) => !field.disabled));
});

test('reduced-motion users do not get an entrance-animation observer', () => {
  const normal = fixture(); const reduced = fixture({ reduced: true });
  assert.equal(normal.observers.length, 2);
  assert.equal(reduced.observers.length, 1);
});

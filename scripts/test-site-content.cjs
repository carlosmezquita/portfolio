const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../site-content.js'), 'utf8');
function fixture(content, failure = false) {
  const intro = { textContent: 'Original intro' }; const contact = { textContent: 'Original contact' };
  const links = Object.fromEntries(['surfay_code', 'surfay_notes', 'urbot_link', 'cadeira_link'].map(key => [key, { href: '#contact', firstChild: { textContent: 'Ask about project ' } }]));
  vm.runInNewContext(source, {
    URL, AbortSignal,
    document: { querySelector: selector => selector.includes('link=') ? links[selector.match(/="([^"]+)"/)[1]] : selector.includes('intro') ? intro : contact },
    fetch: async () => { if (failure) throw new Error('offline'); return { ok: true, json: async () => content }; },
  });
  return { intro, contact, links };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('published content uses textContent and safe project destinations while preserving icons', async () => {
  const f = fixture({ intro: '<script>plain text</script>', contact: 'New contact copy', surfay_code: 'https://example.org/code', urbot_link: 'https://example.org/urbot', cadeira_link: '#contact' });
  await settle();
  assert.equal(f.intro.textContent, '<script>plain text</script>');
  assert.equal(f.contact.textContent, 'New contact copy');
  assert.equal(f.links.urbot_link.href, 'https://example.org/urbot');
  assert.equal(f.links.urbot_link.firstChild.textContent, 'Explore Urbot ');
  assert.equal(f.links.cadeira_link.href, '#contact');
});

test('unsafe content links and offline responses leave checked-in fallbacks intact', async () => {
  const f = fixture({ surfay_code: 'javascript:alert(1)', surfay_notes: '//evil.example', urbot_link: 'https://user:secret@example.org' });
  const offline = fixture(null, true);
  await settle();
  assert(Object.values(f.links).every(link => link.href === '#contact'));
  assert.equal(offline.intro.textContent, 'Original intro');
});

test('both compositions contain editable copy/link hooks and a fallback privacy notice', () => {
  for (const file of ['index.html', 'direction-b.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    for (const key of ['intro', 'contact']) assert(html.includes(`data-content="${key}"`));
    for (const key of ['surfay_code', 'surfay_notes', 'urbot_link', 'cadeira_link']) assert(html.includes(`data-content-link="${key}"`));
    assert(html.includes('id="contact-email-hint">Your email is only used to reply</p>'));
  }
});

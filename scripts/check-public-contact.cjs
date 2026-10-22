// Keep public contact surfaces free of personal inbox addresses and mail links.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
for (const file of ['index.html', 'direction-b.html', 'scripts/build_cv.py']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert(!/mailto:/i.test(source), `${file} exposes a mail link`);
  assert(!/[A-Z0-9._%+-]+@(?:gmail|hotmail|outlook|yahoo)\.[A-Z.]+/i.test(source), `${file} exposes a personal inbox`);
}
console.log('PASS: public page compositions and CV generator expose no personal inbox or mail links.');

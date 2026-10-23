# Working on Carlos's portfolio

## Start here

Read [design.md](design.md) before changing public markup, CSS, imagery, layout,
copy hierarchy or motion. It is the canonical visual contract. Read the relevant
source before editing; preserve newer changes already on the target branch.
Use a clean branch from current `main`, and keep unrelated local work intact.

This is a personal engineering portfolio, with a warm editorial composition and
an expressive blue/teal identity field. Improve the requested feature within that
composition. A functional change is not a reason to redesign the surrounding page.

## Source map

| Area | Source and guidance |
| --- | --- |
| Public homepage | `index.html`, `site.css`; canonical style: `design.md` |
| Alternative composition | `direction-b.html`; review-only, not the default homepage |
| Hero | `hero-motion.js`, `img/identity-field.jpg` |
| Contact | `contact.js`, `contact-worker/`; setup/security: `docs/contact.md` |
| Public privacy page | `privacy.html`, `privacy.css`, `privacy.js`; inherit the public visual identity |
| Editable public content | `site-content.js`, `analytics-worker/content.mjs`; preserve static fallbacks and `data-content` hooks |
| Analytics | `analytics.js`, `performance-analytics.js`, `analytics-worker/`; see `docs/analytics-implementation.md` |
| Private admin | `dashboard-worker/`; read its `PRODUCT.md` and `DESIGN.md` before admin UI changes |
| Claims and CV | `docs/evidence-review.md`, `scripts/build_cv.py`, `Carlos-Mezquita-CV.pdf` |

`docs/design.md` is historical research, not a second active style guide. Its
earlier contact, image and motion instructions have been superseded. Current
source and newer feature documentation establish implemented behavior; do not
restore an obsolete instruction from the log. Keep the private admin's deliberate
system-font, data-first design scoped to that app.

## Apply the design

1. Identify the nearest existing component and the relevant rule in `design.md`.
2. Reuse `site.css` variables and component classes. Extend their original rules
   and responsive states rather than adding a parallel theme or repeated overrides.
3. Preserve semantic markup, editable-content hooks, analytics attributes and
   contact state selectors while changing presentation.
4. Inspect the rendered result, including interaction states. Explain any deliberate
   departure from the contract in the PR. Update `design.md` in the same change
   when the design decision itself changes; do not rewrite it to excuse drift.

Keep this static HTML/CSS/JavaScript site without adding a framework, component
library, build pipeline or remote font service for a small UI task. There is no
root npm install/build step. Do not use Sites for this project.

## Local preview and checks

From the repository root:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Run checks relevant to the change:

| Change | Command |
| --- | --- |
| Every PR | `git diff --check` |
| Public contact surfaces or CV | `node scripts/check-public-contact.cjs` |
| Hero interaction | `node scripts/test-hero-motion.cjs` |
| Contact form/backend | `node --test scripts/test-contact.mjs scripts/test-contact-ui.cjs` |
| Editable content | `node --test scripts/test-site-content.cjs` |
| Analytics/privacy behavior | `node --test scripts/test-analytics.mjs scripts/test-traffic.mjs scripts/test-performance-analytics.cjs` |
| Private admin | `npm ci --prefix dashboard-worker`, then `node --test dashboard-worker/test/*.mjs` |

For visual changes, inspect affected pages at 1440, 1024, 760, 390 and 320 CSS px,
plus 200% zoom. Check no horizontal page overflow, loaded local fonts, legible
images, keyboard focus, reduced motion and any affected empty/filled/error/success
states. Check both compositions when touching shared styles. A screenshot or
passing Node test alone does not verify touch feel or accessibility. Report checks
actually performed and their limits; do not claim physical-device review from an
emulated viewport. Documentation-only changes need link/value/command review,
not a fabricated visual test or a new test suite.

## Content, privacy and deployment

- Keep claims specific and evidenced: prototype status, degree in progress and
  accurate role dates. Do not invent metrics, customer results or product imagery.
  Historical evidence notes are dated; reconcile them with newer verified changes.
- `hello@carlosmezquita.dev` is the approved public alias. Keep the private delivery
  address and credentials out of pages, PDFs, previews, logs and repository files.
  Preserve server validation, Turnstile verification and restricted email delivery.
- Preserve analytics opt-outs, GPC/DNT handling, aggregate-only collection and
  private admin authentication. A styling task must not change their behavior.
- Keep live-content overrides plain text and links validated; do not use HTML
  injection to obtain a visual effect. Public content must remain useful offline.
- Submit a reviewable PR. `main` publishes through GitHub Pages; do not merge,
  deploy production, change DNS or enable a paid service as an incidental step.
  Use an isolated preview for review when needed, and state its commit/version.

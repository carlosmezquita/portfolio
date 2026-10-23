# Carlos Mezquita's portfolio

[Visit the portfolio](https://carlosmezquita.dev)

A concise overview of my software work, Denodo experience, education and contact details. Surfay links directly to its public repository and engineering notes. Urbot and Cadeira have brief summaries and contact links.

## Implementation

Static HTML, CSS and small scripts for navigation, motion and contact. No build step or font CDN is required. The contact form uses Cloudflare Turnstile and a separate Worker. Instrument Sans and Instrument Serif are self-hosted; their licences are in `fonts/`.

- `index.html`: content, navigation and metadata.
- `direction-b.html`: alternative split composition for design review.
- `img/identity-field.jpg`: original supplied blue/teal identity artwork.
- `site.css`: responsive warm editorial layout, dark alternative, focus states and print styles.
- `img/surfay-forecast.png`: real application screenshot with synthetic forecast inputs and original map attribution.
- `docs/design.md`: visual and editorial decisions, with research sources.
- `docs/evidence-review.md`: claim review, LinkedIn inconsistencies and remaining publication gates.
- `hero-motion.js`: lava-lamp-inspired blue/teal field with cursor attraction and touch springs, pause/play, reduced-motion fallback and offscreen/tab suspension.
- `site.js`: maps old `#project/<name>` links to the current project anchors.
- `contact.js`: contact-form submission, verification lifecycle and accessible feedback.
- `contact-worker/`: Cloudflare email endpoint; recipient and Turnstile secret live in Worker secrets.
- `analytics-worker/`: bounded aggregate traffic/engagement and action counters, plus the public text/link endpoint. See [analytics research](docs/analytics-research.md) and [rollout](docs/analytics-implementation.md).
- `privacy.html`, `privacy.js`, `privacy.css`: public analytics notice and explicit browser opt-out.
- `docs/privacy-design.md`: public policy reading layout, preference controls and presentation rules.
- `performance-analytics.js`: manually loads Cloudflare's complementary Web Vitals beacon using the same privacy preference; automatic injection stays off.
- `dashboard-worker/`: private statistics, contact inbox and text/link editor protected by Cloudflare Access.
- `site-content.js`: loads published plain-text content overrides, retaining static content on failure.
- `Carlos-Mezquita-CV.pdf`: downloadable public CV.
- `scripts/build_cv.py`: rebuilds the CV with Python and ReportLab.
- `projects/<name>/index.html`: redirects old case-study URLs to their summaries, with a visible fallback link.
- `CNAME`: existing custom domain for GitHub Pages.

## Preview

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Open `http://localhost:8000`. To rebuild the CV, install ReportLab and run `python3 scripts/build_cv.py`.

## Updating content

Keep role dates, project status, ownership and degree completion accurate. Use concrete descriptions and evidence links. Do not add unverified outcomes, forecast accuracy claims or links to unverified deployments. The CV is a public summary: keep personal addresses, phone numbers and private project details out of it.

Old case studies and diagrams were removed in the first simplification pass. Their earlier versions remain in Git history. Any future case study should earn its space with a real product image, specific decisions and shareable evidence.

## Before publishing

Check the desktop and mobile layouts, keyboard focus, downloadable CV, contact links and old project URLs. Verify any new external evidence link before adding it. Submit changes through a pull request; review before merging to the GitHub Pages publishing branch.

## Design review preview

Use the local server above to review the layout. The contact form requires an approved HTTPS frontend origin and the configured Cloudflare backend. Use the Cloudflare review page for live form checks; downloaded HTML files cannot submit.

## Interaction checks

Run `node scripts/test-hero-motion.cjs` for event and spring behaviour checks. On a phone, tap to nudge the field or sweep sideways to stir; vertical scrolling and pinch zoom remain browser gestures. Physical-device review is still required before production.

## Public contact policy

The public contact alias is `hello@carlosmezquita.dev`, forwarded by Cloudflare Email Routing to the existing verified private inbox. The homepage publishes the alias as text and a mail link; the contact form and footer LinkedIn link remain available. Personal inbox addresses must stay out of public source, pages, CV and previews. Only the exact `mailto:hello@carlosmezquita.dev` link is allowed by `node scripts/check-public-contact.cjs`; recipient query strings and other mail links are rejected. Replies may come from Carlos's personal Gmail address, as requested; no separate sending service is configured.

## Search and agent discovery

The homepage states interest in full-stack and AI product engineering roles at London startups and opportunities across the EU, while keeping Portsmouth as the current location. It includes `ProfilePage` / `Person` JSON-LD with the public alias and the existing GitHub/LinkedIn profiles. The role-preference paragraph is static, so the admin's intro override cannot remove it.

`robots.txt` allows public crawling and declares search and AI-input use, without choosing a training policy. `sitemap.xml` lists the canonical homepage only; the alternative composition has `noindex, follow` and the old project URLs remain redirect stubs. See [agent discovery rollout](docs/agent-discovery.md) for review and post-merge checks. This uses the existing static hosting with no new service, paid plan, or runtime dependency.

## Contact form

The site stays on GitHub Pages; the form posts JSON to a separate Cloudflare Worker. See [contact setup](docs/contact.md) for configuration, privacy, limits and validation. Run `node --test scripts/test-contact.mjs scripts/test-contact-ui.cjs` for server and client interaction checks.

## Private admin

Open the [portfolio admin](https://admin.carlosmezquita.dev/) using the configured owner's Cloudflare login. It shows action statistics, manages new/read/archived contact requests, and edits intro/contact copy and project links. See [admin setup](docs/admin.md) for deployment, security, retention and free-plan limits. The editor's frontend loader must be published through the normal reviewed GitHub Pages PR.

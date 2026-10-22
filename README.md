# Carlos Mezquita's portfolio

[Visit the portfolio](https://carlosmezquita.dev)

A concise overview of my software work, Denodo experience, education and contact details. Surfay links directly to its public repository and engineering notes. Urbot and Cadeira have brief summaries and contact links.

## Implementation

Static HTML, CSS and a small compatibility script. No installation, build step, font CDN or client-side libraries are required. Instrument Sans and Instrument Serif are self-hosted; their licences are in `fonts/`.

- `index.html`: content, navigation and metadata.
- `direction-b.html`: alternative split composition for design review.
- `img/identity-field.jpg`: original supplied blue/teal identity artwork.
- `site.css`: responsive warm editorial layout, dark alternative, focus states and print styles.
- `img/surfay-forecast.png`: real application screenshot with synthetic forecast inputs and original map attribution.
- `docs/design.md`: visual and editorial decisions, with research sources.
- `docs/evidence-review.md`: claim review, LinkedIn inconsistencies and remaining publication gates.
- `hero-motion.js`: blue/teal canvas field, pause/play, reduced-motion fallback and offscreen/tab suspension.
- `site.js`: maps old `#project/<name>` links to the current project anchors.
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

Draft preview: https://portfolio-review-20261022.cadeiraai.workers.dev/

Alternative: `/direction-b.html`. Mobile review frame: `/review/mobile` (preview service only). This is separate from GitHub Pages; PR #6 stays a draft and the production domain is unchanged.

# MezquitaOS — Carlos Mezquita's portfolio

[Visit the portfolio](https://carlosmezquita.dev)

A personal portfolio presented as a small desktop operating system. The résumé lives in its own window; Cadeira, Urbot, and Surfay open in a separate interactive project window.

## About

This portfolio brings together my software projects and experience in a small OS-inspired interface. Project write-ups explain the problem, my contribution, and the engineering decisions behind the work.

The design prioritizes fast loading, accessible navigation, and clear project descriptions.

## Featured projects

| Project | Focus |
| --- | --- |
| Cadeira | AI telephone conversations and restaurant reservations. |
| Urbot | Guided urban-planning checks and case review. |
| Surfay | Local surf forecasts for the Galician coast. |

When updating a project, explain:

- The problem and who experiences it.
- My contribution and the current state of the work.
- The important implementation decisions and their trade-offs.
- Evidence: a public demo, code where shareable, or verified results.
- Limitations and what I am improving next.

Keep descriptions specific and honest. Distinguish working features from planned work; only include outcome metrics that can be substantiated. Publish only material cleared for public sharing.

## Implementation

The site is static HTML, CSS, and vanilla JavaScript. There is no package installation or build step.

| File | Purpose |
| --- | --- |
| `index.html` | Résumé, project launchers and templates, styles, interaction logic, and metadata. |
| `img/` | Existing pixel emoji assets used by the window and favicon. |
| `CNAME` | Custom domain: `carlosmezquita.dev`. |

The existing page loads Tailwind through its CDN script, IBM Plex Mono through Google Fonts, and Google Analytics. It is therefore not entirely dependency-free or offline.

Project interactions add no external libraries or requests. A single native `<dialog>` is reused, with content cloned from an inert `<template>` only when a project opens and removed when it closes. The window supports desktop dragging, Escape to close, and focus restoration. Walkthroughs illustrate the architecture; they do not call the project backends.

## Run locally

From the repository root, with Python 3 installed:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000` in your browser. Internet access is needed for the existing external font, styling, and analytics resources.

## Maintain the portfolio

Edit `index.html` directly. To add a project:

1. Add a launcher with a unique `data-open-project` value.
2. Add a matching `<template id="project-template-VALUE">`.
3. Follow the existing heading, summary, contribution, and walkthrough structure.
4. Keep project names, public links, and descriptions consistent.

The launcher handler discovers templates by ID, so an additional project does not require a separate dialog or event listener implementation. Keep résumé dates, education, contact links, and social metadata accurate.

## Performance and accessibility

- Preserve the lightweight static architecture. Justify any new dependency.
- Keep project content on demand; avoid embedded live apps, autoplay media, polling, and continuous animation loops.
- Optimize any new images and reserve their dimensions.
- Keep all actions keyboard-accessible and clearly labelled.
- Preserve readable mobile layouts, scrolling, and visible focus states.
- Measure performance before claiming an improvement; do not treat an unmeasured score as a result.

## Check changes before merging

For content-only edits, proofread the copy and check affected links. For interaction or layout changes, also check:

- All three project launchers and their walkthrough stages.
- Closing with the close button and Escape, then restoring launcher focus.
- Desktop dragging and resizing without losing the window off-screen.
- Mobile scrolling and text at 200% zoom.
- Keyboard navigation, console errors, and unexpected network requests.
- The résumé, print view, and existing window behavior.

Document which checks were actually performed in the pull request. There is currently no automated test suite or build command in this repository.

## Publishing

The portfolio uses GitHub Pages with the custom domain recorded in `CNAME`. Confirm the configured publishing source in repository settings before changing deployment behavior. Submit changes through a pull request; merging and publication are separate from preparing the change.

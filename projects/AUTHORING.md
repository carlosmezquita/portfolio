# Editing project case studies

Each project has a complete static page:

- `projects/cadeira/index.html`
- `projects/urbot/index.html`
- `projects/surfay/index.html`

The home page opens these documents in the same MezquitaOS window as the résumé. Each document also works at its own URL, with JavaScript disabled, or in a new tab. Shared presentation lives in `projects/case-study.css`; `case-study.js` connects the embedded page's Escape key and current location to the shared window.

## Write the story

Edit the relevant HTML page. The current structure covers context, personal contribution, architecture, design notes, and scope. Add additional sections when they provide useful evidence—for example, a concrete implementation challenge, an evaluation, or a dated milestone.

Explain what you personally did and distinguish it from the wider system. Describe real decisions and limitations. Add outcome numbers only with evidence, and keep unpublished personal plans and private project material out of public copy.

## Add screenshots

1. Save an optimized screenshot beside its project page, for example `projects/cadeira/reservations.webp`.
2. Find the `SCREENSHOTS` comment in that page.
3. Replace the comment with a section like the example below, using the real filename, actual image dimensions, and a specific description.
4. Add `<a href="#screenshots">Screenshots</a>` to that page's contents navigation.

```html
<section class="case-section" id="screenshots" aria-labelledby="screenshots-heading">
  <h2 id="screenshots-heading">Screenshots</h2>
  <div class="gallery">
    <figure>
      <a href="./reservations.webp" target="_blank" rel="noopener">
        <img src="./reservations.webp"
             width="1600" height="1000"
             alt="Reservation list showing the date, party size, and booking status"
             loading="lazy" decoding="async">
      </a>
      <figcaption>
        The reservation view. Explain the feature shown and your contribution to it.
      </figcaption>
    </figure>
  </div>
</section>
```

The filename and dimensions above are an example, not a bundled asset. Do not add the HTML until the image exists. Use actual screenshots with personal data and credentials removed. Repeat the figure for more images; the shared gallery styles handle spacing and mobile widths. A screenshot link opens the original image for closer inspection without a gallery dependency.

## Add or change diagrams

Each project includes an editable `architecture.svg`. You can replace it with an exported SVG, PNG, or WebP diagram and update the figure's filename, dimensions, alternative text, and caption. Prefer a static export over a client-side diagram renderer. Keep labels legible and describe the key relationships in the surrounding text.

Additional diagrams use the same `<figure class="architecture">` structure. For SVG files, preserve a descriptive title and description and do not embed external scripts.

## Performance

The home page does not load the case-study document, diagram, or screenshots until a project opens. Returning to the résumé removes its iframe and restores the prior scroll position. Documents share a small stylesheet and script, use system fonts, and load diagrams and screenshots lazily. No framework, image viewer, or diagram-rendering library is required.

The home page's existing Tailwind CDN and analytics remain separate from this implementation. Measure full-page performance before making claims about scores or real-world speed.

## Check an edit

Serve the repository root with `python3 -m http.server 8000 --bind 127.0.0.1` and open the home page or `/projects/cadeira/` locally.

Check the case study both as a standalone document and inside the OS window. Confirm section links, image paths, captions, next-project navigation, full-page links, Escape to close, and keyboard focus. Check narrow viewports and enlarged text. Real image dimensions prevent layout shifts; verify them when replacing an asset.


## Shared window design

`os-theme.css` defines the common font and colors. The résumé and case study layouts use the same navigation width, heading scale, and spacing. Keep these aligned when changing the presentation. The root window supports maximize/restore; embedded documents hide their duplicate top bar. Native links still open standalone pages without JavaScript or with modified clicks.

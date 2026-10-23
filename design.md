---
version: alpha
name: Carlos Mezquita — Paper and Atlantic light
description: Warm editorial engineering portfolio with an animated blue and teal identity field.
colors:
  primary: "#073b5c"
  paper: "#f5f4ef"
  ink: "#172329"
  muted: "#5b6466"
  rule: "#d6d9d3"
  sage: "#e9ece7"
  sand: "#e8e1d0"
  contact-accent: "#146379"
  field-surface: "#fbfbf7"
  field-border: "#7f8d87"
typography:
  display:
    fontFamily: Instrument Serif
    fontSize: 100px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -0.038em
  section:
    fontFamily: Instrument Serif
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.025em
  body:
    fontFamily: Instrument Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  control:
    fontFamily: Instrument Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  surface: 0px
  control: 2px
spacing:
  wrap-max: 1352px
  gutter-desktop: 64px
  gutter-tablet: 40px
  gutter-phone: 24px
  gutter-small-phone: 18px
  split-gap: 105px
  split-gap-tablet: 65px
components:
  page:
    background: "{colors.paper}"
    foreground: "{colors.ink}"
  contact-field:
    background: "{colors.field-surface}"
    border-color: "{colors.field-border}"
    border-radius: "{rounded.control}"
    typography: "{typography.control}"
---

# Portfolio design contract

## Overview

An engineer's personal editorial portfolio: warm paper, fine rules and expressive
serif titles, interrupted by a single broad field of Atlantic blue and teal light.
The identity connects Carlos's A Coruña/Portsmouth background, swimming and surfing
with the work he builds. It should feel authored, calm and curious. A startup
founder or engineering lead should quickly understand his contribution, inspect
real work and find a contact route.

This is the **canonical public-site style guide**. The lowercase filename is
intentional; `AGENTS.md` links here explicitly. `index.html` is the approved warm
composition. `direction-b.html` is a separate dark comparison, not a theme to
spread through the public site. The private admin has its own scoped guide at
`dashboard-worker/DESIGN.md`.

Preserve the accepted refinements: the live Surfay map preview, public hello
alias, shortened contact note, quiet footer privacy link and editorial privacy
page. This file contains the current rules and useful research references;
revision-specific findings and validation belong in PR descriptions and Git
history, rather than additional design documents.

### What gives this design its character

The hero is the expressive moment. Below it, typography, whitespace and real
product evidence do the work. Surfay deserves a large composed presentation;
Urbot and CadeiraAI have shorter editorial rows because their evidence differs.
This asymmetry is intentional. Do not flatten the page into interchangeable cards.

The token block gives reusable reference values, not a replacement stylesheet.
Responsive formulas and component exceptions below matter. Reuse existing CSS
variables first; when adding a repeated value, give it a semantic role in CSS and
update this guide. Do not mechanically replace fluid type with token maxima.

## Colors

| Role | CSS/source | Usage |
| --- | --- | --- |
| Paper `#f5f4ef` | `--paper` | Main public canvas; warm rather than stark white |
| Ink `#172329` | `--ink` | Main text and titles |
| Muted `#5b6466` | `--muted` | Supporting prose, dates and metadata |
| Rule `#d6d9d3` | `--line` | Decorative 1px section dividers, not input boundaries |
| Marine `#073b5c` | `--blue` | Primary action surface |
| Sage `#e9ece7` | `.background` | About/experience band |
| Sand `#e8e1d0` | `.surfay-stage` | Warm setting for Surfay's own visual language |
| Teal `#146379` | `--contact-accent` | Contact focus and verification feedback |
| Field `#fbfbf7` / border `#7f8d87` | `.contact-field` | Legible input surface and boundary |

Reserve blended blue/cyan/teal light for the identity field. Preserve its dark
lower edge and luminous diagonal ribbon; a random radial gradient does not carry
the same identity. Ordinary page sections remain flat. Error red and success green
are semantic feedback, not new brand accents. Use text/icons as well as color to
communicate state. Check normal text at 4.5:1 and large text/essential boundaries
at 3:1; decorative rules are not field borders.

## Typography

Self-host **Instrument Serif 400** for expressive titles and **Instrument Sans
400/600** for prose, navigation, metadata and controls. Use the existing WOFF2
files in `fonts/`; no font CDN or additional family. Serif titles are regular,
closely tracked and expressive without bold weight. Sans provides precise reading.

| Element | Desktop | Phone at ≤760px |
| --- | --- | --- |
| Hero name | `clamp(56px, 7.2vw, 100px)`, serif, 1.05 | `clamp(42px, 8.5vw, 63px)`; 38px at ≤360px |
| Intro lead | 23px sans, 1.5; 20px at ≤1050px | 20px |
| Selected work title | 36px serif, 1.2 | 30px |
| Surfay headline | `clamp(40px, 4.2vw, 60px)`, serif, 1.05 | 43px |
| Other project names | 36px serif | 32px |
| About headline | `clamp(38px, 4.2vw, 59px)`, serif, 1.1 | 43px |
| Get in touch. | 61px serif, 1; tracking -.04em | 48px |
| Inputs / floating labels | 16px sans; raised label 12px | Same; do not shrink editable text |

Project prose is generally 14px, supporting prose 14–15px, utility text 11–13px.
Use the existing contextual hierarchy rather than assigning every paragraph 16px.
Keep long prose comfortably narrow and allow wrapping/enlargement. Do not force
desktop line breaks onto phones. Public supporting-page display titles should
inherit the serif family and regular weight; dense subsections may use sans.

## Layout & Spacing

`.wrap` has a maximum width of **1352px including padding**. Gutters are 64px
normally, 40px at ≤1050px, 24px at ≤760px and 18px at ≤360px. Align headers,
artwork, section rules and footer to the same content edges.

The sequence is header → broad hero artwork → compact introduction → selected
work → sage background/experience → contact. Keep the opening navigable and the
project evidence prominent. Empty space provides pacing; it is not a gap to fill
with badges, ornamental text or another feature block.

Surfay uses a 1.6:1 image/copy split with a 49px gap on desktop, narrowing at the
tablet breakpoint. About uses 1:1.15 columns with a 105px gap (65px on tablet).
Contact matches the broad split, with .8:1.2 columns at tablet width. At ≤760px,
these stack into a single reading order; secondary project rows stack too.
Keep `minmax(0, …)`/`min-width:0` where needed so long content cannot widen the page.

New public text pages can use a narrower reading column, shared paper/ink/fonts
and generous vertical rhythm. They do not need another animated hero. Keep private
admin tables and controls governed by the admin guide, not homepage display type.

## Elevation & Depth

Use whitespace, surface changes and 1px rules to establish hierarchy. No universal
card shadow system. The real product frame has a restrained shadow, and contact
focus has a soft sage ring; these are local cues. Do not spread glass blur, ambient
glows or floating panels across the page.

## Shapes

Artwork and section surfaces are square. Inputs, the main submit button and pause
control use 2px corners. Circular exceptions have a purpose: the Surfay external
link affordance and the sending spinner. They do not establish a pill-button or
rounded-card language for the rest of the site.

## Components

### Header and identity field

Keep the compact wordmark, quiet text navigation and broad artwork. Desktop hero
ratio is 1634:608; phone ratio is 1.55. The white serif name is fixed near the
lower left, legible against the dark edge. Do not let blobs move the text.

`hero-motion.js` draws the existing six buoyant diffuse blue/teal lobes and soft
diagonal ribbon. Desktop cursor movement attracts/deforms nearby fields and bends
the ribbon, easing back on exit. Phone taps nudge; horizontal sweeps stir with a
bounded spring rebound, squash/stretch and neighbour resistance. Keep the material
soft and slow, not literal outlined/glassy soap bubbles or a pointer trail.

Preserve native vertical scroll and pinch zoom (`pan-y pinch-zoom`), passive input,
vertical-intent cancellation and multi-touch/control/long-press guards. Pause/play
must remain visible, keyboard operable and at least 44px tall on phones. Reduced
motion, unavailable canvas or disabled JavaScript retain `img/identity-field.jpg`.
Suspend offscreen/hidden-tab work; retain the 24fps and 1000px rendering caps.

### Link preview card

The shared-link image uses the original blue/teal banner above warm paper, with
Carlos's circular portrait overlapping the boundary. His name uses Instrument
Serif and **Software Engineer** sits directly underneath in Instrument Sans.
Keep these four elements legible at thumbnail size; no extra badges or promotional
copy. Preserve the supplied photograph's appearance and use a simple face crop.

`img/social-card.png` is a static 1200×630 export, generated by
`scripts/build_social_card.py` from `img/carlos-mezquita.jpg`, the original identity
art and the checked-in fonts. The circle is a specific profile-photo treatment,
not a new rounded-card style. Both public compositions use the same image and
descriptive Open Graph/Twitter alternative text. The homepage hero remains the
existing animated identity field.

### Selected work

Surfay is a real map preview inside the sand stage, beside concise contribution
copy and evidence links. Keep `img/surfay-forecast.png`, its readable map/forecast
crop and embedded attribution. The current preview links to the live map; do not
restore the removed duplicate caption/credits or older full-image destination.
If replacing the screenshot, reassess attribution and any synthetic/demo-data
disclosure against the actual asset; an older image's status is not evidence for
the new one. Retain the experimental-scoring/accuracy limitation in the copy.

Hover and keyboard focus reveal a circular external-link icon with a restrained
12% scrim and image scale of 1.025. On touch the 44px affordance stays visible.
Reduced motion removes scaling/transitions. Preserve an accessible link name.
Urbot and CadeiraAI use ruled horizontal rows, clear status and honest contact
links. Do not fabricate screenshots to make their layouts match Surfay.

### Background

Keep the pale sage band, expressive location heading and compact Denodo/education/
society entries. Fine rules separate entries; factual dates and actual ownership
provide credibility. Avoid timelines made of floating cards, skill meters and
unverified impact counters.

### Contact

Keep the small **Contact** kicker and single-line dark **Get in touch.** heading.
No extra top rule or “A note to Carlos” heading. The approved public alias
`hello@carlosmezquita.dev` has a subtle underline drawn on hover/focus and arrow
movement; the private recipient never appears in public content.

Use one column of outlined, subtly filled fields: 64px minimum input height,
156px textarea, 16px editable text and 2px corners. Keep real associated labels;
the blank placeholder only supports CSS state. On focus or a nonempty value,
labels move up 12px and scale to .75 over 240ms with
`cubic-bezier(.22, 1, .36, 1)`. Filled/autofilled labels stay raised after blur.
Focus decorations clear on blur, while the label follows the value state.
Keep semantic name/email autocomplete, visible focus, associated errors and hints.

Put status beside **Send message** on desktop and beneath it on phones. The short
note **Your email is only used to reply** goes below the action/status group;
retention details belong on the privacy page. The button is marine blue, sage
while disabled, with a subtle hover arrow, sending spinner and success check.
Preserve failure text and entered values; feedback uses an accessible live region.

Keep supported Turnstile `interaction-only` appearance. A provider challenge may
appear; never hide/crop it with CSS. Use its compact size if the available form
width is under 300px. Do not make verification messages decorative headings.

Contact enters once with a small 14px offset and 550–650ms easing. Keyboard focus
cancels entrance motion; reduced motion removes animation/transitions while
preserving label position and all state information. Do not animate every section.

### Footer and supporting pages

Use the existing fine divider and quiet utility links. **Privacy Policy** is small,
muted and not underlined at rest; keyboard focus remains visible. Retain the current
location/link alignment and stacked phone layout. A new support page should share
the paper, ink, serif display title and restrained control shapes. Do not copy the
private admin's system-font headings into public pages.

### Privacy policy

The policy is a reading and preference-management surface within the public site.
Use shared paper/ink and Instrument typography, fine rules and flat sections.
Keep the title explicitly named **Privacy policy.** and retain the quiet wordmark
and return link. Do not add the homepage's animated artwork or marketing claims.

The opening pairs a short explanation and direct analytics-control link with an
overview of browsing, enquiries and choice. The overview supplements the full
policy. A section index sits beside the reading column on desktop and returns to
normal flow on phones. All six policy sections remain expanded and readable
without JavaScript; no accordion hides important disclosures.

The first section contains the existing analytics controls, live setting text and
browser-scope explanation on a pale sage surface. Both actions have equal visual
weight, 2px corners, at least 46px height and visible keyboard focus. Use the
stronger `#738179` boundary on sage to preserve essential control contrast.
Controls stack across the available width on phones. GPC/DNT precedence and
blocked-storage feedback remain governed by `privacy.js`.

`privacy.css` uses a desktop title of `clamp(56px, 6.5vw, 88px)`, with
`clamp(48px, 9vw, 65px)` at ≤760px. Section headings are regular serif, 38px on
desktop and 34px/32px at the phone breakpoints. Reading text is 15px with 1.8 line
height. Labelled definition rows make statistics and retention scannable; they
stack on phones. Reuse the `.wrap` gutters and keep the index out of the reading
column's way at narrow widths.

Separate contact enquiries, custom statistics, Cloudflare processing and
retention. Distinguish custom counters from the performance beacon and transient
network processing, and the private inbox's cleanup from delivered email copies.
Keep the operator, public hello alias, contact form and complaint route easy to
find. Do not promise blanket anonymity, EU-only processing or deletion of email
copies by the inbox cleanup. The page loads neither analytics collector; preserve
that property. Print styles retain the full policy while removing navigation and
choice buttons.

Review index destinations, heading order, no-JavaScript readability, live status,
off/on actions, privacy-signal precedence, blocked storage, keyboard focus and long
links. Use the responsive checks and existing privacy tests in `AGENTS.md`.

## Do's and Don'ts

| Do | Avoid |
| --- | --- |
| Compose real evidence at a readable scale | A miniature screenshot pasted into a generic template |
| Let the hero supply expressive motion | New gradients, glowing dots, cursor trails or animated body text |
| Use serif display titles and quiet sans utility text | Bold sans marketing headlines or extra font families |
| Reuse flat sections, fine rules and asymmetry | Repeated rounded cards, pill badges and feature grids |
| Preserve recent specific refinements | Reverting the public alias, live preview or shortened note from old docs |
| Explain and review an intentional design change | Quietly changing the visual identity during unrelated work |

### Apply and maintain this contract

Before editing, identify the relevant component above and inspect its implementation.
Change the existing pattern, including phone/focus/reduced-motion states, rather
than appending a competing visual system. Review screenshots and real interactions
at the sizes in `AGENTS.md`; include filled labels and visible status feedback when
touching contact. Confirm readable imagery, accurate content and no page overflow.
Describe any remaining limits rather than claiming tests prove visual quality.

Update tokens and rationale together when a deliberate design decision changes.
Keep useful design references here, feature setup in `docs/`, and historical
findings in PR descriptions and Git history. A supporting page that diverges is
an audit finding, not automatic permission to redefine the baseline.

### Visual and interaction references

These references informed the composition; they are not templates to copy or
evidence of an effect on hiring. The portfolio's own rules above take precedence.

| Reference | Principle retained here |
| --- | --- |
| [Cursor](https://cursor.com/home), [Linear](https://linear.app/) | Present real product work at a readable scale with deliberate alignment and framing. |
| [Granola](https://www.granola.ai/), [Resend](https://resend.com/) | Use expressive typography and a coherent material palette to create character. |
| [Stripe](https://stripe.com/en-br), [Mistral](https://mistral.ai/) | Give identity artwork a specific shape and composition; repeat a small set of visual choices. |
| [ElevenLabs](https://elevenlabs.io/), [Rauno's Craft](https://rauno.me/craft) | Prefer shareable evidence and meaningful interactions appropriate to the actual work. |
| [Emil Kowalski](https://emilkowal.ski/), [Agents with Taste](https://emilkowal.ski/ui/agents-with-taste) | Keep language specific and explain the reason for design decisions. |
| [Developing Taste](https://emilkowal.ski/ui/developing-taste), [Train Your Judgement](https://emilkowal.ski/ui/train-your-judgement), [Stripe: Craft and beauty](https://stripe.com/sessions/2024/craft-and-beauty-the-business-value-of-form-in-function) | Compare rendered results and assess craft instead of accepting functionality as visual quality. |
| [Codrops: Interactive Droplet-like Metaballs](https://tympanus.net/codrops/2025/06/09/how-to-create-interactive-droplet-like-metaballs-with-three-js-and-glsl/) | Use soft blending as a material reference; retain our diffuse 2D identity rather than copying a glass shader. |
| [Apple: Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/), [Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Android springs](https://developer.android.com/develop/ui/views/animations/spring-animation) | Connect input to local, interruptible response and bounded settling. |
| [W3C Pointer Events](https://www.w3.org/TR/pointerevents3/#the-touch-action-css-property) | Preserve browser gesture ownership and cancellation. |
| [ICO: Drafting privacy information](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/how-should-we-draft-our-privacy-information/), [Layered notices](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-methods-can-we-use-to-provide-privacy-information/) | Combine a brief overview, descriptive headings, visible detail and nearby controls. These are presentation references, not legal certification. |

### Format research

This guide adapts the open [Google Labs DESIGN.md specification](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)
and [its design rationale](https://github.com/google-labs-code/design.md/blob/main/PHILOSOPHY.md):
combine exact reusable values with clear intent, component behavior and deliberate
constraints. It is a project guide, not a claim of automated schema/contrast certification.
Workflow commands stay in [AGENTS.md](AGENTS.md), following the separation described
by the [AGENTS.md project](https://agents.md/). Research reviewed 23 October 2026.

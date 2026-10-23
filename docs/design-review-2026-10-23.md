# Design review — 23 October 2026

Reviewed main `06683f1b970bcabfb100e4d6423be628d7ec5b1e`, fetched into a fresh
clone and confirmed up to date with `git pull --ff-only`. Older dirty working
copies were preserved. This change documents the style; it does not deploy a
redesign or replace the newer repository work.

## Findings

| Area | Finding | Decision |
| --- | --- | --- |
| Public homepage | The warm editorial identity remains intact: paper/ink palette, local Instrument fonts, broad animated identity field, deliberate Surfay stage, horizontal project rows and sage background section. | Keep this as the baseline. A wholesale redesign would discard the character Carlos wants to preserve. |
| Recent refinements | The live Surfay map crop, hover/focus external-link affordance, public hello alias, short contact note and quiet Privacy Policy link were deliberately added in newer merged work. | Record them explicitly so agents do not restore older variants from conversation history or old design notes. |
| Contact | The current dark serif title, floating labels and status/action arrangement match the agreed direction. A genuine Turnstile challenge can occupy space above the action. | Keep supported provider behavior and semantic states; never conceal the challenge for aesthetics. No message was submitted during this review. |
| Public privacy page | It shares paper/ink and body type, but its display title inherits bold sans-serif styling; its controls use 4px corners rather than the portfolio's 2px. | A small consistency pass should use the public serif/regular display hierarchy and shared control shape. Keep the readable narrow column and existing privacy behavior. This is documented drift, not the intended new baseline. No CSS change in this documentation PR. |
| Private admin | Its own `DESIGN.md` deliberately specifies system sans-serif, compact data presentation and no decorative motion. | Preserve that useful scoped exception; do not impose the homepage hero/type hierarchy on reporting tables. Admin UI was reviewed in source, not through an authenticated live session. |
| Existing design log | `docs/design.md` includes rejected proposals and superseded contact, screenshot and touch instructions mixed with implementation history. | Mark it historical, add a canonical root `design.md`, and make `AGENTS.md` route agents to it before UI work. |

## Review evidence and limits

The live homepage, selected work, contact area and privacy page were inspected in
the cloud browser at a 1363px viewport. The homepage's rendered paper/ink/blue
variables, 64px wrap padding and serif contact heading matched source, with no
horizontal page overflow at that width. The hero, project image and fonts rendered.
The contact challenge was observed without interacting with it.

Responsive rules, reduced-motion branches, floating-label selectors and the private
admin guide were inspected in source. This documentation pass did not repeat phone,
200% zoom, physical-device, submission/delivery or authenticated admin tests. Those
remain necessary for future changes affecting those surfaces. No production,
Cloudflare account, privacy preference or backend configuration was changed.

## Documentation research

The primary sources were Google's [open DESIGN.md specification](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md),
its [philosophy](https://github.com/google-labs-code/design.md/blob/main/PHILOSOPHY.md),
and the [AGENTS.md project](https://agents.md/). The resulting split keeps reusable
values and visual intent together, while setup, code locations and verification
commands remain in the agent entry point. The root guide uses the requested
lowercase `design.md` and explicit links rather than introducing a second
case-only filename.

# Portfolio design brief

Status: PR #6 has been merged. This follow-up removes personal email and adds autonomous lava flow with cursor interaction. The main page uses the warm editorial composition; `direction-b.html` offers a dark split composition with comparable content. The references below record earlier design iterations.

## Audience and purpose

An engineering lead or startup founder should understand Carlos's background, inspect useful work and find a direct contact route. The site should also feel recognisably personal. A readable résumé alone does not meet the visual brief.

## Reference review — 22 October 2026

The current homepages below were inspected in the cloud browser. This table records visual observations and design judgments, not measured effects on hiring. Initial page animations were allowed to resolve where possible. Some decorative/media layers on Resend and Raycast did not fully appear in this browser; no conclusions rely on seeing those layers.

| Reference | What was observed | Useful lesson for this portfolio |
| --- | --- | --- |
| [Cursor](https://cursor.com/home) | Restrained cream typography and navigation, with a large IDE/CLI composition placed over a landscape-like visual. | Give a product image a setting and a clear hierarchy. The frame and surrounding space are part of the image treatment. |
| [Granola](https://www.granola.ai/) | Large editorial serif type, warm product surface, lime accent and a collage of textures around its notepad interface. | Personality comes from a related collection of type, material, imagery and interface. Colour alone does not produce this effect. |
| [Linear](https://linear.app/) | A quiet monochrome surface, broad headline, large interactive product demonstration and consistent alignments through subsequent sections. | Show a selected workflow at a useful scale. Use consistent geometry to make different parts of a page belong together. |
| [Stripe](https://stripe.com/en-br) | A strong multicolour diagonal form crosses the hero and the underlying grid. The art has shape and direction beyond an ambient glow. | Artwork can determine composition. Preserve the supplied image's actual shapes, brightness and position instead of substituting a radial CSS gradient. |
| [ElevenLabs](https://elevenlabs.io/) | A neutral surface and split text hierarchy introduce distinct product areas, with large coloured forms and playable voice examples. | Let visitors encounter the capability. For a reservation project, a genuine cleared call recording could be more informative than an architecture diagram. |
| [Mistral](https://mistral.ai/) | Orange/red pixel characters, geometric forms and fine grid lines recur around the typography. | A small number of repeatable visual choices can form a recognisable identity without uniform project cards. |
| [Resend](https://resend.com/) | A black surface, large serif headline, short supporting copy and a clear primary action. | Typography can provide character independently of decorative effects. |
| [Rauno Freiberg](https://rauno.me/) and [Craft](https://rauno.me/craft) | An expressive typographic introduction and a separate collection of named interface experiments, prototypes and production links. | Personal work can organise the site. His interaction-heavy execution demonstrates his own specialty; it is not a template for a backend/product engineering candidate. |
| [Emil Kowalski](https://emilkowal.ski/) | A deliberately spare personal index with precise role information, named projects and substantive writing. | Specific work and concise language remain valuable even when the desired visual direction is more expressive than his site. |

## Why the current draft fails the visual brief

1. Its CSS colour field does not match the supplied LinkedIn artwork.
2. The oversized two-line name dominates without creating a useful relationship to a portrait, work sample or visual composition.
3. The body repeats a narrow résumé structure, so applying a dark palette does little to change its character.
4. The complete beige Surfay screenshot was reduced into that structure, giving its dense table too little space and no intentional surrounding scene.
5. Exact preservation of a screenshot was treated as more important than choosing a useful presentation. Preserve an honest full view for inspection, but design a readable preview for the homepage.
6. A palette, fixed spacing scale and a generic ban on motion are not sufficient art direction.

## Proposed direction

A personal site with the supplied blue/teal artwork, a compact introduction and a small set of deliberately composed project presentations.

The exact supplied artwork is the visual reference. Do not regenerate it, reconstruct it with radial gradients or darken it so heavily that its defining shapes disappear. Following the user’s instruction to apply this direction, the original banner is included as `img/identity-field.jpg`. The separate Portfolio card is unused and excluded.

### Opening view

- Use the original artwork as a deliberate visible image surface, not a faint decorative glow behind text.
- Set the name on one line on desktop where it fits. Establish the relationship among name, introduction and image before selecting exact font sizes.
- Explain software work in two short sentences. Place Denodo credibility and degree timing close by without turning the hero into a CV.
- Keep LinkedIn contact and work navigation immediately available.
- Avoid the default oversized headline, glowing dot and stock button-group arrangement from the current draft.
- The composition must still work at 390px and 200% text size; do not hide information to preserve an art-directed desktop layout.

### Selected work

- Surfay gets the principal showcase because it has public code and usable product evidence.
- Give it a generous visual surface related to its own warm product palette. Pair a selected map/forecast crop with a short explanation and the evidence links.
- Make the original full-size screenshot available separately. Retain map attribution in any crop or repeat the required credit next to it. Label synthetic inputs.
- Avoid using a miniature full-page table as the principal visual.
- Urbot and CadeiraAI should have presentations suited to their available evidence. Do not fabricate dashboard images or make all three projects fill identical boxes.
- A concise statement of Carlos's contribution sits beside the visual. Technical details belong behind an explicit link when they are too long for that view.

### Supporting content

Denodo, education, society leadership and contact remain concise and accessible. The main page should show relationships between Carlos and his work rather than reproduce the CV in order. Keep role dates and prototype limitations from the evidence review.

### Interaction

Use motion only when it helps a visitor understand or inspect something: switching project previews, revealing detail or confirming an action. Define the trigger, duration, easing and interruption behaviour. Provide reduced-motion support and complete keyboard behaviour. No blanket prohibition on animation and no ambient effects added merely to make the page seem sophisticated.

## Guidance from practicing designers

- [Emil Kowalski — Agents with Taste](https://emilkowal.ski/ui/agents-with-taste): articulate why a layout, typographic or animation decision works, then give the agent concrete rules. Vague requests for premium or modern styling do not establish that judgment.
- [Developing Taste](https://emilkowal.ski/ui/developing-taste): study strong work, explain the decisions and seek critique through practice.
- [Train Your Judgement](https://emilkowal.ski/ui/train-your-judgement): compare alternatives and describe the difference instead of accepting an implementation because it functions.
- [Stripe Sessions — Craft and beauty](https://stripe.com/sessions/2024/craft-and-beauty-the-business-value-of-form-in-function): a primary-source discussion of craft and product quality, rather than a conversion formula.

These are practitioner perspectives and reference analysis. They do not establish a universal detector for AI-generated design or predict hiring success.

## Implemented compositions and review

Composition A uses the original wide artwork, a single-line desktop name, warm paper, Instrument Serif headings and Instrument Sans body text. Surfay sits in a warm stage beside its explanation; the other projects use shorter rows. Composition B uses a dark surface, a split opening and a reversed Surfay layout. Fonts are self-hosted under the SIL Open Font License.

Both compositions were inspected in the cloud browser at approximately 1350px. The main composition was also inspected in a 390px iframe; the content width was 375px after the scrollbar, with no horizontal overflow. Images loaded and fonts reported loaded. Responsive line-break spacing and the alternative background inheritance were corrected after inspection. This is visual review, not user approval or a complete accessibility audit. 200% text enlargement remains to be checked before production publication.

Do not call the design finished based on source checks, a passing contrast calculation or a successful deployment. Inspect its rendered result and revise it. Preserve the working production domain until a design is approved.

## Animated identity field

Following the user’s request, the hero now draws moving blue, cyan and teal fields on a 2D canvas, including a soft diagonal ribbon related to the original artwork. Independent long periods move and reshape the fields without an abrupt loop reset. The lower edge stays dark for the name. This is a code-drawn interpretation, not an animated raster image.

A visible keyboard-operable pause/play control freezes and resumes the current composition. Reduced-motion preference displays the original artwork and removes the motion control. JavaScript or canvas unavailability also leaves the artwork visible. Rendering is capped at 24fps and 1000px canvas width, suspended when the hero is outside the viewport or the tab is hidden, and resumed without advancing time across that pause. No animation dependency was added.

Validation: desktop and 390px-frame browser rendering reviewed, mobile control placement and no horizontal overflow confirmed. Pause changed to Play in the browser; keyboard playback was also observed. A Node VM behavioural harness verified rendering, pause/resume, viewport and tab suspension, preference changes, unavailable-canvas fallback and resolution cap. Syntax and whitespace checks pass. The draft preview is updated; production remains unchanged.

## Cursor interaction

Mouse and pen movement inside the hero attracts the existing colour fields, with stronger influence on nearby fields, a small change in their shape and a bend in the diagonal ribbon. Coordinates are relative to the hero so the response adapts to both compositions and viewport sizes. Input is eased with a 180ms response and a 650ms release rather than following each pointer event directly. Leaving or cancelling the pointer, losing window focus or hiding the hero releases the attraction. The lower-edge shade remains fixed for text contrast.

Touch input is ignored and no default gesture is prevented. Pausing freezes both ambient and pointer motion; reduced motion retains the static artwork. Event handlers only update a target; drawing stays in the existing capped animation loop.

Validation: cloud-browser pointer positions on both sides visibly changed the field composition. A behavioural harness verified horizontal and vertical attraction, return to the ambient path, ignored touch input, frozen output while paused, reduced motion and visibility suspension. JavaScript syntax and whitespace checks pass. The review preview and draft PR are updated; production remains unchanged.

## Phone interaction research — 22 October 2026

- [Yuki Kojima / Codrops: Interactive Droplet-like Metaballs](https://tympanus.net/codrops/2025/06/09/how-to-create-interactive-droplet-like-metaballs-with-three-js-and-glsl/) shows smoothly blending fields and elastic trails. It is a useful material reference; this design keeps the approved diffuse colour field and interprets the behaviour with 2D springs rather than copying its 3D shader or glass appearance. The tutorial was reviewed; its WebGL layer did not render in the cloud browser.
- [Apple: Designing Fluid Interfaces](https://developer.apple.com/videos/play/wwdc2018/803/) and [Motion guidance](https://developer.apple.com/design/human-interface-guidelines/motion) connect fluid motion with gestures and predictable feedback. The design judgment here is to make touch produce a local response and let people interrupt it, while keeping text stationary.
- [Android: Spring animation](https://developer.android.com/develop/ui/views/animations/spring-animation) explains stiffness, velocity and damping. A lightly damped spring gives a short rebound; an indefinitely oscillating effect would not settle. The implementation uses bounded input velocities and small integration steps.
- [W3C Pointer Events](https://www.w3.org/TR/pointerevents3/#the-touch-action-css-property) defines touch gesture ownership and pointer cancellation. The hero uses `pan-y pinch-zoom`; event listeners stay passive and never prevent default scrolling.

### Proposed touch behaviour, implemented in the draft

A short tap nudges nearby fields outward. A horizontal sweep stirs them, then hands a small bounded velocity to the spring on release. Fields stretch/compress with approximately conserved ellipse area, softly resist extra compression against neighbours and settle back into the ambient composition. This is a stylised material response, not a fluid simulation or literal soap-bubble rendering.

Vertical intent yields before applying an interaction. Pointer cancellation, multi-touch, control taps and long presses do not create accidental tap impulses. Mouse and pen attraction, pause/play, reduced motion and visibility suspension are retained. The mobile pause control has at least a 44px target and a small touch hint sits below the name.

Validation: `node scripts/test-hero-motion.cjs` checks tap displacement, squash/stretch, rebound, eventual settling, horizontal stirring, vertical/cancel/pinch/control/long-press guards, desktop attraction, pause, reduced motion and visibility. Syntax and whitespace checks pass. Native iOS/Android gesture behaviour and final perceived feel still require physical-device review. The online preview update was blocked when Cloudflare required reauthentication; do not treat the existing preview as verification of this touch revision.

## Contact privacy and desktop lava flow

Contact routes use LinkedIn instead of a published personal inbox. Remove the address from visible copy, hrefs, CV links/annotations, the CV generator and embedded standalone previews; do not use client-side address obfuscation as a substitute. This policy concerns current output and does not erase Git history or earlier distributed copies.

Desktop animation now has six independently buoyant colour lobes that rise and fall, deform with approximately conserved ellipse area, and blend over a subdued identity-colour wash. Different periods avoid a synchronised loop. Cursor attraction and ribbon bending remain active; leaving eases back into the ongoing flow. The fixed dark lower edge preserves the name’s contrast. Touch springs, pause, reduced motion and visibility suspension remain shared across screen sizes.

Verification: real canvas code rendered at several times using the Canvas 2D runtime; frame compositions inspected. Desktop geometry tests cover vertical movement, deformation, cursor response and return to the ambient path. Existing touch/pause/preference tests pass. The rebuilt one-page CV was rendered and inspected; extracted text and PDF link annotations contain no personal email or mail link. The new standalone preview is independent of Cloudflare. Native device review remains appropriate before production publication.

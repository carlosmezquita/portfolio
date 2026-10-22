# Contact form

Both compositions have name, email and message fields, a managed Turnstile widget, and a LinkedIn alternative. The site remains on GitHub Pages. It submits JSON to `https://portfolio-contact.cadeiraai.workers.dev/api/contact`.

## Server configuration

`contact-worker/worker.mjs` is the Worker entrypoint; `handler.mjs` holds request validation and email construction. Deploy using `contact-worker/wrangler.jsonc`. There are no npm runtime dependencies. Use a current Wrangler version that supports the rate-limit binding.

Required Worker secrets:

- `CONTACT_TO`: the owner's verified Email Routing destination. Never put it in public source or a frontend variable.
- `TURNSTILE_SECRET`: the widget's secret, set through the platform secret store.

Public settings and bindings:

- `TURNSTILE_SITEKEY`: public widget key; `/api/contact/config` exposes only this value.
- `CONTACT_FROM`: address on the Email Routing domain, not the visitor's address.
- `CONTACT_ORIGINS`: exact HTTPS origins allowed to submit. Production allows the apex, www and named review host. Never add localhost to production origins.
- `CONTACT_EMAIL`: native `send_email` binding. The deployed binding is additionally restricted to the verified owner destination. The public config intentionally omits that private address; preserve the restriction through private deployment configuration or the dashboard when redeploying.
- `CONTACT_LIMITER`: three POST attempts per IP per 60 seconds. Native rate-limit counters are approximate and local to each Cloudflare location; this is abuse mitigation, not a strict global quota.

The managed widget is registered for the two production hostnames, named review host, localhost and 127.0.0.1. Local development must use a separate local-only origin allowlist and official Turnstile test keys. Never deploy test keys or verification bypasses to production.

The sender domain must have Cloudflare Email Routing configured. Sending only to a verified destination is free on Workers Free and Paid. No email acknowledgement is sent to visitors; the page shows confirmation. Worker execution remains subject to the account's plan and usage limits. This implementation requires no paid plan upgrade.

The owner confirmed on 22 October 2026 that this must stay free and that on-page confirmation is preferred for now. Do not enable a paid sending plan or add visitor acknowledgement emails. The success message confirms submission to the inbox and explains that Carlos will reply personally using the supplied email address.

## Request handling

The endpoint accepts only JSON POSTs from an approved origin, bounds the streamed body to 24 KB, validates fields (name 1–100 characters, email up to 254, message 10–5,000), rejects a filled honeypot, and rate-limits before verification.

Siteverify runs on the server and must return `success === true`, action `contact`, and a hostname equal to the exact requesting frontend hostname. Invalid, expired and redeemed tokens cannot send. The frontend resets its widget after every attempt and preserves typed content after failures. Missing configuration, verification outages and email errors fail closed.

Only server recipient/sender settings are used. Visitor `to`, `from`, `cc` and similar fields are ignored. Visitor prose is UTF-8/base64 encoded in a plain-text MIME body; only the strictly validated visitor email enters Reply-To. Delivery is awaited before reporting acceptance.

Email validation also rejects leading, trailing and consecutive dots in the local part, local parts longer than 64 characters and domain labels longer than 63 characters. The browser mirrors these checks and reports oversized values and control characters inline; server validation remains authoritative. Names are trimmed, and message prose is preserved as plain text rather than interpreted as HTML. Script-like text and header-like message lines cannot become markup or mail headers.

Both forms retain explicit visible labels associated by `for`/`id`, stable field names and standard `autocomplete="name"` / `autocomplete="email"` tokens. The email field requests an email keyboard and disables capitalization, correction and spellcheck. Its privacy/confirmation hint and error are associated through `aria-describedby`.

## Privacy

Anonymous action counts are documented in [analytics.md](analytics.md). When enabled, the browser sends only an allowlisted page path alongside the form; after email acceptance the server increments a daily `contact_success` counter. No form values enter that counter. Collection respects the tracker opt-out and request privacy signals; telemetry failure never changes delivery success.

The recipient address and Turnstile secret are never returned by the API. Names, email addresses and messages are not written to application logs. After email acceptance, a background task mirrors the validated enquiry into the private admin inbox in D1, separately from anonymous counters. It retains at most 1,000 requests for up to 90 days; the scheduled collector cleanup removes older requests. IP addresses and verification tokens are never stored there. Inbox storage is best effort: a failure does not change an already accepted submission or resend email. Earlier emails are not imported. The email inbox retains delivered messages normally. See [admin.md](admin.md) for access controls and request management.

## Validation

```sh
node --test scripts/test-contact.mjs scripts/test-contact-ui.cjs
node scripts/check-public-contact.cjs
node scripts/test-hero-motion.cjs
```

Server tests cover fixed-recipient delivery, UTF-8 MIME/Reply-To, replay rejection, action/hostname checks, provider failures, header injection, body size, rate limits, origin restrictions, private configuration and error redaction. They mock external services and do not establish production delivery by themselves.

The follow-up security/autofill changes pass all 21 server/client tests, including malformed JSON/UTF-8, wrong field types, malformed address parts, inert script/header-like prose, label/autofill/hint associations and inline length errors. Public-contact privacy and hero-motion checks also pass. These changes have not been deployed or checked with a live email submission; the earlier live results below apply to the preceding revision.

For a live check, open the approved review page, complete verification if requested, submit one labelled test message, verify acceptance and receipt in the owner's inbox, then confirm replay rejection with the redeemed token. Never substitute a production verification bypass for this check.

Setup checks on 22 October 2026: the sender domain's Email Routing is ready, the owner destination is verified, the Worker and widget are configured, the approved-origin configuration request returns 200, an unapproved origin returns 403, and an invalid token returns 403. The prepared test was successfully submitted in the review browser and the resulting email was confirmed in the owner’s inbox. Production-token replay remains unverified; replay rejection is covered by the mocked server tests. The form was inspected at desktop width and in 320 px / 390 px browser frames with no horizontal overflow; inputs keep 16 px type and the action target is 54 px tall. Keyboard navigation from name to email to message and the visible focus outline were checked. Physical-device review remains outstanding.

References: [Email pricing](https://developers.cloudflare.com/email-service/platform/pricing/), [send bindings](https://developers.cloudflare.com/email-service/configuration/send-bindings/), [Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).


## Form design and motion

The form follows the portfolio's cream paper, Instrument Serif/Sans and blue/teal accents. The original single-line, dark serif heading anchors the left column; all three fields follow one vertical reading order on the right. There is no extra form title or rule. Real associated labels begin inside empty fields and move up/shrink on focus or when a value is present. They stay visible while a value is entered, including after blur; clearing a field returns its label only after focus leaves. The same CSS value selector responds to autofill without adding an input-state script. Errors are associated with their fields using `aria-describedby` and `aria-invalid`; errors appear on submit, not on first-time typing.

Motion is bounded and tied to events: one entrance sequence (550–650 ms with short offsets), 180–320 ms focus/hover transitions, including a 240 ms floating-label transition, an in-flight spinner and a 420 ms success check. Focus does not shift layout, pointer movement does not move inputs, keyboard focus cancels the entrance animation, and reduced-motion preference disables the form's animations and transitions. No animation library is loaded.

Verification loads when the form approaches the viewport or receives focus. Turnstile uses its supported `interaction-only` appearance, not CSS concealment: verification still runs and the widget appears if interaction is required. At less than 300 px of available form width, the supported compact widget prevents horizontal overflow. Sending locks fields until completion; failure preserves entered text; success stays visible during token refresh.

Research informing these choices:

- [NN/g: Website Forms Usability](https://www.nngroup.com/articles/web-form-design/) — single-column flow, persistent labels and appropriate field sizes. Floating labels are a requested portfolio design choice; they remain semantic labels rather than disappearing placeholders.
- [GOV.UK: Text input](https://design-system.service.gov.uk/components/text-input/) — explicit labels, associated hints/errors and specific error messages. Its visual branding is not copied.
- [Material: Duration and easing](https://m1.material.io/motion/duration-easing.html) — short, responsive feedback and decelerating transitions. The exact timings above are design choices for this portfolio.
- [Instrument contact form](https://www.instrument.com/contact/contact-form) and [Linear support](https://linear.app/contact/support) — reference examples for concise contact content and a clear submission action. Their page content was reviewed; no claim of testing their animations is made.
- [Cloudflare widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/) — interaction-only appearance, callbacks and supported compact sizing.

Submission feedback sits beside the action button when space permits. The email-use explanation sits underneath that row. On phones, feedback stacks directly below the button, followed by the explanation; the live-region semantics remain unchanged.

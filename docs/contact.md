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

## Request handling

The endpoint accepts only JSON POSTs from an approved origin, bounds the streamed body to 24 KB, validates fields (name 1–100 characters, email up to 254, message 10–5,000), rejects a filled honeypot, and rate-limits before verification.

Siteverify runs on the server and must return `success === true`, action `contact`, and a hostname equal to the exact requesting frontend hostname. Invalid, expired and redeemed tokens cannot send. The frontend resets its widget after every attempt and preserves typed content after failures. Missing configuration, verification outages and email errors fail closed.

Only server recipient/sender settings are used. Visitor `to`, `from`, `cc` and similar fields are ignored. Visitor prose is UTF-8/base64 encoded in a plain-text MIME body; only the strictly validated visitor email enters Reply-To. Delivery is awaited before reporting acceptance.

## Privacy

The recipient address and Turnstile secret are never returned by the API. Names, email addresses, messages, IP addresses and tokens are not written to application logs or a database. The message and reply address pass through Cloudflare to the owner's inbox. Cloudflare processes the request and verification for delivery and abuse prevention. The inbox retains delivered email normally.

## Validation

```sh
node --test scripts/test-contact.mjs
node scripts/check-public-contact.cjs
node scripts/test-hero-motion.cjs
```

Server tests cover fixed-recipient delivery, UTF-8 MIME/Reply-To, replay rejection, action/hostname checks, provider failures, header injection, body size, rate limits, origin restrictions, private configuration and error redaction. They mock external services and do not establish production delivery by themselves.

For a live check, open the approved review page, complete verification if requested, submit one labelled test message, verify acceptance and receipt in the owner's inbox, then confirm replay rejection with the redeemed token. Never substitute a production verification bypass for this check.

Setup checks on 22 October 2026: the sender domain's Email Routing is ready, the owner destination is verified, the Worker and widget are configured, the approved-origin configuration request returns 200, an unapproved origin returns 403, and an invalid token returns 403. The real submission, inbox receipt and production-token replay checks remain pending because the review browser requires an interactive human check. Desktop form layout was inspected; physical-phone review remains outstanding.

References: [Email pricing](https://developers.cloudflare.com/email-service/platform/pricing/), [send bindings](https://developers.cloudflare.com/email-service/configuration/send-bindings/), [Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

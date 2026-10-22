# Private portfolio admin

[Open the admin panel](https://portfolio-dashboard.cadeiraai.workers.dev/). Sign in with the configured owner Cloudflare account. No SQL, API key or local server is needed.

- **Statistics:** 7, 30 or 90 UTC days of action totals, daily activity and link/page breakdowns. The traffic-source link opens Cloudflare's existing Web Analytics report.
- **Requests:** new contact enquiries after email acceptance, with new/read/archived statuses and 25 requests per page. Earlier emails are not imported. Archiving is reversible and does not delete the record.
- **Site content:** homepage introduction, contact introduction, Surfay code/notes URLs and Urbot/CadeiraAI destinations. Publish updates both portfolio compositions after their content loader is deployed. Allow about a minute for public-content cache expiry. Original content can be restored.

## Access controls

The native Worker Access application `Portfolio admin` protects the entire production hostname. Its sole Allow policy, `Portfolio owner only`, includes exactly the privately configured owner email. The only selected identity provider is Cloudflare. The session lasts six hours.

The Worker independently verifies Access's signed RS256 JWT against the team public keys, issuer, application audience, expiry and owner email. Missing configuration returns 503; invalid identity returns 403 before database access. Raw email headers do not establish identity. Responses and authenticated CSS disable caching; CSP prevents scripts, framing and external form submissions. POSTs require an exact same-origin Origin and reject cross-site fetch metadata. Version preview URLs are disabled, and alternate hostnames are rejected.

Live identifiers (not secrets):

- Team: `dawn-waterfall-2c17.cloudflareaccess.com`
- Application: `50949c21-4f96-4c6f-a254-a79d5eef437d`
- Policy: `d077d97b-24de-4652-81a2-ef943a47dcff`
- Audience: recorded in `dashboard-worker/wrangler.jsonc`

Keep the actual owner email only in the Access policy and `OWNER_EMAIL` Worker secret, outside public source. The app does not accept public registration or other administrators.

## Storage and editing

Anonymous counters, the private inbox and published content use separate tables in the existing `portfolio-events` D1 database. Only the fixed six public content fields are exposed by `/api/content`; there is no public inbox or reporting API. The collector restricts the public content endpoint to approved frontend origins. Public content is intentionally public and must never contain private information.

After successful email acceptance, contact storage runs in `waitUntil`. A failed write or full inbox does not undo delivery. At most 1,000 requests are retained, and the daily scheduled cleanup removes records older than 90 days. The delivered email remains the fallback record. Form fields are validated before storage; all displayed prose is escaped. SQL uses bound parameters.

Edits are plain text; link values require HTTPS without credentials or a custom port. Urbot and CadeiraAI may also point to `#contact`. The browser applies text through `textContent`, validates destinations again, and retains checked-in content if loading fails. Revision checks reject stale saves from another tab rather than overwriting newer edits. The editor does not change arbitrary HTML, styling or the CV.

## Deploy

Use Node 22+ and current Wrangler. Preserve the contact Worker's private recipient restriction and existing secrets when deploying it; see [contact.md](contact.md).

```sh
npm ci --prefix dashboard-worker
wrangler d1 migrations apply portfolio-events --remote --config analytics-worker/wrangler.jsonc
wrangler deploy --config analytics-worker/wrangler.jsonc
wrangler secret put OWNER_EMAIL --config dashboard-worker/wrangler.jsonc
wrangler deploy --config dashboard-worker/wrangler.jsonc
```

Set the dashboard hostname, Access team and audience in its Wrangler config before deployment, and keep the native Worker Access app enabled. Never deploy a verification bypass or a permissive policy for testing. The local preview used during development is outside this repository and uses an in-memory database; it is not a production route.

Deploy the contact Worker with its shared `EVENTS_DB` binding using private configuration. Publish `site-content.js`, `analytics.js` and both updated HTML files through the reviewed frontend PR. Static content remains available if the public content endpoint is down.

## Free-plan scope

This uses Workers Free, D1 Free and Zero Trust Free. No Workers Paid upgrade or visitor acknowledgement email was added. The owner completed Zero Trust Free activation and its required billing authorization themselves. Account-wide quotas are shared; the application is not an account billing cap, and later plan changes require a billing review. The event collector still caps acceptance at 5,000 events per UTC day. The inbox caps records at 1,000. There are no scheduled analytics refresh jobs: reports run only when opened.

## Validation

```sh
node --test dashboard-worker/test/*.mjs scripts/test-analytics.mjs scripts/test-contact.mjs scripts/test-contact-ui.cjs scripts/test-site-content.cjs
node scripts/check-public-contact.cjs
```

The 53 tests cover signed/forged/expired/wrong-owner JWTs, authentication before reads, request validation, CSRF, escaped inbox prose, status updates, stale revisions, HTTPS links, public-field isolation, frontend fallback and existing contact/analytics behavior. SQLite-backed tests exercise migrations and queries. External email delivery is mocked; no new live enquiry was sent for this admin deployment.

Live checks on 22 October 2026 UTC: the owner Cloudflare session opened all three admin sections and successfully published the existing text/links without changing their values. Unauthenticated requests to statistics, inbox, editor and CSS redirected to Access even with forged identity headers. Public content returned exactly the six editable fields; an unapproved origin was rejected and no public inbox route existed. The contact Worker's private recipient restriction and secret bindings were preserved, and an invalid Turnstile token still returned 403. The editor was checked at desktop and 390 px widths with no page overflow. The save check exposed a browser interaction with `no-referrer`; the deployed `same-origin` referrer policy preserves native POST origins while suppressing cross-origin referrers. See [MDN's Origin header reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin).

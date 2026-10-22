# Portfolio event analytics

The new aggregate traffic extension adds page views, source categories, device/browser/viewport/country breakdowns, scroll/visible-time milestones and load-time bands to the existing dashboard. See [implementation and rollout](analytics-implementation.md) and [research](analytics-research.md). The documentation below records the original action-counter system and deployment; it does not mean the new extension is deployed. Review independent Cloudflare Web Analytics injection before rollout so it cannot bypass the explicit opt-out. No new paid plan or analytics provider is required.

## Open the reports

Open the [private portfolio admin](https://admin.carlosmezquita.dev/) and sign in with the configured owner Cloudflare account. Statistics provides 7, 30 and 90 day totals, a daily chart and a breakdown by action, target and page. No SQL is required. Requests and Site content are described in [admin.md](admin.md).

For optional SQL access, in the CadeiraAI Cloudflare account, open **Storage & databases → D1 → portfolio-events → Console**.

[Open the portfolio-events database](https://dash.cloudflare.com/1db26bf02a050c742294458d1adc328b/workers/d1/databases/3a9e1416-6515-431b-95d1-3d4e54a31dca).

Last 30 calendar days, by action, target and page:

```sql
SELECT * FROM events_last_30_days ORDER BY total DESC;
```

Daily totals for the last 30 calendar days:

```sql
SELECT * FROM events_daily
WHERE day >= date('now', '-29 days') ORDER BY day DESC, event;
```

Totals for each action, across all pages and targets:

```sql
SELECT event, SUM(total) AS total
FROM events_last_30_days GROUP BY event ORDER BY total DESC;
```

Reports and retention use UTC calendar dates. Reports are available only through the owner-authenticated admin panel or Cloudflare dashboard/CLI; there is no public reporting endpoint.

## What the actions mean

| Event | Meaning | Targets |
| --- | --- | --- |
| `cv_download` | Click on a CV download link; it does not establish that the download completed | `cv` |
| `project_click` | Click on a project's screenshot, enquiry link, section navigation or legacy summary link | `surfay`, `urbot`, `cadeira` |
| `github_click` | Click on an allowlisted profile, repository or engineering-notes link | `profile`, `surfay`, `surfay-engineering`, `urbot`, `cadeira` |
| `contact_start` | First trusted input in name, email or message per page load; focus and honeypot input do not count | `contact` |
| `contact_success` | Email provider accepted the enquiry after server validation and Turnstile verification | `contact` |

The server records successful sends directly. The public event endpoint rejects `contact_success`, so client JavaScript cannot claim an enquiry was delivered. Provider acceptance is not a read receipt or a guarantee against subsequent mail bounces. Only instrumented, non-opted-out submissions with an allowlisted page contribute to this count.

GitHub links count as `github_click`, even inside a project; they are not double-counted as project clicks. No events are sent for unrelated links. The legacy project pages are instrumented as well as both portfolio compositions. Preview and local hosts are excluded.

These are action totals, not unique visitors or session funnels. Repeat visits/clicks, browser blockers, failed networks, quota limits and deliberately forged public click events can affect counts. Origin checks and rate limiting reduce noise but do not authenticate public click telemetry. There is no cross-device or visitor-level tracking. Do not treat the starts-to-sends ratio as a precise conversion funnel.

## Privacy and free-plan bounds

The anonymous counters retain only UTC day, event name, fixed target, allowlisted page path and aggregate count. They contain no cookies, browser storage, visitor IDs, referrer/query strings, names, emails, message contents, precise event timestamps or IP addresses. Separately, the same database now holds the private operational contact inbox and published site text; see [admin.md](admin.md). Cloudflare still processes network metadata to serve requests and enforce rate limits. The client omits credentials and referrer information. Global Privacy Control and Do Not Track disable browser collection; the server also checks those request headers.

The collector is a separate Worker, `portfolio-events`, with request logging disabled. It accepts only exact production origins and bounded JSON with exactly three fields. Prepared SQL and fixed page/event/target allowlists prevent arbitrary data collection. Its limiter allows 30 attempts per IP per minute per Cloudflare location (approximate, not a global quota). IPs are only used transiently as rate-limit keys. The client allows at most 30 tracked link clicks per page load and never retries failed tracking.

A single atomic SQL statement caps accepted events at **5,000 per UTC day across both Workers**, including successful sends. Extra events are dropped. A daily scheduled cleanup retains 90 UTC calendar days, with a bounded number of aggregate rows per day. Analytics outages or exhausted quotas never cancel navigation/downloads or turn delivered enquiries into failed form submissions.

The account's **Workers Free** plan was checked in the dashboard during setup. Workers Free and D1 Free have hard daily limits; they reject excess work rather than charge overages. Quotas are shared with the account's other applications, so tracking can stop earlier than its own cap. No plan upgrade, paid subscription, paid storage, Analytics Engine, Queues or Durable Objects was enabled. If the account is later upgraded, review billing again; the application cap is not a Cloudflare billing cap.

Current published free allowances: 100,000 Worker requests/day; D1 5 million rows read/day, 100,000 rows written/day and 5 GB total storage. Reference: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Web Analytics limitations](https://developers.cloudflare.com/web-analytics/faq/).

## Deployment and maintenance

```sh
wrangler d1 migrations apply portfolio-events --remote --config analytics-worker/wrangler.jsonc
wrangler deploy --config analytics-worker/wrangler.jsonc
```

The contact Worker also needs the same `EVENTS_DB` binding. Deploy it using a private config preserving the live `CONTACT_EMAIL.destination_address` restriction; the private recipient must never be added to public Git source. Preserve existing secrets and variables. See [contact.md](contact.md).

Publish the frontend `analytics.js` and updated HTML/contact.js together. Source files alone do not activate collection until published. The contact Worker remains backward compatible with old clients, which do not send `analytics_page` and therefore do not create success counts.

```sh
node --test scripts/test-analytics.mjs scripts/test-contact.mjs scripts/test-contact-ui.cjs
node scripts/check-public-contact.cjs
```

Tests use Node 22+ with its built-in SQLite module and no runtime npm dependencies. SQL aggregation, daily cap and retention are exercised against a real SQLite database. HTTP validation, click classification, first-input counting, privacy signals, rejected success spoofing and failure isolation are also covered.

Setup validation on 22 October 2026: all 34 tests passed, both Workers passed Wrangler build checks, the collector and cleanup schedule were deployed, and the contact Worker retained its verified-recipient restriction and both secret bindings. Live collector checks returned 403 for an unapproved origin, 400 for a forged success, 204 for preflight and 202 for both an opted-out request and a valid event. The D1 report contained exactly one event, confirming the opt-out did not add a count. That one `cv_download` on `/direction-b.html` is a setup smoke-test count, not a visitor download. Contact configuration returned only its sitekey, and invalid Turnstile verification still returned 403 without sending email. Successful-send counting is covered by mocked email delivery tests; no new live enquiry was sent during this setup.

The analytics frontend PR has been merged. The separate admin PR adds the public content loader and editable-link tracking; publishing that PR is required for admin text/link edits to appear on the portfolio. The dashboard and private inbox backend are deployed separately.

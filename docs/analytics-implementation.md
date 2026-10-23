# Aggregate traffic implementation

The owner selected aggregate statistics without visitor/session identifiers. The existing owner-protected dashboard now includes traffic/engagement alongside actions for 7, 30 and 90 UTC days. See [research](analytics-research.md) for project comparisons and legal scope. New collection requires deployment; historical traffic is not backfilled.

The owner subsequently chose to retain Cloudflare Web Analytics as a complement. `performance-analytics.js` loads the official manual beacon for Web Vitals/network timing using the same `portfolioAnalytics.page()` privacy gate. Automatic injection stays disabled. Cloudflare and custom traffic counts may overlap or differ and must not be added together. The custom D1 report is the action/engagement record; Cloudflare supplies richer performance diagnostics.

## Measurements

| Metric | Meaning |
| --- | --- |
| Views | Once on first visible state per document load. Reloads count; hidden prerenders wait; back/forward cache restoration does not create another view. |
| Sources | Direct/unavailable, internal, search, GitHub, LinkedIn, social, other. No raw referrer/query/fragment/UTM value leaves the browser. Unknown engines can appear as Other. |
| Device/browser | Broad server User-Agent categories, no versions or raw header stored; estimates, including possible iPad desktop-mode misclassification. |
| Viewport | Under 768, 768–1199, at least 1200 CSS pixels, or unknown. |
| Country | Approximate two-letter Cloudflare country, or unknown; no city, region or coordinates. VPNs/proxies affect estimates. |
| Scroll | Reached 25/50/75/100% of scrollable distance, once each after trusted scrolling. Short non-scrollable documents emit none. |
| Visible time | Reached 10/30/60 seconds in a visible tab, once each. Hidden time excluded; long suspended-clock gaps clamped. Not proof of reading. |
| Load | Navigation loadEventEnd under 1 s, 1–3 s, at least 3 s. Missing timing omitted. Not Core Web Vitals. |

Milestones overlap and are not visitor/session funnels. Breakdowns are independent marginal totals and cannot be joined into profiles. Network losses can make their totals disagree. Existing actions retain their definitions in [analytics.md](analytics.md).

## Contract and limits

`POST /api/traffic` accepts exactly `{page,type,values}`. For `view`, values is exactly `{source,viewport}` using fixed enums. For `scroll`, `visible`, `load`, values is one fixed string. Five page paths are allowlisted. A streamed 512-byte limit applies regardless of Content-Length; extra fields/unknown values are rejected. Public clients still cannot claim contact successes.

One parameter-bound atomic SQLite INSERT fans out a measurement into separate `traffic_counts` counters, including a budget counter. A failed dimension rolls back the entire statement. No raw events/identifiers enter SQL. Known bot headers are filtered, but public telemetry is forgeable. Origin checks constrain browsers; they do not authenticate hostile scripts. IP is transiently used by the existing approximate 30 requests/IP/minute/location limiter shared with action collection.

Traffic accepts at most 5,000 requests/UTC day across pages, independent of the existing 5,000 action allowance. Views write seven counters; milestones write two, so accepted traffic is bounded by 35,000 counter increments/day. Rejected requests still use Worker resources; this is not a billing cap or complete abuse defence. The dashboard flags capped days but cannot diagnose all blockers/outages. Both tables retain today plus 89 preceding UTC days through the daily scheduled cleanup; contact retention remains separate.

Client collection never interrupts navigation or contact. Requests omit credentials/referrers, use keepalive, and have no retries/offline queue/deduplication IDs. Maximum per document: one view, one load, four scroll and three visible-time requests, plus bounded existing actions.

## Preferences

Both layouts link to `privacy.html`, which loads no collector. GPC/DNT disable client/server collection. Explicit Disable writes only `portfolio.analytics.disabled=1`, solely to remember the choice; nothing is written by default or transmitted. Every send and contact analytics-page lookup checks it. Enable removes it but never overrides GPC/DNT. Choices are per origin/browser (www separate), and storage failure is explained. Cloudflare still processes network metadata; application request logging remains disabled. See the research for processor/transfer and site-wide-beacon review requirements.

The Cloudflare loader shares the initial choice and waits for a visible document, excludes arbitrary queries/fragments, prevents duplicate loading and disables SPA measurement. Its public site token comes from the dashboard's official snippet. The official beacon has its own payloads (including an ephemeral page-load identifier/referrer/performance timings) and processing/retention; the custom collector's marginal-only storage and 90-day cleanup do not describe Cloudflare's backend. Already loaded Cloudflare measurement in other tabs stops on closing/reloading those tabs; the notice states this limit instead of promising removal of previously sent reports. No forced reload discards unsent contact forms.

Analytics script URLs carry an explicit release version to avoid old browser/CDN caches reusing the previous tracker during rollout. Bump that version when privacy behaviour changes. The Cloudflare loader also independently checks the preference/GPC/DNT, so a cached older tracker cannot bypass them.

## Rollout and rollback

1. Review public notice, applicable basis/exemption and Cloudflare processing/transfer terms. Set Web Analytics to **Enable with JS Snippet installation**, retaining the existing site; automatic injection must remain off.
2. Run tests/dry runs below. Apply additive migrations before either updated Worker, preserving old counters/inbox/content.
3. Deploy collector and Access-protected dashboard, preserving origins, secrets, Access and logging configuration. No contact-Worker change, new secret/service/subscription is needed.
4. Publish analytics.js, performance-analytics.js, both layouts and privacy.html/js/css through the reviewed frontend PR, with the notice available before collection starts.
5. Verify live validation, privacy signals, explicit opt-out, private reports and cleanup. Label any smoke-test count; do not send real enquiries just to test analytics.

```sh
npm ci --prefix dashboard-worker
node --test scripts/test-performance-analytics.cjs scripts/test-traffic.mjs scripts/test-analytics.mjs dashboard-worker/test/*.mjs scripts/test-contact.mjs scripts/test-contact-ui.cjs scripts/test-site-content.cjs
node scripts/check-public-contact.cjs
wrangler deploy --dry-run --config analytics-worker/wrangler.jsonc
wrangler deploy --dry-run --config dashboard-worker/wrangler.jsonc
wrangler d1 migrations apply portfolio-events --remote --config analytics-worker/wrangler.jsonc
wrangler deploy --config analytics-worker/wrangler.jsonc
wrangler deploy --config dashboard-worker/wrangler.jsonc
```

Rollback restores previous frontend/Worker versions without dropping tables or resetting data. Keep privacy controls reachable. Previous Workers ignore the additive table; maintain its retention or separately review stale-data removal if retiring collection.

Real SQLite tests cover migration, fan-out, budget/midnight boundaries, rollback, retention and reporting. Browser-logic tests cover secret stripping, visibility, once-only milestones and preferences. Existing authentication/contact/inbox/editor tests also run. These tests do not prove production collection, global residency or legal compliance.

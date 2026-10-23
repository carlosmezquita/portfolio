# Search and agent discovery

This release adds a public professional contact route, clearer role interests, explicit identity metadata and static discovery files. It stays on the existing GitHub Pages and free Cloudflare setup. It does not add a contact API, Markdown conversion service or paid feature.

## Public facts and contact

- Current location remains Portsmouth, UK. London is a role preference, not a claimed residence.
- The homepage states interest in full-stack and AI product engineering roles at London startups and opportunities across the EU. Start date and UK work eligibility are not inferred.
- The role-preference paragraph is outside the editable `data-content="intro"` element. Existing admin overrides still work, without removing the static recruiting context or changing JSON-LD.
- `hello@carlosmezquita.dev` is the public alias. Its forwarding rule was confirmed Active in Cloudflare on 23 October 2026, targeting the existing verified private inbox. Delivery has not been tested in this release.
- The alias appears in visible HTML, a native mail link, the no-JavaScript form fallback and the Person JSON-LD. A mail link does not itself send email; agents need their own email capability and authorisation.
- The visible email has no resting underline and a 6px gap before the arrow. Hover or keyboard focus reveals a 1px line from its centre over 260ms; the existing reduced-motion rule makes the change immediate.
- The existing Turnstile form and footer LinkedIn link remain available. No private inbox is included in the markup. Replies may reveal the personal Gmail address to the correspondent, as requested by the owner.

## Discovery files

`robots.txt` uses a wildcard allow rule, declares `search=yes, ai-input=yes`, and points to the canonical sitemap. It deliberately leaves AI training preferences unspecified. Crawl preferences do not override Cloudflare WAF or other edge blocks. Cloudflare may prepend managed content to the origin file; verify the final served response after publication.

The sitemap contains only `https://carlosmezquita.dev/`. The alternative design has a crawlable `noindex, follow` directive and is excluded. The existing project pages are noindex redirect stubs and are excluded. Add substantive project pages only after they are published with their own canonical URLs; do not list fragment anchors or unpublished routes. No automatic or invented modification dates are used.

## Before merging

1. Review the local homepage on desktop and mobile, including the role preference and email link.
2. Check the exact mail destination without sending a message.
3. Parse the JSON-LD and sitemap; confirm identity, location, public email and canonical agree with the visible page.
4. Run the public-contact privacy guard, site-content and contact UI/server tests, and `git diff --check`.
5. Keep the PR unmerged until the owner verifies the website. Local review is not production deployment.

## After an approved merge and GitHub Pages publication

1. Fetch `/`, `/robots.txt` and `/sitemap.xml` from the production domain. Expect HTTP 200, correct content types and the intended merged robots policy.
2. Confirm the new role paragraph and alias exist in initial HTML and remain present after the admin content loader runs.
3. Use Google's Rich Results Test / URL Inspection and Bing URL inspection. Submit the sitemap in the relevant webmaster accounts. Structured data does not guarantee search presentation or indexing.
4. Review Cloudflare crawler/security events for unwanted search or assistant blocks. Re-run the content-site agent-readiness scan, interpreting protocol checks separately from indexing or ranking.
5. Arrange an authorised external delivery test to the alias and confirm receipt before claiming tested deliverability. No test email is sent automatically.

References: [Google AI features](https://developers.google.com/search/docs/appearance/ai-features), [profile structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page), [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Cloudflare managed robots](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/).

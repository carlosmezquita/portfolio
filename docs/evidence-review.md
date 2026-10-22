# Portfolio evidence review

Reviewed 22 October 2026. This is a bounded source and claims review, not a production acceptance test. The live LinkedIn profile was inspected through the user's connected browser; search snippets were stale and were not used as the current profile.

## Claims and publication decisions

| Item | Evidence inspected | Decision and limits |
| --- | --- | --- |
| Denodo employment | Current LinkedIn lists a full-time QA Testing and Development internship, Mar–Jun 2023, followed by part-time QA Testing and Development, Jun 2023–Oct 2025. | Preserve the exact role wording and distinguish the two employment periods. These are profile statements, not independently verified employment records. |
| Parallel test execution | Carlos's earlier account of owning this task; current LinkedIn also says he led the redesign. | Retain ownership. Remove the numerical runtime improvement from site and CV: no before/after measurement was available in this review. This does not establish that the prior figure is wrong; it remains a detail Carlos can substantiate. |
| Degree | LinkedIn About and Education say June 2027; the prior portfolio/CV say July 2027. Both describe the Portsmouth degree as in progress. | Publish expected completion in 2027, without an unresolved month. Confirm whether June denotes teaching completion and July denotes the formal course end before reinstating a month. |
| AI Society | LinkedIn Experience still says Incoming President; its Education section says President. Carlos's supplied project context identifies him as President. | Keep President on site/CV on that user-supplied basis. Say rebuilding/planning, not that workshops or partnerships have already happened. LinkedIn Experience needs alignment. |
| Surfay | Public README, engineering notes, publication implementation and corresponding transaction tests. Latest listed Verify Surfay workflow succeeded on 18 October 2026 at b5d8d2ec4e911aada6f17bea23fe7a3fa2c8588d. | Working prototype with public code and engineering notes. CI success is evidence for that revision, not a current live deployment or accuracy claim. No tests rerun here. |
| Surfay image | Public README and third-party notices describe synthetic forecasts with real cartography. The local image's Git blob hash matches the public file: feb4da4bf0b0ba4caf5c59d366653d7ad8c7f517. | Add the actual screenshot, retain map attribution, label synthetic data and link the full-size image. It proves an interface exists, not forecast skill or live service health. |
| Urbot | Private repository README and current documentation index describe the guided workflow, deterministic evaluation, evidence and human review. | Keep a short in-development summary. No private code, customer information or application screenshots are published. No production, legal-completeness or customer-impact claim. |
| CadeiraAI | Private client/server manifests, server README and reservation-tool implementation. They support React, TypeScript/JavaScript, voice/telephone integration, LangGraph and reservation creation. Current server scripts invoke Bun, while the older README still describes Node.js. | Label prototype and describe work across client and TypeScript backend; update the stack to Bun to match executable scripts. Source presence does not prove reliable live calls, customers, latency or booking success. No private excerpts are published. |
| Contact and CV | Email and professional profile destinations match current site/profile context. CV rebuilt and rendered as one page. | Links are available directly. Email deliverability and responses have not been tested. |

## Public evidence

- [Surfay README](https://github.com/carlosmezquita/surfay)
- [Engineering decisions](https://github.com/carlosmezquita/surfay/blob/main/docs/engineering.md)
- [Publication implementation](https://github.com/carlosmezquita/surfay/blob/main/worker/publication.ts)
- [Publication tests](https://github.com/carlosmezquita/surfay/blob/main/worker/publication.test.ts)
- [Successful verification run](https://github.com/carlosmezquita/surfay/actions/runs/39084506975)
- [Asset attribution](https://github.com/carlosmezquita/surfay/blob/main/THIRD_PARTY_NOTICES.md)

## LinkedIn follow-up

- Keep the current headline: Software Engineer | Ex-Denodo | Computer Science Student. It is clear and consistent with the engineering work described.
- Align the degree completion month once confirmed. The website and CV currently avoid the disputed month.
- Update Incoming President to President in Experience to match the actual appointment and Education section.
- Add Surfay to About. Its existing Projects entry already gives a specific, appropriately qualified engineering summary.
- Feature Surfay's public repository directly alongside the portfolio. The existing Featured descriptions about ideas brought to life and code Carlos loves to build provide little useful information; replace them with a concrete explanation of what each link contains.
- Check Surfay's Jul 2026–Jul 2026 dates if they are intended to show ongoing development. The repository records later work; this alone does not determine the correct project start/end dates.
- The event-agency role is labelled Temporary Civil Servant. Check that employment type against the contracts; work for a council client alone does not establish civil-servant status.

No LinkedIn fields were edited during this review.

## Remaining gates

Stage 1 content and source simplification is implemented in PR #6. The revised visual direction still needs a real desktop/mobile browser review.

Stage 2 source review is complete within the bounds above. Full stage 2 remains open for live demo verification, independent substantiation of impact figures, and any shareable Urbot/CadeiraAI media. A missing item is not replaced by an invented statistic, mock product screenshot or unverified demo link.

Before adding a Surfay live demo, confirm migration 0009 and verify navigation, forecast display/refresh, sign-in and an authorized report on the actual deployment. Its public README explicitly says the deployment remains unverified. The optional source-coastline regression also remains unverified; do not present it as fully reproduced.

Browser review was blocked because the connected browser could not reach the workspace server. A self-contained data URL was explicitly denied by browser policy; no bypass was attempted. No Sites preview, public deployment or merge was performed. Automatic review blocked publication of the two supplied artwork files pending explicit approval; they are excluded from the public PR. The existing public CV contact details were checked against the public generator before its replacement was accepted.

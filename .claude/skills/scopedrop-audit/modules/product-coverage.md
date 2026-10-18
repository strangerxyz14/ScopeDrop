# Module: product-coverage

Goal: translate the code state into product state. For each pillar, establish what a reader can actually use today, and measure the code against the 90-day goal of daily return visits.

## A. Pillar matrix

Build a matrix with one row per pillar. Pull the evidence from the earlier modules.

| Pillar | Ingestion pipeline | Storage table(s) | UI route | Live data (not mock) | AI disclosure | Verdict |

Pillars:
- News
- Funding
- Companies
- Learn (Founder Track + glossary)
- Events (geo-filter: Delhi NCR, Bengaluru, Mumbai, Hyderabad)
- Get Your Scope (newsletter)

Give each pillar one of these verdicts:

| Verdict | Meaning |
|---|---|
| SHIPPABLE | All columns are satisfied |
| UI-ONLY | A route exists, but there is no live pipeline |
| PIPELINE-ONLY | Data is flowing, but there is no UI |
| ABSENT | Neither a route nor a pipeline exists |

For Events, check specifically whether the city geo-filter exists, and how a user's city is determined. It could be manual selection, IP-based, or a stored preference.

## B. Retention mechanics (90-day goal: daily return visits)

Report whether each mechanic exists and works, with evidence.

1. **Newsletter capture.**
   - Is there a signup form?
   - Where does it write?
   - Is there double opt-in?
   - Is there a sending integration?
   - Signups that are stored with no sending path count as PARTIAL.
2. **Daily-changing surfaces.**
   - Term of Day.
   - The signal rail, with Realtime.
   - Fresh funding rounds.
   - Do these surfaces actually change daily? Check the cron frequency feeding them.
3. **Freshness signals.** Do pages show "updated X ago" or "new" indicators, using parrot green and only for status?
4. **Analytics.**
   - Is any analytics present, such as Cloudflare Web Analytics, Plausible, Umami, PostHog, or GA?
   - Without analytics, the 90-day goal cannot be measured. That is a P1 finding.
5. **Shareability.**
   - OG images and tags on detail pages, from performance-seo.
   - Share actions.

## C. Scope discipline

Grep for code that implements items listed under "SCOPEDROP FUTURE (post-MVP)":
- Watchlists
- Auth-gated feeds
- Investor Spotlights
- Global Rankings
- AI Tools Directory

Partial work on any of these while the core pillars are UI-ONLY or ABSENT is a P2 finding. It indicates scope drift.

## Report contribution

1. The pillar matrix.
2. A retention checklist.
3. One sentence stating the single highest-leverage gap between the current state and daily return visits.

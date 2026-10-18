# Module: backend-pipeline

Goal: verify the Events Near You phases, the known bugs, the edge-function and cron inventory, LLM routing compliance, and ingestion provenance.

## A. Phase status (Phases 0–4 from baseline.md)

Classify each phase as DONE, PARTIAL, NOT STARTED, or DIVERGED. A phase is DONE only if its code exists, it is wired (called or routed), and it builds.

- **Phase 0 — `_shared/llm.ts`**
  - Does `supabase/functions/_shared/llm.ts` exist? If so, does it implement each of the following? Cite line numbers.
    - Task classes A, B, B', C, and D.
    - Primary and fallback provider per class, matching the routing table in baseline.md.
    - The 7,500-token pre-flight ceiling on Cerebras calls.
    - Timeouts, retry with backoff, and typed error handling.
    - Telemetry: what is logged, and where it is stored.
  - Run `grep -rIni "groq\|cerebras\|llama-3\|qwen\|api.groq.com\|api.cerebras.ai" supabase src` and list every call site outside `_shared/llm.ts`. Each one is a bypass of the abstraction.
- **Phase 1** — Check for:
  - An events schema migration.
  - Whether the `fetch-events` output is read by the UI. Trace the table it writes against the table `EventsCarousel` reads.
  - Whether the Submit Event route and component have been removed.
  - A global default listing.
  - Autofit primitives.
- **Phase 2** — Check for:
  - An `/events/:slug` route in the router.
  - The number of distinct content sections it renders.
  - AI-disclosure badges.
  - Whether `EventDetailsModal` is still used.
- **Phase 3** — Check for:
  - The extraction cascade (JSON-LD → Open Graph → LLM).
  - The image resolver, which calls Workers AI FLUX at 1536×864.
  - The logo resolver, which calls Logo.dev.
  - Editorial generation.
  - The normalizer cron.
- **Phase 4** — Check for:
  - The Techmeme ingestor, including canonical-page fetching.
  - The Luma iCal ingestor using `api.lu.ma/ics/get`.
  - Two-stage filtering.
  - The completeness filter UI.

## B. Known bugs 1–5 (from baseline.md)
Report each bug as FIXED, OPEN, or CHANGED, with `path:line` evidence. Also run:
`grep -rIni "YOUR_SUPABASE_SERVICE_ROLE_KEY\|YOUR_\|REPLACE_ME\|<your\|changeme" supabase src`

## C. Edge function inventory
For every directory under `supabase/functions/` except `_shared`, produce a table with these columns:

| Function | Trigger (cron schedule / HTTP caller / NONE) | Reads tables | Writes tables | Secrets (`Deno.env.get`) | LLM class used | CORS handling |

- Find triggers in two ways:
  - Search the migrations for `cron.schedule` and `net.http_post`.
  - Search `src` for `functions.invoke(` and `/functions/v1/`.
- A function with trigger NONE is dead code and a P2 finding.
- A function that writes a table no reader consumes is an orphan and a P1 finding.

## D. Cron jobs
For each `cron.schedule`, record the job name, the schedule, its target, the auth header source (is it a placeholder, a vault secret, or a hardcoded value?), and the frequency per day. This data is reused by `ops-cost`.

## E. Schema inventory
- List every migration in order, with a one-line summary of each.
- Flag destructive statements: `DROP TABLE|DROP COLUMN|TRUNCATE|ALTER COLUMN .* TYPE|DELETE FROM`. Policy is additive-only, so each one is a P1 finding unless it is clearly a reversal of the same migration.
- Confirm whether these tables exist: `raw_signals`, `entities`, `capital_events`, `articles`, `events`, `collections`. Note which ones are written by a pipeline and which ones are read by the UI.

## F. Ingestion and provenance
- List every ingestion source (RSS URLs, Luma, Techmeme, RSSHub, RSS-Bridge).
- Check that every extracted-row insert includes `source_url`. A missing `source_url` is a P1 finding.
- Flag any storage of full article bodies or near-verbatim text (columns like `content`, `body`, or `full_text` populated from scraped HTML) as a P1 content-risk finding.
- Flag any headless scraping of Luma Discover, or any use of Apify. Both were explicitly rejected approaches.

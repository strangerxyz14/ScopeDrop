---
last_verified: 2026-09-10
note: Hypotheses to verify, not facts. Update this file manually after each merged phase, using the "Baseline divergences" section of the latest audit report.
---

# ScopeDrop Baseline

## Stack
- Frontend: Vite + React + TypeScript, deployed on Cloudflare Workers with static assets via `wrangler.jsonc`.
- Backend: Supabase (free tier), with edge functions and Postgres. Data flows from `raw_signals` into `capital_events`, `entities`, and `articles`.
- LLM providers: Groq (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) and Cerebras (`llama-3.3-70b`, `llama-3.1-8b`), being consolidated into `supabase/functions/_shared/llm.ts`.
- Images: Cloudflare Workers AI FLUX.1 Schnell at 1536×864. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are stored in Supabase secrets.
- Logos: Logo.dev, with its token stored in Supabase secrets.
- Ingestion: Luma iCal (`api.lu.ma/ics/get`), Techmeme RSS with a canonical-page fetch, native RSS feeds (TechCrunch, VentureBeat), and RSSHub/RSS-Bridge as a fallback for sites without native feeds.
- Domain `scopedrop.com` at Hostinger is deferred.
- Constraint: a free-only stack until revenue justifies paid services.

## Data primitives
Entities, capital events, collections, scheduled events, and articles. A classifier-first pipeline routes `raw_signals` into typed extraction.

## LLM routing classes
| Class | Purpose | Primary | Fallback |
|---|---|---|---|
| A | Classify or gate | Cerebras `llama-3.1-8b` | Groq |
| B | Structured JSON, ≤6K tokens | Cerebras `llama-3.3-70b` | Groq |
| B' | Structured JSON, >6K tokens | Groq direct | none |
| C | Short generative (Highlights, tooltips, summaries) | Cerebras `llama-3.3-70b` | none |
| D | Long analytical ("What's the Scope", articles) | Groq `llama-3.3-70b-versatile` | none (Qwen 3 32B A/B pending) |

A hard pre-flight ceiling of 7,500 tokens gates every Cerebras call.

## Content pillars
News, Funding, Companies, Learn (Founder Track and glossary), Events (geo-filtered to Delhi NCR, Bengaluru, Mumbai, and Hyderabad), and Get Your Scope (newsletter).
Goal for the first 90 days: daily return visits.

## Design system (locked)
- Page base Ink `#0A1628`; card surfaces Oxford `#0F2847`.
- Amber `#E8A33D` is used exclusively for monetary values.
- Parrot green `#3ECF6E` is used only for live or status signals, never decoratively.
- Fonts: IBM Plex Mono for data fields, Space Grotesk for display headings, Inter (weights 400–800) for UI.
- The wordmark is "ScopeDrop" everywhere. The favicon is the parrot ring only. The tagline "The pulse of what's building" appears in the tab title only.
- Article images are photorealistic, 1536×864.
- Motion is selective: Realtime inserts on the signal rail, scroll reveals, and the Term of Day cross-fade. No tickers, marquees, or auto-rotation.
- Funding cards carry an amber left-edge bar whose height is proportional to the deal size relative to the largest round in view.
- Desk bylines: The Decode Desk, The Pattern Desk, The Data Desk, and The Radar Desk.
- AI-disclosure badges are required on AI-generated content.

## Active build: Events Near You (5 sequential phases)
- **Phase 0:** a `_shared/llm.ts` provider abstraction covering Groq/Cerebras routing, task classes, fallback, and telemetry.
- **Phase 1:** a canonical events schema migration, a fix for the orphaned fetcher, removal of the Submit Event route, a global default listing, and autofit primitives.
- **Phase 2:** an `/events/[slug]` SEO route (not a modal) with 5 mandatory content sections and AI-disclosure badges.
- **Phase 3:** an enrichment pipeline covering the extraction cascade (JSON-LD → Open Graph → LLM), the image/logo resolver, editorial generation, and the normalizer cron.
- **Phase 4:** Techmeme and Luma ingestors with two-stage filtering, plus a completeness filter UI.

## Known bugs (as of last_verified)
1. The output of the `fetch-events` edge function is orphaned. `EventsCarousel` reads from `events` directly, not from the cache the function writes to.
2. Two SQL migrations contain the literal `YOUR_SUPABASE_SERVICE_ROLE_KEY`, so cron authorization likely fails on every run.
3. `EventDetailsModal` is missing mandatory content sections.
4. The Submit Event route is still live.
5. LLM calls have no shared abstraction, some lack fallback, and model IDs are hardcoded across files.

## Working rules
- Schema changes are additive only. The user applies all migrations manually.
- Phases run in strict sequence, and each must be merged before the next begins.
- Work happens on feature branches only. Nothing is committed directly to `main`.
- Store `source_url` for provenance on every extracted record.

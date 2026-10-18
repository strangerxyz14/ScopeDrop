# Module: ops-cost

Goal: work out where the free-only stack breaks first, and whether the project can be operated and recovered.

## A. Free-tier load model

Use the cron inventory from `backend-pipeline` (section D) and the code paths of each job. For every scheduled job, estimate per run:
- The number of LLM calls, by provider and class.
- The number of Workers AI image generations.
- The number of Logo.dev lookups.
- The outbound fetches.
- The database rows written.

Multiply each figure by the runs per day.

Present the result as a table with these columns:

| Resource | Est. daily usage | Free-tier limit | Headroom | Source of limit |

- **Do not state limits from memory.** Read any limit that the repo documents (README, comments, config). For every other limit, write `LIMIT: verify at <provider docs URL>` and do not use a number.
  - Groq: rate limits per model.
  - Cerebras: rate limits.
  - Cloudflare Workers AI: daily allocation.
  - Supabase free tier: database size, edge function invocations, egress, and project pausing on inactivity.
  - Cloudflare Workers: free-tier requests.
- Any resource whose estimated usage clearly exceeds a documented limit is P1.
- Mark every estimate with its basis, for example "1 call per item × ~N items per feed (from feed config)".

## B. Failure handling and observability
1. Check whether jobs are idempotent. That means upserts on a natural key such as `source_url` or `slug`, rather than plain inserts that duplicate rows on retry.
2. Check how rate-limit responses (HTTP 429) are handled. Look for a backoff, a fallback, or a skip-and-log path. A tight retry loop that drains quota is P1.
3. Check whether each job's run outcome is recorded (a job-runs table, structured `console.log`, or telemetry from `_shared/llm.ts`). Check whether a failing cron would be noticed. With no failure signal, that is P1, because the placeholder-key bug went unnoticed for exactly this reason.
4. Check for dead-letter handling of `raw_signals` that fail classification or extraction.

## C. Delivery hygiene
5. **CI.** Check for `.github/workflows`. If CI exists, record what it runs: build, lint, typecheck, tests. No CI is P2.
6. **Deploy.** Check whether the Workers deploy is automated or manual. Check whether edge-function deploys are documented.
7. **Dependencies.** Summarize `npm outdated`, highlighting only major-version gaps on core packages (react, vite, @supabase/supabase-js, typescript).
8. **Docs.** Check whether the README matches reality: stack, scripts, env vars, and deploy target. Check whether `.env.example` lists every variable found in the security env inventory.
9. **Backups and recovery.** The Supabase free tier has limited backups. Check whether any export or backup script exists. If none does, that is a P2 finding.
10. **TODO debt.** Run `grep -rIn "TODO\|FIXME\|HACK\|XXX" src supabase`. Report the total count and the 10 most consequential items.

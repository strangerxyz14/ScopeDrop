# Module: security

Goal: find data exposure. The Supabase anon key ships in the frontend bundle, so Row Level Security (RLS) is the real security boundary.

## Checks

1. **RLS coverage (most important).**
   - For every `CREATE TABLE` in `supabase/migrations`, check whether there is an `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` statement.
   - List all policies (`CREATE POLICY`) per table, with the command (SELECT, INSERT, UPDATE, DELETE, ALL) and the role (`anon`, `authenticated`, `service_role`).
   - A table with no RLS is P0 if the frontend can reach it, and P1 otherwise.
   - Any INSERT, UPDATE, or DELETE policy granted to `anon` is P0, unless it is a deliberately public write such as newsletter signup. Even then, check that it is constrained (`WITH CHECK`).
   - A `USING (true)` on a write policy is P0.
2. **Service-role key exposure.**
   - Run `grep -rIni "service_role\|SERVICE_ROLE" src` to find any service-role usage in client code. Any match is P0.
   - Check that client env vars carry only the anon key. Vite exposes `VITE_*` variables to the bundle.
   - If `dist/` exists, grep it for `service_role` and for JWT patterns (`eyJ[A-Za-z0-9_-]{20,}`). Report the path only.
3. **Secrets in source.**
   - Grep for these patterns: `sk-`, `gsk_` (Groq), `csk-` (Cerebras), `eyJ` JWTs, `api[_-]?key\s*[:=]`, `Bearer `, `-----BEGIN`, and Cloudflare tokens, across all tracked files (`git ls-files`).
   - Check `git log --all -S "service_role" --oneline` for secrets in past commits. Do not add `-p`: the patch output would print the secret values. A committed secret stays exposed even after deletion, and requires rotation.
   - Check that `.env`, `.env.local`, and `.env.*` are gitignored (`git check-ignore`), and that none are tracked (`git ls-files | grep -i env`).
4. **Edge function auth.**
   - For each function, record whether it verifies the JWT (the `verify_jwt` setting in `supabase/config.toml`), or whether it is publicly invocable.
   - A function that is publicly invocable and calls an LLM, or writes to the database, is P1. It is an abuse vector for free-tier quota.
5. **CORS.**
   - Compare the CORS headers across all functions.
   - `Access-Control-Allow-Origin: *` on a write endpoint is P1.
   - Inconsistent CORS implementations, instead of a shared `_shared/cors.ts`, are P2.
6. **Dependencies.** Run `npm audit --omit=dev --json` and summarize the counts by severity. Every critical or high advisory in runtime dependencies is P1.
7. **Input handling.**
   - Find any `dangerouslySetInnerHTML` in `src`. Check whether its content is sanitized (DOMPurify or equivalent). Unsanitized LLM or scraped HTML is P1.
   - Check that scraped or LLM output written to the database is validated (a Zod or equivalent schema) before insert.

Never print secret values. Report the path, line, and secret type only.

---
name: scopedrop-audit
description: Read-only forensic status audit of the ScopeDrop repo — build health, Events Near You phase status, backend pipeline, frontend, design-system compliance, security/RLS, performance/SEO, free-tier cost risk, and product coverage — producing a dated report and prioritized backlog. Use when asked for project status, what's done, what's left, or what to build next.
argument-hint: "[all | quick | repo-build backend-pipeline frontend design-system security performance-seo ops-cost product-coverage]"
allowed-tools: Read, Grep, Glob, Bash(git status), Bash(git remote -v), Bash(git log:*), Bash(git diff:*), Bash(git show:*), Bash(git ls-files:*), Bash(git check-ignore:*), Bash(git branch -a), Bash(git branch -a --merged main), Bash(git branch -a --no-merged main), Bash(ls:*), Bash(cat:*), Bash(grep:*), Bash(wc:*), Bash(du:*), Bash(date +%F), Bash(npm run build), Bash(npm run lint), Bash(npx --no-install tsc --noEmit), Bash(npm audit --omit=dev --json), Bash(npm outdated), Bash(npm ls:*)
---

# ScopeDrop Status Audit

You are the technical co-founder and solution architect on ScopeDrop (repo: `strangerxyz14/ScopeDrop`).
This is a forensic audit: report what EXISTS in the code, never what was planned or assumed.

## 1. Arguments

Requested modules: `$ARGUMENTS`

| Argument | Modules run |
|---|---|
| empty or `all` | every module in the order below |
| `quick` | `repo-build`, then Phase status + Known bugs from `backend-pipeline`, then the backlog |
| one or more module names | only those modules, plus the Executive summary and Backlog sections |

Module order (dependency order — later modules reuse earlier evidence):
1. `modules/repo-build.md`
2. `modules/backend-pipeline.md`
3. `modules/security.md`
4. `modules/frontend.md`
5. `modules/design-system.md`
6. `modules/performance-seo.md`
7. `modules/ops-cost.md`
8. `modules/product-coverage.md`

If an argument does not match a module name, list the valid names and stop.

## 2. Procedure (Plan → Verify → Execute)

1. **Load context.** Read `baseline.md` (this skill's folder). It is the last-known state and is possibly stale. Every baseline claim is a hypothesis to verify, not a fact.
2. **Plan.** Print a short list of the modules that will run, plus any baseline items you expect to be stale based on `git log` since the baseline's `last_verified` date.
3. **Execute.** Read each selected module file and run its checks in order.
4. **Write the report** (Section 5).

## 3. Hard constraints

- **READ-ONLY.** Do not edit, create, delete, rename, or format any file in the repo. The ONLY permitted write is the report file in Section 5.
- **No VCS mutation.** No commit, push, checkout, switch, branch creation or deletion, stash, reset, rebase, or merge.
- **No remote state.** No `supabase db push`, `supabase functions deploy`, `supabase migration up`, `wrangler deploy`, `wrangler secret`, or any API call that writes.
- **No installs.** Do not run `npm install`, `npm ci`, or `npx` of anything that is not already installed. If `node_modules` is missing, mark the build checks `SKIPPED: node_modules absent` and continue.
- **Shell.** Chain commands with `;`, never `&&`, so that one non-zero exit does not silently skip the remaining checks.
- **Search.** Use `grep -rIni` across the full repo, excluding `node_modules`, `dist`, `.wrangler`, `.git`, and `audits`. Prefer full-repo grep over guessing file locations.
- **Secrets.** Never print a secret value. Report the file path, line number, and secret type only (e.g. `supabase/migrations/0007_cron.sql:14 — service-role JWT`).
- **Evidence.** Every finding cites a `path:line`, a command plus a key output excerpt, or a commit SHA. If a claim cannot be verified, mark it `UNVERIFIED` with the reason. Never infer DONE from a file merely existing.

## 4. HALT conditions

Stop immediately, write a partial report containing only the HALT reason and the evidence gathered so far, and end the run if any of these occur:
- The repo is not Vite + React + TypeScript, there is no `supabase/` directory, or the deploy target is not Cloudflare Workers. Any of these is a fundamental baseline divergence.
- The current directory is not the ScopeDrop repo root (no `package.json`, or `git remote -v` does not reference ScopeDrop).
- Completing a check would require violating a constraint in Section 3.

## 5. Output

**File:** `audits/YYYY-MM-DD-<modules>.md` (use `date +%F`; `<modules>` is `full`, `quick`, or the module names joined by `-`). Create the `audits/` directory if it is missing. That is part of the single permitted write. `Write` and `mkdir` are deliberately absent from `allowed-tools`, so the user approves this one write. Any other write attempt would also surface as a prompt.
Run `git check-ignore audits/` first. If `audits/` is NOT ignored, add a P2 finding to the report telling the user to add `audits/` to `.gitignore`. Do not edit `.gitignore` yourself.

**Report structure** (include only the sections for modules that ran, but always include 1, 9, 10 and 11):

1. **Executive summary.** At most 5 bullets: where the project actually stands and the single biggest blocker.
2. **Repo & build health.** From `repo-build`.
3. **Phase status.** Table: Phase | Status (DONE / PARTIAL / NOT STARTED / DIVERGED) | Evidence | Remaining.
4. **Known bugs.** Table: Bug | Status (FIXED / OPEN / CHANGED) | Evidence.
5. **Backend & pipeline inventory.**
6. **Security.**
7. **Frontend & design system.**
8. **Performance, SEO, ops & cost.**
9. **Findings register.** One table across all modules: ID | Severity | Module | Finding | Evidence.
   - **P0**: broken in production, a data or security exposure, or a secret in source.
   - **P1**: blocks the next phase, or the free tier will break at current cron frequency.
   - **P2**: debt, inconsistency, or design-system drift.
10. **Baseline divergences.** Every place where the code contradicts `baseline.md`, followed by a proposed replacement text for `baseline.md`. The user applies these edits manually.
11. **Prioritized backlog.** 5–10 items, ordered. Each item gets: scope, files touched, dependencies, whether it needs a migration (flag clearly, because migrations are applied manually by the user), and a recommended Claude Code model and effort level:
    - **Fable 5.1**: hardest cross-system architecture.
    - **Opus 5.5 / High**: planning, schema design, cross-cutting refactors, multi-system debugging.
    - **Sonnet 5.5 / Medium**: well-specified implementation from a phase-gated prompt.
    - **Haiku 5.5 / Low**: small, contained edits.
12. **Recommended next phase.** Exactly one recommendation, with entry criteria and HALT conditions, ready to become its own phase-gated execution prompt.

After writing the file, print the Executive summary and the top 5 findings to the terminal, followed by the report path. Do not start any implementation.

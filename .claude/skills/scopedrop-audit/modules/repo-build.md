# Module: repo-build

Goal: establish the ground truth for repo state and build health before any other module runs.

## Checks

1. **Identity.** Run `git remote -v ; ls ; cat package.json`. If this is not the ScopeDrop repo root, HALT.
2. **Repo state.** Run `git status ; git branch -a ; git log --oneline -n 40 ; git log --oneline main..HEAD`.
   - For each branch, report the last commit date and whether it is merged into `main` (`git branch -a --merged main` and `--no-merged main`).
   - Flag unmerged feature branches older than 14 days as stale work.
   - Summarize the commits made since `baseline.md`'s `last_verified` date (`git log --since=<date> --oneline`).
3. **Package managers and lockfiles.** Check whether `package-lock.json`, `bun.lockb`, `pnpm-lock.yaml`, and `yarn.lock` exist. More than one lockfile is a P2 finding, because one of them is a stale artifact.
4. **Toolchain.** Record the `engines` field from `package.json`, and whether `.nvmrc` or `.node-version` exist.
5. **Build health.** Skip this step if `node_modules` is absent. Otherwise run `npm run build ; npm run lint ; npx --no-install tsc --noEmit`.
   - For each command, report PASS or FAIL, the error count, and the first 30 lines of errors.
   - Record the build output: chunk names and sizes. These are reused by `performance-seo`.
6. **Tests.** Check whether test files exist (`*.test.*`, `*.spec.*`), whether a test runner is configured, and whether a `test` script exists. Do not run the tests if this could hit remote services. Only run them if they are clearly pure unit tests.
7. **Config files.** Inventory `vite.config.*`, `wrangler.jsonc`, `tsconfig*.json`, `eslint` config, `supabase/config.toml`, and `.github/workflows/*`. Check whether `tsconfig` sets `"strict": true`.

## Report contribution
A table with the columns Check | Status | Evidence, plus a bullet list of commits since the baseline date.

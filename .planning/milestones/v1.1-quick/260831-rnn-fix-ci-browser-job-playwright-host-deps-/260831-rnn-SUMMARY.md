---
status: complete
quick_id: 260831-rnn
slug: fix-ci-browser-job-playwright-host-deps
date: 2026-08-31
commit: 04e22f5
branch: debug/ci-coverage-gate-fail
---

# Quick Task 260831-rnn — CI browser lane Playwright host-deps

## What changed

One line in `.github/workflows/ci.yml`, `browser` job install step:

- From: `npx playwright install chromium webkit firefox`
- To:   `npx playwright install --with-deps chromium webkit firefox`

## Why

Live CI run 33451875651 (PR #2) `browser` job failed:
`Error: browserType.launch: Host system is missing dependencies to run browsers`.
The install step provisioned the browser binaries but not their OS libraries, so
webkit/firefox could not launch on the current ubuntu-latest runner image (the
Node 20→24 forced-deprecation runner refresh). `--with-deps` runs Playwright's
`install-deps` (apt) to install those libraries.

## Scope guardrails

- Only the `browser` job changed. The `perf` job's `npx playwright install chromium`
  is untouched — it already passes (chromium-only, no missing deps).
- Single-line diff, no new dependencies, no other files.

## Verification

- Local: `git diff --numstat` = `1 1` on ci.yml; the `--with-deps` form present ×1,
  the pre-fix form gone, perf chromium line intact.
- Live CI: to be confirmed on the next PR #2 run — the `browser` job should launch
  all three engines and go green.

## Notes

- Executed on branch `debug/ci-coverage-gate-fail` so the fix joins PR #2 alongside
  the coverage-gate fix (`e3ffded`), letting one CI run confirm both `verify` and
  `browser` green — the prerequisite for the Phase 11 GATE-03 A1 live check.
- Dispatched inline by the orchestrator (not an isolated executor worktree): the
  worktree would fork off origin/main — missing the coverage commits and splitting
  from PR #2 — and Windows junction-based worktree cleanup can gut node_modules.

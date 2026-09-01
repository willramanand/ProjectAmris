---
status: complete
phase: 11-gate-enforcement-cost-publication
source: [11-VERIFICATION.md]
started: 2026-08-28T00:12:00Z
updated: 2026-09-01T00:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. GATE-03 soak safety — soaking gate failure never blocks a publish
expected: The soaking size/perf job shows a red X, but the CI workflow-run conclusion is `success` (green), so a publish is never blocked. Confirms GATE-03 Assumption A1 on the live GitHub Actions platform (`continue-on-error: true` job failure keeps `workflow_run.conclusion == 'success'`).
result: pass
verified: |
  CONFIRMED on live GitHub Actions. Throwaway PR #3 (branch test/gate03-a1-clean,
  off the green main baseline) forced the soaking `size` job red via a clean lever
  — lowered the core-bundle `.size-limit.json` budget 28kB→10kB so `npm run size`
  fails. `.size-limit.json` feeds no hard gate (cost-cards reads api/*.baseline.json,
  not the size-limit budget), so no collateral failure.

  CI run 33454112742 per-job:
    - size: FAILURE (soaked, continue-on-error) — the forced red X
    - verify: success
    - browser: success
    - surface-diff: success
    - smoke: success
    - perf: success
    - RUN CONCLUSION: success  ← A1 proven

  A job-level continue-on-error:true failure keeps workflow_run.conclusion ==
  'success', so release.yml/publish.yml's workflow_run publish gate stays reachable
  — a soaking gate can never block a publish. Throwaway PR closed, branch deleted,
  .size-limit.json reverted.

  (First attempt on 2026-08-31 was blocked by two pre-existing red hard-gates on
  main — the coverage gate and a Playwright host-deps browser failure. Both were
  fixed and merged (PR #2) to produce the green baseline this clean A1 run needed.)

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

---
status: testing
phase: 11-gate-enforcement-cost-publication
source: [11-VERIFICATION.md]
started: 2026-08-28T00:12:00Z
updated: 2026-08-28T00:12:00Z
---

## Current Test

number: 1
name: GATE-03 soak safety — a soaking gate failure never red-builds a publish
expected: |
  Push a throwaway PR that forces a regression the soaking gate catches — e.g.
  temporarily tighten one entry in `api/size.baseline.json` (size), or a count
  metric in `api/perf.baseline.json` (perf). Observe the CI run:
  - the `size` (or `perf`) job annotates RED (a visible red X),
  - BUT the overall workflow-run conclusion stays `success` (green),
  - so `release.yml` / `publish.yml` (the `workflow_run` gate) remains reachable
    and a publish is never blocked.
  This confirms GATE-03 Assumption A1 on the live GitHub Actions platform:
  a job-level `continue-on-error: true` failure keeps
  `workflow_run.conclusion == 'success'`.
awaiting: user response

## Tests

### 1. GATE-03 soak safety — soaking gate failure never blocks a publish
expected: The soaking size/perf job shows a red X, but the CI workflow-run conclusion is `success` (green), so a publish is never blocked. Confirms GATE-03 Assumption A1 on the live GitHub Actions platform (`continue-on-error: true` job failure keeps `workflow_run.conclusion == 'success'`).
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

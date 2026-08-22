---
status: testing
phase: 07-measurement-baselines-budgets
source: [07-VERIFICATION.md]
started: 2026-08-22T18:39:35Z
updated: 2026-08-22T18:39:35Z
---

## Current Test

number: 1
name: Live perf-harness reproducibility (Chromium)
expected: |
  In a Chromium-capable environment, run `npm run test:perf` (Vitest Browser Mode +
  Playwright/Chromium), then `node scripts/perf-diff.mjs api/perf.baseline.json api/perf.json`.
  The perf lane launches Chromium, applies the 6x-CPU + Slow-3G throttle, and regenerates
  api/perf.json whose per-scenario `counts` (button/combobox/data-grid/overlay:
  update/updated/render/computePosition/repositions/nodes) match the committed
  api/perf.baseline.json byte-for-byte, with throttled wall-clock > unthrottled in each
  scenario's throttle-liveness evidence. perf-diff reports "No count drift" and exits 0.
awaiting: user response

## Tests

### 1. Live perf-harness reproducibility (Chromium)
expected: Run `npm run test:perf` then `node scripts/perf-diff.mjs api/perf.baseline.json api/perf.json` in a Playwright/Chromium environment. Chromium launches under 6x-CPU + Slow-3G throttle, regenerates api/perf.json whose per-scenario counts match the committed api/perf.baseline.json byte-for-byte, throttled wall-clock > unthrottled per scenario, and perf-diff reports "No count drift" (exit 0). Why human: the perf lane requires a live browser the verifier sandbox cannot launch.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

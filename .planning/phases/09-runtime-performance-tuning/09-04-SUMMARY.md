---
phase: 09-runtime-performance-tuning
plan: 04
subsystem: testing
tags: [perf-harness, perf-baseline, regression-gate, machine-diff, size-limit, a11y, capstone]

# Dependency graph
requires:
  - phase: 09-01
    provides: "data-grid sort identity memo + sortComputes count key (untuned 3 -> tuned 1)"
  - phase: 09-02
    provides: "combobox two-level filter memo + filterCalls count key (untuned 12 -> tuned 10)"
  - phase: 09-03
    provides: "floating-position middleware slice cache + middlewareBuilds count key (untuned 4 -> tuned 1); CR-01 retired"
  - phase: 07-measurement-baselines-budgets
    provides: "perf-diff.mjs (report-only diff/--write), committed api/perf.baseline.json, low-end-cellular throttle profile"
provides:
  - "api/perf.baseline.json regenerated to the final fully-tuned state — now carries sortComputes/filterCalls/middlewareBuilds at tuned values (the forward reference Phase 11 gates against)"
  - "api/perf.baseline.untuned.json — NEW durable 'before' baseline: tuned structure with only the three count keys overridden to untuned values, so the count improvement is a re-runnable machine diff (perf-diff.mjs untuned tuned)"
  - "Phase-level capstone delta table (untuned -> tuned for all three targets + report-only wall-clock per scenario) — a single committed record, not scattered across the three per-plan SUMMARYs"
affects: [phase-11 (enforcing perf gates — flips these budgets report-only -> enforcing)]

# Actuals (#2632)
actuals:
  tokens: 1600
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Durable machine before/after: mint an untuned baseline from the tuned baseline structure with ONLY the improved count keys overridden, so the win survives as a re-runnable perf-diff rather than ephemeral per-plan prose (RESEARCH Methodology step 2, Pitfall 1)"
    - "Self-verifying baseline assembly: the untuned baseline is validated by the same perf-diff.mjs it feeds — the diff must show exactly the three count drops and nothing else"

key-files:
  created:
    - "api/perf.baseline.untuned.json — durable untuned 'before' baseline (perf-diff-compatible)"
  modified:
    - "api/perf.baseline.json — regenerated to the final tuned state (adds the three new count keys)"

key-decisions:
  - "Two committed baselines: the tuned api/perf.baseline.json (forward reference) + the untuned api/perf.baseline.untuned.json (durable machine 'before'). A tuned-only baseline reports 'No count drift' by construction and leaves no machine evidence of the win (Pitfall 1)."
  - "The untuned baseline overrides ONLY the three count keys (sortComputes 1->3, filterCalls 10->12, middlewareBuilds 1->4); every lifecycle/node/computePosition/reposition/wall-clock value is copied verbatim from the tuned baseline and self-verified by the diff."
  - "Regenerated the tuned baseline from the fresh api/perf.json rather than hand-patching the Phase-7 baseline — Phase 11 must gate against the actual current tuned scenario counts, not a stale hand-edit."

requirements-completed: [RPERF-01, RPERF-02, RPERF-03, RPERF-04]

coverage:
  - id: D1
    description: "Tuned api/perf.baseline.json regenerated on fully-tuned code; contains sortComputes=1 (data-grid), filterCalls=10 (combobox), middlewareBuilds=1 (overlay)"
    requirement: "RPERF-01/02/03"
    verification:
      - kind: other
        ref: "npm run test:perf (5/5) -> node scripts/perf-diff.mjs --write api/perf.json api/perf.baseline.json; grep sortComputes/filterCalls/middlewareBuilds (all present)"
        status: pass
      - kind: other
        ref: "npm run perf:diff -> 'No count drift' (exit 0) against the just-written tuned baseline (expected)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Durable untuned baseline preserves the 'before' counts; perf-diff.mjs untuned tuned shows exactly the three count drops and no other count/lifecycle/node/position drift"
    requirement: "RPERF-01/02/03"
    verification:
      - kind: other
        ref: "node scripts/perf-diff.mjs api/perf.baseline.untuned.json api/perf.baseline.json | grep -cE '^ +~ (sortComputes|filterCalls|middlewareBuilds):' == 3"
        status: pass
      - kind: other
        ref: "same diff has NO '~ (update|updated|render|nodes|computePosition|repositions):' row (byte-identical between the two baselines)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full regression gate green + no size regression + frozen surface untouched"
    requirement: "RPERF-04 / all"
    verification:
      - kind: e2e
        ref: "npm run test:run (100 files / 717 tests) + npm run test:browser (20 files / 102 tests — incl. no-0,0-frame, CR-01 retry, 3 a11y snapshot specs)"
        status: pass
      - kind: other
        ref: "npm run size (6 budgets under limit) + npm run assert:no-lit (0 inlined Lit) + git diff --quiet .size-limit.json vite.config.ts"
        status: pass
    human_judgment: false

# Metrics
duration: ~9min
completed: 2026-08-24
status: complete
---

# Phase 9 Plan 04: Perf Baseline Finalization + Regression Capstone Summary

**Regenerated the committed tuned perf baseline on the fully-tuned code (adding sortComputes/filterCalls/middlewareBuilds) and minted a durable untuned "before" baseline, so the three count improvements survive as a single re-runnable machine diff; the full suite (100 files / 717 tests, 20 browser files / 102 tests) is green with all six size budgets under limit and the frozen external/size surface untouched.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-08-24T03:21:57Z
- **Completed:** 2026-08-24T03:31:14Z
- **Tasks:** 2 (Task 1 committed; Task 2 verification-only, no new artifact)
- **Files modified:** 1 modified (api/perf.baseline.json), 1 created (api/perf.baseline.untuned.json)

## Capstone Delta Table (untuned -> tuned)

Source: `node scripts/perf-diff.mjs api/perf.baseline.untuned.json api/perf.baseline.json` (the durable, re-runnable machine before/after).

| Count key | Scenario | Untuned (before) | Tuned (after) | Delta | Requirement |
|-----------|----------|------------------|---------------|-------|-------------|
| `sortComputes` | data-grid | **3** | **1** | **-2** | RPERF-01 |
| `filterCalls` | combobox | **12** | **10** | **-2** | RPERF-02 |
| `middlewareBuilds` | overlay | **4** | **1** | **-3** | RPERF-03 |

The diff shows **exactly** these three count-key drops and **no other count metric** drifting in any scenario — self-proving the untuned baseline differs from the tuned baseline ONLY in the three tuned keys.

## Report-only Wall-Clock (median | mean+3σ band, per scenario)

Volatile / machine-variable (D-06 — never gated); recorded here for information only.

| Scenario | Median | Band (mean+3σ) |
|----------|--------|----------------|
| button (noise control) | 15.4 ms | 24.3 ms |
| combobox | 88.2 ms | 137.6 ms |
| data-grid | 102.6 ms | 144.6 ms |
| overlay | 38.1 ms | 54.6 ms |

## Lifecycle / Node Identity Across the Two Baselines

By construction (untuned = tuned structure with only the three count keys overridden) and self-verified by the diff, `update`/`updated`/`render` + `nodes` (and `computePosition`/`repositions` for overlay) are **byte-identical** across both baselines:

| Scenario | update/updated/render | nodes | computePosition | repositions |
|----------|-----------------------|-------|-----------------|-------------|
| button | 4 / 4 / 4 | 5 | — | — |
| combobox | 11 / 11 / 11 | 20 | — | — |
| data-grid | 5 / 5 / 5 | 250 | — | — |
| overlay | 7 / 7 / 7 | 5 | 4 | 2 |

The button control scenario stays flat (no count keys, unchanged lifecycle) as the noise control.

## Gate Results (Task 2)

| Gate | Result |
|------|--------|
| `npm run test:run` | 100 files / 717 tests passed (jsdom + browser + perf) |
| `npm run test:browser` | 20 files / 102 tests passed (regression gate incl. no-0,0-frame, CR-01 cold-load retry, 3 a11y snapshot specs) |
| `npm run test:perf` | 5 files / 5 tests passed (fresh api/perf.json on tuned code) |
| `npm run size` | 6 budgets all under limit — core 21.08/28 kB, full 62.13/75 kB, button 1.88/2.5 kB, data-grid 11.23/13 kB, popover 9.81/12 kB, first-load 22.97/40 kB |
| `npm run assert:no-lit` | OK — 0 inlined-Lit markers across 148 dist files; 155 bare Lit externals (Lit stays external) |
| `git diff --quiet .size-limit.json vite.config.ts` | clean — frozen external/size surface untouched |
| `npm run perf:diff` (tuned baseline vs fresh run) | "No count drift", exit 0 (expected) |

No budget was flipped from report-only to enforcing — that is Phase 11 (GATE-*).

## Task Commits

1. **Task 1: finalize tuned baseline + mint durable untuned baseline** — `1db4dbc` (perf)
2. **Task 2: full regression gate** — verification-only; all gates green, no new artifact to commit (its `<files>` = api/perf.baseline.json, already committed in Task 1).

**Plan metadata:** (docs: complete plan — this SUMMARY commit)

## Files Created/Modified
- `api/perf.baseline.json` — regenerated via `perf-diff.mjs --write api/perf.json api/perf.baseline.json`; now carries `sortComputes` (data-grid), `filterCalls` (combobox), `middlewareBuilds` (overlay) at tuned values. This is the forward reference Phase 11 will gate enforcing thresholds against.
- `api/perf.baseline.untuned.json` — NEW durable "before" baseline: byte-identical to the tuned baseline except `data-grid.counts.sortComputes` (1->3), `combobox.counts.filterCalls` (10->12), `overlay.counts.middlewareBuilds` (1->4). perf-diff-compatible so the count improvement is a re-runnable machine diff.

## Decisions Made
- **Two committed baselines, not one.** A tuned-only baseline reports "No count drift" by construction and leaves no machine evidence of the win. The untuned baseline is the durable machine "before" that Phase 11 needs to flip these budgets from report-only to enforcing (RESEARCH Methodology step 2 + Open Question 3; Pitfall 1).
- **Override only the three count keys.** Everything else (lifecycle/node/computePosition/reposition/wall-clock/throttle/repeats) is copied verbatim from the tuned baseline — a proven phase invariant — and the assembly is self-verified by the diff.
- **Regenerate, do not hand-patch.** The tuned baseline is regenerated from the fresh `api/perf.json` so Phase 11 gates against the actual current tuned scenario counts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Built `dist/` so the size gate could run in the fresh worktree**
- **Found during:** Task 2 (`npm run size`)
- **Issue:** `size-limit` measures `dist/**` bundles, but a fresh git worktree has no `dist/` (it is gitignored and not carried over from the main checkout the plan's `cd C:/repos/ProjectAmris` verify commands assumed). The size gate failed with "Size Limit can't find files at dist/…".
- **Fix:** Ran `npx tsc` + `npx vite build` to produce the `dist/` bundles (verification-only; `dist/` is gitignored). Deliberately did NOT run the full `npm run build` chain, to avoid regenerating the tracked `docs/contract.md` (build:contract-doc) — size-limit needs only the JS bundles.
- **Files modified:** none tracked (dist/ is gitignored).
- **Verification:** `npm run size` then passed — all six budgets under limit.

**2. [Rule 1 - Housekeeping] Reverted EOL-only a11y snapshot churn**
- **Found during:** Task 2 (`npm run test:browser` / `npm run test:run`)
- **Issue:** The Windows browser runner rewrote the three committed a11y `.snap` files with CRLF line endings (content-identical — `git diff --ignore-all-space` is empty). This is the same benign churn Plan 03 documented.
- **Fix:** `git checkout --` on the three specific snapshot files to keep the phase diff clean. No content changed.
- **Files modified:** none (reverted).

---

**Total deviations:** 2 (1 blocking worktree-environment fix, 1 EOL housekeeping). No source/CEM change; verification-only plan.

## Note: lifecycle counts vs the Phase-7 baseline (not a regression)

The regenerated tuned baseline records `data-grid.update` = 5 (Phase-7 baseline had 3) and `overlay.update/updated/render` = 7 (Phase-7 had 4). These are **not** memo-induced render-structure changes — they are the deliberate perf-scenario extensions from Plans 01/03: the data-grid scenario now forces two extra unchanged-state `requestUpdate()` re-renders (to prove memo effectiveness) and the overlay scenario now does open + close + reopen. Each per-plan SUMMARY recorded that within its own scenario the untuned and tuned lifecycle/node counts are identical (the memo changed no render structure), and the invariant metrics that are directly comparable to Phase-7 — `computePosition` (4), `repositions` (2), and all `nodes` counts — are unchanged. `button` and `combobox` lifecycle counts are byte-identical to Phase-7. The tuned baseline intentionally reflects the current tuned scenarios so Phase 11 gates against reality, not a stale count.

## Known Stubs
None — no placeholder/empty-data stubs. Two measurement artifacts only; no source symbols introduced.

## Threat Flags
None — verification + baseline-artifact regeneration only; no source behavior change, no input path, no network, no new deps (threat register T-09-07 `accept`, low). Both baselines live under `api/` (outside `package.files` — never shipped).

## User Setup Required
None.

## Next Phase Readiness
- Phase 11 can flip `sortComputes`/`filterCalls`/`middlewareBuilds` from report-only to enforcing, gating against the committed tuned `api/perf.baseline.json`.
- `api/perf.baseline.untuned.json` gives Phase 11 a re-runnable machine before/after (`node scripts/perf-diff.mjs api/perf.baseline.untuned.json api/perf.baseline.json`) — the durable proof of the count improvement.
- CR-01 is retired (Plan 03); no open pre-ship Criticals from this phase.

## Self-Check: PASSED

- Files: `api/perf.baseline.json`, `api/perf.baseline.untuned.json`, `.planning/phases/09-runtime-performance-tuning/09-04-SUMMARY.md` — all FOUND on disk.
- Commit: `1db4dbc` (Task 1 baseline artifacts) — FOUND in branch history.
- Machine before/after re-verified: `perf-diff.mjs untuned tuned` shows exactly the three count drops (sortComputes 3->1, filterCalls 12->10, middlewareBuilds 4->1) and no other drift.

---
*Phase: 09-runtime-performance-tuning*
*Completed: 2026-08-24*

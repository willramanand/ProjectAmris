---
phase: 01-test-coverage-ci-gates-foundation
plan: 08
subsystem: testing
tags: [size-limit, tree-shaking, coverage-v8, vitest, ci, gate-finalization, 1-to-1-test-invariant]

# Dependency graph
requires:
  - "01-01 tracer: hybrid jsdom+browser Vitest config, baseline coverage gate, core-bundle size budget, CI verify/browser/size jobs"
  - "01-02..01-07: dedicated 1:1 test files for all 66 components (grouped files retired incrementally)"
provides:
  - Complete size-limit budget set (core, full, button light, data-grid heavy) + tree-shaking canary
  - Coverage thresholds ratcheted to the final measured floor (green-on-arrival, hard-blocks regression)
  - 66/66 dedicated 1:1 test files — no grouped multi-component file remains
  - Proven-green four-gate pipeline (coverage, browser, in-browser a11y, size) on existing code
affects: []

actuals:
  tokens: 3098
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "size-limit min+gzip path entries with ignore:[lit,@floating-ui] -> shipped (not peer) size"
    - "Tree-shaking canary on a per-component deep entry (button 2.2kB vs full 51kB) — busts on a barrel/import* regression"
    - "Ratchet-to-final-floor coverage: global floors lifted to measured floor with ~1-1.5pt green-on-arrival margin"
    - "Per-directory coverage tiers checked as an additional per-glob aggregate (interactive dirs bucketed at their own floor)"

key-files:
  created:
    - .planning/phases/01-test-coverage-ci-gates-foundation/01-08-SUMMARY.md
  modified:
    - .size-limit.json
    - vitest.config.ts
  deleted:
    - test/components/display-trivial.test.ts

key-decisions:
  - "size-limit entries use gzip (must-have: min+gzipped) rather than the tracer's brotli; core floor set to 23kB (measured 21.3kB gzip)"
  - "Tree-shaking canary targets dist/components/button/index.js (per-component deep entry), NOT the self-registering full barrel dist/amris.js"
  - "select reaches the full D-03 ceiling (br80/fn85/ln85/st85); dialog kept at its high measured floor (br94) rather than de-ratcheted to the ceiling"
  - "combobox/date-picker stay bucketed below the ceiling (interactive-heavy: br 46.62 / 54.19 measured)"
  - "Task 3 required no ci.yml edit — the tracer's verify/browser/size jobs already hard-block and stay read-only (contents:read, no packages:write)"

patterns-established:
  - "Tree-shaking regression canary via size-limit deep-entry budget"
  - "Ratchet-to-final-floor coverage thresholds after all splits land"

requirements-completed: [TEST-01, TEST-07, PERF-01]

coverage:
  - id: D1
    description: "size-limit budgets core/full/button-light/data-grid-heavy (each min+gzip, peer deps ignored) with a tree-shaking canary; all green at measured baseline (PERF-01, D-07/D-08/D-09)"
    requirement: "PERF-01"
    verification:
      - kind: automated
        ref: "npm run build && npx size-limit — exit 0 (core 21.3/23, full 51.09/55, button 2.2/2.5, data-grid 3.21/3.5, canary 2.2/5 kB)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tree-shaking canary fails CI if a component deep import transitively pulls the whole library (barrel/import* regression), based on per-component deep entry not the full barrel (D-08, Pitfall 10)"
    requirement: "PERF-01"
    verification:
      - kind: automated
        ref: "canary on dist/components/button/index.js (2.2 kB) with limit 5 kB; a barrel regression would balloon it toward the 51 kB full bundle and bust"
        status: pass
    human_judgment: false
  - id: D3
    description: "Coverage thresholds ratcheted up to the final measured floor, still green-on-arrival (TEST-07, D-01/D-02/D-03/D-05)"
    requirement: "TEST-07"
    verification:
      - kind: automated
        ref: "npx vitest run --project jsdom --coverage — exit 0 (br 67.54>=66 / fn 82.71>=81 / ln 84.01>=83 / st 83.21>=82); 437 tests pass"
        status: pass
    human_judgment: false
  - id: D4
    description: "All 66 components have a dedicated 1:1 test file; no grouped multi-component file remains (display-trivial deleted; layout-primitives + misc-display already gone) (TEST-01, OQ-3)"
    requirement: "TEST-01"
    verification:
      - kind: automated
        ref: "src/components: 66 dirs; test/components: 66 dedicated files, 1:1 (missing=[], extra=[]); display-trivial/layout-primitives/misc-display all absent"
        status: pass
    human_judgment: false
  - id: D5
    description: "All four gates (coverage, browser, in-browser a11y, size) pass on existing code and hard-block on regression; ci.yml stays PR-triggered and read-only"
    verification:
      - kind: automated
        ref: "jsdom coverage exit 0 (437) + browser project exit 0 (39) + build+size exit 0; ci.yml permissions contents:read, no packages:write"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-08-11
status: complete
---

# Phase 1 Plan 08: Finalize & Lock the Four-Gate Safety Net Summary

**Completed the size-limit budget set (core/full/button-light/data-grid-heavy, min+gzip) with a tree-shaking canary, ratcheted coverage to the final measured floor, retired the last grouped test file (66/66 1:1 invariant now holds), and proved the whole coverage + browser + in-browser-a11y + size pipeline green on existing code — the Phase 1 safety net is complete and hard-blocks regressions.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-11T22:51:07Z
- **Completed:** 2026-08-11T22:57:58Z
- **Tasks:** 3
- **Files modified:** 3 (0 created code, 2 modified, 1 deleted)

## Accomplishments
- Expanded `.size-limit.json` from a single core entry to the full budget set: **core** (`dist/amris-core.js`, 23 kB / measured 21.3), **full** (`dist/amris.js`, 55 kB / 51.09), **button light** (`dist/components/button/index.js`, 2.5 kB / 2.2), **data-grid heavy** (`dist/components/data-grid/index.js`, 3.5 kB / 3.21) — each min+gzip with `lit`/`@floating-ui` ignored (shipped size).
- Added a **tree-shaking canary** on the button deep entry (limit 5 kB, measured 2.2 kB). Because the button deep import is 2.2 kB while the full bundle is 51 kB, any barrel/`import *` regression that drags the whole library into one component would balloon the entry past 5 kB and bust CI. The canary targets the per-component deep entry, **not** the self-registering full barrel (importing anything from `dist/amris.js` runs every `customElements.define` by design).
- Deleted `test/components/display-trivial.test.ts` — the single race-free deletion point (OQ-3). Verified its 16 components (breadcrumb, button-group, empty-state, error-text, field, hint-text, label, nav-bar, progress-ring, side-nav, split-view, stat, status-dot, timeline, visually-hidden, app-shell) all have dedicated files with real assertions before deleting.
- Confirmed the **1:1 invariant**: 66 `src/components/*` dirs ↔ 66 dedicated `test/components/<name>.test.ts` (missing=[], extra=[]); all three grouped files (display-trivial, layout-primitives, misc-display) are absent.
- Ratcheted `vitest.config.ts` coverage thresholds up to the final measured floor: global br 63→66, fn 78→81, ln 80→83, st 79→82 (measured 67.54/82.71/84.01/83.21). Per-dir tiers: combobox br45/fn50, date-picker br52/fn60; **select reaches the full D-03 ceiling** (br80/fn85/ln85/st85); dialog kept at its high measured floor (br94/fn88/ln95/st95).
- Proved the full pipeline green locally: jsdom coverage (437 tests, exit 0), browser project (39 tests incl. in-browser axe, exit 0), build + size-limit (5/5 entries under budget, exit 0). `package.json` `test` stays `vitest --project jsdom` (D-06 contributor default).

## Task Commits

1. **Task 1: size-limit budget set + tree-shaking canary** — `6b0d129` (feat)
2. **Task 2: ratchet coverage + retire display-trivial** — `65e7507` (test)
3. **Task 3: prove four-gate pipeline green** — no code commit; `ci.yml` already satisfied every requirement (verify/browser/size jobs hard-block, PR-triggered, `permissions: contents: read`, no `packages:write`). Verification-only task.

**Plan metadata:** _(final docs commit)_

## Files Created/Modified
- `.size-limit.json` — full budget set (core/full/button/data-grid) + tree-shaking canary, all min+gzip
- `vitest.config.ts` — coverage thresholds ratcheted to final measured floor + updated per-dir tiers
- `test/components/display-trivial.test.ts` — **deleted** (last grouped file; components redistributed to dedicated files by plans 03/04)

## Decisions Made
- **gzip over brotli for the size budget:** the plan must-have specifies "min+gzipped", so all five entries use `"gzip": true`. Core floor set to 23 kB against the measured 21.3 kB gzip (the tracer's 20 kB was brotli/17.86 kB). This makes the compression method consistent across the whole budget set.
- **Canary on the deep entry, not the barrel:** basing the tree-shaking canary on `dist/components/button/index.js` (2.2 kB) rather than `dist/amris.js` is what makes it a real regression guard — the full barrel counts the whole library by design.
- **dialog kept high, not de-ratcheted:** dialog measures br 95, so its floor stays at br 94 rather than being lowered to the D-03 br≥80 ceiling (the ceiling is a target minimum, not a cap).
- **Task 3 needed no ci.yml edit:** the tracer already wired hard-blocking, read-only gates; Task 3 was a proof-of-green task and produced no diff.

## Deviations from Plan
None — plan executed exactly as written. All three tasks landed with their intended files; the only judgment calls (exact kB budgets and per-dir threshold numbers) were explicitly delegated to executor discretion (D-09) and set from live measurements.

## Issues Encountered
- **size-limit `--config` path resolution:** paths in a size-limit config file resolve relative to the config file's directory, so a temp measurement config had to live at the repo root (not `/tmp`). This affected only a throwaway measurement config; the committed `.size-limit.json` is unaffected.

## Known Stubs
None — no placeholder/empty-data stubs introduced. This is a test/config-only finalization; no component source was touched.

## Threat Flags
None — no new runtime surface. Per threat register T-01-08a/b: coverage/size config is committed and green-on-arrival (hard-blocks only on regression, no new deps), and `ci.yml` stays PR-triggered + read-only (`permissions: contents: read`, no `packages:write`/publish — that is Phase 6).

## Next Phase Readiness
- The complete Phase 1 safety net — coverage (ratcheted), real-browser fidelity + in-browser a11y, and the full bundle-size budget with a tree-shaking canary — is green on existing code and hard-blocks any regression. Downstream breaking work (API freeze, validation UX) is now guarded.
- **Carried finding for Phase 4 (from plan 01):** no form-associated control reports validity via `ElementInternals.setValidity`; the required-field validation assertion (TEST-02 full) remains blocked until that lands.
- **Carried for Phase 6:** publishing/`packages:write` and changeset SHA-pinning are intentionally out of scope here; CI stays read-only.

## Self-Check: PASSED
- `.size-limit.json` and `vitest.config.ts` present; `test/components/display-trivial.test.ts` confirmed deleted.
- `01-08-SUMMARY.md` present; both task commits (6b0d129, 65e7507) exist in git history.
- 1:1 invariant verified: 66 src component dirs ↔ 66 dedicated test files (missing=[], extra=[]).

---
*Phase: 01-test-coverage-ci-gates-foundation*
*Completed: 2026-08-11*

---
phase: 09-runtime-performance-tuning
plan: 03
subsystem: ui
tags: [floating-ui, overlays, lit, reactive-controller, lazy-load, dynamic-import, a11y, perf-harness, vitest-browser]

# Dependency graph
requires:
  - phase: 09-01
    provides: countMethod prototype-wrap probe in test/perf/harness.ts
  - phase: 08-bundle-size-deferral
    provides: FloatingPositionController + lazy-load deferral of @floating-ui/dom & @lit-labs/virtualizer (CR-01 target)
provides:
  - Cached static middleware slice ([offset, flip, shift]) in the shared FloatingPositionController — assembled once per config-change, not once per autoUpdate tick
  - middlewareBuilds deterministic perf count wired into the overlay scenario (RPERF-03 count evidence)
  - CR-01 retired — loadFloating/loadVirtualizer null their memoized promise slot on reject so a transient chunk failure no longer permanently bricks positioning/virtualization page-wide
  - Browser cold-load retry spec proving reject->retry recovery end-to-end
  - Report-only popover a11y name/role/focusability snapshot guard (RPERF-04)
affects: [09-04, runtime-perf-gates, phase-11-enforcing-gates, overlays, combobox, select, dropdown, tooltip, date-picker]

# Actuals (#2632)
actuals:
  tokens: 5600
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Resolved-value-keyed memoization of floating-ui middleware objects (cache while resolved offset is unchanged; re-resolve getters every tick)"
    - "@internal rejecting-importer seam (default = unchanged static bare import()) to make a rejected dynamic import testable on the browser lane"
    - "Hybrid a11y guard: load-bearing shadowQuery/focusability assertions + advisory toMatchAriaSnapshot (report-only)"

key-files:
  created:
    - test/browser/lazy-load-retry.test.ts
    - test/browser/popover-a11y-snapshot.test.ts
    - test/browser/__snapshots__/popover-a11y-snapshot.test.ts.snap
  modified:
    - src/internal/controllers/floating-position.ts
    - src/internal/helpers/lazy-load.ts
    - test/perf/overlay.perf.test.ts

key-decisions:
  - "middlewareBuilds is keyed on the resolved offset value (not a construction-time fixed/getter split), so a getter that returns a stable value (popover offset=8) is cached too — yielding the 4->1 drop while still reflecting a changed getter"
  - "_buildMiddleware builds only the cacheable base slice; the getter-backed host tail (popover arrow) is rebuilt every tick and never cached, so it is composed by _updatePosition, not by _buildMiddleware"
  - "Added an @internal test-only rejecting-importer seam to lazy-load.ts because vitest browser-mode vi.mock cannot simulate a rejected dynamic import; default importers keep the exact static bare specifiers (T-09-04 unaffected)"
  - "WR-02/WR-03 left opportunistic-only (D-05): they are out-of-file component changes and not trivially cheap — carried forward"

patterns-established:
  - "Cache floating-ui base middleware slice keyed on resolved primitive inputs; never cache getter-backed resolve() results"
  - "Prove null-on-reject cache recovery on the real browser lane via an injectable importer whose retry path is the genuine module"

requirements-completed: [RPERF-03, RPERF-04]

coverage:
  - id: D1
    description: "Shared FloatingPositionController caches the static [offset, flip, shift] middleware slice — built once per config-change instead of once per autoUpdate tick — with computePosition output byte-identical and all lifecycle guards intact"
    requirement: "RPERF-03"
    verification:
      - kind: e2e
        ref: "test/browser/floating-position.test.ts (real Chromium geometry byte-identical)"
        status: pass
      - kind: integration
        ref: "test/perf/overlay.perf.test.ts#measures open+reposition counts (middlewareBuilds 1, computePosition 4, repositions 2)"
        status: pass
      - kind: e2e
        ref: "npm run test:browser (19 files, 97 tests — all 6 overlays green, hard gate)"
        status: pass
    human_judgment: false
  - id: D2
    description: "CR-01 retired — loadFloating/loadVirtualizer null the memoized slot on a rejected import() so the next call retries and can succeed"
    requirement: "RPERF-03"
    verification:
      - kind: e2e
        ref: "test/browser/lazy-load-retry.test.ts (reject->retry recovery + single-memoization, real Chromium)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Report-only popover a11y name/role/focusability snapshot guard proving the churn edit strips no accessibility DOM from the representative overlay"
    requirement: "RPERF-04"
    verification:
      - kind: automated_ui
        ref: "test/browser/popover-a11y-snapshot.test.ts (shadowQuery parts + deepActiveElement + toMatchAriaSnapshot)"
        status: pass
    human_judgment: false

# Metrics
duration: 22min
completed: 2026-08-23
status: complete
---

# Phase 9 Plan 03: Overlay Reposition Churn + CR-01 + Popover A11y Guard Summary

**Cached the static [offset, flip, shift] middleware slice in the shared FloatingPositionController (middlewareBuilds 4->1, computePosition/repositions unchanged at 4/2, geometry byte-identical), retired the Phase-8 Critical CR-01 with a null-on-reject loader retry, and added a report-only popover a11y snapshot guard.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-08-23T22:58:00-04:00
- **Completed:** 2026-08-23T23:12:23-04:00
- **Tasks:** 3
- **Files modified:** 3 (+3 created)

## Accomplishments
- **RPERF-03:** `FloatingPositionController._buildMiddleware(mod, offset)` now assembles the cacheable base slice, and `_updatePosition` reuses it while the resolved offset is unchanged — the per-tick middleware-object churn across all 6 overlays (combobox, select, dropdown, popover, tooltip, date-picker) is removed. Getter-backed placement/offset and the host middleware tail (popover `arrow`) are still re-resolved/rebuilt every tick, so nothing is frozen stale. computePosition input/output is byte-identical (browser-proven).
- **Count evidence (F-2):** wired `middlewareBuilds` into `overlay.perf.test.ts` via `countMethod`; it drops to 1 (once-per-config) while `computePosition`/`repositions` stay at the committed baseline 4/2 by design. Deterministic across all 5 repeats.
- **D-05 / CR-01 retired:** both memoized loaders `.catch`-reset their promise slot to `null` on reject and rethrow, so one transient chunk failure no longer permanently bricks positioning/virtualization page-wide; the combobox/select `_ensureVirtualizer` retry guards now recover as documented. Proven end-to-end by a new browser cold-load retry spec.
- **RPERF-04:** new report-only `popover-a11y-snapshot.test.ts` snapshots the trigger role/name tree and asserts exact `::part` names + trigger focusability across open/close — the churn edit strips no a11y DOM.
- **Hard gate:** full browser lane green (19 files, 97 tests) — floating-position, overlay-focus, virtual-scroll, and the Phase-8 no-0,0-frame specs all pass, proving all 6 overlays behave identically.

## Task Commits

Each task was committed atomically (TDD tasks split RED/GREEN):

1. **Task 1 (RED): middlewareBuilds count wiring** - `ff65150` (test)
2. **Task 1 (GREEN): cache static middleware slice** - `286bfcc` (feat)
3. **Task 2 (RED): cold-load retry spec + rejecting-importer seam** - `98c5965` (test)
4. **Task 2 (GREEN): null loader cache on rejected import() (CR-01)** - `1dd9b37` (fix)
5. **Task 3: report-only popover a11y snapshot guard** - `d07b26d` (test)

**Plan metadata:** (docs: complete plan — this SUMMARY commit)

## Files Created/Modified
- `src/internal/controllers/floating-position.ts` - New private `_buildMiddleware(mod, offset)` + cached `_baseSlice`/`_cachedOffset`; `_updatePosition` re-resolves getters each tick and reuses the cached base slice while the resolved offset is unchanged.
- `src/internal/helpers/lazy-load.ts` - `.catch` null-on-reject reset on both loaders (CR-01); `@internal` rejecting-importer seam (`__setLazyLoadImportersForTest` / `__resetLazyLoadImportersForTest`) with default importers keeping the unchanged static bare specifiers.
- `test/perf/overlay.perf.test.ts` - `middlewareBuilds` probe via `countMethod`; asserts it drops below the tick count and that computePosition/repositions stay at 4/2 (F-2).
- `test/browser/lazy-load-retry.test.ts` - NEW cold-load rejection->retry spec (+ happy-path single-memoization).
- `test/browser/popover-a11y-snapshot.test.ts` (+ committed `.snap`) - NEW report-only hybrid a11y guard.

## Decisions Made
- **Resolved-value-keyed base-slice cache.** Rather than a construction-time fixed-vs-getter split, the base slice rebuilds only when the *resolved* offset changes. This caches the popover's getter-backed-but-stable offset (=8) too, producing the 4->1 `middlewareBuilds` drop while a genuinely changed getter still triggers a rebuild (no stale freeze). Cleaner and stronger than the typeof split the action sketched.
- **`_buildMiddleware` builds only the base slice.** The getter-backed host tail (popover `arrow`, which reads a live `@query` node) must never be cached, so it is composed by `_updatePosition`, keeping `_buildMiddleware` invoked once-per-config — which is what makes `middlewareBuilds` a meaningful count.
- **Assert F-2 explicitly.** The perf test now hard-asserts `computePosition===4` and `repositions===2` against the committed baseline, so any accidental change to reposition frequency fails loudly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added an `@internal` rejecting-importer seam to make CR-01 testable on the browser lane**
- **Found during:** Task 2 (CR-01 cold-load retry spec)
- **Issue:** The plan's action suggested forcing a rejected `import()` via `vi.mock` / stubbing the dynamic-import path. Empirically, vitest browser-mode `vi.mock` **cannot** simulate a rejected dynamic import: throwing in the factory raises a hard "error mocking a module" (the factory is evaluated once at setup, not per-call), and network-level abort needs `api.allowExec` which only the perf project grants — not the browser lane. Without a seam the CR-01 fix is unprovable on the required browser lane.
- **Fix:** Added a minimal `@internal` importer indirection in `lazy-load.ts`: `floatingImporter`/`virtualizerImporter` default to the **unchanged static bare** `import('@floating-ui/dom')` / `import('@lit-labs/virtualizer/virtualize.js')`, plus `__setLazyLoadImportersForTest`/`__resetLazyLoadImportersForTest` (mirroring the existing `__resetLazyLoadCachesForTest`). The retry path in the spec is the genuine static-specifier import, so recovery is proven end-to-end. Production behavior is identical; no computed/origin-qualified path is ever built (T-09-04 satisfied); the seam is not re-exported from any barrel, is off the frozen CEM surface, and is tree-shaken from consumer bundles.
- **Files modified:** src/internal/helpers/lazy-load.ts, test/browser/lazy-load-retry.test.ts
- **Verification:** `test/browser/lazy-load-retry.test.ts` RED against the buggy `??=` (retry re-rejects), GREEN after the `.catch` reset (retry resolves to the real module); tsc clean.
- **Committed in:** 98c5965 (seam, RED) + 1dd9b37 (fix, GREEN)

---

**Total deviations:** 1 (1 blocking, Rule 3).
**Impact on plan:** The seam is the minimal enabler for the plan's own required browser-lane CR-01 proof; it adds no production behavior, no public/CEM surface, and no supply-chain path. No scope creep. WR-02/WR-03 remain opportunistic-only per D-05 (out-of-file component changes, not trivially cheap) and are carried forward.

## Issues Encountered
- **`middlewareBuilds` must reflect config-changes, not tick count.** An early reading had `_buildMiddleware` doing the full per-tick assembly (which would never drop below computePosition). Resolved by making `_buildMiddleware` build only the memoized base slice and guarding its call on the resolved offset — giving the intended 4->1 count.
- **Benign console noise:** the browser lane logs `ResizeObserver loop completed with undelivered notifications` (pre-existing floating-ui/autoUpdate behavior) and a Lit "scheduled an update after update completed" warning from the popover `_positioned` reveal — neither fails any test (19 files / 97 tests green).
- **Windows line-ending churn:** the full browser-lane run rewrote `data-grid-a11y-snapshot.test.ts.snap` with CRLF (empty content diff); reverted to keep the plan diff clean.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `counts.middlewareBuilds` is a NEW perf key; Plan 04 must regenerate/commit `api/perf.baseline.json` to include it (untuned->tuned: middlewareBuilds ~4->1; computePosition/repositions unchanged at 4/2).
- CR-01 is retired — the pre-ship Critical is closed with a browser-proven retry.
- The popover a11y `.snap` is committed; future overlay edits must keep it byte-identical (report-only until the Phase-11 enforcing flip).

---
*Phase: 09-runtime-performance-tuning*
*Completed: 2026-08-23*

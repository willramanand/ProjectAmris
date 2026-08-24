---
phase: 09-runtime-performance-tuning
plan: 01
subsystem: testing
tags: [lit, web-components, data-grid, perf-harness, memoization, a11y, vitest-browser, aria-snapshot]

# Dependency graph
requires:
  - phase: 07-measurement-baselines-budgets
    provides: "throttled Chromium perf harness (countLifecycle/countComputePosition/assertStableCounts), api/perf.baseline.json, low-end-cellular profile"
  - phase: 04-performance-feature-capabilities
    provides: "data-grid list virtualization (virtualize()<->repeat() swap, _sortedRows getter read sites)"
provides:
  - "countMethod(Ctor, name) — generic prototype-wrap count probe in test/perf/harness.ts (the measurement spine Plans 02/03 reuse for filterCalls/middlewareBuilds)"
  - "data-grid identity-keyed sort memo behind nameable _computeSortedRows(); sortComputes count key (untuned 3 -> tuned 1)"
  - "test/browser/data-grid-a11y-snapshot.test.ts — report-only browser-lane hybrid a11y guard (RPERF-04) proving the memo strips no a11y DOM"
affects: [09-02 (combobox filter memo), 09-03 (floating-position middleware memo), 09-04 (perf baseline finalize), phase-11 (perf gates)]

# Actuals (#2632)
actuals:
  tokens: 4400
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nameable-compute-method + identity cache: move a hot in-render compute into a wrappable private method, guard the getter on source-identity (mirrors Lit's reference dirty-check)"
    - "Generic countMethod count probe generalizing countComputePosition — makes in-render work measurable (RESEARCH F-1)"
    - "Browser-lane hybrid a11y snapshot: load-bearing shadowQuery attribute reads + advisory toMatchAriaSnapshot role/name tree"

key-files:
  created:
    - "test/browser/data-grid-a11y-snapshot.test.ts — report-only RPERF-04 a11y guard"
    - "test/browser/__snapshots__/data-grid-a11y-snapshot.test.ts.snap — committed advisory aria trees"
  modified:
    - "test/perf/harness.ts — new export countMethod(Ctor, name)"
    - "src/components/data-grid/data-grid.ts — _computeSortedRows() + _sortCache identity memo"
    - "test/perf/data-grid.perf.test.ts — sortComputes wiring + memo-effectiveness assertion"

key-decisions:
  - "Fast-path lives in the getter (unsorted returns this.rows by reference); _computeSortedRows() holds only the col-lookup + sort, so sortComputes counts real sorts only (initial unsorted render never increments)"
  - "Identity key on (this.rows, _sortKey, _sortDir) — not value-equality — mirrors Lit's @property/@state reference dirty-check and cannot introduce a stale-render class Lit wouldn't already have (Pitfall 13)"
  - "Forced unchanged-state re-renders via requestUpdate() (deterministic) rather than focus events for the memo-effectiveness scenario — makes the RED failure reliable (3 sorted reads) and the count deterministic across 5 repeats"
  - "aria-rowindex only exists on the div-grid (virtual) path, so the a11y guard adds a cold-chunk >100-row case for it; empty/single-row edges stay on the table path"
  - "Kept `page` import from @vitest/browser/context (plan/PATTERNS-prescribed, only typed source for page/getByRole); the deprecation warning is cosmetic and vitest/browser lacks the typed page export"

patterns-established:
  - "countMethod probe idiom: the count metric must be BUILT before it can improve (update/updated/render/nodes stay flat when work is memoized inside a render)"
  - "Report-only browser a11y guard scaffold reusable by Plans 02/03 (combobox/popover snapshots)"

requirements-completed: [RPERF-01, RPERF-04]

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "countMethod(Ctor, name) generic count probe added to the perf harness (the reusable measurement spine)"
    requirement: "RPERF-01"
    verification:
      - kind: unit
        ref: "test/perf/data-grid.perf.test.ts#measures render+sort counts under throttle, deterministic across 5 repeats (imports+wires countMethod)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit -p tsconfig.json (exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "data-grid sort identity-memoized behind _computeSortedRows(); sortComputes drops 3 -> 1 deterministically; sorted output + lifecycle/node counts byte-identical"
    requirement: "RPERF-01"
    verification:
      - kind: unit
        ref: "test/perf/data-grid.perf.test.ts#measures render+sort counts (asserts sortComputes === 1, assertStableCounts across 5 repeats)"
        status: pass
      - kind: unit
        ref: "test/components/data-grid.test.ts (12 passed — sort output byte-identical incl. empty/single/equal-key)"
        status: pass
    human_judgment: false
  - id: D3
    description: "report-only browser-lane a11y snapshot guard proving the sort memo strips no a11y DOM (aria-rowcount/colcount/multiselectable/sort/rowindex + roving tabindex; empty + single-row edges)"
    requirement: "RPERF-04"
    verification:
      - kind: automated_ui
        ref: "test/browser/data-grid-a11y-snapshot.test.ts (4 passed, real Chromium; comparison-mode green against committed snapshot)"
        status: pass
    human_judgment: false

# Metrics
duration: ~22min
completed: 2026-08-23
status: complete
---

# Phase 9 Plan 01: data-grid sort memo + measurement spine Summary

**Built the reusable `countMethod` perf-count probe and used it to prove a data-grid identity-keyed sort memo drops `sortComputes` from 3 to 1 with byte-identical sorted output, lifecycle/node counts, and accessibility DOM — the full measure→tune→re-measure loop proven end-to-end on one component.**

## Performance

- **Duration:** ~22 min active (excludes the tracer checkpoint wait between commits `2642772` and `2b73c67`)
- **Started:** 2026-08-23T18:28Z (tracer)
- **Completed:** 2026-08-23T22:43:13Z
- **Tasks:** 2
- **Files modified:** 3 modified, 2 created

## Accomplishments
- Added `countMethod(Ctor, name)` to `test/perf/harness.ts` — a generic prototype-wrap count probe generalizing `countComputePosition`. This is the load-bearing measurement spine Plans 02/03 reuse (`filterCalls`, `middlewareBuilds`). Per RESEARCH F-1 the existing update/updated/render/nodes counts cannot see work memoized *inside* a render, so this probe is what makes the RPERF-01 "count improvement" bar measurable at all.
- Refactored the data-grid `_sortedRows` getter into a nameable `_computeSortedRows()` (col lookup + `[...].sort(cmp*dir)` verbatim) plus an identity-keyed `_sortCache` guard on `(this.rows, _sortKey, _sortDir)`. The unsorted fast-path still returns `this.rows` by reference.
- Wired `sortComputes` into the perf scenario with a memo-effectiveness assertion: across a sort click + two forced unchanged-state re-renders, the sort recomputes **exactly once** (untuned = 3, tuned = 1), deterministic across all 5 perf repeats.
- Added `test/browser/data-grid-a11y-snapshot.test.ts` — a report-only browser-lane hybrid a11y guard (RPERF-04, D-04): load-bearing `shadowQuery` reads of `aria-rowcount`/`aria-colcount`/`aria-multiselectable`/`aria-sort`/`aria-rowindex` + roving `tabindex`, plus an advisory `toMatchAriaSnapshot` role/name tree, covering the empty and single-row edges.

## Untuned -> Tuned count (RPERF-01)

| Count key | Untuned (RED) | Tuned (GREEN) | Notes |
|-----------|---------------|---------------|-------|
| `sortComputes` | **3** | **1** | 3 sorted-path reads (sort click + 2 forced unchanged-state re-renders) collapse to 1 compute under the identity memo. Deterministic across 5 repeats. |
| `update` | 5 | 5 | unchanged — memo changed no render structure |
| `updated` | 5 | 5 | unchanged |
| `render` | 5 | 5 | unchanged |
| `nodes` | 250 | 250 | unchanged — no a11y/DOM node stripped |

The ephemeral `api/perf.json` is gitignored; the committed `sortComputes` baseline is finalized in Plan 04.

## Task Commits

Each task was committed atomically (Task 1 is a tracer TDD task: RED -> GREEN):

1. **Task 1 (RED): sortComputes count probe + failing memo assertion** - `e7548cf` (test)
2. **Task 1 (GREEN): identity-memoize data-grid sort compute** - `2642772` (feat)
3. **Task 2: report-only data-grid a11y snapshot guard** - `2b73c67` (test)

**Plan metadata:** (docs: complete plan — this SUMMARY commit)

## Files Created/Modified
- `test/perf/harness.ts` - Added exported `countMethod(Ctor, name)` prototype-wrap count probe.
- `src/components/data-grid/data-grid.ts` - Extracted `_computeSortedRows()` and added the `_sortCache` identity memo guarding `_sortedRows`.
- `test/perf/data-grid.perf.test.ts` - Wired `sortComputes` via `countMethod`, forced 2 unchanged-state re-renders, assert `sortComputes === 1`.
- `test/browser/data-grid-a11y-snapshot.test.ts` - NEW report-only browser-lane hybrid a11y guard.
- `test/browser/__snapshots__/data-grid-a11y-snapshot.test.ts.snap` - Committed advisory aria trees (grid/rowgroup/row/columnheader/gridcell).

## Decisions Made
- Fast-path kept in the getter so `sortComputes` counts only real sorts (initial unsorted mount render never increments).
- Identity key (reference), not value-equality — mirrors Lit's own dirty-check; cannot add a stale-render class Lit wouldn't already have (Pitfall 13).
- `requestUpdate()` (not focus events) drives the unchanged-state re-renders — deterministic RED (3 reads) and a stable count across repeats.
- Added a cold-chunk >100-row div-grid case to cover `aria-rowindex` (only present on the virtual path); empty/single-row edges stay on the table path.

## Deviations from Plan

**1. [Rule 3 - Blocking] Path-aware sort helper in the a11y spec**
- **Found during:** Task 2 (a11y snapshot guard)
- **Issue:** The plan's `sortFirstColumn` used `th.sortable`, which only exists on the `<table>` path; the >100-row div-grid case (needed for `aria-rowindex`) uses `.grid-header-cell.sortable`, so the virtual-path test threw "Unable to find th.sortable".
- **Fix:** Made `sortFirstColumn` try `th.sortable` then fall back to `.grid-header-cell.sortable`.
- **Files modified:** test/browser/data-grid-a11y-snapshot.test.ts
- **Verification:** `npm run test:browser -- test/browser/data-grid-a11y-snapshot.test.ts` → 4 passed.
- **Committed in:** `2b73c67`

**2. [Rule 1 - Bug] Guaranteed DOM cleanup between a11y tests**
- **Found during:** Task 2 (a11y snapshot guard)
- **Issue:** `page.getByRole('grid')` queries the whole document; a host left mounted by a failing assertion made the next test's locator ambiguous (Playwright strict-mode violation: "resolved to 3 elements").
- **Fix:** Added an `afterEach` that removes every `am-data-grid` from the document regardless of outcome.
- **Files modified:** test/browser/data-grid-a11y-snapshot.test.ts
- **Verification:** All 4 tests pass in both write and comparison modes.
- **Committed in:** `2b73c67`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug) — both scoped to the new test-only file.
**Impact on plan:** No scope creep; no source/CEM change beyond the planned memo. Frozen v1.0 public surface untouched (no new props/events/slots/parts/tokens); `virtualize()`↔`repeat()` swap and `_comparatorFor` body left intact.

## Issues Encountered
- `@vitest/browser/context` emits a deprecation warning (suggests `vitest/browser`), but `vitest/browser` does not export the typed `page`/`getByRole` locators, and the plan/PATTERNS prescribe `@vitest/browser/context`. Kept the prescribed import; the warning is non-blocking and the spec passes.

## Known Stubs
None — no placeholder/empty-data stubs introduced. All new code is exercised by passing tests.

## Threat Flags
None — internal memoization + test-only additions; no new network, input parsing, `innerHTML`, or dependencies (threat register T-09-01/T-09-02 both `accept`, low).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `countMethod` spine is in place for Plan 02 (combobox `_computeFilteredOptions` → `filterCalls`) and Plan 03 (floating-position `_buildMiddleware` → `middlewareBuilds`).
- The report-only browser a11y snapshot scaffold is reusable for the combobox/popover snapshot specs in Plans 02/03.
- Plan 04 finalizes the committed `sortComputes` baseline in `api/perf.baseline.json`.

## Self-Check: PASSED

All claimed artifacts verified present on disk and all task commits present in the branch history:
- Files: `test/perf/harness.ts`, `src/components/data-grid/data-grid.ts`, `test/perf/data-grid.perf.test.ts`, `test/browser/data-grid-a11y-snapshot.test.ts`, `test/browser/__snapshots__/data-grid-a11y-snapshot.test.ts.snap`, `.planning/phases/09-runtime-performance-tuning/09-01-SUMMARY.md` — all FOUND.
- Commits: `e7548cf` (RED), `2642772` (GREEN), `2b73c67` (Task 2), `825fd3e` (SUMMARY) — all FOUND.

---
*Phase: 09-runtime-performance-tuning*
*Completed: 2026-08-23*

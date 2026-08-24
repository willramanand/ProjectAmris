---
phase: 09-runtime-performance-tuning
plan: 02
subsystem: ui
tags: [lit, web-components, combobox, memoization, perf, a11y, vitest, aria-snapshot]

# Dependency graph
requires:
  - phase: 09-01
    provides: "harness.countMethod — the prototype-wrap count probe reused to count _computeFilteredOptions (filterCalls)"
  - phase: 07
    provides: "throttled Chromium perf harness (countLifecycle/assertStableCounts/proveThrottleLive) + browser a11y lane"
provides:
  - "Two-level identity memo for the combobox filter behind a nameable _computeFilteredOptions() + get _filteredOptions()"
  - "Level-1 _allOptions identity cache (re-spreads only on options/slotted identity change)"
  - "Distinct select-mode filtered cache keyed on _dropdownQuery (never collapsed with the text-mode value key)"
  - "counts.filterCalls perf key wired into the combobox scenario (untuned 12 -> tuned 10, deterministic across 5 repeats)"
  - "test/browser/combobox-a11y-snapshot.test.ts — report-only hybrid accessible-name/role guard for combobox"
affects: [09-04, runtime-performance-tuning, perf-baseline, combobox]

# Actuals — same estimateTokens scale (chars/4 over the realized diff)
actuals:
  tokens: 3100
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-level identity-keyed instance-field memo (Level-1 merged list, Level-2 filtered) behind a nameable compute method"
    - "Prototype-wrappable compute method (_computeFilteredOptions) so the perf harness countMethod can meter in-render work"
    - "Browser-lane hybrid a11y guard: advisory toMatchAriaSnapshot role/name tree + load-bearing exact shadowQuery attribute assertions"

key-files:
  created:
    - "test/browser/combobox-a11y-snapshot.test.ts"
    - "test/browser/__snapshots__/combobox-a11y-snapshot.test.ts.snap"
  modified:
    - "src/components/combobox/combobox.ts"
    - "test/perf/combobox.perf.test.ts"

key-decisions:
  - "Memoize only, never debounce (D-01): cache misses fire on the same keystroke that changes value, so WHEN the list visibly updates and the am-search cadence are byte-identical."
  - "Identity keys (not value-equality) mirror Lit's reference-based dirty-check — the memo can introduce no stale class Lit itself would not already have."
  - "Select-mode keeps a DISTINCT cache slot keyed on _dropdownQuery; the two mode keys never cross-contaminate."
  - "Tuned filterCalls == QUERY.length + 2 (one compute per distinct value, plus the two distinct-identity mount states), asserted exact + deterministic."

patterns-established:
  - "Pattern 1: nameable _computeFilteredOptions() wrapped by an identity-memoized get _filteredOptions(); all text-mode read sites thread the single result."
  - "Pattern 2: report-only browser a11y snapshot guard co-located in test/browser/** with a committed .snap, hybrid advisory-tree + exact-attribute."

requirements-completed: [RPERF-02, RPERF-04]

coverage:
  - id: D1
    description: "Combobox filter reduced to one _computeFilteredOptions per distinct (options-identity, value, remote) state via a two-level identity memo; filterCalls drops 12->10 while update/updated/render/nodes stay identical."
    requirement: "RPERF-02"
    verification:
      - kind: unit
        ref: "test/perf/combobox.perf.test.ts#measures filter-per-keystroke counts under throttle, deterministic across 5 repeats"
        status: pass
      - kind: unit
        ref: "test/components/combobox.test.ts (23 tests — filtered list + am-search cadence unchanged)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Combobox accessible name/role tree + role=combobox + aria-activedescendant clamp + option aria-posinset/aria-setsize/aria-selected are intact after the memo (incl. empty-results and single-option states)."
    requirement: "RPERF-04"
    verification:
      - kind: automated_ui
        ref: "test/browser/combobox-a11y-snapshot.test.ts (5 tests, real Chromium, report-only)"
        status: pass
    human_judgment: false

# Metrics
duration: 18min
completed: 2026-08-23
status: complete
---

# Phase 9 Plan 02: Combobox Filter Memo + A11y Snapshot Guard Summary

**Combobox filter-per-keystroke work is now a two-level identity memo behind `_computeFilteredOptions`; `filterCalls` drops 12→10 deterministically with lifecycle/node counts byte-identical, and a report-only browser-lane a11y snapshot guard proves no accessibility DOM was stripped (RPERF-02 tuned, RPERF-04 guarded).**

## Performance

- **Duration:** ~18 min
- **Completed:** 2026-08-23
- **Tasks:** 2
- **Files modified:** 4 (2 modified, 2 created)

## Accomplishments
- Added a **Level-1 `_allOptions` identity cache** (re-spreads `[...options, ...slotted]` only when either source array's identity changes) and a **Level-2 filtered memo** behind a nameable `_computeFilteredOptions()` + `get _filteredOptions()`, keyed on `(allOptions identity, value, remote)`.
- Threaded the four TEXT-mode read sites (ListboxNav `getOptions`, `_handleKeydown`, `_openOptionCount`, `render`) through the single `_filteredOptions` read path; kept SELECT-mode (`_selectFilteredOptions`, `_dropdownQuery`) on its own **distinct** cache slot (D-01, no key collapse).
- Wired `counts.filterCalls` into the combobox perf scenario via `harness.countMethod` (reused from Plan 01). **Untuned = 12; tuned = 10**, deterministic across 5 repeats (`assertStableCounts`); `update`/`updated`/`render` = 11 and `nodes` = 20 **unchanged** before/after — proof the memo altered no observable render structure.
- Created a report-only browser-lane hybrid a11y snapshot guard (real Chromium) for combobox: advisory `toMatchAriaSnapshot` role/name tree + load-bearing exact attribute assertions (role=combobox, in-range `aria-activedescendant` → live option id, option `aria-posinset`/`aria-setsize`/`aria-selected`, the FIX-02 out-of-range clamp, the empty-results "No results" row, and the single-option state).

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): filterCalls probe + per-keystroke memo assertion** - `16bd6bb` (test)
2. **Task 1 (GREEN): two-level identity memo for combobox filter** - `4a93482` (feat)
3. **Task 2: combobox accessible-name/role snapshot guard** - `4b36bdd` (test)

_TDD: Task 1 committed RED (the assertion fails against the un-memoized HEAD source, which lacks `_computeFilteredOptions` and recomputes 12×) then GREEN (the two caches drop it to 10)._

## Files Created/Modified
- `src/components/combobox/combobox.ts` - Added `_allOptionsCache` + `_filteredCache` + `_selectFilteredCache` identity caches, `_computeFilteredOptions()`, and memoized `_filteredOptions` getter; routed the four text-mode read sites through it. `option-filter.ts` untouched.
- `test/perf/combobox.perf.test.ts` - Wired `countMethod(AmCombobox, '_computeFilteredOptions')` → `counts.filterCalls`; asserts the tuned value (`QUERY.length + 2`) + `assertStableCounts`.
- `test/browser/combobox-a11y-snapshot.test.ts` - New report-only hybrid a11y guard (5 tests, real Chromium).
- `test/browser/__snapshots__/combobox-a11y-snapshot.test.ts.snap` - Committed aria role/name tree snapshot (`- combobox "Pick" [expanded]`).

## Decisions Made
- **Memoize only, never debounce (D-01):** the Level-2 cache miss fires on the same keystroke that changes `value`, so the filtered list content and the turn it becomes visible — plus the remote `am-search` cadence — are byte-identical to the pre-memo path. Pure dedupe.
- **Identity keys, not value-equality:** mirrors Lit's own reference-based `@property`/`@state` dirty-check; in-place mutation of `options` already does not trigger a Lit update, so the cache introduces no new stale-render class.
- **Distinct select-mode key:** `_selectFilteredOptions` keeps its own cache keyed on `_dropdownQuery`, never collapsed with the text-mode `value` key.
- **Tuned `filterCalls` = `QUERY.length + 2`:** one compute per distinct typed `value` (8 keystrokes) plus the two distinct-identity mount states (`options=[]` default render, then `options=OPTIONS`). Both extras are genuine option-identity changes, not redundant recomputation.

## Deviations from Plan

None - plan executed exactly as written. `option-filter.ts` was left byte-identical (verified: no diff); `_renderOptionList`/`_ensureVirtualizer` and the frozen CEM surface were untouched; no debounce introduced.

## Issues Encountered
- **`value` is the filter query in text mode:** the first draft of the a11y snapshot set `value='Apple'` to exercise `aria-selected="true"`, but in text mode `value` also filters, collapsing the list to the one matching row. Resolved by using `value=''` for the all-options scenarios and a dedicated single-matching-row test for `aria-selected="true"` (which is exactly the state where a selected value is visible).
- **`@vitest/browser/context` is deprecated:** switched the `page` import to `vitest/browser` (matches the harness).
- **Snapshot artifact:** `toMatchAriaSnapshot()` writes a committed `.snap` (same pattern as the sibling `data-grid-a11y-snapshot.test.ts.snap`); the failure-run screenshot under `test/browser/__screenshots__/` is gitignored and not committed.

## Verification

- `vitest run --project perf test/perf/combobox.perf.test.ts` — green; `filterCalls` deterministic at 10 (untuned 12), `update/updated/render/nodes` unchanged.
- `vitest run --project browser test/browser/combobox-a11y-snapshot.test.ts` — green (5 tests, report-only); snapshot stable on rerun (0 written).
- `vitest run --project jsdom test/components/combobox.test.ts` — green (23 tests; filtered list + am-search cadence unchanged).
- `vitest run --project browser test/browser/combobox-virtual.test.ts` — green (7 tests; virtualization/nav blast-radius intact).
- `tsc --noEmit -p tsconfig.json` — clean.

## Next Phase Readiness
- `counts.filterCalls` is measured on tuned code; Plan 04 owns committing it into `api/perf.baseline.json` (this plan did not touch the gitignored `api/perf.json`).
- RPERF-02 tuned and RPERF-04 (combobox) guarded. No blockers.

## Self-Check: PASSED

All created/modified files present on disk; all 3 task commits (`16bd6bb`, `4a93482`, `4b36bdd`) present in history.

---
*Phase: 09-runtime-performance-tuning*
*Completed: 2026-08-23*

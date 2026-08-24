---
phase: 09-runtime-performance-tuning
verified: 2026-08-23T23:52:00Z
status: passed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
requirements_verified: [RPERF-01, RPERF-02, RPERF-03, RPERF-04]
---

# Phase 9: Runtime Performance Tuning Verification Report

**Phase Goal:** The heaviest components do measurably less main-thread work on throttled CPUs — each change behavior-preserving and re-measured against the real post-deferral graph — without stripping any accessibility DOM.
**Verified:** 2026-08-23T23:52:00Z
**Status:** passed
**Re-verification:** No — initial verification (post code-review CR-01/WR-01 fix, commit ce87124)

## Goal Achievement

The phase goal is achieved. Three hot render paths are memoized behind identity caches (data-grid sort, combobox filter, overlay floating-middleware slice), each proven to reduce a machine-measurable work count while keeping sorted/filtered/positioned output byte-identical, Lit lifecycle + DOM node counts unchanged, and accessibility DOM intact. The count improvement is preserved as a durable, re-runnable machine diff. The one behavior-preservation defect surfaced in review (data-grid sort memo omitting `columns` from its key) was fixed and covered by a jsdom regression test.

### Observable Truths

| # | Truth (requirement) | Status | Evidence |
|---|---------------------|--------|----------|
| 1 | data-grid sort identity-memoized behind `_computeSortedRows`; `sortComputes` drops 3→1 deterministically (RPERF-01) | ✓ VERIFIED | `data-grid.ts:418` cache keyed on `(rows,cols,key,dir)`; perf test `data-grid.perf.test.ts` PASS on real Chromium (sortComputes=1, stable ×5) |
| 2 | Sorted output byte-identical incl. empty/single/equal-key; unsorted fast-path returns `this.rows` by reference (RPERF-01) | ✓ VERIFIED | `_computeSortedRows` body is verbatim col-lookup + `[...].sort(cmp*dir)`; getter fast-path `return this.rows`; data-grid jsdom 13/13 PASS |
| 3 | CR-01 fixed: a `columns` swap that changes the comparator recomputes (no stale sort order) (RPERF-01) | ✓ VERIFIED | `cache.cols === this.columns` guard present; regression test "CR-01: recomputes sort when a columns swap changes the comparator" PASS (jsdom) |
| 4 | combobox filter two-level identity memo; `filterCalls` drops 12→10; distinct text-mode vs select-mode keys (RPERF-02) | ✓ VERIFIED | `combobox.ts:537/556/947` three caches; text sites route `_filteredOptions`, select keeps `_selectFilteredCache` on `_dropdownQuery`; perf test PASS (filterCalls=10, stable ×5) |
| 5 | Filter memoize-only, no debounce — list updates on same keystroke, am-search cadence unchanged (RPERF-02, D-01) | ✓ VERIFIED | Cache miss keyed on `value`; combobox jsdom suite green (SUMMARY 23 tests); no debounce in source; option-filter.ts untouched (no phase commit) |
| 6 | Overlay middleware base slice `[offset,flip,shift]` cached, rebuilt once per config not per tick; `middlewareBuilds` 4→1 (RPERF-03) | ✓ VERIFIED | `floating-position.ts:193` rebuild guarded on `offsetValue !== _cachedOffset`; overlay perf test PASS (middlewareBuilds=1) |
| 7 | Getter-backed options re-resolved every tick (no stale freeze); array order [offset,flip,shift,...host] preserved; computePosition/repositions unchanged (RPERF-03, F-2) | ✓ VERIFIED | `_updatePosition` re-resolves placement/offset each tick, host tail rebuilt each tick, `[...._baseSlice, ...hostMiddleware]`; perf test asserts computePosition=4/repositions=2; full browser lane green (per 09-03 SUMMARY) |
| 8 | CR-01/loader: rejected `import()` nulls the memoized slot on both `loadFloating`/`loadVirtualizer`; retry succeeds (D-05) | ✓ VERIFIED | `lazy-load.ts:52/85` `.catch` resets `floatingPromise`/`virtualizerPromise = null`; `lazy-load-retry.test.ts` PASS (real Chromium) |
| 9 | WR-01 fixed: data-grid virtualizer-warm `.catch()` — no unhandled rejection on cold-chunk failure (D-05) | ✓ VERIFIED | `data-grid.ts:159` `.catch()` on `loadVirtualizer().then(...)`; commit ce87124 |
| 10 | a11y name/role/aria/focusability byte-identical before/after for data-grid, combobox, popover incl. empty/single edges (RPERF-04, D-04) | ✓ VERIFIED | 3 browser a11y snapshot specs PASS (14 tests total incl. lazy-load-retry) on real Chromium; load-bearing shadowQuery attr reads + advisory aria trees |
| 11 | Durable machine before/after: `perf-diff.mjs untuned tuned` shows exactly the 3 count drops and no lifecycle/node/position drift (RPERF-01/02/03) | ✓ VERIFIED | Ran `node scripts/perf-diff.mjs api/perf.baseline.untuned.json api/perf.baseline.json` → exactly sortComputes 3→1, filterCalls 12→10, middlewareBuilds 4→1; no update/render/nodes/computePosition/repositions row; exit 0 |
| 12 | Frozen v1.0 CEM public surface + no bytes moved; only private members / test-only seam changed (all prohibitions) | ✓ VERIFIED | Only 4 planned source files changed, all `_`-prefixed private members + `@internal` test importer seam; no public props/events; option-filter.ts / CEM / size-limit untouched (schema-drift + size gates green per 09-04) |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `test/perf/harness.ts` | `countMethod(Ctor,name)` probe | ✓ VERIFIED | Exported at line 294, prototype-wrap + restore discipline |
| `src/components/data-grid/data-grid.ts` | `_computeSortedRows()` + `_sortCache` (cols in key) | ✓ VERIFIED | Present; wired via `_sortedRows` getter read sites |
| `src/components/combobox/combobox.ts` | `_computeFilteredOptions` + `_filteredOptions` + 3 identity caches | ✓ VERIFIED | Present; four text-mode sites routed, select-mode distinct key |
| `src/internal/controllers/floating-position.ts` | `_buildMiddleware` + `_baseSlice`/`_cachedOffset` | ✓ VERIFIED | Present; order preserved; getters re-resolved |
| `src/internal/helpers/lazy-load.ts` | `.catch` null-on-reject both loaders | ✓ VERIFIED | Lines 52/57, 85/89 |
| `test/browser/{data-grid,combobox,popover}-a11y-snapshot.test.ts` | report-only a11y guards | ✓ VERIFIED | All 3 exist and PASS on Chromium |
| `test/browser/lazy-load-retry.test.ts` | cold-load retry proof | ✓ VERIFIED | Exists and PASS |
| `api/perf.baseline.json` | tuned baseline w/ 3 new count keys | ✓ VERIFIED | Contains sortComputes/filterCalls/middlewareBuilds at tuned values |
| `api/perf.baseline.untuned.json` | durable untuned before baseline | ✓ VERIFIED | Present; diff-verified to differ only in the 3 count keys |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 3 count improvements durable | `node scripts/perf-diff.mjs untuned tuned` | exactly 3 drops, no other drift, exit 0 | ✓ PASS |
| data-grid sort correctness + CR-01 | `vitest run --project jsdom data-grid.test.ts` | 13/13 | ✓ PASS |
| perf count assertions (all 3 targets) | `vitest run --project perf {data-grid,combobox,overlay}.perf.test.ts` | 3/3 (real Chromium) | ✓ PASS |
| a11y snapshots + loader retry | `vitest run --project browser {3 a11y specs}, lazy-load-retry` | 14/14 (real Chromium) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| RPERF-01 | 09-01, 09-04 | data-grid re-render-on-sort narrowed behavior-preservingly + re-measured | ✓ SATISFIED | sort memo + CR-01 fix; sortComputes 3→1; jsdom + perf green |
| RPERF-02 | 09-02, 09-04 | combobox filter-per-keystroke reduced + re-measured | ✓ SATISFIED | two-level memo; filterCalls 12→10; perf green |
| RPERF-03 | 09-03, 09-04 | overlay reposition churn reduced + re-measured | ✓ SATISFIED | base-slice cache; middlewareBuilds 4→1; computePosition/repositions flat (F-2); browser lane |
| RPERF-04 | 09-01/02/03, 09-04 | a11y snapshots guard each tuned component | ✓ SATISFIED | 3 browser snapshot specs green; no aria/role/focusability stripped |

No orphaned requirements — REQUIREMENTS.md maps only RPERF-01..04 to Phase 9, all claimed across plans.

### Anti-Patterns Found

None blocking. No debt markers (TBD/FIXME/XXX) introduced in phase source. Deferred review items WR-02 (harness pseudo-median at even N), WR-03 (combobox slot-change churn), IN-01/IN-02 (doc/maintenance notes) are tracked follow-ups with no live defect; none affect the phase goal.

### Human Verification Required

None. Every truth is backed by an automated behavioral test: count deltas by the perf lane + durable machine diff, sort/filter/position correctness and the CR-01 behavior-preservation invariant by unit/regression tests, a11y-DOM preservation by browser snapshot guards, and loader recovery by the cold-load retry spec. Wall-clock is report-only by design (D-08) and not required to gate the goal — the count metrics are the machine-measurable proof of reduced main-thread work.

### Gaps Summary

No gaps. The one critical review finding (CR-01) and its companion warning (WR-01) were resolved in commit ce87124 and are verified in source with a passing regression test. All must-haves verified against the actual codebase.

---

_Verified: 2026-08-23T23:52:00Z_
_Verifier: Claude (gsd-verifier)_

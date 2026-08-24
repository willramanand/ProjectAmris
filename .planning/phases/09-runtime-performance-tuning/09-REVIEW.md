---
phase: 09-runtime-performance-tuning
reviewed: 2026-08-24T03:39:08Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/components/data-grid/data-grid.ts
  - src/components/combobox/combobox.ts
  - src/internal/controllers/floating-position.ts
  - src/internal/helpers/lazy-load.ts
  - test/perf/harness.ts
  - test/perf/data-grid.perf.test.ts
  - test/perf/combobox.perf.test.ts
  - test/perf/overlay.perf.test.ts
  - test/browser/data-grid-a11y-snapshot.test.ts
  - test/browser/combobox-a11y-snapshot.test.ts
  - test/browser/popover-a11y-snapshot.test.ts
  - test/browser/lazy-load-retry.test.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: partially_resolved
---

# Phase 9: Code Review Report

**Reviewed:** 2026-08-24T03:39:08Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Phase 9 memoizes three hot render paths behind identity caches (data-grid sort, combobox filter, overlay floating-middleware slice), adds a perf count-probe harness, and nulls the lazy-load module cache on a rejected `import()`. I traced every cache's invalidation key against the inputs its compute actually reads, checked the rejected-import retry path, and looked for behavior changes vs. the un-memoized code.

The combobox filter caches, the floating-position `_baseSlice` cache, and the lazy-load null-on-reject retry are all correct — each cache key fully covers the inputs its compute consumes, and the retry seam is proven end-to-end by `lazy-load-retry.test.ts`.

The standout defect is in the **data-grid sort memo**: its cache key omits `this.columns`, but `_computeSortedRows()` reads `this.columns` (for the column lookup and comparator). Because `columns` is a public `@property`, Lit re-renders when it changes — but the memo silently returns stale sort output, producing a wrong-order data render that the un-memoized getter did not have. A second, lower-severity gap: data-grid's virtualizer-warm path does not `.catch()` its rejected loader promise, unlike combobox's equivalent, producing an unhandled rejection on a cold-chunk failure.

## Critical Issues

### CR-01: data-grid sort memo omits `this.columns` from its cache key — stale sort order on a live column change

**File:** `src/components/data-grid/data-grid.ts:400-438`
**Issue:**
The sort memo is keyed on `(this.rows, this._sortKey, this._sortDir)` only:

```ts
if (
  cache &&
  cache.rows === this.rows &&
  cache.key === this._sortKey &&
  cache.dir === this._sortDir
) {
  return cache.result;
}
```

But `_computeSortedRows()` also reads `this.columns`:

```ts
const col = this.columns.find(c => c.key === this._sortKey); // reads this.columns
...
const cmp = this._comparatorFor(col); // reads col.compare / col.type
```

`columns` is a public `@property({ type: Array })`. When a consumer replaces `columns` — e.g. swaps the active sort column's `compare` closure, flips its `type` from `'string'` to `'number'`, or toggles `sortable` — while `rows`, `_sortKey`, and `_sortDir` stay reference-identical, Lit re-renders (columns identity changed) but `_sortedRows` returns the previously-cached array computed with the OLD comparator. The grid then displays data in the wrong sort order with no error.

This is a genuine regression, not a pre-existing class: the un-memoized getter re-ran `_computeSortedRows()` on every render, so it always picked up the latest `columns`. The doc comment's claim that the memo "mirrors the same reference dirty-check Lit's own `@property`/`@state` uses, so it ... cannot introduce a stale-render class Lit wouldn't already have" is false — Lit *does* dirty-check `columns` and re-render, but this cache ignores `columns`, so it desyncs from Lit's own change semantics. Realistic trigger: a `compare` closure that captures external state (locale, a secondary-sort field) and is re-supplied via a new `columns` array while the row data is unchanged.

**Fix:** Add `columns` identity to the cache key (and to the stored cache record):

```ts
private _sortCache: {
  rows: Record<string, unknown>[];
  columns: DataGridColumn[];
  key: string;
  dir: SortDirection;
  result: Record<string, unknown>[];
} | null = null;

private get _sortedRows(): Record<string, unknown>[] {
  if (!this._sortKey || this._sortDir === 'none') return this.rows;
  const cache = this._sortCache;
  if (
    cache &&
    cache.rows === this.rows &&
    cache.columns === this.columns &&   // <-- add
    cache.key === this._sortKey &&
    cache.dir === this._sortDir
  ) {
    return cache.result;
  }
  const result = this._computeSortedRows();
  this._sortCache = { rows: this.rows, columns: this.columns, key: this._sortKey, dir: this._sortDir, result };
  return result;
}
```

## Warnings

### WR-01: data-grid virtualizer-warm swallows nothing — unhandled promise rejection on a cold-chunk failure

**File:** `src/components/data-grid/data-grid.ts:156-160`
**Issue:**
`_scheduleVirtualizerWarm` chains `.then()` with no `.catch()`:

```ts
loadVirtualizer().then((m) => {
  if (!this.isConnected) return;
  this._virtualize = m.virtualize;
  this.requestUpdate();
});
```

`loadVirtualizer()` re-throws on a failed dynamic `import()` (by design — see `lazy-load.ts:85-91`), so a cold-chunk fetch failure here becomes an **unhandled promise rejection** (console noise + `unhandledrejection` events in consumer apps). Combobox's equivalent (`_ensureVirtualizer`, `combobox.ts:850-862`) correctly `.catch()`es the same loader and resets its retry guard — data-grid is inconsistent with that design. Functionally the grid still falls back to the unwindowed `repeat()`/table body, and because `_virtualizerRaf` is 0 and `_virtualize` stays undefined a later `updated()` reschedules a retry — but every failed retry emits another unhandled rejection.

**Fix:** Mirror combobox's handling:

```ts
loadVirtualizer()
  .then((m) => {
    if (!this.isConnected) return;
    this._virtualize = m.virtualize;
    this.requestUpdate();
  })
  .catch(() => {
    // Cold/failed chunk — stay on the repeat()/table fallback (D-05); a later
    // updated() reschedules a retry.
  });
```

### WR-02: `summarize()` reports a pseudo-median that is wrong for even-length sample sets

**File:** `test/perf/harness.ts:366-372`
**Issue:**
`median = sorted[Math.floor(sorted.length / 2)]` takes the upper-middle element rather than averaging the two central values. For the committed `REPEATS = 5` this is fine (index 2 is the true median), but the field is named/documented as the reported median and is persisted to `api/perf.json` as the headline wall-clock number; if `REPEATS` is ever set to an even value the "median" silently becomes the upper-of-two element, biasing the report high. Report-only, so not gating — but the label misrepresents the value for even N.

**Fix:** Average the two central elements for even-length input:

```ts
const mid = Math.floor(sorted.length / 2);
const median = sorted.length === 0
  ? 0
  : sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
```

### WR-03: combobox `_handleOptionsSlotChange` can churn `_allOptions` identity and perturb the pinned `filterCalls` count

**File:** `src/components/combobox/combobox.ts:588-594` (interaction with `test/perf/combobox.perf.test.ts:124-125`)
**Issue:**
`_handleOptionsSlotChange` always rebuilds `_slottedOptions` as a fresh array via `.filter().map()`, even when the assigned-element set is empty:

```ts
this._slottedOptions = nodes
  .filter((el): el is HTMLElement => el.tagName === 'AM-OPTION')
  .map(el => (el as any).value || el.textContent?.trim() || '');
```

A `slotchange` on a combobox with no light-DOM `am-option` children still assigns a brand-new `[]` to the `@state` `_slottedOptions`, which changes `_allOptions` identity (`_allOptionsCache` invalidates) and forces an extra `_computeFilteredOptions` cache miss. The perf spec pins `filterCalls` to exactly `QUERY.length + 2 = 10` and asserts byte-identical counts across 5 repeats; whether a browser fires `slotchange` for an empty default slot is engine/timing dependent, so this is a latent determinism/flake risk for that assertion (and a small amount of wasted recompute in production). Not a correctness bug in the memo itself.

**Fix:** Skip the state write when the derived list is unchanged (guard on empty + shallow-equal), or short-circuit when `nodes` contains no `AM-OPTION` and `_slottedOptions` is already empty, so slot noise does not invalidate the option caches.

## Info

### IN-01: data-grid sort-memo doc comment overstates the invalidation guarantee

**File:** `src/components/data-grid/data-grid.ts:392-405`
**Issue:** Independent of the CR-01 fix, the JSDoc asserts the memo "cannot introduce a stale-render class Lit wouldn't already have." That is inaccurate as written because the compute depends on `this.columns`, which Lit *does* dirty-check. Once CR-01 is fixed, update the comment to state the full key `(rows, columns, key, dir)` so the next reader can verify key/compute-input parity at a glance.
**Fix:** Reword the comment to enumerate every input `_computeSortedRows` reads and confirm each is in the cache key.

### IN-02: floating-position `_baseSlice` / `_cachedOffset` are never reset on `stop()`

**File:** `src/internal/controllers/floating-position.ts:111-112, 147-153`
**Issue:** The cached base-middleware slice persists across `stop()`/`start()` cycles. This is currently correct — `_updatePosition` re-resolves `offset` every tick and rebuilds when it changes, and `flip()`/`shift()` carry no host inputs — so there is no live defect. Flagging only as a maintenance note: if a future middleware factory in the base slice ever gains a host-derived input, the "rebuild only when resolved offset changes" gate would need widening. No change required now.
**Fix:** None required; document the "base slice carries no host input other than offset" invariant near `_buildMiddleware` so a future edit does not silently break it.

---

_Reviewed: 2026-08-24T03:39:08Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---

## Resolution (execute-phase, commit ce87124)

| ID | Severity | Status | Notes |
|----|----------|--------|-------|
| CR-01 | Critical | ✅ Fixed | `_sortCache` now keys on `(rows, columns, key, dir)`; a columns-swap that changes the comparator recomputes. jsdom regression test added (`data-grid.test.ts` "CR-01: recomputes sort when a columns swap changes the comparator"). |
| WR-01 | Warning | ✅ Fixed | data-grid virtualizer-warm `loadVirtualizer().then()` now has `.catch()` — a cold-chunk failure stays on the table path instead of surfacing as an unhandled rejection. |
| WR-02 | Warning | ⏭ Deferred | `harness.ts summarize()` pseudo-median is correct at `REPEATS=5`; test-infra only. Tracked as a follow-up. |
| WR-03 | Warning | ⏭ Deferred | combobox `_handleOptionsSlotChange` `_slottedOptions` churn — no observed determinism failure (perf lane green); tracked as a follow-up. |
| Info ×2 | Info | ⏭ Deferred | Minor; tracked. |

Verification after fix: `tsc --noEmit` clean · data-grid perf `sortComputes`=1 (memo win preserved) · data-grid jsdom 13/13.

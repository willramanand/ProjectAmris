# Phase 9: Runtime-Performance Tuning - Pattern Map

**Mapped:** 2026-08-23
**Files analyzed:** 10 (4 source MODIFIED, 1 harness MODIFIED, 1 baseline REGENERATED, 4 test specs NEW)
**Analogs found:** 10 / 10 (every target file already exists or has a strong in-repo analog)

This phase is a behavior- AND surface-preserving runtime-perf tuning. Every source edit is an **identity-keyed result cache** wrapping an existing hot compute, plus **new deterministic count probes** (mirroring `countComputePosition`) to make the "count improvement" bar measurable, plus **new browser-lane a11y snapshot specs** (mirroring `a11y.browser.test.ts`) and a **cold-load retry spec** for the folded CR-01 fix. No CEM/public-surface change; nothing enforcing flips (all report-only → Phase 11).

**Start from `08-PATTERNS.md`** — it already maps the post-Phase-8 shape of these exact files (data-grid `_sortedRows`/virtualize swap, combobox `_renderOptionList`, the shared controller `_updatePosition`, `lazy-load.ts`). This map extends it with the Phase-9-specific compute-method refactors, count probes, and a11y specs.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/data-grid/data-grid.ts` (MOD) | component (data display) | transform (memoized sort) | itself — `_sortedRows` getter (392-399); memo shape in RESEARCH Pattern 1 | exact (in-place) |
| `src/components/combobox/combobox.ts` (MOD) | component (form/overlay) | transform (memoized filter) | itself — `_allOptions` (532-534) + 5 `filterOptions` sites; data-grid sort memo is the sibling idiom | exact (in-place) |
| `src/internal/controllers/floating-position.ts` (MOD) | controller (reactive) | request-response (async positioning) | itself — `_updatePosition` (146-166) | exact (in-place) |
| `src/internal/helpers/lazy-load.ts` (MOD) | utility (internal helper) | event-driven (load-on-intent) | itself — `??=` caches at lines 38-40 / 59-61; fix shape in RESEARCH:296-303 | exact (in-place) |
| `test/perf/harness.ts` (MOD) | test (measurement) | batch (count probe) | itself — `countComputePosition` (255-274) / `countLifecycle` (208-237) | exact (add `countMethod`) |
| `api/perf.baseline.json` (REGEN) | config (measurement artifact) | batch | itself — regenerate on untuned code with new count keys | exact |
| `test/browser/data-grid-a11y-snapshot.test.ts` (NEW) | test (browser a11y) | batch (snapshot) | `test/browser/a11y.browser.test.ts` | role-match (axe scaffold; new `toMatchAriaSnapshot` + attr assertions) |
| `test/browser/combobox-a11y-snapshot.test.ts` (NEW) | test (browser a11y) | batch (snapshot) | `test/browser/a11y.browser.test.ts` | role-match |
| `test/browser/popover-a11y-snapshot.test.ts` (NEW) | test (browser a11y) | batch (snapshot) | `test/browser/a11y.browser.test.ts` | role-match |
| `test/browser/lazy-load-retry.test.ts` (NEW) | test (browser cold-load) | event-driven | `test/browser/a11y.browser.test.ts` (fixture/import scaffold) + `__resetLazyLoadCachesForTest()` | role-match |

## Shared Patterns

### The nameable-compute-method + identity-cache idiom (RPERF-01 & RPERF-02)
**Source:** RESEARCH.md Pattern 1 (data-grid:392-399) and Pattern 2 (combobox:532-534).
**Apply to:** `data-grid.ts` (`_computeSortedRows`), `combobox.ts` (`_computeFilteredOptions`), and — for symmetry — `floating-position.ts` (`_buildMiddleware(mod)`).

The idiom: keep the existing getter as the public read site, but move the actual compute body into a **nameable private method** so the perf harness can prototype-wrap it for a count probe. The getter guards on a source-identity cache:

```typescript
// instance field
private _sortCache: { rows: unknown[]; key: string; dir: string; result: Record<string, unknown>[] } | null = null;

private get _sortedRows(): Record<string, unknown>[] {
  const c = this._sortCache;
  if (c && c.rows === this.rows && c.key === this._sortKey && c.dir === this._sortDir) return c.result;
  const result = this._computeSortedRows();   // <-- wrappable by countMethod probe
  this._sortCache = { rows: this.rows, key: this._sortKey, dir: this._sortDir, result };
  return result;
}
private _computeSortedRows(): Record<string, unknown>[] { /* the CURRENT getter body, verbatim */ }
```

**Why identity, not value-equality:** Lit's `@property` dirty-check is itself reference-based, so an identity key mirrors the component's existing change semantics exactly and cannot introduce a stale-render class Lit wouldn't already have (avoids Pitfall 13). **Preserve the unsorted fast-path** (`return this.rows` — same reference) so downstream identity checks are unaffected.

### The count-probe idiom (F-1/F-2 — the measurable-count gap)
**Source:** `test/perf/harness.ts` — `countComputePosition` (255-274), `countLifecycle` (208-237).
**Apply to:** a new generic `countMethod(Ctor, name)` in `harness.ts`, wired into the three scenario specs.

The existing counts (`update`/`updated`/`render`/`nodes` + `computePosition`/`repositions`) do NOT change when you memoize work *inside* a render — so the requirement's "count improvement" bar is unmeasurable without new probes. Extend `harness.ts` with the same prototype-wrap shape:

```typescript
// test/perf/harness.ts — generalizes countComputePosition (255-274)
export function countMethod(Ctor: { prototype: object }, name: string) {
  let n = 0;
  const proto = Ctor.prototype as Record<string, unknown>;
  const orig = proto[name] as (...a: unknown[]) => unknown;
  proto[name] = function (this: unknown, ...a: unknown[]) { n++; return orig.apply(this, a); };
  return { get count() { return n; }, reset() { n = 0; }, restore() { proto[name] = orig; } };
}
```

New count keys: `sortComputes` (data-grid), `filterCalls` (combobox), `middlewareBuilds` (overlay). Wire into each spec exactly like `countLifecycle` is wired in `data-grid.perf.test.ts:74/91/105` (construct, merge into `counts`, `restore()` in `finally`). Assert stable across 5 repeats via `assertStableCounts` (harness:371-381).

### Preserve the controller lifecycle invariants (RPERF-03)
**Source:** `floating-position.ts` — `_startToken` close-during-load guard, `start()`/`stop()` open-gating, `hostDisconnected → stop()` (142-144).
**Apply to:** the `floating-position.ts` churn edit only. The churn reduction (cache static middleware slice, hoist fixed `resolve()`) must NOT weaken these Phase-8 invariants, and `computePosition` output must stay byte-identical. The browser lane is the gate (blast radius = all 6 overlays).

### The browser-lane a11y spec scaffold (RPERF-04)
**Source:** `test/browser/a11y.browser.test.ts` (1-53).
**Apply to:** the three new `*-a11y-snapshot.test.ts` specs. Reuse `fixture` + `waitForUpdate` from `../helpers`, the per-component `import` + `describe`/`it` structure, and the same `checkA11y` from `../a11y-helper` for a complementary presence check. Layer on the NEW facility: `expect.element(page.getByRole(...)).toMatchAriaSnapshot()` (role+name tree) plus explicit `aria-*`/`tabindex` reads via `shadowQuery`.

## Pattern Assignments

### `src/components/data-grid/data-grid.ts` (component, transform) — MODIFIED

**Analog:** itself. **Current getter to refactor** (lines 392-399, verbatim):
```typescript
private get _sortedRows(): Record<string, unknown>[] {
  if (!this._sortKey || this._sortDir === 'none') return this.rows;
  const col = this.columns.find(c => c.key === this._sortKey);
  if (!col) return this.rows;
  const dir = this._sortDir === 'asc' ? 1 : -1;
  const cmp = this._comparatorFor(col);
  return [...this.rows].sort((a, b) => cmp(a, b) * dir);
}
```
**Edit:** split into cached getter + `_computeSortedRows()` per the Shared Pattern above; keyed on `(this.rows identity, this._sortKey, this._sortDir)`. Body of `_computeSortedRows` = the current getter body verbatim (byte-identical comparator, `localeCompare`/numeric rules). Read sites at **446 / 538 / 618** reuse the cache untouched. Do NOT narrow the non-sort render path (D-02 defers it). Leave the `virtualize()`↔`repeat()` swap (Phase-8 machinery) intact.

**Count wiring:** `countMethod(AmDataGrid, '_computeSortedRows')` in `data-grid.perf.test.ts` → `counts.sortComputes`. Untuned: >1 per render sequence; tuned: 1.

---

### `src/components/combobox/combobox.ts` (component, transform) — MODIFIED

**Analog:** itself + the data-grid sort memo (sibling idiom). **Current `_allOptions` re-spread** (lines 532-534, verbatim):
```typescript
private get _allOptions(): string[] {
  return [...this.options, ...this._slottedOptions];
}
```
`filterOptions` (pure, `option-filter.ts:14-18`) is called at **five sites**: ListboxNav `getOptions` (196), `_handleKeydown` (704), `_openOptionCount` (795 — see excerpt below), select-mode `_selectFilteredOptions` (893), `render()` (938). `_openOptionCount` (verbatim):
```typescript
private _openOptionCount(): number {
  return this.searchInTrigger
    ? this._selectFilteredOptions.length
    : filterOptions(this._allOptions, this.value, this.remote).length;
}
```
**Edit (two-level identity memo):**
- **Level 1** — cache `_allOptions` keyed on `(this.options identity, this._slottedOptions identity)`. Both reference-stable between mutations (`options` is `@property`; `_slottedOptions` is `@state` set only in `_handleOptionsSlotChange` at 536-542).
- **Level 2** — `_computeFilteredOptions()` (nameable, wrappable) keyed on `(allOptions identity, this.value, this.remote)`; route all five sites through a single `get _filteredOptions()`.
- **TWO cache entries:** the select-mode path (`_dropdownQuery`, site 893) is a distinct query — give it its own key entry / second small cache. Do NOT collapse it with the text-mode `value` key.

Keep `filterOptions` semantics byte-identical (do not edit `option-filter.ts`). Do NOT debounce (D-01). Leave `_renderOptionList` / `_ensureVirtualizer` (798-834, Phase-8 swap) intact.

**Count wiring:** `countMethod(AmCombobox, '_computeFilteredOptions')` → `counts.filterCalls`. Untuned: 5+ per keystroke; tuned: 1.

---

### `src/internal/controllers/floating-position.ts` (controller, request-response) — MODIFIED

**Analog:** itself. **Current `_updatePosition`** (lines 146-166, verbatim):
```typescript
private async _updatePosition(
  mod: typeof import('@floating-ui/dom'),
  reference: HTMLElement,
  floating: HTMLElement,
): Promise<void> {
  const strategy = resolve(this.opts.strategy);
  const mw = this.opts.middleware;
  const hostMiddleware = typeof mw === 'function' ? mw(mod) : (mw ?? []);
  const { x, y, placement, middlewareData } = await mod.computePosition(reference, floating, {
    placement: resolve(this.opts.placement) ?? 'bottom-start',
    ...(strategy ? { strategy } : {}),
    middleware: [
      mod.offset(resolve(this.opts.offset) ?? 4),
      mod.flip(),
      mod.shift({ padding: 8 }),
      ...hostMiddleware,
    ],
  });
  Object.assign(floating.style, { left: `${x}px`, top: `${y}px` });
  this.opts.onPositioned?.({ x, y, placement, middlewareData });
}
```
**Edit:** extract middleware-array assembly into a nameable `_buildMiddleware(mod)` and cache the static base slice (`[mod.offset(fixedN), mod.flip(), mod.shift({padding:8})]`) + hoist `resolve()` for hosts passing fixed values. **SAFE vs REQUIRED-TO-RE-RESOLVE** per RESEARCH Pattern 3 table:
- SAFE to cache: `mod.flip()`, `mod.shift({padding:8})` (no inputs); `mod.offset(n)` when offset is a fixed value; fixed `resolve(placement/offset/strategy)`.
- MUST re-resolve every tick: getter-backed options (popover/tooltip/dropdown live getters) — caching freezes stale placement (surface-observable).
- Rebuild only the host tail each tick; prepend cached base — preserves `[offset, flip, shift, ...host]` order → identical `computePosition` input.

**Keep byte-identical:** `computePosition` output, the `_startToken` close-during-load guard, autoUpdate open-gating (`start()`/`stop()`), `hostDisconnected → stop()` (142-144). Verify assumption A1 (middleware object reuse) empirically on the browser lane before merge.

**Count wiring:** `countMethod(FloatingPositionController, '_buildMiddleware')` → `counts.middlewareBuilds`. Note (F-2): `computePosition`/`repositions` counts will NOT drop (autoUpdate ticks unchanged) — `middlewareBuilds` is the count evidence; wall-clock is the primary win.

---

### `src/internal/helpers/lazy-load.ts` (utility, event-driven) — MODIFIED (CR-01 fold-in, D-05)

**Analog:** itself. **Current caches** (lines 38-40 and 59-61):
```typescript
export function loadFloating(): Promise<typeof import('@floating-ui/dom')> {
  return (floatingPromise ??= import('@floating-ui/dom'));
}
// ...
export function loadVirtualizer(): Promise<typeof import('@lit-labs/virtualizer/virtualize.js')> {
  return (virtualizerPromise ??= import('@lit-labs/virtualizer/virtualize.js'));
}
```
**Bug:** `??=` caches a *rejected* `import()` → a single transient chunk-load failure permanently bricks positioning/virtualization page-wide (the combobox `_ensureVirtualizer` retry at 798-809 re-awaits the same rejected promise, so it never recovers).
**Fix (RESEARCH:296-303) — null the slot on reject so the next call retries:**
```typescript
export function loadFloating() {
  return (floatingPromise ??= import('@floating-ui/dom').catch((err) => {
    floatingPromise = null;   // allow a genuine retry
    throw err;
  }));
}
// identical pattern for loadVirtualizer
```
Behavior-preserving; no new public API. `__resetLazyLoadCachesForTest()` (82-85) already exists for the cold-load spec. WR-02/WR-03 (siblings in `08-REVIEW.md`) are opportunistic-only — fix if cheap while in-file, else carry forward.

---

### `test/perf/harness.ts` (test, batch) — MODIFIED

**Analog:** `countComputePosition` (255-274) / `countLifecycle` (208-237). Add the generic `countMethod(Ctor, name)` (Shared Pattern above), mirroring the exact prototype-wrap + `restore()` discipline. No change to `THROTTLE_PROFILE` (105-109), `summarize` (313-333), or `assertStableCounts` (371-381).

---

### `api/perf.baseline.json` (config, batch) — REGENERATED

**Analog:** itself. Current keys per scenario are `update`/`updated`/`render`/`nodes` (+ `computePosition`/`repositions` for overlay). It does NOT contain `sortComputes`/`filterCalls`/`middlewareBuilds`, so it cannot show a delta for them. **Capture the "before" on UNTUNED code first** (add probes → run `npm run test:perf` → `node scripts/perf-diff.mjs --write api/perf.json api/perf.baseline.json`), commit that as the baseline, then tune and diff. Lifecycle + node counts must stay identical after tuning (proof the memo changed no render structure).

---

### `test/browser/{data-grid,combobox,popover}-a11y-snapshot.test.ts` (test, NEW)

**Analog:** `test/browser/a11y.browser.test.ts` (1-53) — reuse `fixture`/`waitForUpdate` (`../helpers`), the per-component import + `describe`/`it` shape, and `checkA11y` (`../a11y-helper`) for a complementary presence check.
**New facility (hybrid — F-3):**
1. `await expect.element(page.getByRole('grid'|'combobox'|...)).toMatchAriaSnapshot()` (role + accessible-name tree). `page` from `@vitest/browser/context`.
2. Explicit attribute snapshots via `shadowQuery` — data-grid: `aria-rowcount`/`aria-colcount`/`aria-sort`/`aria-rowindex` (data-grid.ts:561/583-593); combobox: `aria-setsize`/`aria-posinset`/`aria-selected` (770-782) + `aria-activedescendant` clamp (758-762); overlay: trigger/panel roles.
3. Focusability — assert `tabindex` on roving-focus nodes (data-grid.ts:562/594) and `deepActiveElement()` (`test/helpers.ts:127-135`) where relevant.

Represent "overlay" with `am-popover` (reuse the Phase-7 perf-scenario overlay for an apples-to-apples delta). All report-only. Prefer explicit attribute assertions as load-bearing (A3 — aria-tree snapshot advisory).

---

### `test/browser/lazy-load-retry.test.ts` (test, NEW)

**Analog:** `a11y.browser.test.ts` scaffold (fixture/import) + `__resetLazyLoadCachesForTest()` (lazy-load.ts:82-85). Spec: force a rejected first `import()` (or reset cache), assert a subsequent call retries and succeeds — proving CR-01 no longer permanently bricks. Runs on the browser cold-load lane.

## No Analog Found

None. Every source target is an in-place edit of an existing file; every new test spec mirrors `a11y.browser.test.ts` + the `countComputePosition` harness idiom. The only genuinely-new mechanism (the sort/filter/middleware count probe) is derived from `countComputePosition`, not invented.

## Key Patterns Identified

- **Nameable-compute-method + identity cache** is the universal RPERF-01/02 idiom: keep the getter as the read site, move the compute into a wrappable private method, guard on source identity mirroring Lit's own reference dirty-check.
- **The count metric must be built before it can improve** (F-1/F-2): `countMethod` probes on `_computeSortedRows`/`_computeFilteredOptions`/`_buildMiddleware` produce the deterministic `sortComputes`/`filterCalls`/`middlewareBuilds` keys; `computePosition`/`render`/`nodes` counts stay flat by design.
- **The controller edit re-resolves getter-backed options every tick, caches only fixed-input middleware** — freezing live getters is the one surface-observable trap.
- **Browser lane is the gate** for the shared controller (6-overlay blast radius) and all a11y proof; jsdom mocks positioning/observers.
- **CR-01 fix = a `.catch` slot-reset** in the same file the overlay work re-touches; exercised by the new cold-load retry spec.

## Metadata

**Analog search scope:** `src/components/{data-grid,combobox}/`, `src/internal/controllers/floating-position.ts`, `src/internal/helpers/lazy-load.ts`, `test/perf/`, `test/browser/`, `api/perf.baseline.json`, and `08-PATTERNS.md`.
**Files scanned:** 10 (plus 08-PATTERNS.md reused).
**Pattern extraction date:** 2026-08-23

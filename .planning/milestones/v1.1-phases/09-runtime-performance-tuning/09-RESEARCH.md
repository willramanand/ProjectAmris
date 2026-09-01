# Phase 9: Runtime-Performance Tuning - Research

**Researched:** 2026-08-23
**Domain:** Behavior- & surface-preserving runtime-perf tuning of three hot paths (data-grid sort, combobox filter, overlay reposition) in a frozen-API Lit 3 Web Components library, re-measured on a throttled low-end-cellular profile
**Confidence:** HIGH (every target file, the perf harness, the baseline JSON, and the a11y-snapshot facility were opened and verified this session; the one genuinely-new mechanism — a sort/filter compute-count probe — is derived from the existing `countComputePosition` idiom, not invented)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (combobox, RPERF-02):** **Memoize only — no debounce.** `filterOptions(this._allOptions, this.value, this.remote)` runs 3×+ per keystroke (render 938, ListboxNav `getOptions` 196, keydown 704, count getter 795, select-mode 893) and `_allOptions` (532) re-spreads `[...this.options, ...this._slottedOptions]` on every call. Compute the filtered list **once per render/keystroke and reuse it**, memoized by `(options-identity, slotted-identity, value, remote)`; thread the single result through render + nav paths. **Do NOT debounce** — debouncing shifts the observable `am-search` cadence (remote mode) and *when* the list visibly updates. Reversible (local caching inside combobox).
- **D-02 (data-grid, RPERF-01):** **Memoize the sort only.** `_sortedRows` (392) does `[...this.rows].sort(cmp * dir)` inside a getter called on **every** `render()`, so focus/selection/any state change re-clones + re-sorts. Cache the sorted array keyed on `(rows-identity, _sortKey, _sortDir)`; read sites at 446/538/618 reuse the cache. Deeper render-narrowing (skip full re-render on selection/focus) is **deferred** unless the baseline says sort isn't the dominant cost. Reversible (memo field inside data-grid).
- **D-03 (overlay, RPERF-03):** **Tune the ONE shared `FloatingPositionController`, validated on the browser lane.** `_updatePosition` (`floating-position.ts:146`) rebuilds the `[offset, flip, shift, ...hostMiddleware]` array and re-runs `resolve()` getters on **every** autoUpdate tick. Reducing churn fixes all 6 overlays at once. **Keep computePosition output identical; preserve autoUpdate open-gating + `_startToken` guard exactly.** Browser regression lane is the gate (blast radius = all 6 overlays). Reversibility: **costly.**
- **D-04 (a11y, RPERF-04):** **Accessible-name/role snapshots on the BROWSER lane, per tuned component.** Snapshot accessible name + computed role + focusability of key nodes (grid/row/cell/columnheader + `aria-sort`/`aria-rowindex`; combobox `role=combobox` + `aria-activedescendant` + option `aria-posinset`/`aria-setsize`; overlay trigger/panel roles) and assert byte-identical before/after. Run on `test/browser/**`, NOT jsdom. NEW report-only test machinery — no `getAccessibleName`/aria-snapshot harness exists yet. Reversible (test-only).
- **D-05 (fold CR-01):** **Fix `lazy-load.ts` rejected-promise cache.** `??=` caches a rejected `import()` → permanent brick. Fix = null the cache slot on rejection so the next call retries; behavior-preserving, no new public API. Consider siblings **WR-02** / **WR-03** as *opportunistic, not required*. Reversible (localized helper fix).

### Claude's Discretion

- **Exact churn-reduction mechanism inside the shared controller (D-03):** cache the static middleware slice and rebuild only the host tail; hoist `resolve()` calls whose sources are fixed values (combobox/select/date-picker pass fixed placement/offset) so only getter-backed hosts (popover/tooltip/dropdown) re-resolve; and/or coalesce repositions. Pick from the measured baseline; keep `computePosition` output identical.
- **Memoization shape (D-01/D-02):** module-level vs instance field; identity vs value-equality key — instance field keyed on identity is the likely fit.
- **Which single overlay represents "overlay"** for the a11y snapshot + perf re-measure — reuse the Phase-7 perf-scenario overlay (`am-popover`, `test/perf/overlay.perf.test.ts`).
- **Whether to re-capture the post-deferral perf baseline before/after, or diff against committed `api/perf.baseline.json`** — planner decides; requirement is a demonstrated count + wall-clock improvement, measured with the existing harness + tachometer.
- **Whether WR-02/WR-03 get fixed alongside CR-01 (D-05)** — opportunistic, not required.

### Deferred Ideas (OUT OF SCOPE)

- Deeper data-grid render-narrowing (skip full re-render on selection/focus) — deferred out of D-02 unless the baseline shows sort isn't the dominant cost.
- Debouncing combobox filter / `am-search` — rejected under D-01 (behavior-observable; needs a Changeset).
- WR-02 (no-`0,0` reveal gate) / WR-03 (fire-and-forget unhandled rejections) — opportunistic only.
- Flipping perf-count / size budgets to enforcing → **Phase 11** (GATE-01/02/03). All budgets stay report-only this phase.
- `manualChunks` shared-runtime dedupe → `PERF-V2-01` (future).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RPERF-01 | Data-grid re-render-on-sort narrowed behavior-preservingly; count + wall-clock improvement vs post-deferral baseline | §Pattern 1 (identity-keyed sort memo); §Finding F-1 (existing counts are insensitive to memoization — a new sort-compute count probe is required); §Validation Architecture |
| RPERF-02 | Combobox filter-per-keystroke work reduced behavior-preservingly; re-measured | §Pattern 2 (two-level identity memo: `_allOptions` + filtered); §Finding F-1 (filter-invocation count probe required); §Validation Architecture |
| RPERF-03 | Overlay reposition churn reduced behavior-preservingly; re-measured | §Pattern 3 (cache static middleware slice + hoist fixed `resolve()`); §Finding F-2 (existing `computePosition` count won't drop from per-tick churn reduction — needs a middleware-build count probe or wall-clock-only claim) |
| RPERF-04 | Accessible-name/role snapshots guard each tuned component (`aria-*`, roles, focusability) | §Pattern 4 + §Finding F-3 (`expect.element(locator).toMatchAriaSnapshot()` verified available in `@vitest/browser` 4.1.9; hybrid with explicit attribute + tabindex snapshots) |
</phase_requirements>

## Summary

Phase 9 is a small, surgical set of edits to files that already exist, all under the frozen-surface constraint. The three tuning targets are each a single hot function: `data-grid._sortedRows` (a getter that re-clones + re-sorts on every render), `combobox`'s five `filterOptions(...)` call sites (each re-spreading `_allOptions` and re-filtering), and `FloatingPositionController._updatePosition` (which rebuilds the middleware array and re-runs `resolve()` getters on every autoUpdate tick). All three fixes are **memoize/cache redundant work**, never change *when* things visibly happen. The CR-01 lazy-load rejected-promise fix is a five-line `.catch` reset in the exact file the overlay work re-touches.

**The single most important planning finding (F-1/F-2):** the committed perf harness counts only Lit lifecycle hooks (`update`/`updated`/`render`), `computePosition` invocations (autoUpdate ticks), reposition `style`-writes, and DOM node counts. **Memoizing the sort or the filter reduces work *inside* a render — it does not reduce any of those counts.** `render()` still runs, `computePosition` still fires on each tick, node counts are unchanged. Therefore, to satisfy each requirement's "**count** + wall-clock improvement" bar (the gate-safe half of the metric per PITFALLS.md #15), Phase 9 must add **new deterministic first-party count probes** that measure the specific redundant work each tuning removes — a sort-compute count (data-grid), a filter-invocation count (combobox), and (for RPERF-03) a middleware-rebuild/resolve count. These follow the exact `countComputePosition` prototype-wrap idiom already in `harness.ts`. Without them the "count improvement" claim has nothing to measure against.

**Primary recommendation:** Refactor each memoization so the actual compute path is a **nameable private method** (`data-grid._computeSortedRows()`, `combobox._computeFilteredOptions()`, `FloatingPositionController._buildMiddleware(mod)`), memoized by source-identity in an instance field. Then add `countLifecycle`-style probes wrapping those prototypes to produce deterministic before/after counts (e.g. data-grid sort computes 3→1 per render sequence; combobox filter 5+→1 per keystroke). Prove behavior identical via the browser lane + new `toMatchAriaSnapshot` guards; report wall-clock (median + mean+3σ band) as supporting evidence only. Re-capture the baseline *with the new count metrics on untuned code first* (the committed `api/perf.baseline.json` cannot show a delta for metrics it does not yet contain).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sort memoization (RPERF-01) | Component (`data-grid.ts`) | — | Sort is data-grid-specific state (`_sortKey`/`_sortDir`/`rows`); memo is a private instance field, off the CEM surface `[VERIFIED: src/components/data-grid/data-grid.ts:392-399]` |
| Filter memoization (RPERF-02) | Component (`combobox.ts`) | Internal pure module (`option-filter.ts`) | `filterOptions` stays a pure fn (semantics unchanged); the cache wraps it inside the component `[VERIFIED: src/internal/controllers/option-filter.ts:14-18]` |
| Reposition churn (RPERF-03) | Internal chokepoint controller (`floating-position.ts`) | 6 overlay components (hosts) | One shared controller fans out to all overlays; edit here, validate blast radius on browser lane `[VERIFIED: src/internal/controllers/floating-position.ts:146-166]` |
| A11y snapshot guard (RPERF-04) | Browser test lane (`test/browser/**`) | — | Real Chromium a11y tree required; jsdom mocks positioning/observers `[CITED: .planning/research/PITFALLS.md#pitfall-1]` |
| CR-01 retry-on-reject (D-05) | Internal helper (`lazy-load.ts`) | overlay + virtualizer callers | Localized `.catch` reset; exercised by browser cold-load specs `[VERIFIED: src/internal/helpers/lazy-load.ts:38-40,59-61]` |

## Standard Stack

**No new packages are installed this phase.** Every edit is internal source + test machinery reusing the already-installed toolchain. The relevant existing stack:

### Core (already present — versions verified via `package.json` this session)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `lit` | ^3.3.2 (peer) | Component base; reactive lifecycle the memo interacts with | Project foundation; memo must align with Lit's reference-identity dirty-check (Pitfall 13) `[VERIFIED: package.json peerDependencies]` |
| `@floating-ui/dom` | ^1.7.6 (external) | Positioning math the controller drives | The `_updatePosition` chokepoint wraps its `computePosition`/`autoUpdate`/`offset`/`flip`/`shift` `[VERIFIED: package.json dependencies]` |
| `@lit-labs/virtualizer` | 2.1.1 (external, exact pin) | Windowing above 100 rows/options; do NOT re-touch the swap | Leave intact; sort memo sits upstream of the virtualize/repeat swap `[VERIFIED: package.json dependencies]` |
| `vitest` + `@vitest/browser-playwright` | 4.1.9 | jsdom + browser + perf lanes | Perf lane (Chromium + CDP throttle) and the new a11y-snapshot lane both live here `[VERIFIED: package.json devDependencies]` |
| `tachometer` | ^0.7.2 | Local-only, ungated A/B wall-clock delta during tuning | Trustworthy before/after timing outside the noisy CI count lane `[VERIFIED: package.json devDependencies]` |
| `axe-core` | ^4.11.1 | Existing browser a11y scan (complements, does not replace, name/role snapshots) | axe checks *presence* of violations, not *identity* of names/roles — Pitfall 14 needs the snapshot `[VERIFIED: test/a11y-helper.ts:1-31]` |

**Installation:** none required.

## Package Legitimacy Audit

**No external packages are installed or upgraded in Phase 9.** All work is internal source edits (`data-grid.ts`, `combobox.ts`, `floating-position.ts`, `lazy-load.ts`), plus new test specs and a harness extension that import only already-vendored modules. The Package Legitimacy Gate is **not applicable** — there are no candidate package names to verify. The frozen `vite.config.ts` `external` array must NOT be touched (byte-snapshot-guarded by `test/no-bundled-lit.test.ts`) `[CITED: .planning/phases/08-bundle-size-deferral/08-PATTERNS.md:48-50]`.

## Architecture Patterns

### System Architecture — where the three tunings attach

```
                   render() / event handlers (every state change)
                              │
   ┌──────────────────────────┼───────────────────────────┐
   │ data-grid                │ combobox                    │ 6 overlays
   │  _sortedRows (getter)    │  filterOptions x5 sites     │  (popover/tooltip/dropdown/
   │  [...rows].sort() EVERY  │  _allOptions re-spread      │   combobox/select/date-picker)
   │   render  ── RPERF-01    │   EVERY call ── RPERF-02    │        │
   │        │                 │        │                    │        ▼
   │        ▼                 │        ▼                    │  FloatingPositionController
   │  MEMO: instance field    │  MEMO: 2-level identity     │  ._updatePosition (autoUpdate tick)
   │  keyed (rows,key,dir)    │  cache (_allOptions,        │   rebuilds [offset,flip,shift,
   │        │                 │   filtered)                 │   ...host] + resolve() EVERY tick
   │        ▼                 │        ▼                    │        │ ── RPERF-03
   │  _computeSortedRows()    │  _computeFilteredOptions()  │        ▼
   │  ← wrappable count probe │  ← wrappable count probe    │  cache static [offset,flip,shift]
   └──────────────────────────┴───────────────────────────┘   slice; hoist FIXED resolve();
                              │                                 keep getter hosts re-resolving
                              ▼                                        │
              perf harness (test/perf/*.perf.test.ts)                 ▼
              counts (gated) + wall-clock (report-only)     _buildMiddleware(mod)
                              │                              ← wrappable count probe
                              ▼
              api/perf.json → perf-diff.mjs → api/perf.baseline.json
                              │
                              ▼
              test/browser/** : toMatchAriaSnapshot + attr/tabindex snapshots (RPERF-04)
                              + lazy-load cold-load retry spec (D-05 / CR-01)
```

### Pattern 1: Identity-keyed sort memo (RPERF-01, D-02)

**What:** Replace the recompute-on-every-access getter with an instance-field cache validated by source identity.

**Current (verified this session):**
```typescript
// src/components/data-grid/data-grid.ts:392-399  [VERIFIED verbatim]
private get _sortedRows(): Record<string, unknown>[] {
  if (!this._sortKey || this._sortDir === 'none') return this.rows;
  const col = this.columns.find(c => c.key === this._sortKey);
  if (!col) return this.rows;
  const dir = this._sortDir === 'asc' ? 1 : -1;
  const cmp = this._comparatorFor(col);
  return [...this.rows].sort((a, b) => cmp(a, b) * dir);
}
```
Read sites: `_focusRowAt` reads `.length` `[VERIFIED: data-grid.ts:446]`, `_renderVirtual` `[VERIFIED: data-grid.ts:538]`, `_renderTable` `[VERIFIED: data-grid.ts:618]`. `_isVirtual = this.rows.length > VIRTUALIZE_ROW_THRESHOLD` where the threshold is `100` `[VERIFIED: data-grid.ts:131-132]` `[VERIFIED: src/internal/helpers/virtualize-support.ts:78]`.

**Recommended shape:**
```typescript
// instance fields
private _sortCache: { rows: unknown[]; key: string; dir: string; result: Record<string,unknown>[] } | null = null;

private get _sortedRows(): Record<string, unknown>[] {
  const c = this._sortCache;
  if (c && c.rows === this.rows && c.key === this._sortKey && c.dir === this._sortDir) return c.result;
  const result = this._computeSortedRows();          // <-- nameable, wrappable for the count probe
  this._sortCache = { rows: this.rows, key: this._sortKey, dir: this._sortDir, result };
  return result;
}
private _computeSortedRows(): Record<string, unknown>[] { /* the current getter body */ }
```
**Why identity, not value-equality:** Lit's `@property` dirty-check is itself reference-based — a caller who mutates `rows` in place without reassigning the array already does not trigger a Lit update, so an **identity** cache key exactly mirrors the component's existing change semantics and cannot introduce a stale-render class Lit itself wouldn't already have (avoids Pitfall 13) `[CITED: .planning/research/PITFALLS.md#pitfall-13]`. **Preserve the unsorted fast-path** (`return this.rows` when no sort) — it returns the *same reference* today; the cache must keep that behavior so downstream identity checks are unaffected.

**Behavior-preservation:** output is byte-identical (same comparator, same `localeCompare`/numeric rules `[VERIFIED: data-grid.ts:378-389]`). WHEN the list updates is unchanged — Lit still re-renders on every state change; the getter simply returns the cached array instead of re-sorting.

### Pattern 2: Two-level identity memo for combobox filter (RPERF-02, D-01)

**What:** Cache both the `_allOptions` spread and the filtered result; thread the single filtered list through render + nav.

**Current (verified this session):**
```typescript
// _allOptions re-spreads EVERY call  [VERIFIED: src/components/combobox/combobox.ts:532-534]
private get _allOptions(): string[] { return [...this.options, ...this._slottedOptions]; }
// filterOptions is a pure fn  [VERIFIED: src/internal/controllers/option-filter.ts:14-18]
export function filterOptions(options: string[], query: string, remote = false): string[] {
  if (remote) return options;
  const q = query.toLowerCase();
  return options.filter(o => o.toLowerCase().includes(q));
}
```
Five call sites all recompute independently: ListboxNav `getOptions` `[VERIFIED: combobox.ts:196]`, `_handleKeydown` `[VERIFIED: combobox.ts:704]`, `_openOptionCount` `[VERIFIED: combobox.ts:795]`, select-mode `_selectFilteredOptions` `[VERIFIED: combobox.ts:893]`, `render()` `[VERIFIED: combobox.ts:938]`.

**Recommended shape:**
- **Level 1** — cache `_allOptions` keyed on `(this.options identity, this._slottedOptions identity)`; both are reference-stable between mutations (`options` is `@property`, `_slottedOptions` is `@state` set in `_handleOptionsSlotChange` `[VERIFIED: combobox.ts:536-542]`).
- **Level 2** — `_computeFilteredOptions()` keyed on `(allOptions identity, this.value, this.remote)`. Route all five sites through a single `get _filteredOptions()` that reads the cache. The select-mode path (`_dropdownQuery`) is a distinct query and gets its own key entry (or a second small cache) — do **not** collapse it with the text-mode `value` key.

**Do NOT debounce (D-01):** the cache miss fires on the same keystroke that changes `value`, so the list updates on exactly the same turn as today — `am-search` cadence (remote) and visible-update timing are preserved. Pure dedupe only.

### Pattern 3: Static-middleware-slice cache + fixed-`resolve()` hoist (RPERF-03, D-03)

**What:** Stop rebuilding the base middleware array and re-running fixed-value getters on every autoUpdate tick, while keeping `computePosition` output byte-identical.

**Current (verified this session):**
```typescript
// src/internal/controllers/floating-position.ts:146-166  [VERIFIED verbatim]
private async _updatePosition(mod, reference, floating): Promise<void> {
  const strategy = resolve(this.opts.strategy);
  const mw = this.opts.middleware;
  const hostMiddleware = typeof mw === 'function' ? mw(mod) : (mw ?? []);
  const { x, y, placement, middlewareData } = await mod.computePosition(reference, floating, {
    placement: resolve(this.opts.placement) ?? 'bottom-start',
    ...(strategy ? { strategy } : {}),
    middleware: [ mod.offset(resolve(this.opts.offset) ?? 4), mod.flip(), mod.shift({ padding: 8 }), ...hostMiddleware ],
  });
  Object.assign(floating.style, { left: `${x}px`, top: `${y}px` });
  this.opts.onPositioned?.({ x, y, placement, middlewareData });
}
```

**Safe vs surface-observable (the core D-03 unknown):**

| Sub-mechanism | Safe? | Rationale |
|---------------|-------|-----------|
| Cache `mod.flip()` and `mod.shift({padding:8})` middleware objects (no host inputs) across ticks | **SAFE** | Zero inputs; floating-ui middleware are stateless config objects, reusable across `computePosition` calls — output identical `[CITED: floating-ui computePosition/middleware docs]` `[ASSUMED: object-reuse safety not re-verified against v1.7.6 source this session]` |
| Cache `mod.offset(n)` when `this.opts.offset` is a **fixed value** (combobox/select/date-picker pass fixed offset) | **SAFE** | Input constant → same middleware; rebuild only if the resolved offset changes |
| Hoist `resolve(this.opts.placement/offset/strategy)` for hosts that pass **fixed values** (detect `typeof !== 'function'` once at construction) | **SAFE** | Fixed options never change between ticks `[VERIFIED: floating-position.ts:19-21 resolve()]` |
| Re-`resolve()` **getter-backed** options every tick (popover/tooltip/dropdown pass live getters) | **REQUIRED — must NOT cache** | These reflect live reactive props; caching would freeze a stale placement/arrow → **surface-observable** `[VERIFIED: floating-position.ts:44-61 JSDoc "getters are resolved on every reposition"]` |
| Rebuild only the **host tail** (`hostMiddleware`) each tick, prepend the cached base slice | **SAFE** | Preserves array order `[offset, flip, shift, ...host]` exactly → identical computePosition input |
| **Coalesce/debounce repositions** (reduce autoUpdate callback frequency) | **RISKY — treat as deferred** | Changes *when* the panel moves — perceivable lag, same class of objection D-01 raised against debounce. Only pursue if the baseline proves per-tick allocation is not the dominant cost, and only with browser-lane proof. |

**Recommendation:** implement the cached-base-slice + fixed-`resolve()`-hoist (allocation/CPU win per tick, zero output change); leave coalescing out unless data demands it. **Invariants to preserve untouched:** the `_startToken` close-during-load guard `[VERIFIED: floating-position.ts:99,121-125,137]`, autoUpdate open-gating (`start()`/`stop()`), and `hostDisconnected → stop()` `[VERIFIED: floating-position.ts:118-144]`.

### Pattern 4: A11y name/role snapshot on the browser lane (RPERF-04, D-04)

**What:** New report-only specs in `test/browser/**` that snapshot the accessibility tree and the load-bearing ARIA attributes/focusability, asserting byte-identical before/after tuning.

**Verified facility:** `@vitest/browser` 4.1.9 ships `expect.element(locator).toMatchAriaSnapshot()`, documented with the example `await expect.element(page.getByRole('navigation')).toMatchAriaSnapshot()` `[VERIFIED: node_modules/@vitest/browser/jest-dom.d.ts:742,754 — read this session]`. The browser context exposes `page`, `cdp`, and `commands` `[VERIFIED: node_modules/@vitest/browser/context.d.ts — read this session]`.

**Caveat that shapes the design:** `toMatchAriaSnapshot()` captures the role + accessible-name tree, but does **not** by itself assert arbitrary ARIA attributes D-04 names (`aria-sort`, `aria-rowindex`, `aria-posinset`, `aria-setsize`, `aria-activedescendant`) or focusability (`tabindex`). Use a **hybrid**:
1. `toMatchAriaSnapshot()` for the role + accessible-name tree of each tuned component (data-grid, combobox, `am-popover`).
2. Explicit attribute snapshots — read the specific ARIA attrs via `shadowQuery` and assert their exact values (data-grid: `aria-rowcount`/`aria-colcount`/`aria-sort`/`aria-rowindex` `[VERIFIED: data-grid.ts:583-593,561]`; combobox option `aria-setsize`/`aria-posinset`/`aria-selected` `[VERIFIED: combobox.ts:770-782]` and `aria-activedescendant` clamp `[VERIFIED: combobox.ts:758-762]`).
3. Focusability — assert `tabindex` on the roving-focus nodes (`[VERIFIED: data-grid.ts:562,594]`) and, where relevant, `deepActiveElement()` `[VERIFIED: test/helpers.ts:127-135]`.

Slot next to `a11y.browser.test.ts` (same `checkA11y` axe scan available for a complementary presence check) `[VERIFIED: test/browser/a11y.browser.test.ts:1-53]`. All report-only — no gating flip (Phase 11).

### Anti-Patterns to Avoid
- **A second layer of Lit change-detection** (`shouldUpdate`/`hasChanged`/`guard` with a hand-written dep array) — D-02/D-01 are pure result caches keyed on identity, NOT render-skipping. A wrong dep set is the classic stale-render bug (Pitfall 13). Do not add `shouldUpdate` overrides.
- **Caching getter-backed `resolve()` results** in the controller — freezes live popover/tooltip placement (surface-observable).
- **Coalescing/debouncing repositions or the filter** — changes observable timing (D-01/D-03 explicitly forbid).
- **Touching the `virtualize()`↔`repeat()` swap or the `external` array** — out of scope; leave the Phase-8 machinery intact.
- **Claiming a wall-clock win inside the noise band** — gate/claim on deterministic counts; wall-clock is report-only with a mean+3σ band (Pitfall 15).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Count "how much work did the memo remove" | An ad-hoc `console.count` or timer | Extend `harness.ts` with a `countLifecycle`-style prototype-wrap probe on the new `_computeSortedRows`/`_computeFilteredOptions`/`_buildMiddleware` methods | The idiom already exists (`countComputePosition` wraps `_updatePosition`) and yields deterministic, gate-safe counts `[VERIFIED: test/perf/harness.ts:246-274]` |
| Accessible name/role capture | Manual `getComputedAccessibleNode` / CDP `Accessibility.getFullAXTree` plumbing | `expect.element(locator).toMatchAriaSnapshot()` | First-party in `@vitest/browser` 4.1.9; CDP AX-tree needs `allowExec` (only the perf lane grants it, not the browser lane) `[VERIFIED: vitest.config.ts:89-104 vs 58-72]` |
| Before/after wall-clock delta during tuning | New benchmark script | Existing `tachometer/{data-grid,combobox,overlay}.json` (local, ungated) | Purpose-built, already targets these three components `[CITED: 09-CONTEXT.md canonical_refs]` |
| Baseline diff / drift report | New comparator | `scripts/perf-diff.mjs` (report-only; `--write` to regenerate) | Already keyed by `scenario:metric`, counts-gated / wall-clock report-only `[VERIFIED: scripts/perf-diff.mjs:54-126]` |
| Filter semantics | Re-implement filtering in the component | Keep `filterOptions` pure and unchanged; wrap it in a cache | Behavior-preserving requires byte-identical filter output `[VERIFIED: option-filter.ts:14-18]` |

**Key insight:** the entire "new machinery" for this phase is one harness probe function plus new test specs — everything else is caching existing computations.

## Runtime State Inventory

Phase 9 is a code-only optimization: no rename/refactor of stored keys, no migration, no OS-registered state. Explicitly:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no datastore keys, collection names, or IDs change | None |
| Live service config | None — no external service configuration touched | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | The committed `api/perf.baseline.json` is a *measurement* artifact, not a build output. It must be **regenerated** once the new count metrics are added (see §Perf Re-measurement) — it does not currently contain `sortComputes`/`filterCalls` keys `[VERIFIED: api/perf.baseline.json — only update/updated/render/nodes(+computePosition/repositions for overlay)]` | Regenerate via `perf-diff.mjs --write` after the untuned-code capture |

## Common Pitfalls

### Pitfall 1: The count metric that "improves" doesn't exist yet (F-1)
**What goes wrong:** A plan asserts "RPERF-01 count improvement" but the harness only counts `update`/`updated`/`render`/`nodes`. Memoizing the sort leaves all four unchanged — the getter still runs inside the same render calls. The requirement's count half is unmeasurable and the plan silently degrades to a wall-clock-only claim (which is report-only and noisy).
**Why it happens:** The existing baseline (`data-grid` = update/updated/render 3, nodes 250 `[VERIFIED: api/perf.baseline.json:34-49]`) looks like "the counts" but none of them reflect sort work.
**How to avoid:** Add a `sortComputes` (data-grid) and `filterCalls` (combobox) count probe wrapping the new nameable compute methods, capture them on **untuned** code, then show the drop after tuning.
**Warning signs:** A task says "re-measure" but references no new metric key; `perf-diff.mjs` shows "No count drift" after tuning (which would mean nothing measurable changed).

### Pitfall 2: Overlay `computePosition` count won't drop from per-tick churn reduction (F-2)
**What goes wrong:** Overlay baseline has `computePosition: 4, repositions: 2` `[VERIFIED: api/perf.baseline.json:50-58]`. Caching the middleware slice / hoisting `resolve()` reduces work *per* `_updatePosition` call — it does **not** reduce the *number* of calls (autoUpdate still ticks the same). So `computePosition` stays 4.
**How to avoid:** For RPERF-03, either (a) add a `middlewareBuilds`/`resolveCalls` count probe that drops from once-per-tick to once-per-config-change, or (b) accept that RPERF-03's *count* evidence is the new build-count metric and its *wall-clock* is the primary win — and say so explicitly. Do **not** try to force `computePosition` down by coalescing (surface-observable, D-03).
**Warning signs:** A plan expects `computePosition` to fall after middleware caching.

### Pitfall 3: Measuring in jsdom / unthrottled (Pitfall 1 from PITFALLS.md)
**What goes wrong:** Runtime numbers taken in the jsdom lane are meaningless (mocked layout/observers). **How to avoid:** all perf + a11y-positioning work runs in the Chromium `perf`/`browser` projects under the pinned `low-end-cellular` profile: `{ name: 'low-end-cellular', cpuRate: 6, network: 'Slow-3G' }` `[VERIFIED: test/perf/harness.ts:105-109]`. `[CITED: .planning/research/PITFALLS.md#pitfall-1]`

### Pitfall 4: CR-01 retry claims that can't fire (D-05)
**What goes wrong:** `combobox._ensureVirtualizer` resets its guard in `.catch()` "so a later render can retry" `[VERIFIED: combobox.ts:798-809]`, but the retry re-awaits the *same* cached rejected promise from `lazy-load.ts`, so it never recovers. **How to avoid:** apply the null-on-reject fix to BOTH loaders `[VERIFIED: lazy-load.ts:38-40,59-61]`; then the existing retry guards work as documented. Exercise via `__resetLazyLoadCachesForTest()` `[VERIFIED: lazy-load.ts:82-85]` in a browser cold-load spec.

### Pitfall 5: Stripping a11y DOM while trimming (Pitfall 14 from PITFALLS.md)
**What goes wrong:** A memo refactor that also "tidies" render output can drop an `aria-*` or reorder focusables — passes axe, breaks AT. **How to avoid:** the D-04 hybrid snapshot is the guard; run it before/after each tuned component. `[CITED: .planning/research/PITFALLS.md#pitfall-14]`

## Code Examples

### New harness count probe (mirrors `countComputePosition`)
```typescript
// test/perf/harness.ts — analogous to countComputePosition (harness.ts:255-274) [VERIFIED idiom]
export function countMethod(Ctor: { prototype: object }, name: string) {
  let n = 0;
  const proto = Ctor.prototype as Record<string, unknown>;
  const orig = proto[name] as (...a: unknown[]) => unknown;
  proto[name] = function (this: unknown, ...a: unknown[]) { n++; return orig.apply(this, a); };
  return { get count() { return n; }, reset() { n = 0; }, restore() { proto[name] = orig; } };
}
// usage in data-grid.perf.test.ts:
// const sort = countMethod(AmDataGrid, '_computeSortedRows');
// ... run scenario ... counts.sortComputes = sort.count;  // untuned: >1 per render seq; tuned: 1
```

### CR-01 fix (D-05)
```typescript
// src/internal/helpers/lazy-load.ts — null the slot on reject so the next call retries [VERIFIED target]
export function loadFloating() {
  return (floatingPromise ??= import('@floating-ui/dom').catch((err) => {
    floatingPromise = null;   // allow a genuine retry
    throw err;
  }));
}
// identical pattern for loadVirtualizer (lazy-load.ts:59-61)
```

### A11y snapshot spec (D-04)
```typescript
// test/browser/data-grid-a11y-snapshot.test.ts (NEW, report-only)
import { expect } from 'vitest';
import { page } from '@vitest/browser/context';   // [VERIFIED: context.d.ts exposes page]
// mount am-data-grid, then:
// await expect.element(page.getByRole('grid')).toMatchAriaSnapshot();  // role+name tree
// plus explicit attr assertions: aria-sort / aria-rowindex / tabindex read via shadowQuery
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Playwright `page.accessibility.snapshot()` (deprecated) | `toMatchAriaSnapshot()` / `locator.ariaSnapshot()` (YAML aria tree) | Playwright 1.4x+ / Vitest browser 4.x | Use the Vitest matcher, not the deprecated API `[VERIFIED: @vitest/browser jest-dom.d.ts:754]` |
| Recompute derived lists in getters each render (Lit-idiomatic for cheap data) | Identity-keyed instance-field memo for expensive derivations only | This phase | Only the profiled hot paths get memoized (Pitfall 13 — don't over-memoize) |

**Deprecated/outdated:** `page.accessibility.snapshot()` — superseded by aria snapshots.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | floating-ui middleware objects (`flip()`, `shift()`, `offset(n)`) are safely reusable across `computePosition` calls (enables caching the base slice) | Pattern 3 | If a middleware carries per-call mutable state, cached reuse could diverge output — **verify on the browser lane** (geometry) + assert `computePosition` output identical before merging. Fallback: cache only `flip()`/`shift()` (provably input-less) and keep rebuilding `offset()`. |
| A2 | The committed `api/perf.baseline.json` reflects the post-deferral (Phase-8) state and is the intended comparison point | Perf Re-measurement | If it predates Phase 8, the "improvement vs post-deferral baseline" claim is against the wrong baseline — re-capture is the safe path regardless (recommended). |
| A3 | `toMatchAriaSnapshot()` output is stable enough across runs to diff byte-identically for a fixed DOM | Pattern 4 | If Chromium AX-name computation varies, use explicit attribute snapshots as the load-bearing assertion and treat the aria-tree snapshot as advisory. |

**These three assumptions gate design choices, not package installs — resolve A1 empirically on the browser lane during the overlay task; A2 by re-capturing; A3 by preferring explicit attribute assertions where exactness matters.**

## Open Questions

1. **Does RPERF-03 need its own new count metric, or is wall-clock its primary evidence?**
   - What we know: middleware caching reduces per-tick work, not `computePosition` count (F-2).
   - What's unclear: whether the planner wants a `middlewareBuilds`/`resolveCalls` count added (parity with RPERF-01/02) or accepts wall-clock + a browser-lane "output identical" proof.
   - Recommendation: add the build-count probe for symmetry and gate-safety; it's cheap and follows the same idiom.

2. **Combobox select-mode (`searchInTrigger`) vs text-mode — one cache or two?**
   - What we know: text-mode filters on `this.value`; select-mode on `this._dropdownQuery` `[VERIFIED: combobox.ts:890-894]`.
   - Recommendation: two key entries (or a tiny 2-slot cache) — do not collapse; they are distinct queries active in different modes.

3. **Should the baseline be re-captured, or diffed against the committed file?**
   - Recommendation: **re-capture** on untuned code first (the committed baseline lacks the new count keys), commit that as the "before", then diff after tuning. Use tachometer for the local wall-clock A/B.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Chromium + Playwright | perf lane + browser a11y lane (CDP throttle, aria snapshot) | ✓ | playwright ^1.62.1 / @vitest/browser-playwright 4.1.9 | — (no jsdom substitute for positioning/a11y) |
| `cdp()` write+exec grant | throttle in perf lane | ✓ | scoped to `perf` project only `[VERIFIED: vitest.config.ts:101]` | — |
| tachometer | local ungated A/B wall-clock | ✓ | ^0.7.2 | perf harness wall-clock (noisier) |
| `toMatchAriaSnapshot` | RPERF-04 name/role snapshots | ✓ | @vitest/browser 4.1.9 | explicit attribute + `deepActiveElement` snapshots |
| Node runtime | perf/browser lanes | ✓ | CI Node 20 | Note: `size-limit@13` needs Node ≥22.18 and runs on a separate pinned job — irrelevant to Phase 9 (no size work) but do not run the perf lane under a mismatched Node `[CITED: .planning/research/PITFALLS.md#integration-gotchas]` |

**No missing dependencies.** All tuning + measurement + a11y machinery uses the already-installed stack.

## Perf Re-measurement Methodology (question 4, detailed)

1. **Add the new deterministic count probes** to `harness.ts` (`countMethod` above) and wire them into each scenario spec: `sortComputes` (data-grid), `filterCalls` (combobox), and — recommended — `middlewareBuilds` (overlay). These are engine-independent and asserted stable across 5 repeats via `assertStableCounts` `[VERIFIED: harness.ts:371-381]`.
2. **Capture the "before" on untuned code:** run `npm run test:perf`, then `node scripts/perf-diff.mjs --write api/perf.json api/perf.baseline.json` to mint a baseline that *contains the new keys* `[VERIFIED: scripts/perf-diff.mjs:184-203]`. (The current committed baseline cannot show a delta for a key it lacks.)
3. **Tune**, re-run `npm run test:perf`, then `npm run perf:diff` (report-only diff of committed baseline vs fresh `api/perf.json`) `[VERIFIED: package.json scripts perf:diff]`. Expect the new counts to drop (e.g. combobox `filterCalls` 5+→1/keystroke; data-grid `sortComputes` N→1/render-seq); Lit lifecycle counts and node counts should stay **identical** (proof the memo changed no observable render structure).
4. **Wall-clock is report-only** with the mean+3σ band `[VERIFIED: harness.ts:313-333]`. Do not claim a wall-clock win smaller than the band. Use `tachometer/{data-grid,combobox,overlay}.json` locally for a tighter, ungated A/B if the harness band is too wide to read the delta (Pitfall 15).
5. **Everything stays report-only** — `perf-diff.mjs` exits 0 even on count drift this phase `[VERIFIED: scripts/perf-diff.mjs:223]`. The enforcing flip is Phase 11 (GATE-02).

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation` not disabled). Observable, measurable validation points per requirement:

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (`jsdom` + `browser` + `perf` projects) `[VERIFIED: vitest.config.ts:41-107]` |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test:browser` (regression gate for overlay/a11y) `[VERIFIED: package.json]` |
| Perf command | `npm run test:perf` then `npm run perf:diff` `[VERIFIED: package.json]` |
| Full suite command | `npm run test:run` (all projects) `[VERIFIED: package.json]` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RPERF-01 | Sort recompute count drops; render/node counts + sorted output unchanged | perf (Chromium, throttled) | `vitest run --project perf test/perf/data-grid.perf.test.ts` | ✅ (extend with `sortComputes` probe) |
| RPERF-01 | Sorted-row order byte-identical after memo | unit/browser | existing data-grid sort specs | ✅ `[VERIFIED: data-grid.perf.test.ts + component specs]` |
| RPERF-02 | Filter invocation count drops to 1/keystroke; filtered list + `am-search` cadence unchanged | perf | `vitest run --project perf test/perf/combobox.perf.test.ts` | ✅ (extend with `filterCalls` probe) |
| RPERF-03 | Middleware-build/resolve count drops per tick; `computePosition` output identical; `computePosition`/`repositions` counts unchanged; open-gating + `_startToken` intact | browser + perf | `npm run test:browser` + `vitest run --project perf test/perf/overlay.perf.test.ts` | ✅ (extend with build-count probe) |
| RPERF-03 | Real geometry unchanged (no `0,0`, anchored to trigger) | browser | `vitest run --project browser test/browser/floating-position.test.ts` | ✅ `[VERIFIED: test/browser/floating-position.test.ts]` |
| RPERF-04 | Accessible name/role tree + `aria-*` + tabindex byte-identical before/after, per tuned component | browser (report-only) | `npm run test:browser` (new `*-a11y-snapshot.test.ts` specs) | ❌ Wave 0 — NEW machinery (D-04) |
| D-05/CR-01 | A rejected `import()` no longer bricks; next call retries | browser cold-load | `npm run test:browser` (uses `__resetLazyLoadCachesForTest`) | ❌ Wave 0 — new retry spec |

### Sampling Rate
- **Per task commit:** `npm run test:browser` for any overlay/lazy-load/a11y change (blast-radius gate, D-03); `vitest run --project perf test/perf/<target>.perf.test.ts` for the tuned component.
- **Per wave merge:** full `npm run test:perf` + `npm run perf:diff` + `npm run test:browser`.
- **Phase gate:** full suite green + a11y snapshots unchanged + count deltas demonstrated (report-only) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `test/perf/harness.ts` — add `countMethod` probe + wire `sortComputes`/`filterCalls`/`middlewareBuilds` into the three scenario specs.
- [ ] `api/perf.baseline.json` — regenerate on untuned code so it contains the new count keys (`--write`).
- [ ] `test/browser/data-grid-a11y-snapshot.test.ts`, `combobox-a11y-snapshot.test.ts`, `popover-a11y-snapshot.test.ts` — new hybrid name/role + attr + tabindex snapshots (D-04).
- [ ] `test/browser/lazy-load-retry.test.ts` — cold-load rejection → retry succeeds (D-05/CR-01) via `__resetLazyLoadCachesForTest()`.
- [ ] Nameable compute methods to enable the probes: `data-grid._computeSortedRows()`, `combobox._computeFilteredOptions()`, `FloatingPositionController._buildMiddleware(mod)`.

## Security Domain

`security_enforcement` is not disabled, but Phase 9 introduces **no new attack surface** — it caches existing computations and adds test-only machinery. Relevant standing controls (all preserved, none newly required):

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation / Output Encoding | yes (standing) | Lit-safe templating only — no `innerHTML`/`eval`; the memo/cache work touches no template-injection path `[VERIFIED: CLAUDE.md constraints]` |
| V6 Cryptography | no | — |
| Supply chain (dynamic import) | yes (standing) | `lazy-load.ts` import specifiers stay **static bare package specifiers** — the CR-01 fix adds only a `.catch` reset, never a computed/origin-qualified path `[VERIFIED: lazy-load.ts:22-29 JSDoc + :38-40]` |

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Injection via cached derived data | Tampering | Cache holds already-sanitized strings; Lit escapes on render — no change |
| Malicious dynamic-import target | Tampering/Elevation | Bare specifier resolved by consumer bundler; never build a computed module path (unchanged) |

## Sources

### Primary (HIGH confidence — read this session)
- `src/components/data-grid/data-grid.ts` (`_sortedRows` 392-399, read sites 446/538/618, `_isVirtual` 131-132, ARIA attrs 561/583-594) — the RPERF-01 target
- `src/components/combobox/combobox.ts` (`_allOptions` 532-534, `filterOptions` sites 196/704/795/893/938, `_renderOption` 770-782, `_activeDescendant` 758-762, `_ensureVirtualizer` 798-809) — RPERF-02 target
- `src/internal/controllers/floating-position.ts` (`_updatePosition` 146-166, `resolve` 19-21, `_startToken` guard 99/121-125/137, options JSDoc 44-61) — RPERF-03 target
- `src/internal/controllers/option-filter.ts` (14-18) — pure `filterOptions` semantics to preserve
- `src/internal/helpers/lazy-load.ts` (38-40/59-61/82-85) — CR-01 fix target + test reset
- `src/internal/helpers/virtualize-support.ts` (78 — `VIRTUALIZE_ROW_THRESHOLD = 100`)
- `test/perf/harness.ts` (throttle profile 105-109, `countLifecycle` 208-237, `countComputePosition` 246-274, `summarize` 313-333, `assertStableCounts` 371-381)
- `test/perf/{data-grid,combobox,overlay}.perf.test.ts`, `api/perf.baseline.json`, `scripts/perf-diff.mjs`
- `test/browser/{a11y.browser,floating-position}.test.ts`, `test/helpers.ts`, `test/a11y-helper.ts`, `vitest.config.ts`, `package.json`
- `node_modules/@vitest/browser/jest-dom.d.ts:742,754` (`toMatchAriaSnapshot`) + `context.d.ts` (`page`/`cdp`/`commands`)

### Secondary (HIGH — canonical research/prior-phase docs)
- `.planning/research/PITFALLS.md` (#1 jsdom measurement, #13 over-memoization, #14 a11y stripping, #15 flaky gates, integration gotchas)
- `.planning/research/ARCHITECTURE.md` (`src/internal/` chokepoint boundary; freeze gates)
- `.planning/phases/08-bundle-size-deferral/08-PATTERNS.md` (per-file map; frozen `external` array)
- `.planning/phases/08-bundle-size-deferral/08-REVIEW.md` (CR-01/WR-02/WR-03 verbatim)

### Tertiary (MEDIUM/LOW — training knowledge, flagged in Assumptions Log)
- floating-ui middleware-object reuse safety (A1) — CITED from floating-ui docs concept, not re-verified against v1.7.6 source this session

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all versions verified in `package.json`.
- Architecture / tuning mechanisms: HIGH — every target function read verbatim this session; the safe-vs-observable table for D-03 is grounded in the controller's own JSDoc contract.
- Measurement gap (F-1/F-2): HIGH — baseline JSON + harness read directly; the "no existing count metric captures memoization" finding is verified, not inferred.
- A11y facility (F-3): HIGH — `toMatchAriaSnapshot` verified present in the installed `@vitest/browser` type defs.
- Middleware-reuse safety (A1): MEDIUM — resolve empirically on the browser lane during the overlay task.

**Research date:** 2026-08-23
**Valid until:** ~2026-09-22 (stable internal-code domain; re-verify only if `@vitest/browser` or `@floating-ui/dom` is upgraded)
</content>
</invoke>

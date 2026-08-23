---
phase: 08-bundle-size-deferral
reviewed: 2026-08-22T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/internal/helpers/lazy-load.ts
  - src/internal/controllers/floating-position.ts
  - src/internal/helpers/virtualize-support.ts
  - src/components/popover/popover.ts
  - src/components/tooltip/tooltip.ts
  - src/components/color-picker/color-picker.ts
  - src/components/rich-select/rich-select.ts
  - src/components/dropdown/dropdown.ts
  - src/components/combobox/combobox.ts
  - src/components/select/select.ts
  - src/components/data-grid/data-grid.ts
  - scripts/deep-import-purity.mjs
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-08-22
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

This phase converts overlay/virtualizer components from static imports of
`@floating-ui/dom` and `@lit-labs/virtualizer` to memoized dynamic-`import()`
loaders, with `repeat()`-fallback render paths that swap to `virtualize()` once
the chunk resolves.

**What holds up under scrutiny (verified, not assumed):**

- **Static-import deferral is airtight.** Every `@floating-ui/dom` /
  `@lit-labs/virtualizer` reference in the reviewed source is either an
  `import type { … }` statement or a `typeof import('…')` type position
  (`floating-position.ts:2-7,61,147`, `data-grid.ts:41`, `combobox.ts:117`,
  `select.ts:303-305`, `lazy-load.ts:31,51`). Under `verbatimModuleSyntax` those
  erase completely — no bare runtime specifier leaks into the static graph. The
  migrated overlays (`combobox`, `select`, `rich-select`, `color-picker`) carry
  no floating-ui import at all and route through the controller/loader.
- **The `repeat()`→`virtualize()` ARIA swap is index-consistent.** In
  `data-grid` both paths compute `aria-rowindex` via `ariaRowindex(absIndex)`
  (`data-grid.ts:561,611`); `repeat()`'s index and the virtualizer's absolute
  index (documented A1) coincide, header row stays `aria-rowindex="1"`, and
  `aria-rowcount` reflects the full total. `combobox`/`select` share a single
  `_renderOption`/`_renderVirtualOption` with `aria-posinset`/`aria-setsize`
  driven from state, identical across the swap.
- **Generation/teardown guards are correct.** `FloatingPositionController`'s
  monotonic `_startToken` (`floating-position.ts:99,121-125,137`) properly
  abandons a close-during-load / disconnect-during-load run; `data-grid`'s
  double-rAF warm is cancelled on disconnect and `isConnected`-guarded on
  resolve (`data-grid.ts:149-173`). No `requestIdleCallback` used (Safari 16.4
  floor respected).
- **`deep-import-purity.mjs`** classify logic is correct (dynamic subset
  subtracted occurrence-by-occurrence from the shared parser union; report-only
  exit 0 by design, D-08).

The defects below live in the **async-failure and reveal-timing seams** the
deferral newly introduces.

## Critical Issues

### CR-01: Memoized loaders cache rejected promises — one transient `import()` failure permanently bricks positioning for the whole page session

**File:** `src/internal/helpers/lazy-load.ts:38-40, 59-61`
**Issue:**
```ts
export function loadFloating() {
  return (floatingPromise ??= import('@floating-ui/dom'));
}
```
`??=` only assigns when the cache is `null`/`undefined`. If the `import()`
**rejects** (chunk 404 after a redeploy while an old tab is open, offline blip,
parse error), `floatingPromise` is left holding a *rejected* promise — not
`null`. Every subsequent `loadFloating()` call returns that same rejected
promise forever. Same defect in `loadVirtualizer` (`:59-61`).

Impact is not hypothetical and has **no recovery short of a full reload**:

- **Floating-ui has no fallback.** Once poisoned, every overlay on the page
  (`tooltip`, `popover`, `dropdown`, `combobox`, `select`, `rich-select`,
  `color-picker`) permanently fails its first `computePosition`. Panels that
  reveal on open (`.listbox.open`, `:host([open]) .panel`) then show at an
  unpositioned location indefinitely; panels gated on `onPositioned`
  (`popover`, `rich-select`) never reveal at all.
- **Prefetch-on-intent widens the blast radius.** A `pointerenter` during a
  momentary network blip caches the rejection *before* the user ever clicks,
  so the later real open can never succeed.
- **The code's own retry claims are false.** `combobox._ensureVirtualizer()`
  (`combobox.ts:806-809`) resets `_virtualizerRequested` in its `.catch()`
  "so a later render can retry", and `select` leaves `_virtualizerLoading`
  latched. Neither can recover: the retry re-`await`s the *same* cached rejected
  promise from `lazy-load.ts`. The comment describes behavior the implementation
  cannot deliver.

This is a genuine robustness regression: before this phase floating-ui was
statically linked and could not fail to load.

**Fix:** Clear the cache slot on rejection so a later call re-attempts the
import:
```ts
export function loadFloating() {
  return (floatingPromise ??= import('@floating-ui/dom').catch((err) => {
    floatingPromise = null; // allow a genuine retry on the next call
    throw err;
  }));
}
```
Apply the identical pattern to `loadVirtualizer`. Then the `combobox`/`select`
retry guards actually work as their comments claim.

## Warnings

### WR-01: `am-dropdown` has no prefetch-on-intent wiring — first open always pays the full cold dynamic-import latency

**File:** `src/components/dropdown/dropdown.ts:1-6, 133-142`
**Issue:** Every other migrated overlay warms the floating-ui chunk on trigger
intent — `popover`/`tooltip`/`combobox`/`color-picker`/`rich-select` bind
`@pointerenter`/`@focusin` to `prefetchFloating`, and `select` binds
`@pointerenter`. `dropdown` imports only `FloatingPositionController` (no
`prefetchFloating` import) and its `.trigger` wires only `@click`. Its first
open therefore always awaits a cold `import('@floating-ui/dom')` before
positioning — precisely the gap the phase's prefetch-on-intent design
(D-01/D-03) exists to hide. Combined with WR-02 the dropdown panel is the
worst-case reveal-before-position on the page.
**Fix:** Import `prefetchFloating` and add a prefetch handler on the trigger,
matching the sibling overlays:
```ts
import { FloatingPositionController } from '.../floating-position.js';
import { prefetchFloating } from '.../lazy-load.js';
// …
private _handlePrefetch = () => { prefetchFloating(); };
// render(): <div class="trigger" @click=${…}
//   @pointerenter=${this._handlePrefetch} @focusin=${this._handlePrefetch}>
```

### WR-02: Hidden-until-positioned (no-0,0) gate applied inconsistently — tooltip/dropdown/combobox/select/color-picker can paint an unpositioned frame across the loader await

**File:** `src/components/tooltip/tooltip.ts:108-110, 141-145`;
`src/components/dropdown/dropdown.ts:65-81, 119-131`;
`src/components/combobox/combobox.ts:448-451, 570-582`;
`src/components/select/select.ts:514-518, 609-620`;
`src/components/color-picker/color-picker.ts:161, 553-562`
**Issue:** `popover` (`_positioned`, `popover.ts:57,125,241`) and `rich-select`
(`_positioned`, `rich-select.ts:78,236,579`) gate their reveal on the first
`computePosition` writing `left/top`, so the deferred-loader `await` seam can
never flash the panel at its pre-positioned location (D-02). The other overlays
reveal purely on the open/visible state and do **not** gate on positioning:

- Clearest case — **tooltip**: `_handleEnter` sets the `visible` attribute
  (which flips `.tooltip` to `opacity:1` via `:host([visible])`) *synchronously*,
  then calls `_floatingController.start()`, which `await`s the dynamic import
  before any `computePosition`. On a cold first hover the tooltip is fully
  opaque at its static/stale `position:fixed` location for the entire fetch,
  then jumps to the anchored placement. `popover`/`rich-select` guard exactly
  this seam; `tooltip` (which also renders an arrow and uses `placement:'top'`)
  does not.
- `dropdown`/`combobox`/`select`/`color-picker` reveal their panel
  (`.panel`/`.listbox`/`.panel.open`) on open before `left/top` is written.

Pre-phase this seam was a single microtask (module already linked); the new
dynamic import stretches it to many frames on a cold chunk, making the flash
user-visible.
**Fix:** Extend the popover/rich-select `_positioned` pattern to the remaining
overlays: add a `@state() _positioned=false`, set it in an `onPositioned`
callback (or after `_updatePosition` writes `left/top` for color-picker), gate
the reveal selector on it, and reset it on close. At minimum apply it to
`tooltip`, whose flash is the most pronounced.

### WR-03: Fire-and-forget `start()` / `_updatePosition()` produce unhandled promise rejections on loader failure

**File:** `src/components/popover/popover.ts:216`;
`src/components/dropdown/dropdown.ts:123`;
`src/components/combobox/combobox.ts:573`;
`src/components/select/select.ts:612`;
`src/components/rich-select/rich-select.ts:347`;
`src/components/tooltip/tooltip.ts:144`;
`src/components/color-picker/color-picker.ts:322`
**Issue:** `FloatingPositionController.start()` is `async` and `await`s
`loadFloating()` (`floating-position.ts:118-122`); every host calls it
fire-and-forget from `updated()`/timers with no `.catch`. `color-picker` calls
`this._updatePosition()` (also `async`, awaits `loadFloating()`) the same way
(`color-picker.ts:322`). If the import rejects (see CR-01) each becomes an
**unhandled promise rejection** — console noise in production and a likely
`unhandledrejection` failure in the jsdom/Vitest suite that gates this v1.0.
**Fix:** Swallow-and-degrade at the call site, e.g. `void this._floatingController.start().catch(() => {})`, or add an internal `try/catch` around the `await loadFloating()` in `start()`/`_updatePosition()` so a load failure degrades quietly instead of rejecting.

### WR-04: Data-grid virtual-path focus relies on a single rAF after `scrollVirtualizerToIndex` — the target row may not be mounted yet, silently dropping keyboard focus

**File:** `src/components/data-grid/data-grid.ts:441-455`
**Issue:** In the virtual branch of `_focusRowAt`:
```ts
scrollVirtualizerToIndex(this._gridBody, clamped);
requestAnimationFrame(() => {
  const rowEl = this._gridBody?.querySelector(`[data-sorted-index="${clamped}"]`);
  rowEl?.focus();
});
```
`scrollVirtualizerToIndex` scrolls a recycled-out row toward the window, but the
`@lit-labs/virtualizer` flow layout mounts rows asynchronously via
`ResizeObserver`/measurement — the DOM node carrying `data-sorted-index` is not
guaranteed to exist after a single `requestAnimationFrame`. When it isn't,
`rowEl?.focus()` is a no-op (optional chaining swallows it) and focus falls to
`<body>`, breaking Arrow/Home/End keyboard navigation to far-off rows. The
comment claims the scroll "then focus it once it mounts", but nothing waits for
the mount.
**Fix:** Retry until the node exists (bounded), e.g. poll across a few rAFs or
use the virtualizer's `visibilityChanged`/`rangeChanged` event / an
`element(idx)` readiness check before focusing, rather than assuming a single
frame is sufficient.

## Info

### IN-01: `am-select` warms chunks only on `@pointerenter`, not on keyboard focus

**File:** `src/components/select/select.ts:1100-1103`
**Issue:** The select trigger binds `_handleTriggerIntent` (which prefetches
floating-ui and, above threshold, the virtualizer) to `@pointerenter` only;
`@focus` runs `_handleFocus`, which does not prefetch. A keyboard-only user who
tabs to the trigger and presses Enter gets no warm-up and pays the cold-load gap
on open. `rich-select` prefetches on both `@pointerenter` and `@focus`
(`rich-select.ts:562-563`).
**Fix:** Call `_handleTriggerIntent()` from the focus path too (or bind it to
`@focus`) for parity with the other overlays.

### IN-02: Virtualizer resolution depends on a private symbol's `description` string

**File:** `src/internal/helpers/virtualize-support.ts:143-152`
**Issue:** `resolveHostVirtualizer` locates the attached `Virtualizer` by
scanning `Object.getOwnPropertySymbols(host)` for `sym.description === 'virtualizerRef'`
plus an `element()` capability check. This is a deliberate (documented) tactic to
avoid a static import of the runtime symbol, but it silently no-ops if
`@lit-labs/virtualizer` ever changes that symbol's description — degrading
`scrollVirtualizerToIndex` to a permanent no-op (breaking scroll-into-window for
keyboard nav in `data-grid`/`combobox`/`select`) with no error. Mitigated by the
exact `2.1.1` pin (D-13).
**Fix:** No change required given the pin, but add a dev-time assertion/test that
fails if the symbol lookup returns `undefined` for a mounted virtualizer, so a
future dependency bump surfaces the break loudly rather than silently.

---

_Reviewed: 2026-08-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

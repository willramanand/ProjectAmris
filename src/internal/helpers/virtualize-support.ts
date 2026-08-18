/**
 * virtualize-support — internal helpers for threshold-gated list virtualization.
 *
 * It registers no custom element and exports no component, so it never appears
 * on the frozen CEM/public surface (D-05 — virtualization is freeze-neutral,
 * internal-only). It lives under `src/internal/` and is imported only by
 * component source (`am-data-grid`, and later the combobox/select popups) —
 * never re-exported from `src/index.ts` / `src/index.all.ts`.
 *
 * ## Verified `@lit-labs/virtualizer` v2.1.1 runtime API (A1–A4, this session)
 *
 * The `virtualize()` **directive** (not the `<lit-virtualizer>` element — D-05
 * keeps virtualization internal with no new registered tag) is imported from
 * `@lit-labs/virtualizer/virtualize.js`, which also re-exports `virtualizerRef`
 * `[VERIFIED: node_modules/@lit-labs/virtualizer/virtualize.d.ts:12,50 + package.json exports "./virtualize.js"]`.
 *
 * - **A1 — absolute index (CONFIRMED):** the directive calls the caller's
 *   `renderItem(item, idx)` with the ABSOLUTE index into the `items` array:
 *   `this._renderItem = (item, idx) => renderItem(item, idx + this._first)`
 *   `[VERIFIED: virtualize.js:62]`. The `RenderItemFunction<T>` signature is
 *   `(item: T, index: number) => TemplateResult` `[VERIFIED: virtualize.d.ts:30]`.
 *   Therefore `aria-rowindex` / `aria-posinset` can be computed directly from
 *   the `renderItem` index without a window offset.
 * - **A2 — scroll-to (CORRECTED):** the directive has NO `scrollToIndex()`.
 *   `scrollToIndex` exists ONLY on the `<lit-virtualizer>` element as a legacy
 *   shim `[VERIFIED: LitVirtualizer.d.ts:21-24]`. For the directive, get the
 *   `Virtualizer` off the host element via the `virtualizerRef` symbol and call
 *   `.element(idx)?.scrollIntoView(options)` — a proxy that scrolls an item into
 *   view even while it is virtualized out of the DOM
 *   `[VERIFIED: README.md:192-208, 300-306; Virtualizer.d.ts:188]`. See
 *   {@link scrollVirtualizerToIndex}.
 * - **A3 — import path (CONFIRMED):** `@lit-labs/virtualizer/virtualize.js`.
 * - **A4 — flow layout (CONFIRMED):** the default layout is `flow`, which
 *   auto-measures child heights via `ResizeObserver` — no explicit `layout`
 *   config or fixed `itemSize` is needed `[VERIFIED: README.md:90,119-125]`.
 *   The `flow` layout requires each child to be a BLOCK-LEVEL element, so
 *   virtualized rows must render a single block-level root node.
 *
 * The virtualizer is kept EXTERNAL/unbundled via the `vite.config.ts`
 * `/^@lit-labs\//` external pattern (D-12) and exact-pinned at `2.1.1` (D-13,
 * pre-1.0/labs — a minor bump can break the runtime API).
 */

import { virtualizerRef, type VirtualizerHostElement } from '@lit-labs/virtualizer/virtualize.js';

/**
 * Row-count threshold above which a list auto-activates virtualization (D-05 —
 * no public attribute; below it, today's `repeat()` rendering stands unchanged).
 *
 * ## Chosen value: 100 (measurement basis, D-07)
 *
 * The cost model that sets this number is the per-row DOM weight of
 * `am-data-grid`: each rendered row instantiates `(columns + 1)` `role="gridcell"`
 * nodes, and — when `selectable` — one nested `am-checkbox` custom element with
 * its own shadow root. For a representative ~5-column grid that is roughly
 * 500–600 element nodes at 100 rows, plus up to 100 nested custom-element shadow
 * roots. Around that size, a full re-render (which the grid does on every sort
 * toggle and selection change) starts to exceed a ~16 ms frame budget on
 * mid-tier hardware, so the windowing overhead of the virtualizer begins to pay
 * for itself. Below ~100 rows, `repeat()`'s keyed diff stays comfortably
 * sub-frame and the extra machinery (ResizeObserver, transform positioning,
 * div-grid ARIA plumbing) is net-negative. A round 100 keeps the boundary
 * memorable and matches the Phase 1 measured-baseline convention (D-07 permits a
 * round ~100 chosen from render cost on ~100 rows of representative content).
 */
export const VIRTUALIZE_ROW_THRESHOLD = 100;

/**
 * `aria-posinset` value (1-based) for an item at the given absolute index.
 * Used by virtualized listbox options (PERF-03) so the position stays truthful
 * even when the item is recycled out of the DOM.
 */
export function ariaPosinset(absIndex: number): number {
  return absIndex + 1;
}

/**
 * `aria-setsize` value — the FULL logical total, taken from component state
 * (never from the count of currently-mounted DOM nodes; Pitfall 2).
 */
export function ariaSetsize(total: number): number {
  return total;
}

/**
 * `aria-rowindex` value (1-based) for a data row at the given absolute index,
 * including the header-row offset. With the default `headerOffset` of 1 (a
 * single sticky header row occupying row 1), the first data row (absIndex 0)
 * reports `aria-rowindex="2"`. Computed from the absolute index (A1), so the
 * value is truthful for recycled rows under virtualization.
 */
export function ariaRowindex(absIndex: number, headerOffset = 1): number {
  return absIndex + 1 + headerOffset;
}

/**
 * Scroll a (possibly virtualized-out) item at `index` into view via the
 * `virtualize()` directive's `Virtualizer`, reached off the host element with
 * the `virtualizerRef` symbol (A2). Call this BEFORE moving focus/tabindex or
 * setting `aria-activedescendant` to that item, so the target node exists in the
 * DOM first (never move focus to an unmounted row — preserves FIX-03).
 *
 * No-op when the host has no virtualizer yet (e.g. below the threshold or before
 * first layout), so callers can invoke it unconditionally.
 *
 * @param host - the element that hosts the `virtualize()` directive as its content
 * @param index - absolute index of the target item in the `items` array
 * @param options - forwarded to the native `scrollIntoView` (defaults to `{ block: 'nearest' }`)
 */
export function scrollVirtualizerToIndex(
  host: Element | null | undefined,
  index: number,
  options: ScrollIntoViewOptions = { block: 'nearest' },
): void {
  const virtualizer = (host as VirtualizerHostElement | null | undefined)?.[virtualizerRef];
  virtualizer?.element(index)?.scrollIntoView(options);
}

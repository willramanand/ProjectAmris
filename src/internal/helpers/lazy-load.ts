/**
 * lazy-load — internal helpers for memoized dynamic-`import()` of the library's
 * heavy, interaction-gated runtime deps (`@floating-ui/dom`,
 * `@lit-labs/virtualizer`).
 *
 * It registers no custom element and exports no component, so it never appears
 * on the frozen CEM/public surface (D-06 — deferral is an internal optimization,
 * never a new public entry point). It lives under `src/internal/` and is
 * imported only by component/controller source — never re-exported from
 * `src/index.ts` / `src/index.all.ts`.
 *
 * ## Memoization contract (D-06)
 *
 * Each loader holds a module-level promise cache assigned with `??=`. The first
 * caller triggers the `import()`; every later caller — including a second
 * concurrent first-open — awaits the SAME promise instance, so the dependency is
 * fetched, parsed, and evaluated exactly once (no double network/parse). The
 * `prefetch*` variants are fire-and-forget warms hung off trigger intent
 * (`pointerenter`/`focus`, D-01/D-03) or near a virtualization threshold (D-04),
 * so the promise the loader later `await`s is usually already resolved.
 *
 * ## Externalization + supply chain (D-06 / D-10 / T-08-01)
 *
 * The `import()` specifiers are static bare package specifiers, so the consumer's
 * bundler resolves them and the deps stay `external` (never bundled or
 * duplicated; the frozen vite `external` snapshot + the no-bundled-Lit assertion
 * guard this). Never build a computed or origin-qualified module path — that
 * would defeat externalization and open a dynamic-code / supply-chain seam.
 */

let floatingPromise: Promise<typeof import('@floating-ui/dom')> | null = null;

/**
 * Load `@floating-ui/dom` (`computePosition`/`autoUpdate`/`flip`/`shift`/`offset`
 * plus the `size`/`arrow` middleware factories), memoized. Awaited by
 * {@link FloatingPositionController} before the first `computePosition`.
 */
export function loadFloating(): Promise<typeof import('@floating-ui/dom')> {
  return (floatingPromise ??= import('@floating-ui/dom'));
}

/**
 * Fire-and-forget warm of the floating-ui chunk on trigger intent
 * (`pointerenter`/`focus`, D-01/D-03). Returns `void`; the resolved module is
 * consumed later via {@link loadFloating}.
 */
export function prefetchFloating(): void {
  void loadFloating();
}

let virtualizerPromise: Promise<typeof import('@lit-labs/virtualizer/virtualize.js')> | null = null;

/**
 * Load the `@lit-labs/virtualizer` `virtualize()` directive module, memoized.
 * `virtualize()` runs inside `render()` and cannot be `await`ed, so callers
 * prefetch near the row threshold (D-04) and fall back to `repeat()` until this
 * resolves (D-05).
 */
export function loadVirtualizer(): Promise<typeof import('@lit-labs/virtualizer/virtualize.js')> {
  return (virtualizerPromise ??= import('@lit-labs/virtualizer/virtualize.js'));
}

/**
 * Fire-and-forget warm of the virtualizer chunk near-threshold / on popup-open
 * (D-04). Returns `void`; the resolved module is consumed later via
 * {@link loadVirtualizer}.
 */
export function prefetchVirtualizer(): void {
  void loadVirtualizer();
}

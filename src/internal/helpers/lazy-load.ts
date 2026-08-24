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
 * Indirection over the raw `import()` so a browser cold-load spec can inject a
 * one-shot REJECTING importer to prove the null-on-reject retry (CR-01) without
 * a real chunk 404 — vitest browser-mode `vi.mock` cannot simulate a rejected
 * dynamic import (its factory is evaluated once at setup and cannot reject
 * per-call). The DEFAULT is the unchanged static bare package specifier, so
 * externalization + supply chain (T-09-04) are unaffected: no computed or
 * origin-qualified path is ever built. @internal — never re-exported from a
 * barrel; tree-shaken from consumer bundles.
 */
let floatingImporter: () => Promise<typeof import('@floating-ui/dom')> = () =>
  import('@floating-ui/dom');

/**
 * Load `@floating-ui/dom` (`computePosition`/`autoUpdate`/`flip`/`shift`/`offset`
 * plus the `size`/`arrow` middleware factories), memoized. Awaited by
 * {@link FloatingPositionController} before the first `computePosition`.
 */
export function loadFloating(): Promise<typeof import('@floating-ui/dom')> {
  return (floatingPromise ??= floatingImporter());
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

/** Test-only rejecting-importer seam for the virtualizer loader (see
 * {@link floatingImporter}). Defaults to the unchanged static bare specifier. */
let virtualizerImporter: () => Promise<typeof import('@lit-labs/virtualizer/virtualize.js')> = () =>
  import('@lit-labs/virtualizer/virtualize.js');

/**
 * Load the `@lit-labs/virtualizer` `virtualize()` directive module, memoized.
 * `virtualize()` runs inside `render()` and cannot be `await`ed, so callers
 * prefetch near the row threshold (D-04) and fall back to `repeat()` until this
 * resolves (D-05).
 */
export function loadVirtualizer(): Promise<typeof import('@lit-labs/virtualizer/virtualize.js')> {
  return (virtualizerPromise ??= virtualizerImporter());
}

/**
 * Fire-and-forget warm of the virtualizer chunk near-threshold / on popup-open
 * (D-04). Returns `void`; the resolved module is consumed later via
 * {@link loadVirtualizer}.
 */
export function prefetchVirtualizer(): void {
  void loadVirtualizer();
}

/**
 * Test-only: clear the memoized loader caches so the next `loadFloating` /
 * `loadVirtualizer` call returns a fresh *pending* promise. Browser specs that
 * assert the cold `repeat()` → windowed swap (D-05) require the loader pending
 * at the first render; without a reset a prior spec sharing the page leaves the
 * promise already resolved, so the cold frame is never observable (an
 * order-dependent flake, not a product defect). References no package specifier,
 * is not re-exported from any barrel, and is tree-shaken from consumer bundles.
 * @internal
 */
export function __resetLazyLoadCachesForTest(): void {
  floatingPromise = null;
  virtualizerPromise = null;
}

/**
 * Test-only: override the dynamic-import functions so a browser cold-load spec
 * can force a rejected first `import()` (a transient chunk failure) and prove
 * the null-on-reject retry (CR-01) recovers on the next call. Only the provided
 * overrides are applied. References no package specifier itself, is not
 * re-exported from any barrel, and is tree-shaken from consumer bundles.
 * @internal
 */
export function __setLazyLoadImportersForTest(overrides: {
  floating?: () => Promise<typeof import('@floating-ui/dom')>;
  virtualizer?: () => Promise<typeof import('@lit-labs/virtualizer/virtualize.js')>;
}): void {
  if (overrides.floating) floatingImporter = overrides.floating;
  if (overrides.virtualizer) virtualizerImporter = overrides.virtualizer;
}

/**
 * Test-only: restore the default static bare-specifier importers after a spec
 * that swapped in a rejecting importer via {@link __setLazyLoadImportersForTest}.
 * @internal
 */
export function __resetLazyLoadImportersForTest(): void {
  floatingImporter = () => import('@floating-ui/dom');
  virtualizerImporter = () => import('@lit-labs/virtualizer/virtualize.js');
}

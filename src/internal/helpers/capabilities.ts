/**
 * capabilities — internal, memoized feature-detection probes for the runtime
 * platform capabilities the library degrades against (COMPAT-01/02).
 *
 * It registers no custom element and exports no component, so it never appears
 * on the frozen CEM/public surface (mirrors `lazy-load.ts` — an internal
 * optimization is never a new public entry point). It lives under
 * `src/internal/` and is imported only by component/controller/helper source —
 * never re-exported from `src/index.ts` / `src/index.all.ts`, and tree-shaken
 * from consumer bundles.
 *
 * ## Memoization contract
 *
 * Each probe holds its OWN module-level `boolean | undefined` cache assigned
 * with `??=` (the `lazy-load.ts` memoize-once idiom). The first caller evaluates
 * the feature test exactly once; every later caller returns the SAME cached
 * boolean. The caches are INDEPENDENT — forcing one probe's result (e.g. via a
 * capability-off test shim + {@link __resetCapabilitiesForTest}) never changes
 * another probe's cached value. A probe NEVER throws and NEVER returns
 * `undefined`: it returns a plain `boolean` even when the backing global
 * (`ElementInternals`, `CSS`, `Document.prototype.adoptedStyleSheets`) is absent
 * or only partially implemented (COMPAT-01 empty/undefined-input edge).
 */

let _formAssociation: boolean | undefined;
let _ariaReflection: boolean | undefined;
let _adoptedStyleSheets: boolean | undefined;
let _supportsHas: boolean | undefined;

/**
 * Whether the platform supports form-associated custom elements via
 * `ElementInternals` (the Safari 16.4 floor). True only when the
 * `attachInternals()` method exists AND the `ElementInternals` interface is
 * present AND its prototype exposes `setFormValue` (the form-association method —
 * a partial engine that ships `ElementInternals` for ARIA reflection without
 * form support fails this check). Gates {@link attachInternalsSafe}.
 */
export function hasFormAssociation(): boolean {
  return (_formAssociation ??=
    typeof HTMLElement.prototype.attachInternals === 'function' &&
    typeof globalThis.ElementInternals !== 'undefined' &&
    'setFormValue' in globalThis.ElementInternals.prototype);
}

/**
 * Whether `ElementInternals` supports the ARIA reflection accessors (the `role`
 * property and the `aria*` mixin). Independent of form association — an engine
 * may expose ARIA reflection separately.
 */
export function hasAriaReflection(): boolean {
  return (_ariaReflection ??=
    typeof globalThis.ElementInternals !== 'undefined' &&
    'role' in globalThis.ElementInternals.prototype);
}

/**
 * Whether the platform supports constructable / adopted stylesheets
 * (`Document.prototype.adoptedStyleSheets`). Lit falls back to `<style>`
 * injection when absent.
 */
export function hasAdoptedStyleSheets(): boolean {
  return (_adoptedStyleSheets ??= 'adoptedStyleSheets' in Document.prototype);
}

/**
 * Whether the platform supports the CSS `:has()` relational selector. Probed via
 * `CSS.supports('selector(:has(*))')` — the non-empty `:has(*)` argument is
 * REQUIRED: `selector(:has())` (empty form) returns false in Safari even where
 * `:has()` is supported, so the empty form would report a false negative.
 */
export function supportsHas(): boolean {
  return (_supportsHas ??=
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('selector(:has(*))'));
}

/**
 * Test-only: clear ALL four memoized probe caches so the next call to each probe
 * re-evaluates against the current (possibly shimmed) environment. Capability-off
 * specs delete/redefine a backing global then call this before asserting the
 * forced-false result. Mirrors `__resetLazyLoadCachesForTest`. References no
 * package specifier, is not re-exported from any barrel, and is tree-shaken from
 * consumer bundles.
 * @internal
 */
export function __resetCapabilitiesForTest(): void {
  _formAssociation = undefined;
  _ariaReflection = undefined;
  _adoptedStyleSheets = undefined;
  _supportsHas = undefined;
}

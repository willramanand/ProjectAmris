/**
 * attach-internals-safe — the guarded-attach chokepoint for form-associated
 * custom elements (COMPAT-02).
 *
 * Registers no custom element and exports no component, so it never appears on
 * the frozen CEM/public surface. It lives under `src/internal/` and is imported
 * only by component source — never re-exported from `src/index.ts` /
 * `src/index.all.ts`, and tree-shaken from consumer bundles.
 *
 * Below the Safari 16.4 floor, calling the raw `host.attachInternals()` in a
 * constructor THROWS, bricking construction of the element page-wide. This
 * helper gates the call on {@link hasFormAssociation} and additionally catches a
 * throw from a partial engine that exposes the method but still rejects the
 * attach — returning `null` so the component constructs, connects, and renders
 * with form association degraded off rather than not rendering at all. Above the
 * floor it is a pure pass-through: it returns exactly what `attachInternals()`
 * returns.
 */

import { hasFormAssociation } from './capabilities.js';

/**
 * Attach `ElementInternals` to `host` if the platform supports form-associated
 * custom elements, else return `null`. Never throws.
 *
 * @param host - The form-associated custom element attaching its internals.
 * @returns The attached `ElementInternals`, or `null` below the floor / on a
 *   caught attach throw.
 */
export function attachInternalsSafe(host: HTMLElement): ElementInternals | null {
  if (!hasFormAssociation()) {
    return null;
  }
  try {
    return host.attachInternals();
  } catch {
    return null;
  }
}

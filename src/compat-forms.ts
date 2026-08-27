/**
 * `@willramanand/amris/compat-forms` — opt-in, side-effect-only entry that
 * enables the hidden-input Light-DOM form-participation fallback (COMPAT-03).
 *
 * A consumer imports this subpath ONCE at app init:
 *
 * ```ts
 * import '@willramanand/amris/compat-forms';
 * ```
 *
 * The entire contract is the side effect: importing this module flips the global
 * fallback flag (`enableFormFallback()`), after which Amris form controls attach a
 * hidden Light-DOM `<input>` mirror to restore native form submission STRICTLY
 * below the ElementInternals form-association floor (Safari < 16.4, etc.). At or
 * above the floor it is a no-op — ElementInternals wins (XOR, never both channels,
 * no double-submit).
 *
 * This module registers no custom element and re-exports nothing, so it is
 * invisible to the frozen CEM public surface (props/events/slots/parts/tokens
 * unchanged) and is never re-exported from `src/index.ts` / `src/index.all.ts`.
 * It imports no Lit — plain TypeScript only.
 */
import { enableFormFallback } from './internal/helpers/form-participation.js';

enableFormFallback();

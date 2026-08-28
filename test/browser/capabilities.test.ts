import { describe, expect, it } from 'vitest';

import {
  hasAdoptedStyleSheets,
  hasAriaReflection,
  hasFormAssociation,
  supportsHas,
} from '../../src/internal/helpers/capabilities.js';

/**
 * COMPAT-04/05 — cross-engine, REAL-BROWSER capability confirmation.
 *
 * This is the positive counterpart to Plan 01's jsdom capability-OFF unit tests:
 * those force each probe false by deleting/shimming a backing global; this spec
 * runs the SAME four probes UNSHIMMED against the real, evergreen browser engine
 * under test and asserts each returns `true`. It runs under the `browser` Vitest
 * project (NO test/setup.ts — real native ElementInternals / Document / CSS, not
 * the jsdom MockElementInternals), so a `true` here means the real engine ships
 * the capability.
 *
 * Engine matrix (COMPAT-04, D-06):
 *   - Chromium — matched by the `browser` project's unfiltered full-lane glob.
 *   - WebKit   — matched by the `webkit` instance's explicit 7-spec `include`
 *                (Plan 07 Task 1).
 *   - Firefox  — matched by the `firefox` instance's `include` (Plan 07 Task 2).
 *
 * The empirical results feed Plan 08's BROWSER_SUPPORT.md true-per-capability
 * floor (COMPAT-05) — RESEARCH.md's version table is a hypothesis; THIS spec's
 * runs on the pinned Playwright binaries are the authoritative observation. In
 * particular RESEARCH.md flags Firefox's ElementInternals ARIA-reflection ship
 * version as an open question (assumption A2, Bugzilla 1785412); the
 * `hasAriaReflection()` assertion is deliberately kept at `true` (not softened)
 * so any real Firefox gap fails LOUD and gets recorded for Plan 08 rather than
 * silently passing a weakened check.
 */

/** Best-effort engine label for the test-run log (WebKit UA also names Safari). */
function engineLabel(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome') || ua.includes('Chromium')) return 'Chromium';
  if (ua.includes('AppleWebKit') && ua.includes('Safari')) return 'WebKit';
  return `unknown (${ua})`;
}

describe('capabilities probes — real-engine confirmation (COMPAT-04/05)', () => {
  it('hasFormAssociation() is true on the real engine (ElementInternals FACE / setFormValue)', () => {
    expect(hasFormAssociation()).toBe(true);
  });

  it('hasAdoptedStyleSheets() is true on the real engine (constructable stylesheets)', () => {
    expect(hasAdoptedStyleSheets()).toBe(true);
  });

  it('supportsHas() is true on the real engine (CSS :has() relational selector)', () => {
    expect(supportsHas()).toBe(true);
  });

  it('hasAriaReflection() is true on the real engine (ElementInternals.role / aria* mixin)', () => {
    // COMPAT-05 empirical observation point. Chromium + current WebKit ship ARIA
    // reflection; RESEARCH.md A2 flags Firefox's ship version as the one open
    // empirical question (Firefox ARIA reflection landed via Bugzilla 1785412,
    // historically gated on `accessibility.ARIAReflection.enabled`). The pinned
    // Playwright Firefox in this repo is evergreen, so this is expected to pass;
    // the assertion stays at `true` so a genuine gap surfaces as a real finding
    // for Plan 08's BROWSER_SUPPORT.md rather than a silent weakening.
    // eslint-disable-next-line no-console
    console.log(`[COMPAT-05] hasAriaReflection() on ${engineLabel()} =`, hasAriaReflection());
    expect(hasAriaReflection()).toBe(true);
  });
});

import { afterEach, describe, expect, it } from 'vitest';

import {
  __resetCapabilitiesForTest,
  hasAdoptedStyleSheets,
  hasAriaReflection,
  hasFormAssociation,
  supportsHas,
} from '../src/internal/helpers/capabilities';

/**
 * COMPAT-01 — capabilities.ts's four probes each return an independent,
 * memoized `boolean`. This suite covers, per probe, the default-on and
 * forced-off states, plus the two edges the spec calls out: adjacency (forcing
 * one probe off must not change another) and empty/undefined-input (a probe
 * returns a boolean even when its backing global is absent, never `undefined`
 * and never throwing).
 */
describe('capabilities probes (COMPAT-01)', () => {
  // Captured after test/setup.ts has run (carries the setFormValue shim).
  const savedElementInternals = globalThis.ElementInternals;
  // Snapshot of whether jsdom natively exposes adoptedStyleSheets, so the
  // memoization test only cleans up a descriptor it itself added.
  const ORIGINAL_HAS_ADOPTED = 'adoptedStyleSheets' in Document.prototype;

  afterEach(() => {
    // Restore every global a test may have mutated, then clear the memo so no
    // cached value leaks into the next test.
    Object.defineProperty(globalThis, 'ElementInternals', {
      configurable: true,
      writable: true,
      value: savedElementInternals,
    });
    if (
      Object.getOwnPropertyDescriptor(Document.prototype, 'adoptedStyleSheets') &&
      !ORIGINAL_HAS_ADOPTED
    ) {
      delete (Document.prototype as { adoptedStyleSheets?: unknown }).adoptedStyleSheets;
    }
    __resetCapabilitiesForTest();
  });

  describe('default (jsdom) state', () => {
    it('every probe returns a plain boolean, never undefined, never throwing (empty-input edge)', () => {
      __resetCapabilitiesForTest();
      for (const probe of [
        hasFormAssociation,
        hasAriaReflection,
        hasAdoptedStyleSheets,
        supportsHas,
      ]) {
        let result: boolean;
        expect(() => {
          result = probe();
        }).not.toThrow();
        expect(typeof result!).toBe('boolean');
      }
    });

    it('hasFormAssociation() and hasAriaReflection() are true in the jsdom lane (above the floor)', () => {
      __resetCapabilitiesForTest();
      expect(hasFormAssociation()).toBe(true);
      expect(hasAriaReflection()).toBe(true);
    });
  });

  describe('capability-off via global shim', () => {
    it('deleting globalThis.ElementInternals forces hasFormAssociation() and hasAriaReflection() false', () => {
      delete (globalThis as { ElementInternals?: unknown }).ElementInternals;
      __resetCapabilitiesForTest();

      // Both probes read the same global, so both go false — while remaining
      // separately callable (they do not throw on the absent global).
      expect(hasFormAssociation()).toBe(false);
      expect(hasAriaReflection()).toBe(false);
    });
  });

  describe('adjacency / independence', () => {
    it('forcing ElementInternals off does not change hasAdoptedStyleSheets()/supportsHas()', () => {
      // Capture the default-on values of the two UNRELATED probes first.
      __resetCapabilitiesForTest();
      const adoptedDefault = hasAdoptedStyleSheets();
      const hasDefault = supportsHas();

      // Now force the ElementInternals-backed probes off and re-evaluate all.
      delete (globalThis as { ElementInternals?: unknown }).ElementInternals;
      __resetCapabilitiesForTest();

      expect(hasFormAssociation()).toBe(false);
      // The unrelated probes are UNCHANGED — no shared cache, no single
      // "any capability missing" fallback flipped them.
      expect(hasAdoptedStyleSheets()).toBe(adoptedDefault);
      expect(supportsHas()).toBe(hasDefault);
    });
  });

  describe('memoization', () => {
    it("caches a probe's value across a backing-global mutation until __resetCapabilitiesForTest()", () => {
      // Precondition: jsdom does not expose adoptedStyleSheets by default.
      expect(ORIGINAL_HAS_ADOPTED).toBe(false);

      __resetCapabilitiesForTest();
      const first = hasAdoptedStyleSheets();
      expect(first).toBe(false);

      // Mutate the backing global to the opposite state WITHOUT resetting.
      Object.defineProperty(Document.prototype, 'adoptedStyleSheets', {
        configurable: true,
        get() {
          return [];
        },
      });

      // Still the cached value — memoization survives the mutation.
      expect(hasAdoptedStyleSheets()).toBe(false);

      // After a reset the probe re-evaluates and now observes the mutation.
      __resetCapabilitiesForTest();
      expect(hasAdoptedStyleSheets()).toBe(true);
    });
  });
});

import { afterEach, describe, expect, it } from 'vitest';

import '../src/components/input/input';
import {
  __resetCapabilitiesForTest,
  hasFormAssociation,
} from '../src/internal/helpers/capabilities';

/**
 * COMPAT-02 — below the ElementInternals floor, a form-associated component must
 * still construct, connect, and render. This file covers `am-input` ONLY (the
 * tracer component). The rollout plans (04/05/06) each create their OWN
 * batch-scoped constructor-no-throw file (`capabilities-off-constructor.batch-a1
 * / .batch-a2 / .batch-b`) rather than appending here, so no two parallel wave-2
 * plans ever mutate this same tag array (collision-free merge-back).
 */
const FORM_TAGS = ['am-input'] as const;

type UpdatingElement = HTMLElement & {
  value: string;
  updateComplete: Promise<unknown>;
};

describe('capability-off construction (ElementInternals floor absent)', () => {
  // Captured after test/setup.ts has run, so it carries the setFormValue shim.
  const savedElementInternals = globalThis.ElementInternals;

  afterEach(() => {
    // Restore the global reference and clear the memoized probe so later specs
    // (and files) observe the default above-floor state again.
    Object.defineProperty(globalThis, 'ElementInternals', {
      configurable: true,
      writable: true,
      value: savedElementInternals,
    });
    __resetCapabilitiesForTest();
    document.body.innerHTML = '';
  });

  for (const tag of FORM_TAGS) {
    it(`${tag} constructs, connects, and renders without throwing when form association is absent`, async () => {
      // Force hasFormAssociation() false: remove the global entirely, then reset
      // the memo so the next probe re-evaluates against the stripped environment.
      delete (globalThis as { ElementInternals?: unknown }).ElementInternals;
      __resetCapabilitiesForTest();
      expect(hasFormAssociation()).toBe(false);

      let element!: UpdatingElement;
      expect(() => {
        element = document.createElement(tag) as UpdatingElement;
        document.body.appendChild(element);
      }).not.toThrow();

      // The element is still a registered, upgraded custom element.
      expect(customElements.get(tag)).toBeDefined();

      await element.updateComplete;

      // It still renders real shadow content below the floor.
      expect(element.shadowRoot).not.toBeNull();
      expect(element.shadowRoot!.childElementCount).toBeGreaterThan(0);

      // internals is null below the floor: updated() must null-safe setFormValue,
      // so mutating `value` (which schedules updated()) does not throw.
      expect(() => {
        element.value = 'x';
      }).not.toThrow();
      await element.updateComplete;
      expect(element.value).toBe('x');
    });
  }
});

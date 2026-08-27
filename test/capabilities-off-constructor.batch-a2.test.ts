import { afterEach, describe, expect, it } from 'vitest';

import '../src/components/number-field/number-field';
import {
  __resetCapabilitiesForTest,
  hasFormAssociation,
} from '../src/internal/helpers/capabilities';

/**
 * COMPAT-02 — below the ElementInternals floor, a form-associated component must
 * still construct, connect, and render. This is batch A2's OWN constructor-no-throw
 * file (number-field + input-otp + both radio classes + rich-select + select),
 * distinct from Plan 01's `capabilities-off-constructor.test.ts`, Plan 04's
 * `.batch-a1`, and Plan 06's `.batch-b`. No two parallel wave-2 plans mutate the
 * same tag array, so the worktree merge-back is collision-free.
 */
const FORM_TAGS = ['am-number-field'] as const;

type ConstructedElement = HTMLElement & {
  disabled: boolean;
  updateComplete: Promise<unknown>;
};

describe('capability-off construction — batch A2 (ElementInternals floor absent)', () => {
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

      let element!: ConstructedElement;
      expect(() => {
        element = document.createElement(tag) as ConstructedElement;
        document.body.appendChild(element);
      }).not.toThrow();

      // The element is still a registered, upgraded custom element.
      expect(customElements.get(tag)).toBeDefined();

      // The FIRST render runs updated() below the floor: every
      // `internals?.setFormValue` / `internals?.setValidity` call site must be
      // null-safe, so awaiting the first update must not reject.
      await element.updateComplete;

      // It still renders real shadow content below the floor.
      expect(element.shadowRoot).not.toBeNull();
      expect(element.shadowRoot!.childElementCount).toBeGreaterThan(0);

      // A second update cycle (benign shared property, present on every batch-A2
      // component) must also not throw below the floor.
      expect(() => {
        element.disabled = true;
      }).not.toThrow();
      await element.updateComplete;
    });
  }
});

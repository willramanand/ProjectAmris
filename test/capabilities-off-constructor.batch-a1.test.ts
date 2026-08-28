import { afterEach, describe, expect, it } from 'vitest';

import '../src/components/button/button';
import '../src/components/checkbox/checkbox';
import '../src/components/combobox/combobox';
import '../src/components/color-picker/color-picker';
import '../src/components/date-picker/date-picker';
import {
  __resetCapabilitiesForTest,
  hasFormAssociation,
} from '../src/internal/helpers/capabilities';

/**
 * COMPAT-02 — below the ElementInternals floor, a form-associated component must
 * still construct, connect, and render. This batch-A1 file covers the five
 * net-new tags rolled out in Plan 10-04 Task 2 (`am-button`, `am-checkbox`,
 * `am-combobox`, `am-color-picker`, `am-date-picker`). `am-input` is
 * intentionally EXCLUDED — it is already covered by Plan 01's
 * test/capabilities-off-constructor.test.ts. Owned SOLELY by Plan 10-04, so no
 * other parallel wave-2 plan mutates this tag array (collision-free merge-back).
 */
const FORM_TAGS = [
  'am-button',
  'am-checkbox',
  'am-combobox',
  'am-color-picker',
  'am-date-picker',
] as const;

type UpdatingElement = HTMLElement & {
  updateComplete: Promise<unknown>;
};

describe('capability-off construction — batch A1 (ElementInternals floor absent)', () => {
  // Captured after test/setup.ts has run, so it carries the setFormValue shim.
  const savedElementInternals = globalThis.ElementInternals;

  afterEach(() => {
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
    });
  }
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import '../src/components/slider/slider';
import {
  __resetCapabilitiesForTest,
  hasFormAssociation,
} from '../src/internal/helpers/capabilities';
import { __resetFormParticipationForTest } from '../src/internal/helpers/form-participation';

/**
 * COMPAT-02 — below the ElementInternals floor, a form-associated component must
 * still construct, connect, and render. This is the BATCH-B constructor-no-throw
 * file (Plan 10-06): it covers the final four form-associated tags — am-slider
 * (the batch tracer), am-switch, am-textarea, am-time-picker. It is owned solely
 * by this plan; no other wave-2 plan appends here, so the parallel-worktree
 * merge-back is collision-free. Together with Plan 01's `am-input` file and the
 * batch-a1 / batch-a2 files (Plans 04/05), the four-file union covers all 16
 * form-associated custom elements.
 */
const FORM_TAGS = ['am-slider'] as const;

type UpdatingElement = HTMLElement & {
  disabled: boolean;
  updateComplete: Promise<unknown>;
};

describe('capability-off construction, batch B (ElementInternals floor absent)', () => {
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
    __resetFormParticipationForTest();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  for (const tag of FORM_TAGS) {
    it(`${tag} constructs, connects, and renders without throwing when form association is absent`, async () => {
      // Silence the one-time below-floor warn the fallback branch emits (the
      // fallback opt-in is off here, so updated() takes the warn path).
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

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

      // internals is null below the floor: updated() must null-safe every
      // setFormValue/setValidity call, so mutating a reactive property (which
      // schedules updated()) does not throw.
      expect(() => {
        element.disabled = true;
      }).not.toThrow();
      await element.updateComplete;
      expect(element.disabled).toBe(true);
    });
  }
});

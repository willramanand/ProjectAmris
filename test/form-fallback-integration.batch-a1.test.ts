import { afterEach, describe, expect, it, vi } from 'vitest';

import '../src/components/input/input';
import {
  __resetCapabilitiesForTest,
  hasFormAssociation,
} from '../src/internal/helpers/capabilities';
import {
  __resetFormParticipationForTest,
  enableFormFallback,
} from '../src/internal/helpers/form-participation';

/**
 * COMPAT-02 + COMPAT-03 — batch-A1 below-floor form-participation proof (jsdom).
 *
 * Proven via native jsdom `<form>` / `FormData` serialization of the Light-DOM
 * hidden-input mirror (NOT ElementInternals — the jsdom mock never reaches
 * FormData). Each value-bearing batch-A1 control gets three cases:
 *   A. below floor + fallback ON  → FormData parity + a single idempotent mirror
 *   B. below floor + fallback OFF → one-time `warnBelowFloorOnce`, no mirror
 *   C. ABOVE floor + fallback ON  → XOR: the mirror never attaches (no double-submit)
 *
 * This file is owned SOLELY by Plan 10-04 (batch A1). Task 2 appends the remaining
 * value-bearing controls (checkbox, combobox, color-picker, date-picker) to the
 * SAME {@link FALLBACK_TAGS} array — button is excluded (no value channel to fall
 * back). No other plan appends here, so wave-2 merge-back is collision-free.
 */

type UpdatingElement = HTMLElement & {
  name: string;
  updateComplete: Promise<unknown>;
  requestUpdate: () => void;
};

type FallbackCase = {
  tag: string;
  /** The `name` the control submits under. */
  name: string;
  /** Apply a non-empty value to `el`; return the expected FormData string. */
  applyValue: (el: UpdatingElement) => string;
};

const FALLBACK_TAGS: FallbackCase[] = [
  {
    tag: 'am-input',
    name: 'email',
    applyValue: (el) => {
      (el as UpdatingElement & { value: string }).value = 'user@example.com';
      return 'user@example.com';
    },
  },
];

const savedElementInternals = globalThis.ElementInternals;

/** Strip ElementInternals so `hasFormAssociation()` re-evaluates to false. */
function forceBelowFloor(): void {
  delete (globalThis as { ElementInternals?: unknown }).ElementInternals;
  __resetCapabilitiesForTest();
}

function restoreCapabilities(): void {
  Object.defineProperty(globalThis, 'ElementInternals', {
    configurable: true,
    writable: true,
    value: savedElementInternals,
  });
  __resetCapabilitiesForTest();
}

async function mountInForm(
  tag: string,
  name: string,
): Promise<{ form: HTMLFormElement; el: UpdatingElement }> {
  const form = document.createElement('form');
  const el = document.createElement(tag) as UpdatingElement;
  el.name = name;
  form.appendChild(el);
  document.body.appendChild(form);
  await el.updateComplete;
  return { form, el };
}

afterEach(() => {
  restoreCapabilities();
  __resetFormParticipationForTest();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('batch-A1 below-floor form participation (COMPAT-02 + COMPAT-03)', () => {
  for (const c of FALLBACK_TAGS) {
    describe(c.tag, () => {
      it('below floor + fallback ON: mirrors value into native FormData (parity + single idempotent mirror)', async () => {
        forceBelowFloor();
        __resetFormParticipationForTest();
        enableFormFallback();
        expect(hasFormAssociation()).toBe(false);

        const { form, el } = await mountInForm(c.tag, c.name);
        const expected = c.applyValue(el);
        await el.updateComplete;

        // Parity: the mirror serializes the control's value through the form.
        expect(new FormData(form).get(c.name)).toBe(expected);
        // Exactly one Light-DOM mirror.
        expect(el.querySelectorAll('input[data-am-fallback]').length).toBe(1);

        // A further update reuses the SAME node (idempotent find-or-create).
        el.requestUpdate();
        await el.updateComplete;
        expect(el.querySelectorAll('input[data-am-fallback]').length).toBe(1);
        expect(new FormData(form).get(c.name)).toBe(expected);
      });

      it('below floor + fallback OFF (default): warns exactly once, appends no mirror', async () => {
        forceBelowFloor();
        __resetFormParticipationForTest(); // fallback disabled by default
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        const { el } = await mountInForm(c.tag, c.name);
        c.applyValue(el);
        await el.updateComplete;

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(String(warnSpy.mock.calls[0][0])).toContain('@willramanand/amris/compat-forms');
        expect(el.querySelectorAll('input[data-am-fallback]').length).toBe(0);
      });

      it('above the floor + fallback ON: XOR — the mirror never attaches (no double-submit)', async () => {
        // Real capability present (do NOT strip ElementInternals).
        __resetCapabilitiesForTest();
        __resetFormParticipationForTest();
        enableFormFallback();
        expect(hasFormAssociation()).toBe(true);

        const { form, el } = await mountInForm(c.tag, c.name);
        c.applyValue(el);
        await el.updateComplete;

        // The fallback branch is gated on `!internals`; above the floor it never
        // runs — zero mirrors and no duplicate FormData entry for `name`.
        expect(el.querySelectorAll('input[data-am-fallback]').length).toBe(0);
        expect(new FormData(form).getAll(c.name).length).toBeLessThanOrEqual(1);
      });
    });
  }
});

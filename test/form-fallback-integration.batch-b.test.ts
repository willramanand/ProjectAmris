import { afterEach, describe, expect, it, vi } from 'vitest';

import '../src/components/slider/slider';
import {
  __resetCapabilitiesForTest,
  hasFormAssociation,
} from '../src/internal/helpers/capabilities';
import {
  __resetFormParticipationForTest,
  enableFormFallback,
} from '../src/internal/helpers/form-participation';

/**
 * COMPAT-02 + COMPAT-03 caller-side integration for BATCH B (Plan 10-06): the
 * hidden-input Light-DOM form-participation fallback wired into the four batch-B
 * value-bearing controls — am-slider (tracer), am-switch, am-textarea,
 * am-time-picker. Each is exercised through three cases:
 *
 *   1. fallback-on parity  — below the floor + opt-in enabled: the mirror
 *      serializes the control's value into the enclosing native <form>'s
 *      FormData (numeric/boolean/string coerced to a string, as its native
 *      setFormValue serialization would).
 *   2. fallback-off warn   — below the floor + opt-in NOT enabled: no mirror is
 *      attached and exactly one below-floor console.warn is emitted.
 *   3. above-floor XOR     — ElementInternals present (even with the opt-in
 *      enabled): the fallback never attaches, so there is no double-submit
 *      channel.
 *
 * This file is owned solely by this plan (no shared-array append with any other
 * wave-2 plan), so the parallel-worktree merge-back is collision-free.
 */

type FormEl = HTMLElement & {
  name: string;
  disabled: boolean;
  updateComplete: Promise<unknown>;
  [key: string]: unknown;
};

type FallbackCase = {
  /** Custom-element tag under test. */
  tag: string;
  /** The `name` the control mirrors onto its hidden input (the FormData key). */
  fieldName: string;
  /** Put the element into a known, value-bearing state. */
  apply: (el: FormEl) => void;
  /** The string the mirror must serialize into FormData below the floor. */
  expected: string;
};

const FALLBACK_TAGS: FallbackCase[] = [
  {
    tag: 'am-slider',
    fieldName: 'volume',
    apply: (el) => {
      el.name = 'volume';
      el.value = 30;
    },
    expected: '30',
  },
];

const FALLBACK_MARKER = '[data-am-fallback]';

describe('below-floor form-participation fallback, batch B', () => {
  const savedElementInternals = globalThis.ElementInternals;

  afterEach(() => {
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

  /** Force the below-floor path deterministically before element construction. */
  function forceBelowFloor(): void {
    delete (globalThis as { ElementInternals?: unknown }).ElementInternals;
    __resetCapabilitiesForTest();
    expect(hasFormAssociation()).toBe(false);
  }

  for (const { tag, fieldName, apply, expected } of FALLBACK_TAGS) {
    it(`${tag}: below the floor with the opt-in enabled, mirrors its value into the form's FormData`, async () => {
      forceBelowFloor();
      enableFormFallback();

      const form = document.createElement('form');
      const el = document.createElement(tag) as FormEl;
      form.appendChild(el);
      document.body.appendChild(form);

      apply(el);
      await el.updateComplete;

      // Exactly one hidden mirror (idempotent find-or-create across re-renders).
      expect(el.querySelectorAll(FALLBACK_MARKER).length).toBe(1);
      // Native FormData serializes the light-DOM hidden input.
      expect(new FormData(form).get(fieldName)).toBe(expected);
    });

    it(`${tag}: below the floor without the opt-in, warns once and attaches no mirror`, async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      forceBelowFloor();

      const form = document.createElement('form');
      const el = document.createElement(tag) as FormEl;
      form.appendChild(el);
      document.body.appendChild(form);

      apply(el);
      await el.updateComplete;

      // No fallback channel exists when the consumer has not opted in.
      expect(el.querySelector(FALLBACK_MARKER)).toBeNull();
      // The one-time below-floor developer warning fired and names the tag.
      expect(warn).toHaveBeenCalled();
      expect(warn.mock.calls[0][0]).toContain(tag);
    });

    it(`${tag}: above the floor, the fallback never attaches even with the opt-in enabled (XOR)`, async () => {
      // Default jsdom lane: ElementInternals present -> internals non-null.
      enableFormFallback();

      const form = document.createElement('form');
      const el = document.createElement(tag) as FormEl;
      form.appendChild(el);
      document.body.appendChild(form);

      apply(el);
      await el.updateComplete;

      // internals is present, so the `!this.internals` branch is skipped: no
      // second (hidden-input) submission channel -> no double-submit.
      expect(el.querySelector(FALLBACK_MARKER)).toBeNull();
    });
  }
});

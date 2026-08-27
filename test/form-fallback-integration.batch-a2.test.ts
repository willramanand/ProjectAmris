import { afterEach, describe, expect, it, vi } from 'vitest';

import '../src/components/number-field/number-field';
import '../src/components/input-otp/input-otp';
import '../src/components/radio/radio';
import '../src/components/rich-select/rich-select';
import '../src/components/select/select';
import {
  __resetCapabilitiesForTest,
  hasFormAssociation,
} from '../src/internal/helpers/capabilities';
import {
  __resetFormParticipationForTest,
  enableFormFallback,
  isFormFallbackEnabled,
} from '../src/internal/helpers/form-participation';

/**
 * COMPAT-03 (batch A2) — the XOR-gated hidden-input Light-DOM form-participation
 * fallback, proven per value-bearing component of this batch. Three cases per tag:
 *
 *  1. Below the floor + fallback ENABLED → the mirror serializes into the native
 *     `<form>`'s FormData with parity to the component's above-floor value.
 *  2. Below the floor + fallback DISABLED (default) → exactly one dev warning, no
 *     mirror node.
 *  3. Above the floor (internals present) → the fallback NEVER attaches even when
 *     opted in — the XOR gate (no double-submit, T-10-08b).
 *
 * This file is owned solely by Plan 05 (batch A2). Each tag carries a small value
 * adapter because the batch's value-bearing controls expose different value APIs
 * (numeric property, OTP `_values` state, string `value`), so a single
 * `element.value = …` loop cannot drive them all.
 */
type FallbackCase = {
  tag: string;
  name: string;
  /** Drive the control to a known above-floor value. */
  setValue: (el: HTMLElement) => void;
  /** The stringified value the fallback mirror must serialize. */
  expected: string;
};

const FALLBACK_TAGS: FallbackCase[] = [
  {
    tag: 'am-number-field',
    name: 'qty',
    setValue: (el) => {
      (el as unknown as { value: number }).value = 42;
    },
    expected: '42',
  },
  {
    tag: 'am-input-otp',
    name: 'code',
    // value is a read-only getter over the `_values` @state — drive that instead.
    setValue: (el) => {
      (el as unknown as { _values: string[] })._values = ['1', '2', '3', '4', '5', '6'];
    },
    expected: '123456',
  },
  {
    tag: 'am-radio-group',
    name: 'plan',
    setValue: (el) => {
      (el as unknown as { value: string }).value = 'pro';
    },
    expected: 'pro',
  },
  {
    tag: 'am-rich-select',
    name: 'assignee',
    setValue: (el) => {
      (el as unknown as { value: string }).value = 'alice';
    },
    expected: 'alice',
  },
  {
    tag: 'am-select',
    name: 'fruit',
    setValue: (el) => {
      (el as unknown as { value: string }).value = 'apple';
    },
    expected: 'apple',
  },
];

/** Force the ElementInternals floor absent so `attachInternalsSafe` returns null. */
function forceBelowFloor(): void {
  delete (globalThis as { ElementInternals?: unknown }).ElementInternals;
  __resetCapabilitiesForTest();
}

describe('form-participation fallback integration — batch A2', () => {
  const savedElementInternals = globalThis.ElementInternals;

  afterEach(() => {
    Object.defineProperty(globalThis, 'ElementInternals', {
      configurable: true,
      writable: true,
      value: savedElementInternals,
    });
    __resetCapabilitiesForTest();
    __resetFormParticipationForTest();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  for (const cfg of FALLBACK_TAGS) {
    it(`${cfg.tag} — below floor with fallback enabled mirrors its value into FormData`, async () => {
      forceBelowFloor();
      __resetFormParticipationForTest();
      enableFormFallback();
      expect(hasFormAssociation()).toBe(false);

      const form = document.createElement('form');
      document.body.appendChild(form);

      const el = document.createElement(cfg.tag) as HTMLElement & {
        name: string;
        updateComplete: Promise<unknown>;
      };
      el.name = cfg.name;
      form.appendChild(el);
      await el.updateComplete;

      cfg.setValue(el);
      await el.updateComplete;

      // Exactly one hidden-input mirror, a light-DOM child of the host.
      const mirrors = el.querySelectorAll('input[data-am-fallback]');
      expect(mirrors.length).toBe(1);

      // Native FormData parity — the mirror serializes the component's value.
      const fd = new FormData(form);
      expect(fd.get(cfg.name)).toBe(cfg.expected);
    });

    it(`${cfg.tag} — below floor with fallback disabled warns once and mirrors nothing`, async () => {
      forceBelowFloor();
      __resetFormParticipationForTest(); // fallback disabled (default)
      expect(hasFormAssociation()).toBe(false);
      expect(isFormFallbackEnabled()).toBe(false);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const el = document.createElement(cfg.tag) as HTMLElement & {
        name: string;
        updateComplete: Promise<unknown>;
      };
      el.name = cfg.name;
      document.body.appendChild(el);
      await el.updateComplete;
      cfg.setValue(el);
      await el.updateComplete;

      // One-time below-floor developer warning, and no mirror was appended.
      expect(warnSpy).toHaveBeenCalled();
      expect(el.querySelector('input[data-am-fallback]')).toBeNull();
    });

    it(`${cfg.tag} — above the floor never attaches the hidden-input fallback (XOR)`, async () => {
      // Default state: ElementInternals present (setFormValue shimmed) → internals
      // non-null. Even opted in, the XOR gate must keep the fallback off above the
      // floor so the two channels are structurally exclusive (no double-submit).
      __resetCapabilitiesForTest();
      __resetFormParticipationForTest();
      enableFormFallback();
      expect(hasFormAssociation()).toBe(true);

      const el = document.createElement(cfg.tag) as HTMLElement & {
        name: string;
        updateComplete: Promise<unknown>;
      };
      el.name = cfg.name;
      document.body.appendChild(el);
      await el.updateComplete;
      cfg.setValue(el);
      await el.updateComplete;

      expect(el.querySelector('input[data-am-fallback]')).toBeNull();
    });
  }
});

/**
 * am-radio has checked-based (not value-set) semantics, so it does not fit the
 * generic `setValue` loop above. Its distinctive contract is T-10-09b: below the
 * floor an unselected radio must be ABSENT from FormData (native radio
 * semantics), implemented via teardown-on-deselect rather than a present-but-empty
 * mirror. Above the floor the fallback never attaches (XOR).
 */
describe('form-participation fallback integration — am-radio (checked-based)', () => {
  const savedElementInternals = globalThis.ElementInternals;

  afterEach(() => {
    Object.defineProperty(globalThis, 'ElementInternals', {
      configurable: true,
      writable: true,
      value: savedElementInternals,
    });
    __resetCapabilitiesForTest();
    __resetFormParticipationForTest();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  type RadioEl = HTMLElement & {
    name: string;
    value: string;
    checked: boolean;
    updateComplete: Promise<unknown>;
  };

  it('below floor + fallback enabled: present-when-checked, absent-when-deselected', async () => {
    forceBelowFloor();
    __resetFormParticipationForTest();
    enableFormFallback();
    expect(hasFormAssociation()).toBe(false);

    const form = document.createElement('form');
    document.body.appendChild(form);

    const el = document.createElement('am-radio') as RadioEl;
    el.name = 'plan';
    el.value = 'pro';
    form.appendChild(el);
    await el.updateComplete;

    // Checked → mirror present, value serialized.
    el.checked = true;
    await el.updateComplete;
    expect(el.querySelector('input[data-am-fallback]')).not.toBeNull();
    expect(new FormData(form).get('plan')).toBe('pro');

    // Deselected → mirror torn down, ABSENT from FormData (native radio semantics).
    el.checked = false;
    await el.updateComplete;
    expect(el.querySelector('input[data-am-fallback]')).toBeNull();
    expect(new FormData(form).get('plan')).toBeNull();
  });

  it('above the floor never attaches the hidden-input fallback (XOR)', async () => {
    __resetCapabilitiesForTest();
    __resetFormParticipationForTest();
    enableFormFallback();
    expect(hasFormAssociation()).toBe(true);

    const el = document.createElement('am-radio') as RadioEl;
    el.name = 'plan';
    el.value = 'pro';
    document.body.appendChild(el);
    await el.updateComplete;
    el.checked = true;
    await el.updateComplete;

    expect(el.querySelector('input[data-am-fallback]')).toBeNull();
  });
});

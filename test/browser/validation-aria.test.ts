import { afterEach, describe, expect, it } from 'vitest';

import '../../src/components/field/field';
import '../../src/components/input/input';
import { fixture, waitForUpdate } from '../helpers';

/**
 * FEAT-01 / FEAT-02 — cross-shadow ARIA wiring + D-04 politeness against REAL
 * ElementInternals in Chromium (04-RESEARCH §"Pitfall 3", §"Pitfall 5").
 *
 * The load-bearing proof (RESEARCH Open Q-1, Option A): the inner `<input>`'s
 * `aria-describedby` must resolve to a node IN THE SAME shadow root as the
 * input — a cross-root reference would not announce. This suite queries the
 * control's own `shadowRoot` for the referenced id and asserts it is non-null.
 *
 * Runs in the `browser` project (no test/setup.ts) so ElementInternals is
 * native. NOTE: does NOT import getMockInternals — the mock is jsdom-only.
 */

type ValidatingInput = HTMLElement & {
  value: string;
  invalid: boolean;
  setCustomError(message: string): void;
  updateComplete: Promise<unknown>;
};

function innerInput(host: HTMLElement): HTMLInputElement {
  return host.shadowRoot!.querySelector('input')!;
}

function errorNode(host: HTMLElement): HTMLElement | null {
  return host.shadowRoot?.querySelector('[part="error"]') ?? null;
}

async function blurInput(host: ValidatingInput): Promise<void> {
  const inner = innerInput(host);
  inner.focus();
  inner.blur();
  await host.updateComplete;
  await waitForUpdate(host);
}

afterEach(() => {
  document.querySelectorAll('am-field, am-input, form').forEach((el) => el.remove());
});

describe('validation ARIA + politeness (real ElementInternals)', () => {
  it('resolves aria-describedby to a node in the SAME shadow root as the input (Pitfall 3)', async () => {
    const field = await fixture<HTMLElement>(
      '<am-field><am-input label="Name" required></am-input></am-field>',
    );
    const input = field.querySelector('am-input') as ValidatingInput;
    await input.updateComplete;
    await blurInput(input);

    const inner = innerInput(input);
    const describedBy = inner.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();

    // The referenced id MUST exist inside the control's own shadow root.
    const target = input.shadowRoot!.getElementById(describedBy!);
    expect(target).not.toBeNull();
    expect(target).toBe(errorNode(input));
  });

  it('announces per-field (blur) errors politely and submit-time errors assertively (D-04)', async () => {
    // Per-field: blur error is polite.
    const field = await fixture<HTMLElement>(
      '<am-field><am-input label="Name" required></am-input></am-field>',
    );
    const blurInputEl = field.querySelector('am-input') as ValidatingInput;
    await blurInputEl.updateComplete;
    await blurInput(blurInputEl);
    const blurError = errorNode(blurInputEl);
    expect(blurError!.getAttribute('aria-live')).toBe('polite');
    expect(blurError!.getAttribute('role')).toBeNull();

    // Submit-time: role=alert (assertive).
    const form = await fixture<HTMLFormElement>(
      '<form><am-field><am-input label="City" name="city" required></am-input></am-field></form>',
    );
    const submitInput = form.querySelector('am-input') as ValidatingInput;
    await submitInput.updateComplete;
    form.requestSubmit();
    await submitInput.updateComplete;
    await waitForUpdate(submitInput);
    const submitError = errorNode(submitInput);
    expect(submitError!.getAttribute('role')).toBe('alert');
  });

  it("setCustomError overrides the native message and '' restores it (D-03)", async () => {
    const field = await fixture<HTMLElement>(
      '<am-field><am-input label="Email" required></am-input></am-field>',
    );
    const input = field.querySelector('am-input') as ValidatingInput;
    await input.updateComplete;
    await blurInput(input);

    const nativeMessage = innerInput(input).validationMessage;
    expect(errorNode(input)!.textContent).toBe(nativeMessage);

    input.setCustomError('Email already registered');
    await input.updateComplete;
    await waitForUpdate(input);
    expect(errorNode(input)!.textContent).toBe('Email already registered');

    input.setCustomError('');
    await input.updateComplete;
    await waitForUpdate(input);
    expect(errorNode(input)!.textContent).toBe(nativeMessage);
  });

  it('renders the message as TEXT, never as markup (T-04-01 / ASVS V5)', async () => {
    const field = await fixture<HTMLElement>(
      '<am-field><am-input label="Email"></am-input></am-field>',
    );
    const input = field.querySelector('am-input') as ValidatingInput;
    await input.updateComplete;

    input.setCustomError('<img src=x onerror="window.__xss=1">');
    await input.updateComplete;
    await waitForUpdate(input);

    const error = errorNode(input);
    expect(error).not.toBeNull();
    // The payload is rendered as literal text, not parsed into an <img> element.
    expect(error!.querySelector('img')).toBeNull();
    expect(error!.textContent).toBe('<img src=x onerror="window.__xss=1">');
    expect((window as unknown as { __xss?: number }).__xss).toBeUndefined();
  });

  it('reflects invalid state via the :host([invalid]) attribute hook, not :state() (Pitfall 5)', async () => {
    const field = await fixture<HTMLElement>(
      '<am-field><am-input label="Name" required></am-input></am-field>',
    );
    const input = field.querySelector('am-input') as ValidatingInput;
    await input.updateComplete;
    await blurInput(input);

    // The CSS hook is the reflected boolean attribute (works at the Safari 16.4
    // floor where :state()/CustomStateSet is unavailable).
    expect(input.hasAttribute('invalid')).toBe(true);
  });
});

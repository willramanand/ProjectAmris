import { afterEach, describe, expect, it } from 'vitest';

import '../../src/components/field/field';
import '../../src/components/input/input';
import { fixture, waitForUpdate } from '../helpers';

/**
 * FEAT-01 — validation timing against REAL ElementInternals in Chromium.
 *
 * Runs in the `browser` Vitest project, which OMITS test/setup.ts, so these
 * assertions exercise native `ElementInternals.setValidity` /
 * `validationMessage` / the native `invalid` event — the jsdom lane mocks all
 * of these, which is exactly why the D-01 timing gate and real form-submit
 * behaviour MUST be proven here (04-VALIDATION §"Critical lane boundary").
 *
 * NOTE: deliberately does NOT import getMockInternals — the mock does not exist
 * in the browser project.
 */

type ValidatingInput = HTMLElement & {
  value: string;
  invalid: boolean;
  setCustomError(message: string): void;
  updateComplete: Promise<unknown>;
};

/** Query the control's OWN shadow root for the rendered error region. */
function errorNode(input: HTMLElement): HTMLElement | null {
  return input.shadowRoot?.querySelector('[part="error"]') ?? null;
}

/** Focus then blur the inner native input to trip the D-01 touched gate. */
async function blurInput(host: ValidatingInput): Promise<void> {
  const inner = host.shadowRoot!.querySelector('input')!;
  inner.focus();
  inner.blur();
  await host.updateComplete;
  await waitForUpdate(host);
}

afterEach(() => {
  document.querySelectorAll('am-field, am-input, form').forEach((el) => el.remove());
});

describe('validation timing (real ElementInternals)', () => {
  it('shows NO error on first paint for a required empty input (D-01)', async () => {
    const field = await fixture<HTMLElement>(
      '<am-field><am-input label="Name" required></am-input></am-field>',
    );
    const input = field.querySelector('am-input') as ValidatingInput;
    await input.updateComplete;

    expect(errorNode(input)).toBeNull();
    const inner = input.shadowRoot!.querySelector('input')!;
    expect(inner.getAttribute('aria-invalid')).not.toBe('true');
  });

  it('surfaces the native validationMessage after a real blur on an empty required input', async () => {
    const field = await fixture<HTMLElement>(
      '<am-field><am-input label="Name" required></am-input></am-field>',
    );
    const input = field.querySelector('am-input') as ValidatingInput;
    await input.updateComplete;

    const inner = input.shadowRoot!.querySelector('input')!;
    const nativeMessage = inner.validationMessage; // real Chromium constraint text
    expect(nativeMessage).not.toBe('');

    await blurInput(input);

    const error = errorNode(input);
    expect(error).not.toBeNull();
    expect(input.invalid).toBe(true);
    expect(inner.getAttribute('aria-invalid')).toBe('true');
    // The shown text is the native constraint message.
    expect(error!.textContent).toBe(nativeMessage);
  });

  it('clears the error live once a valid value is typed', async () => {
    const field = await fixture<HTMLElement>(
      '<am-field><am-input label="Name" required></am-input></am-field>',
    );
    const input = field.querySelector('am-input') as ValidatingInput;
    await input.updateComplete;

    await blurInput(input);
    expect(errorNode(input)).not.toBeNull();

    const inner = input.shadowRoot!.querySelector('input')!;
    inner.value = 'Ada';
    inner.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await input.updateComplete;
    await waitForUpdate(input);

    expect(errorNode(input)).toBeNull();
    expect(input.invalid).toBe(false);
    expect(inner.getAttribute('aria-invalid')).not.toBe('true');
  });

  it('surfaces the error assertively on a real form submit of an invalid input (D-04)', async () => {
    const form = await fixture<HTMLFormElement>(
      '<form><am-field><am-input label="Name" name="name" required></am-input></am-field></form>',
    );
    const input = form.querySelector('am-input') as ValidatingInput;
    await input.updateComplete;

    // A real submit attempt: the browser runs constraint validation over the
    // form-associated custom element and fires `invalid` on it (form does NOT
    // submit because am-input called setValidity with a failing flag).
    form.requestSubmit();
    await input.updateComplete;
    await waitForUpdate(input);

    const error = errorNode(input);
    expect(error).not.toBeNull();
    // Submit-time errors announce assertively via role=alert (D-04).
    expect(error!.getAttribute('role')).toBe('alert');
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/number-field/number-field';
import {
  click,
  fixture,
  getMockInternals,
  keydown,
  oneEvent,
  shadowQuery,
  waitForUpdate,
} from '../helpers';

describe('am-number-field', () => {
  it('renders with label and initial value', async () => {
    const element = await fixture<HTMLElement & { value: number | null }>(
      '<am-number-field label="Quantity" value="5"></am-number-field>',
    );

    const input = shadowQuery<HTMLInputElement>(element, 'input[type="number"]');
    expect(input.value).toBe('5');
    expect(input.getAttribute('aria-label')).toBe('Quantity');
  });

  it('increments on clicking the increment button', async () => {
    const element = await fixture<HTMLElement & { value: number | null }>(
      '<am-number-field value="3" step="1"></am-number-field>',
    );

    const incBtn = shadowQuery<HTMLButtonElement>(element, '[aria-label="Increase"]');
    const eventPromise = oneEvent(element, 'change');
    await click(incBtn, element);
    const event = await eventPromise;
    const target = event.target as HTMLElement & { value: number | null };

    expect(target.value).toBe(4);
    expect(element.value).toBe(4);
  });

  it('decrements on clicking the decrement button', async () => {
    const element = await fixture<HTMLElement & { value: number | null }>(
      '<am-number-field value="10" step="2"></am-number-field>',
    );

    const decBtn = shadowQuery<HTMLButtonElement>(element, '[aria-label="Decrease"]');
    const eventPromise = oneEvent(element, 'change');
    await click(decBtn, element);
    const event = await eventPromise;
    const target = event.target as HTMLElement & { value: number | null };

    expect(target.value).toBe(8);
    expect(element.value).toBe(8);
  });

  it('clamps value to min/max', async () => {
    const element = await fixture<HTMLElement & { value: number | null }>(
      '<am-number-field value="10" min="0" max="10"></am-number-field>',
    );

    const incBtn = shadowQuery<HTMLButtonElement>(element, '[aria-label="Increase"]');
    expect(incBtn.disabled).toBe(true);

    await click(incBtn, element);
    expect(element.value).toBe(10);
  });

  it('increments via ArrowUp key', async () => {
    const element = await fixture<HTMLElement & { value: number | null }>(
      '<am-number-field value="5"></am-number-field>',
    );
    const input = shadowQuery<HTMLInputElement>(element, 'input[type="number"]');

    await keydown(input, 'ArrowUp', element);

    expect(element.value).toBe(6);
  });

  it('sets form value via ElementInternals', async () => {
    const element = await fixture<HTMLElement>(
      '<am-number-field value="42"></am-number-field>',
    );

    expect(getMockInternals(element).formValue).toBe('42');
  });

  describe('validation (jsdom lane)', () => {
    type ValidatingNumberField = HTMLElement & {
      invalid: boolean;
      setCustomError(message: string): void;
      updateComplete: Promise<unknown>;
    };

    it('shows NO validation error on first paint for a required empty field (D-01)', async () => {
      const element = await fixture<ValidatingNumberField>(
        '<am-number-field label="Quantity" required></am-number-field>',
      );

      expect(element.invalid).toBe(false);
      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();
      expect(
        shadowQuery<HTMLInputElement>(element, 'input[type="number"]').getAttribute('aria-invalid'),
      ).toBeNull();
    });

    it('surfaces the native message only after the field is touched (D-01 gate)', async () => {
      const element = await fixture<ValidatingNumberField>(
        '<am-number-field label="Quantity" required></am-number-field>',
      );
      const input = shadowQuery<HTMLInputElement>(element, 'input[type="number"]');

      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();

      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      await element.updateComplete;
      await waitForUpdate(element);

      const error = element.shadowRoot?.querySelector('[part="error"]');
      expect(error).not.toBeNull();
      expect(element.invalid).toBe(true);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).not.toBeNull();
      expect(element.shadowRoot?.getElementById(describedBy!)).toBe(error);
    });

    it('setCustomError shows immediately and reflects the invalid attribute (D-03)', async () => {
      const element = await fixture<ValidatingNumberField>(
        '<am-number-field label="Quantity" value="5"></am-number-field>',
      );

      element.setCustomError('Out of stock');
      await element.updateComplete;
      await waitForUpdate(element);

      expect(element.hasAttribute('invalid')).toBe(true);
      const error = element.shadowRoot?.querySelector('[part="error"]');
      expect(error?.textContent).toBe('Out of stock');
      expect(error?.getAttribute('aria-live')).toBe('polite');
      expect(error?.getAttribute('role')).toBeNull();
    });

    it("setCustomError('') clears the error when there is no native violation", async () => {
      const element = await fixture<ValidatingNumberField>(
        '<am-number-field label="Quantity" value="5"></am-number-field>',
      );

      element.setCustomError('Server says no');
      await element.updateComplete;
      await waitForUpdate(element);
      expect(element.hasAttribute('invalid')).toBe(true);

      element.setCustomError('');
      await element.updateComplete;
      await waitForUpdate(element);

      expect(element.hasAttribute('invalid')).toBe(false);
      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();
    });
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/slider/slider';
import { fixture, getMockInternals, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-slider', () => {
  it('renders a range input with correct min/max/value', async () => {
    const element = await fixture<HTMLElement & { value: number; min: number; max: number }>(
      '<am-slider value="30" min="0" max="100"></am-slider>',
    );
    const input = shadowQuery<HTMLInputElement>(element, 'input[type="range"]');

    expect(input.value).toBe('30');
    expect(input.min).toBe('0');
    expect(input.max).toBe('100');
  });

  it('emits input on input and change on change', async () => {
    const element = await fixture<HTMLElement & { value: number }>(
      '<am-slider value="50"></am-slider>',
    );
    const input = shadowQuery<HTMLInputElement>(element, 'input[type="range"]');

    const inputPromise = oneEvent(element, 'input');
    input.value = '75';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await waitForUpdate(element);
    const inputEvent = await inputPromise;
    const inputTarget = inputEvent.target as HTMLElement & { value: number };

    expect(inputTarget.value).toBe(75);
    expect(element.value).toBe(75);

    const changePromise = oneEvent(element, 'change');
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    const changeEvent = await changePromise;
    const changeTarget = changeEvent.target as HTMLElement & { value: number };

    expect(changeTarget.value).toBe(75);
  });

  it('sets form value via ElementInternals', async () => {
    const element = await fixture<HTMLElement & { value: number }>(
      '<am-slider value="42"></am-slider>',
    );

    expect(getMockInternals(element).formValue).toBe('42');
  });

  it('applies the aria-label from the label property', async () => {
    const element = await fixture<HTMLElement>(
      '<am-slider label="Volume"></am-slider>',
    );
    const input = shadowQuery<HTMLInputElement>(element, 'input[type="range"]');

    expect(input.getAttribute('aria-label')).toBe('Volume');
  });

  it('disables the input when disabled', async () => {
    const element = await fixture<HTMLElement>(
      '<am-slider disabled></am-slider>',
    );
    const input = shadowQuery<HTMLInputElement>(element, 'input[type="range"]');

    expect(input.disabled).toBe(true);
  });

  describe('validation (jsdom lane)', () => {
    type ValidatingSlider = HTMLElement & {
      value: number;
      invalid: boolean;
      setCustomError(message: string): void;
      updateComplete: Promise<unknown>;
    };

    it('shows NO validation error on first paint (D-01)', async () => {
      const element = await fixture<ValidatingSlider>('<am-slider value="30"></am-slider>');

      expect(element.invalid).toBe(false);
      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();
      expect(
        shadowQuery<HTMLInputElement>(element, 'input[type="range"]').getAttribute('aria-invalid'),
      ).toBeNull();
    });

    it('does not surface an error on blur while the value is valid (D-01)', async () => {
      const element = await fixture<ValidatingSlider>('<am-slider value="30"></am-slider>');
      const input = shadowQuery<HTMLInputElement>(element, 'input[type="range"]');

      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      await element.updateComplete;
      await waitForUpdate(element);

      expect(element.invalid).toBe(false);
      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();
    });

    it('setCustomError shows immediately and reflects the invalid attribute (D-03)', async () => {
      const element = await fixture<ValidatingSlider>('<am-slider value="30"></am-slider>');

      element.setCustomError('Pick a value above 50');
      await element.updateComplete;
      await waitForUpdate(element);

      expect(element.hasAttribute('invalid')).toBe(true);
      const error = element.shadowRoot?.querySelector('[part="error"]');
      expect(error?.textContent).toBe('Pick a value above 50');
      expect(error?.getAttribute('aria-live')).toBe('polite');
      expect(error?.getAttribute('role')).toBeNull();
      const input = shadowQuery<HTMLInputElement>(element, 'input[type="range"]');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).not.toBeNull();
      expect(element.shadowRoot?.getElementById(describedBy!)).toBe(error);
    });

    it("setCustomError('') clears the error", async () => {
      const element = await fixture<ValidatingSlider>('<am-slider value="30"></am-slider>');

      element.setCustomError('Out of range');
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

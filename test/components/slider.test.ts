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
});

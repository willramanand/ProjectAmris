import { describe, expect, it } from 'vitest';

import '../../src/components/number-field/number-field';
import { click, fixture, getMockInternals, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

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
    const eventPromise = oneEvent<{ value: number }>(element, 'am-change');
    await click(incBtn, element);
    const event = await eventPromise;

    expect(event.detail.value).toBe(4);
    expect(element.value).toBe(4);
  });

  it('decrements on clicking the decrement button', async () => {
    const element = await fixture<HTMLElement & { value: number | null }>(
      '<am-number-field value="10" step="2"></am-number-field>',
    );

    const decBtn = shadowQuery<HTMLButtonElement>(element, '[aria-label="Decrease"]');
    const eventPromise = oneEvent<{ value: number }>(element, 'am-change');
    await click(decBtn, element);
    const event = await eventPromise;

    expect(event.detail.value).toBe(8);
    expect(element.value).toBe(8);
  });

  it('clamps value to min/max', async () => {
    const element = await fixture<HTMLElement & { value: number | null }>(
      '<am-number-field value="10" min="0" max="10"></am-number-field>',
    );

    const incBtn = shadowQuery<HTMLButtonElement>(element, '[aria-label="Increase"]');
    expect(incBtn.disabled).toBe(true);

    // Force increment — should stay at max
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
});

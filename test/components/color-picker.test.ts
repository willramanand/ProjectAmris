import { describe, expect, it } from 'vitest';

import '../../src/components/color-picker/color-picker';
import { click, fixture, getMockInternals, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

type ColorPickerEl = HTMLElement & {
  value: string;
  swatches: string[];
  disabled: boolean;
  invalid: boolean;
  showAlpha: boolean;
};

async function makePicker(extra = ''): Promise<ColorPickerEl> {
  return fixture<ColorPickerEl>(`<am-color-picker ${extra}></am-color-picker>`);
}

function trigger(el: ColorPickerEl): HTMLElement {
  return shadowQuery<HTMLElement>(el, '.trigger');
}

function panel(el: ColorPickerEl): HTMLElement {
  return shadowQuery<HTMLElement>(el, '.panel');
}

describe('am-color-picker', () => {
  it('renders the trigger swatch with the current value', async () => {
    const el = await makePicker('value="#6366f1"');
    expect(shadowQuery<HTMLElement>(el, '.trigger-value').textContent?.trim()).toBe('#6366f1');
  });

  it('opens the panel when the trigger is clicked', async () => {
    const el = await makePicker();
    expect(panel(el).classList.contains('open')).toBe(false);
    await click(trigger(el), el);
    expect(panel(el).classList.contains('open')).toBe(true);
  });

  it('does not open when disabled', async () => {
    const el = await makePicker('disabled');
    await click(trigger(el), el);
    expect(panel(el).classList.contains('open')).toBe(false);
  });

  it('updates value via hex input and emits input/change', async () => {
    const el = await makePicker('value="#000000"');
    await click(trigger(el), el);

    const hexInput = shadowQuery<HTMLInputElement>(el, '.hex-input');
    hexInput.value = '#ff0000';
    const eventPromise = oneEvent(el, 'input');
    hexInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await eventPromise;

    expect(el.value.toLowerCase()).toBe('#ff0000');
    expect(getMockInternals(el).formValue?.toLowerCase()).toBe('#ff0000');
  });

  it('renders predefined swatches', async () => {
    const el = await makePicker();
    el.swatches = ['#ff0000', '#00ff00', '#0000ff'];
    await waitForUpdate(el);
    await click(trigger(el), el);

    const swatchBtns = el.shadowRoot?.querySelectorAll('.swatch-btn');
    expect(swatchBtns?.length).toBe(3);
  });

  it('selects a swatch on click and updates value', async () => {
    const el = await makePicker('value="#000000"');
    el.swatches = ['#ff5733'];
    await waitForUpdate(el);
    await click(trigger(el), el);

    const swatchBtn = shadowQuery<HTMLButtonElement>(el, '.swatch-btn');
    const eventPromise = oneEvent(el, 'change');
    await click(swatchBtn, el);
    await eventPromise;

    expect(el.value.toLowerCase()).toBe('#ff5733');
  });

  it('reflects invalid attribute', async () => {
    const el = await makePicker('invalid');
    expect(el.hasAttribute('invalid')).toBe(true);
    expect(trigger(el).classList.contains('invalid')).toBe(true);
  });
});

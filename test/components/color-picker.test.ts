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

  describe('validation (jsdom lane)', () => {
    type ValidatingPicker = ColorPickerEl & {
      required: boolean;
      setCustomError(message: string): void;
      updateComplete: Promise<unknown>;
    };

    async function blurTrigger(el: ValidatingPicker): Promise<void> {
      trigger(el).dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      await el.updateComplete;
      await waitForUpdate(el);
    }

    it('shows NO validation error on first paint for a required empty picker (D-01)', async () => {
      const el = (await makePicker('required value=""')) as ValidatingPicker;

      expect(el.invalid).toBe(false);
      expect(el.shadowRoot?.querySelector('[part="error"]')).toBeNull();
      expect(trigger(el).getAttribute('aria-invalid')).toBeNull();
    });

    it('surfaces the native message only after the trigger is blurred (D-01 gate)', async () => {
      const el = (await makePicker('required value=""')) as ValidatingPicker;
      const trig = trigger(el);

      expect(el.shadowRoot?.querySelector('[part="error"]')).toBeNull();

      await blurTrigger(el);

      const error = el.shadowRoot?.querySelector('[part="error"]');
      expect(error).not.toBeNull();
      expect(el.invalid).toBe(true);
      expect(trig.getAttribute('aria-invalid')).toBe('true');
      const describedBy = trig.getAttribute('aria-describedby');
      expect(describedBy).not.toBeNull();
      expect(el.shadowRoot?.getElementById(describedBy!)).toBe(error);
    });

    it('setCustomError shows immediately and reflects the invalid attribute (D-03)', async () => {
      const el = (await makePicker('value="#6366f1"')) as ValidatingPicker;

      el.setCustomError('That color fails contrast');
      await el.updateComplete;
      await waitForUpdate(el);

      expect(el.hasAttribute('invalid')).toBe(true);
      const error = el.shadowRoot?.querySelector('[part="error"]');
      expect(error?.textContent).toBe('That color fails contrast');
      expect(error?.getAttribute('aria-live')).toBe('polite');
      expect(error?.getAttribute('role')).toBeNull();
    });

    it("setCustomError('') clears the error when there is no native violation", async () => {
      const el = (await makePicker('value="#6366f1"')) as ValidatingPicker;

      el.setCustomError('Server rejected');
      await el.updateComplete;
      await waitForUpdate(el);
      expect(el.hasAttribute('invalid')).toBe(true);

      el.setCustomError('');
      await el.updateComplete;
      await waitForUpdate(el);

      expect(el.hasAttribute('invalid')).toBe(false);
      expect(el.shadowRoot?.querySelector('[part="error"]')).toBeNull();
    });

    it('custom error wins over the native constraint message (D-03 precedence)', async () => {
      const el = (await makePicker('required value=""')) as ValidatingPicker;

      await blurTrigger(el);
      const nativeMessage = el.shadowRoot?.querySelector('[part="error"]')?.textContent;
      expect(nativeMessage).toBeTruthy();

      el.setCustomError('Custom takes priority');
      await el.updateComplete;
      await waitForUpdate(el);

      const error = el.shadowRoot?.querySelector('[part="error"]');
      expect(error?.textContent).toBe('Custom takes priority');
      expect(error?.textContent).not.toBe(nativeMessage);
    });
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/time-picker/time-picker';
import { fixture, getMockInternals, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

type TimePickerEl = HTMLElement & {
  value: string;
  label: string;
  step: number;
  showSeconds: boolean;
  use12Hour: boolean;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
};

async function makeTimePicker(extra = ''): Promise<TimePickerEl> {
  return fixture<TimePickerEl>(`<am-time-picker ${extra}></am-time-picker>`);
}

function segment(el: TimePickerEl, name: string): HTMLButtonElement {
  return shadowQuery<HTMLButtonElement>(el, `[data-segment="${name}"]`);
}

describe('am-time-picker', () => {
  it('renders hours and minutes segments by default', async () => {
    const el = await makeTimePicker('label="Start"');
    expect(segment(el, 'hours')).toBeTruthy();
    expect(segment(el, 'minutes')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('[data-segment="seconds"]')).toBeNull();
  });

  it('renders seconds when show-seconds is set', async () => {
    const el = await makeTimePicker('show-seconds');
    expect(segment(el, 'seconds')).toBeTruthy();
  });

  it('renders period segment when use12-hour is set', async () => {
    const el = await makeTimePicker('use12-hour');
    expect(segment(el, 'period')).toBeTruthy();
  });

  it('parses initial value', async () => {
    const el = await makeTimePicker('value="14:30"');
    expect(segment(el, 'hours').textContent?.trim()).toContain('14');
    expect(segment(el, 'minutes').textContent?.trim()).toContain('30');
  });

  it('arrow keys increment/decrement minute segment by step', async () => {
    const el = await makeTimePicker('value="14:30" step="15"');
    const min = segment(el, 'minutes');
    min.focus();
    await keydown(min, 'ArrowUp', el);
    expect(el.value).toBe('14:45');
    await keydown(min, 'ArrowDown', el);
    await keydown(min, 'ArrowDown', el);
    expect(el.value).toBe('14:15');
  });

  it('arrow keys increment hour segment', async () => {
    const el = await makeTimePicker('value="14:30"');
    const hr = segment(el, 'hours');
    hr.focus();
    await keydown(hr, 'ArrowUp', el);
    expect(el.value).toBe('15:30');
  });

  it('emits change when value changes via keyboard', async () => {
    const el = await makeTimePicker('value="14:30"');
    const min = segment(el, 'minutes');
    min.focus();
    const eventPromise = oneEvent(el, 'change');
    await keydown(min, 'ArrowUp', el);
    await eventPromise;
    expect(getMockInternals(el).formValue).toBe('14:31');
  });

  it('reflects disabled, invalid, required attributes', async () => {
    const el = await makeTimePicker('disabled invalid required');
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.hasAttribute('invalid')).toBe(true);
    expect(el.hasAttribute('required')).toBe(true);
  });

  it('clamps hour wrap-around (23 → 0)', async () => {
    const el = await makeTimePicker('value="23:00"');
    const hr = segment(el, 'hours');
    hr.focus();
    await keydown(hr, 'ArrowUp', el);
    expect(el.value).toBe('00:00');
    await waitForUpdate(el);
  });
});

describe('am-time-picker — validation (jsdom lane)', () => {
  type ValidatingTimePicker = TimePickerEl & {
    setCustomError(message: string): void;
    updateComplete: Promise<unknown>;
  };

  function firstSegment(el: TimePickerEl): HTMLButtonElement {
    return shadowQuery<HTMLButtonElement>(el, '.segment');
  }

  it('shows NO validation error on first paint for a required empty time-picker (D-01)', async () => {
    const el = await fixture<ValidatingTimePicker>('<am-time-picker label="Start" required></am-time-picker>');
    expect(el.invalid).toBe(false);
    expect(el.shadowRoot?.querySelector('[part="error"]')).toBeNull();
    expect(firstSegment(el).getAttribute('aria-describedby')).toBeNull();
  });

  it('surfaces the native message only after a segment is touched (D-01 gate)', async () => {
    const el = await fixture<ValidatingTimePicker>('<am-time-picker label="Start" required></am-time-picker>');
    const seg = firstSegment(el);

    expect(el.shadowRoot?.querySelector('[part="error"]')).toBeNull();

    seg.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await el.updateComplete;
    await waitForUpdate(el);

    const error = el.shadowRoot?.querySelector('[part="error"]');
    expect(error).not.toBeNull();
    expect(el.invalid).toBe(true);
    const describedBy = seg.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(el.shadowRoot?.getElementById(describedBy!)).toBe(error);
  });

  it('setCustomError shows immediately and reflects the invalid attribute (D-03)', async () => {
    const el = await fixture<ValidatingTimePicker>('<am-time-picker label="Start"></am-time-picker>');
    el.setCustomError('Pick a time');
    await el.updateComplete;
    await waitForUpdate(el);

    expect(el.hasAttribute('invalid')).toBe(true);
    const error = el.shadowRoot?.querySelector('[part="error"]');
    expect(error?.textContent).toBe('Pick a time');
    expect(error?.getAttribute('aria-live')).toBe('polite');
    expect(error?.getAttribute('role')).toBeNull();
  });

  it("setCustomError('') clears the error when there is no native violation", async () => {
    const el = await fixture<ValidatingTimePicker>('<am-time-picker label="Start"></am-time-picker>');
    el.setCustomError('Server says no');
    await el.updateComplete;
    await waitForUpdate(el);
    expect(el.hasAttribute('invalid')).toBe(true);

    el.setCustomError('');
    await el.updateComplete;
    await waitForUpdate(el);
    expect(el.hasAttribute('invalid')).toBe(false);
    expect(el.shadowRoot?.querySelector('[part="error"]')).toBeNull();
  });

  it('custom error wins over the native required message (D-03 precedence)', async () => {
    const el = await fixture<ValidatingTimePicker>('<am-time-picker label="Start" required></am-time-picker>');
    firstSegment(el).dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    el.setCustomError('Custom wins');
    await el.updateComplete;
    await waitForUpdate(el);

    const error = el.shadowRoot?.querySelector('[part="error"]');
    expect(error?.textContent).toBe('Custom wins');
  });
});

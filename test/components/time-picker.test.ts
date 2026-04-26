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

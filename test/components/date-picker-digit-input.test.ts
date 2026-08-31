import { describe, expect, it } from 'vitest';

import '../../src/components/date-picker/date-picker';
import { fixture, keydown, shadowQuery, waitForUpdate } from '../helpers';

// COVERAGE (ci-coverage-gate-fail) — keyboard SEGMENT DIGIT-INPUT.
// The date-picker's type-to-set digit entry (_handleDigitInput and the segment
// navigation/clamp helpers it drives: _advanceToNextSegment, _getSegmentOrder,
// _focusSegment, _clampDay, _resetBufferTimer, _ensureValue) is plain keyboard
// interaction logic — fully reachable under jsdom by dispatching digit keydowns
// on a focused segment. These assert the real emitted value, not just coverage.

type DatePickerEl = HTMLElement & {
  value: string;
  disabled: boolean;
  readonly: boolean;
};

async function makeDatePicker(extra = ''): Promise<DatePickerEl> {
  return fixture<DatePickerEl>(`<am-date-picker ${extra}></am-date-picker>`);
}

function segment(el: DatePickerEl, name: 'year' | 'month' | 'day'): HTMLButtonElement {
  return shadowQuery<HTMLButtonElement>(el, `[data-segment="${name}"]`);
}

function activeSegment(el: DatePickerEl): string {
  return (el as unknown as { _activeSegment: string })._activeSegment;
}

async function focusSegment(
  el: DatePickerEl,
  name: 'year' | 'month' | 'day',
): Promise<HTMLButtonElement> {
  const seg = segment(el, name);
  seg.focus();
  seg.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
  await waitForUpdate(el);
  return seg;
}

async function typeDigits(
  el: DatePickerEl,
  seg: HTMLButtonElement,
  digits: string,
): Promise<void> {
  for (const d of digits) {
    await keydown(seg, d, el);
  }
}

describe('am-date-picker — keyboard digit input (coverage)', () => {
  it('types a full 4-digit year, commits it, and auto-advances to the month segment', async () => {
    const el = await makeDatePicker('value="2020-06-15"');
    const seg = await focusSegment(el, 'year');

    await typeDigits(el, seg, '1999');

    // _handleDigitInput(year) collects 4 digits then commits + advances.
    expect(el.value.split('-')[0]).toBe('1999');
    expect(activeSegment(el)).toBe('month');
  });

  it('commits a high first month digit (>1) immediately and advances to day', async () => {
    const el = await makeDatePicker('value="2025-06-15"');
    const seg = await focusSegment(el, 'month');

    // '5' > 1, so the single digit resolves the month with no second keystroke.
    await typeDigits(el, seg, '5');

    expect(el.value.split('-')[1]).toBe('05');
    expect(activeSegment(el)).toBe('day');
  });

  it('collects a two-digit month when the first digit is 0 or 1', async () => {
    const el = await makeDatePicker('value="2025-06-15"');
    const seg = await focusSegment(el, 'month');

    // '1' is not > 1, so it buffers; '2' resolves the two-digit month "12".
    await typeDigits(el, seg, '12');

    expect(el.value.split('-')[1]).toBe('12');
    expect(activeSegment(el)).toBe('day');
  });

  it('commits a high first day digit (> max first digit) immediately', async () => {
    const el = await makeDatePicker('value="2025-03-15"');
    const seg = await focusSegment(el, 'day');

    // March has 31 days -> maxFirst = 3; '4' > 3 so it resolves to day 04.
    await typeDigits(el, seg, '4');

    expect(el.value).toBe('2025-03-04');
  });

  it('collects a two-digit day when the first digit is low', async () => {
    const el = await makeDatePicker('value="2025-03-01"');
    const seg = await focusSegment(el, 'day');

    await typeDigits(el, seg, '15');

    expect(el.value).toBe('2025-03-15');
  });

  it('clamps an out-of-range day when the entered month is shorter (_clampDay)', async () => {
    const el = await makeDatePicker('value="2025-01-31"');
    const seg = await focusSegment(el, 'month');

    // Switch to February (28 days in 2025) — day 31 must clamp down to 28.
    await typeDigits(el, seg, '02');

    expect(el.value).toBe('2025-02-28');
  });

  it('materialises today when digits are typed with no prior value (_ensureValue)', async () => {
    const el = await makeDatePicker();
    expect(el.value).toBe('');

    const seg = await focusSegment(el, 'year');
    await typeDigits(el, seg, '2001');

    // _ensureValue backfills month/day from today, then the typed year commits.
    expect(el.value).toMatch(/^2001-\d{2}-\d{2}$/);
  });

  it('ignores digit input when disabled', async () => {
    const el = await makeDatePicker('disabled value="2025-03-15"');
    const seg = await focusSegment(el, 'year');

    await typeDigits(el, seg, '1999');

    // Guarded early-return: value is untouched.
    expect(el.value).toBe('2025-03-15');
  });
});

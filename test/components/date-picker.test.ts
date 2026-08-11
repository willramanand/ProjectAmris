import { describe, expect, it, vi } from 'vitest';

import '../../src/components/date-picker/date-picker';
import { click, fixture, getMockInternals, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

type DatePickerEl = HTMLElement & {
  value: string;
  label: string;
  min: string;
  max: string;
  disabled: boolean;
  readonly: boolean;
  invalid: boolean;
};

async function makeDatePicker(extra = ''): Promise<DatePickerEl> {
  return fixture<DatePickerEl>(`<am-date-picker ${extra}></am-date-picker>`);
}

function calendarIcon(el: DatePickerEl): HTMLElement {
  return shadowQuery<HTMLElement>(el, '.calendar-icon');
}

function dropdown(el: DatePickerEl): HTMLElement {
  return shadowQuery<HTMLElement>(el, '.dropdown');
}

describe('am-date-picker', () => {
  it('renders label and Y-M-D segments', async () => {
    const el = await makeDatePicker('label="Start date"');
    expect(shadowQuery<HTMLElement>(el, '.floating-label').textContent?.trim()).toBe('Start date');
    expect(el.shadowRoot?.querySelectorAll('.segment').length).toBe(3);
  });

  it('opens the calendar dropdown when icon is clicked', async () => {
    const el = await makeDatePicker();
    expect(dropdown(el).classList.contains('open')).toBe(false);

    await click(calendarIcon(el), el);
    expect(dropdown(el).classList.contains('open')).toBe(true);
  });

  it('selects a date via the calendar and emits change', async () => {
    const el = await makeDatePicker('value="2025-06-15"');
    await click(calendarIcon(el), el);

    // Pick day 20
    const days = Array.from(
      dropdown(el).querySelector('am-calendar')?.shadowRoot?.querySelectorAll('.day:not(.outside)') ?? [],
    ) as HTMLButtonElement[];
    const target = days.find((d) => d.textContent?.trim() === '20')!;
    expect(target).toBeTruthy();

    const eventPromise = oneEvent(el, 'change');
    await click(target, el);
    await eventPromise;

    expect(el.value).toBe('2025-06-20');
    expect(getMockInternals(el).formValue).toBe('2025-06-20');
  });

  it('reflects disabled and does not open', async () => {
    const el = await makeDatePicker('disabled');
    await click(calendarIcon(el), el);
    expect(dropdown(el).classList.contains('open')).toBe(false);
  });

  it('reflects invalid and required attributes', async () => {
    const el = await makeDatePicker('invalid required');
    expect(el.hasAttribute('invalid')).toBe(true);
    expect(el.hasAttribute('required')).toBe(true);
  });

  it('arrow keys on a segment increment/decrement value', async () => {
    const el = await makeDatePicker('value="2025-06-15"');
    const segDay = shadowQuery<HTMLButtonElement>(el, '.seg-day');
    segDay.focus();
    await keydown(segDay, 'ArrowUp', el);
    expect(el.value).toBe('2025-06-16');
    await keydown(segDay, 'ArrowDown', el);
    await keydown(segDay, 'ArrowDown', el);
    expect(el.value).toBe('2025-06-14');
  });

  it('closes dropdown after a date is selected', async () => {
    const el = await makeDatePicker('value="2025-06-15"');
    await click(calendarIcon(el), el);
    expect(dropdown(el).classList.contains('open')).toBe(true);

    const days = Array.from(
      dropdown(el).querySelector('am-calendar')?.shadowRoot?.querySelectorAll('.day:not(.outside)') ?? [],
    ) as HTMLButtonElement[];
    const target = days.find((d) => d.textContent?.trim() === '10')!;
    await click(target, el);
    await waitForUpdate(el);

    expect(dropdown(el).classList.contains('open')).toBe(false);
  });
});

// TEST-05 — global-listener teardown spies (jsdom lifecycle lane).
// am-date-picker attaches a document-level `click` listener when the calendar
// dropdown opens and removes it when it closes (and on disconnect).
describe('am-date-picker — document listener teardown (TEST-05)', () => {
  function outsideClickHandler(el: DatePickerEl): EventListener {
    return (el as unknown as { _handleOutsideClick: EventListener })._handleOutsideClick;
  }

  it('attaches a document click listener on open and removes it on close', async () => {
    const el = await makeDatePicker();
    const handler = outsideClickHandler(el);
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    await click(calendarIcon(el), el); // open
    expect(dropdown(el).classList.contains('open')).toBe(true);
    expect(addSpy).toHaveBeenCalledWith('click', handler);

    // Close via an outside click.
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await waitForUpdate(el);
    expect(dropdown(el).classList.contains('open')).toBe(false);
    expect(removeSpy).toHaveBeenCalledWith('click', handler);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('detaches the document click listener on disconnect while open', async () => {
    const el = await makeDatePicker();
    await click(calendarIcon(el), el);
    const handler = outsideClickHandler(el);

    const removeSpy = vi.spyOn(document, 'removeEventListener');
    el.remove();
    await waitForUpdate(el);
    expect(removeSpy).toHaveBeenCalledWith('click', handler);
    removeSpy.mockRestore();
  });
});

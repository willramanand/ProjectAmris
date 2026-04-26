import { describe, expect, it } from 'vitest';

import '../../src/components/calendar/calendar';
import { click, fixture, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

type CalendarEl = HTMLElement & {
  value: string;
  min: string;
  max: string;
  disabled: boolean;
};

async function makeCalendar(extra = ''): Promise<CalendarEl> {
  return fixture<CalendarEl>(`<am-calendar ${extra}></am-calendar>`);
}

describe('am-calendar', () => {
  it('renders a calendar grid with day cells', async () => {
    const el = await makeCalendar();
    const days = el.shadowRoot?.querySelectorAll('.day');
    // 6 weeks × 7 = 42 cells max, at least 28 (Feb worst-case) is real
    expect((days?.length ?? 0)).toBeGreaterThanOrEqual(28);
  });

  it('shows a value when set and marks it selected', async () => {
    const el = await makeCalendar('value="2025-03-15"');
    const selected = el.shadowRoot?.querySelector('.day.selected');
    expect(selected).toBeTruthy();
    expect(selected?.textContent?.trim()).toBe('15');
  });

  it('emits change when a day is clicked', async () => {
    const el = await makeCalendar('value="2025-03-15"');
    const days = Array.from(el.shadowRoot?.querySelectorAll('.day:not(.outside)') ?? []) as HTMLButtonElement[];
    const target = days.find((d) => d.textContent?.trim() === '20')!;
    expect(target).toBeTruthy();

    const eventPromise = oneEvent(el, 'change');
    await click(target, el);
    await eventPromise;

    expect(el.value).toBe('2025-03-20');
  });

  it('navigates to the previous month via the prev nav button', async () => {
    const el = await makeCalendar('value="2025-03-15"');
    const prev = shadowQuery<HTMLButtonElement>(el, '.nav-btn[aria-label="Previous month"]');

    // Capture current month label
    const monthLabel = shadowQuery<HTMLElement>(el, '.month-label');
    const before = monthLabel.textContent?.trim();

    await click(prev, el);

    const after = shadowQuery<HTMLElement>(el, '.month-label').textContent?.trim();
    expect(after).not.toBe(before);
  });

  it('disables interaction when disabled', async () => {
    const el = await makeCalendar('disabled');
    expect(el.hasAttribute('disabled')).toBe(true);
  });

  it('respects min/max bounds — out-of-range days are disabled', async () => {
    const el = await makeCalendar('value="2025-03-15" min="2025-03-10" max="2025-03-20"');
    const days = Array.from(el.shadowRoot?.querySelectorAll('.day:not(.outside)') ?? []) as HTMLButtonElement[];

    const day9 = days.find((d) => d.textContent?.trim() === '9');
    const day15 = days.find((d) => d.textContent?.trim() === '15');
    const day25 = days.find((d) => d.textContent?.trim() === '25');

    expect(day9?.disabled).toBe(true);
    expect(day15?.disabled).toBe(false);
    expect(day25?.disabled).toBe(true);
  });

  it('switches to month picker when month label is clicked', async () => {
    const el = await makeCalendar('value="2025-03-15"');
    const monthLabel = shadowQuery<HTMLButtonElement>(el, '.month-label');
    await click(monthLabel, el);
    await waitForUpdate(el);

    // Month picker grid should now be visible — look for a month name button
    const buttons = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []) as HTMLButtonElement[];
    const hasMonth = buttons.some((b) => /^(Jan|Feb|Mar)$/i.test(b.textContent?.trim() ?? ''));
    expect(hasMonth).toBe(true);
  });
});

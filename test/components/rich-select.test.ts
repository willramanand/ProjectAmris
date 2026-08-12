import { describe, expect, it } from 'vitest';

import '../../src/components/rich-select/rich-select';
import type { RichOption } from '../../src/components/rich-select/rich-select';
import { click, fixture, getMockInternals, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

type RichSelectEl = HTMLElement & {
  value: string;
  options: RichOption[];
  searchable: boolean;
  disabled: boolean;
  invalid: boolean;
};

const OPTIONS: RichOption[] = [
  { value: 'alice', label: 'Alice', description: 'Engineering' },
  { value: 'bob', label: 'Bob', description: 'Design', icon: '🎨' },
  { value: 'carol', label: 'Carol', description: 'Product', group: 'Leads' },
  { value: 'dan', label: 'Dan', disabled: true },
];

async function makeRichSelect(extra = ''): Promise<RichSelectEl> {
  const el = await fixture<RichSelectEl>(`<am-rich-select label="Assignee" ${extra}></am-rich-select>`);
  el.options = [...OPTIONS];
  await waitForUpdate(el);
  return el;
}

function trigger(el: RichSelectEl): HTMLElement {
  return shadowQuery<HTMLElement>(el, '.trigger');
}

function listOptions(el: RichSelectEl): HTMLElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll('.option') ?? []) as HTMLElement[];
}

describe('am-rich-select', () => {
  it('renders trigger with placeholder when no value', async () => {
    const el = await makeRichSelect();
    expect(el.shadowRoot?.querySelector('.placeholder')).toBeTruthy();
  });

  it('opens listbox on trigger click and exposes role=combobox', async () => {
    const el = await makeRichSelect();
    const t = trigger(el);
    expect(t.getAttribute('role')).toBe('combobox');
    expect(t.getAttribute('aria-expanded')).toBe('false');

    await click(t, el);
    expect(t.getAttribute('aria-expanded')).toBe('true');
    expect(listOptions(el).length).toBe(4);
  });

  it('selects an option on click and emits change', async () => {
    const el = await makeRichSelect();
    await click(trigger(el), el);

    const eventPromise = oneEvent(el, 'change');
    await click(listOptions(el)[1], el); // Bob
    await eventPromise;

    expect(el.value).toBe('bob');
    expect(getMockInternals(el).formValue).toBe('bob');
  });

  it('does not select disabled options', async () => {
    const el = await makeRichSelect();
    await click(trigger(el), el);

    const disabledOpt = el.shadowRoot?.querySelector('.option.disabled') as HTMLElement;
    expect(disabledOpt).toBeTruthy();

    let fired = false;
    el.addEventListener('change', () => { fired = true; });
    await click(disabledOpt, el);

    expect(fired).toBe(false);
    expect(el.value).toBe('');
  });

  it('renders option description and icon', async () => {
    const el = await makeRichSelect();
    await click(trigger(el), el);

    const opts = listOptions(el);
    expect(opts[0].querySelector('.option-description')?.textContent?.trim()).toBe('Engineering');
    expect(opts[1].querySelector('.option-icon')?.textContent?.trim()).toBe('🎨');
  });

  it('groups options under group headings when group is set', async () => {
    const el = await makeRichSelect();
    await click(trigger(el), el);

    const groupLabel = el.shadowRoot?.querySelector('.group-label');
    expect(groupLabel?.textContent?.trim()).toBe('Leads');
  });

  it('closes listbox on Escape', async () => {
    const el = await makeRichSelect();
    await click(trigger(el), el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true');

    await keydown(trigger(el), 'Escape', el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('navigates with ArrowDown and selects on Enter', async () => {
    const el = await makeRichSelect();
    await click(trigger(el), el);
    await keydown(trigger(el), 'ArrowDown', el);
    await keydown(trigger(el), 'Enter', el);

    expect(el.value).toBe('alice');
  });

  it('does not open when disabled', async () => {
    const el = await makeRichSelect('disabled');
    const t = trigger(el);
    await click(t, el);
    expect(t.getAttribute('aria-expanded')).toBe('false');
  });

  it('reflects invalid via aria-invalid', async () => {
    const el = await makeRichSelect('invalid');
    expect(trigger(el).getAttribute('aria-invalid')).toBe('true');
  });

  it('search input filters options when searchable', async () => {
    const el = await makeRichSelect('searchable');
    await click(trigger(el), el);

    const input = shadowQuery<HTMLInputElement>(el, '.search-input');
    input.value = 'al';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await waitForUpdate(el);

    const labels = listOptions(el).map((o) => o.querySelector('.option-label')?.textContent?.trim());
    expect(labels).toEqual(['Alice']);
  });
});

// TEST-04 — dynamic option-update index clamp (jsdom logic lane).
// am-rich-select is data-driven via the `options` (RichOption[]) property.
// Replacing it with a much shorter array while open must not surface an
// out-of-bounds highlighted option. Asserts the observable bound (green-on-
// arrival, D-05); see SUMMARY for the raw-state finding.
describe('am-rich-select — dynamic option-update index clamp (TEST-04)', () => {
  const BIG: RichOption[] = Array.from({ length: 30 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }));

  async function openWithBigOptions(): Promise<RichSelectEl> {
    const el = await makeRichSelect();
    el.options = [...BIG];
    await waitForUpdate(el);
    await click(trigger(el), el); // open
    return el;
  }

  function highlightedDomIndex(el: RichSelectEl): number {
    return listOptions(el).findIndex((o) => o.classList.contains('highlighted'));
  }

  it('keeps the highlighted index within bounds when options shrink while open', async () => {
    const el = await openWithBigOptions();

    // Highlight near the end of the large list.
    (el as unknown as { _highlightedIndex: number })._highlightedIndex = BIG.length - 1;
    await waitForUpdate(el);

    el.options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ];
    await waitForUpdate(el);

    const opts = listOptions(el);
    expect(opts.length).toBe(2);
    expect(opts.map((o) => o.querySelector('.option-label')?.textContent?.trim())).toEqual(['Alpha', 'Beta']);
    // The stale index-29 highlight must not survive onto the 2-option list.
    // (`highlightedDomIndex` is < length by construction, so assert the
    // concrete `-1` — no rendered option is left highlighted at all.)
    expect(highlightedDomIndex(el)).toBe(-1);

    // Navigating clamps the highlight back into range — it lands on a real,
    // in-bounds option rather than dereferencing the stale index.
    await keydown(trigger(el), 'ArrowDown', el);
    const navIdx = highlightedDomIndex(el);
    expect(navIdx).toBeGreaterThanOrEqual(0);
    expect(navIdx).toBeLessThan(listOptions(el).length);
    const rawIndex = (el as unknown as { _highlightedIndex: number })._highlightedIndex;
    expect(rawIndex).toBeGreaterThanOrEqual(0);
    expect(rawIndex).toBeLessThan(listOptions(el).length);
  });

  it('holds bounds through rapid successive option replacements', async () => {
    const el = await openWithBigOptions();
    (el as unknown as { _highlightedIndex: number })._highlightedIndex = BIG.length - 1;
    await waitForUpdate(el);

    el.options = [
      { value: 'x', label: 'X' },
      { value: 'y', label: 'Y' },
      { value: 'z', label: 'Z' },
    ];
    el.options = [{ value: 'solo', label: 'Solo' }];
    await waitForUpdate(el);

    const opts = listOptions(el);
    expect(opts.length).toBe(1);
    // No stale highlight lingers after the rapid shrink.
    expect(highlightedDomIndex(el)).toBe(-1);

    // A navigation keystroke clamps the highlight into the 1-option range.
    await keydown(trigger(el), 'ArrowDown', el);
    const navIdx = highlightedDomIndex(el);
    expect(navIdx).toBeGreaterThanOrEqual(0);
    expect(navIdx).toBeLessThan(listOptions(el).length);
    const rawIndex = (el as unknown as { _highlightedIndex: number })._highlightedIndex;
    expect(rawIndex).toBeGreaterThanOrEqual(0);
    expect(rawIndex).toBeLessThan(listOptions(el).length);
  });
});

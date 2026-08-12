import { describe, expect, it, vi } from 'vitest';

import '../../src/components/combobox/combobox';
import { click, fixture, getMockInternals, inputText, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

type ComboboxEl = HTMLElement & {
  value: string;
  options: string[];
  async: boolean;
  loading: boolean;
  disabled: boolean;
  readonly: boolean;
  select: boolean;
};

const FRUITS = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry'];

async function makeCombobox(extra = ''): Promise<ComboboxEl> {
  const el = await fixture<ComboboxEl>(`<am-combobox label="Fruit" ${extra}></am-combobox>`);
  el.options = [...FRUITS];
  await waitForUpdate(el);
  return el;
}

function getInput(el: ComboboxEl): HTMLInputElement {
  return shadowQuery<HTMLInputElement>(el, 'input');
}

function getOptions(el: ComboboxEl): HTMLElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll('.option') ?? []) as HTMLElement[];
}

describe('am-combobox', () => {
  it('renders the floating label', async () => {
    const el = await makeCombobox();
    const label = el.shadowRoot?.querySelector('[part="label"]');
    expect(label?.textContent?.trim()).toBe('Fruit');
  });

  it('opens listbox on focus and closes on Escape', async () => {
    const el = await makeCombobox();
    const input = getInput(el);

    input.focus();
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
    await waitForUpdate(el);
    expect(input.getAttribute('aria-expanded')).toBe('true');

    await keydown(input, 'Escape', el);
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('filters options as the user types (sync mode)', async () => {
    const el = await makeCombobox();
    const input = getInput(el);

    input.focus();
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
    await waitForUpdate(el);

    await inputText(input, 'ap', el);
    const visible = getOptions(el).map((o) => o.textContent?.trim());
    expect(visible).toEqual(['Apple', 'Apricot']);
  });

  it('selects an option on click and emits change', async () => {
    const el = await makeCombobox();
    const input = getInput(el);

    input.focus();
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
    await waitForUpdate(el);

    const eventPromise = oneEvent(el, 'change');
    const opts = getOptions(el);
    await click(opts[2], el); // Banana
    await eventPromise;

    expect(el.value).toBe('Banana');
    expect(getMockInternals(el).formValue).toBe('Banana');
  });

  it('navigates options with ArrowDown/ArrowUp and selects on Enter', async () => {
    const el = await makeCombobox();
    const input = getInput(el);

    input.focus();
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
    await waitForUpdate(el);

    await keydown(input, 'ArrowDown', el);
    await keydown(input, 'ArrowDown', el);
    await keydown(input, 'Enter', el);

    expect(el.value).toBe('Apricot');
  });

  it('does not open or react when disabled', async () => {
    const el = await makeCombobox('disabled');
    const input = getInput(el);
    expect(input.disabled).toBe(true);

    // A disabled combobox must not open. The native disabled <input> is what
    // blocks user interaction, so exercise the real focus()/click() methods
    // (which honour `disabled`) rather than synthetic events, and confirm the
    // listbox never expands.
    input.focus();
    await waitForUpdate(el);
    input.click();
    await waitForUpdate(el);

    expect(input.getAttribute('aria-expanded')).toBe('false');
    const listbox = el.shadowRoot?.querySelector('.listbox');
    expect(listbox?.classList.contains('open')).toBe(false);
  });

  it('does not filter and emits am-search in async mode', async () => {
    const el = await makeCombobox('async');
    const input = getInput(el);

    input.focus();
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
    await waitForUpdate(el);

    const eventPromise = oneEvent<{ query: string }>(el, 'am-search');
    await inputText(input, 'xy', el);
    const ev = await eventPromise;
    expect(ev.detail.query).toBe('xy');

    // Async mode does not filter the local options array.
    const visible = getOptions(el).map((o) => o.textContent?.trim());
    expect(visible).toEqual(FRUITS);
  });

  it('shows a "No results" empty state when filter yields nothing', async () => {
    const el = await makeCombobox();
    const input = getInput(el);

    input.focus();
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
    await waitForUpdate(el);

    await inputText(input, 'zzzz', el);
    const empty = el.shadowRoot?.querySelector('.empty');
    expect(empty?.textContent?.trim()).toBe('No results');
  });

  it('reflects required and invalid attributes', async () => {
    const el = await makeCombobox('required invalid');
    expect(el.hasAttribute('required')).toBe(true);
    expect(el.hasAttribute('invalid')).toBe(true);
    const input = getInput(el);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});

// TEST-04 — async/dynamic option-update index clamp (jsdom logic lane).
// Replacing `options` with a much shorter array while the listbox is open must
// not surface an out-of-bounds highlighted option. These assert the observable
// DOM bound (green-on-arrival, D-05); see SUMMARY for the raw-state finding.
describe('am-combobox — dynamic option-update index clamp (TEST-04)', () => {
  const BIG = Array.from({ length: 40 }, (_, i) => `Item ${i}`);

  async function openWithBigOptions(): Promise<ComboboxEl> {
    const el = await makeCombobox();
    el.options = [...BIG];
    await waitForUpdate(el);
    const input = getInput(el);
    input.focus();
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
    await waitForUpdate(el);
    return el;
  }

  function highlightedDomIndex(el: ComboboxEl): number {
    return getOptions(el).findIndex((o) => o.classList.contains('highlighted'));
  }

  it('keeps the highlighted option within bounds when options shrink while open', async () => {
    const el = await openWithBigOptions();

    // Highlight near the end of the large list.
    (el as unknown as { _highlightedIndex: number })._highlightedIndex = BIG.length - 1;
    await waitForUpdate(el);

    // Replace with a much shorter array.
    el.options = ['Apple', 'Banana'];
    await waitForUpdate(el);

    const rendered = getOptions(el);
    expect(rendered.length).toBe(2);
    // Stale options from the previous set do not linger.
    expect(rendered.map((o) => o.textContent?.trim())).toEqual(['Apple', 'Banana']);
    // The stale index-39 highlight must not survive onto the 2-option list.
    // (`highlightedDomIndex` is < length by construction, so assert the
    // concrete `-1` — no rendered option is left highlighted at all.)
    expect(highlightedDomIndex(el)).toBe(-1);

    // Navigating clamps the highlight back into range — it lands on a real,
    // in-bounds option rather than dereferencing the stale index.
    await keydown(getInput(el), 'ArrowDown', el);
    const navIdx = highlightedDomIndex(el);
    expect(navIdx).toBeGreaterThanOrEqual(0);
    expect(navIdx).toBeLessThan(getOptions(el).length);
    const rawIndex = (el as unknown as { _highlightedIndex: number })._highlightedIndex;
    expect(rawIndex).toBeGreaterThanOrEqual(0);
    expect(rawIndex).toBeLessThan(getOptions(el).length);
  });

  it('holds bounds through rapid successive option replacements', async () => {
    const el = await openWithBigOptions();
    (el as unknown as { _highlightedIndex: number })._highlightedIndex = BIG.length - 1;
    await waitForUpdate(el);

    // Replace twice in quick succession before the next render settles.
    el.options = ['One', 'Two', 'Three'];
    el.options = ['Solo'];
    await waitForUpdate(el);

    const rendered = getOptions(el);
    expect(rendered.length).toBe(1);
    expect(rendered.map((o) => o.textContent?.trim())).toEqual(['Solo']);
    // No stale highlight lingers after the rapid shrink.
    expect(highlightedDomIndex(el)).toBe(-1);

    // A navigation keystroke clamps the highlight into the 1-option range.
    await keydown(getInput(el), 'ArrowDown', el);
    const navIdx = highlightedDomIndex(el);
    expect(navIdx).toBeGreaterThanOrEqual(0);
    expect(navIdx).toBeLessThan(getOptions(el).length);
    const rawIndex = (el as unknown as { _highlightedIndex: number })._highlightedIndex;
    expect(rawIndex).toBeGreaterThanOrEqual(0);
    expect(rawIndex).toBeLessThan(getOptions(el).length);
  });
});

// TEST-05 — global-listener teardown spies (jsdom lifecycle lane).
// am-combobox attaches a document-level `click` listener when the listbox opens
// and removes it when it closes (and on disconnect). Spies confirm attach-on-
// open / detach-on-close and a balanced cycle.
describe('am-combobox — document listener teardown (TEST-05)', () => {
  function documentClickHandler(el: ComboboxEl): EventListener {
    return (el as unknown as { _handleDocumentClick: EventListener })._handleDocumentClick;
  }

  async function open(el: ComboboxEl): Promise<void> {
    const input = getInput(el);
    input.focus();
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
    await waitForUpdate(el);
  }

  it('attaches a document click listener on open and removes it on close', async () => {
    const el = await makeCombobox();
    const handler = documentClickHandler(el);
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    await open(el);
    expect(addSpy).toHaveBeenCalledWith('click', handler);

    await keydown(getInput(el), 'Escape', el);
    expect(removeSpy).toHaveBeenCalledWith('click', handler);

    // Attach/detach counts for this handler are balanced across the cycle.
    const adds = addSpy.mock.calls.filter(([type, fn]) => type === 'click' && fn === handler).length;
    const removes = removeSpy.mock.calls.filter(([type, fn]) => type === 'click' && fn === handler).length;
    expect(adds).toBe(removes);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('detaches the document click listener on disconnect while open', async () => {
    const el = await makeCombobox();
    const handler = documentClickHandler(el);
    await open(el);

    const removeSpy = vi.spyOn(document, 'removeEventListener');
    el.remove();
    await waitForUpdate(el);
    expect(removeSpy).toHaveBeenCalledWith('click', handler);
    removeSpy.mockRestore();
  });
});

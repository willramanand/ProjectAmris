import { describe, expect, it } from 'vitest';

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

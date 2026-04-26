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

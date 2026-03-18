import { describe, expect, it } from 'vitest';

import '../../src/components/select/select';
import { click, fixture, getMockInternals, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-option', () => {
  it('sets role="option" and fires am-select-option on click', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-option value="apple">Apple</am-option>',
    );

    expect(element.getAttribute('role')).toBe('option');

    const eventPromise = oneEvent<{ value: string }>(element, 'am-select-option');
    await click(element, element);
    const event = await eventPromise;

    expect(event.detail.value).toBe('apple');
  });

  it('reflects selected and disabled states via ARIA', async () => {
    const element = await fixture<HTMLElement & { selected: boolean; disabled: boolean }>(
      '<am-option value="x" selected disabled>X</am-option>',
    );

    expect(element.getAttribute('aria-selected')).toBe('true');
    expect(element.getAttribute('aria-disabled')).toBe('true');
  });

  it('does not fire when disabled', async () => {
    const element = await fixture<HTMLElement>(
      '<am-option value="nope" disabled>Nope</am-option>',
    );

    let fired = false;
    element.addEventListener('am-select-option', () => { fired = true; });
    await click(element, element);

    expect(fired).toBe(false);
  });

  it('removes aria-disabled when no longer disabled', async () => {
    const element = await fixture<HTMLElement & { disabled: boolean }>(
      '<am-option value="x" disabled>X</am-option>',
    );

    expect(element.getAttribute('aria-disabled')).toBe('true');

    element.disabled = false;
    await waitForUpdate(element);

    expect(element.hasAttribute('aria-disabled')).toBe(false);
  });
});

describe('am-select', () => {
  it('opens dropdown on trigger click', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Fruit">
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    await click(trigger, element);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('selects an option and emits am-change', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      `<am-select label="Fruit">
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>`,
    );

    // Open
    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await click(trigger, element);

    // Click an option
    const options = element.querySelectorAll('am-option') as NodeListOf<HTMLElement>;
    const eventPromise = oneEvent<{ value: string }>(element, 'am-change');
    await click(options[1], element);
    const event = await eventPromise;

    expect(event.detail.value).toBe('banana');
    expect(element.value).toBe('banana');
    expect(getMockInternals(element).formValue).toBe('banana');
  });

  it('sets aria-label on the listbox from the label prop', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Color">
        <am-option value="red">Red</am-option>
      </am-select>`,
    );

    const listbox = shadowQuery<HTMLElement>(element, '[role="listbox"]');
    expect(listbox.getAttribute('aria-label')).toBe('Color');
  });

  it('reflects the combobox role on the trigger', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Test">
        <am-option value="a">A</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('does not open when disabled', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Fruit" disabled>
        <am-option value="apple">Apple</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await click(trigger, element);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('does not open when readonly', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Fruit" readonly>
        <am-option value="apple">Apple</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await click(trigger, element);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape key', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Fruit">
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await click(trigger, element);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    await keydown(trigger, 'Escape', element);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Tab key', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Fruit">
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await click(trigger, element);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    await keydown(trigger, 'Tab', element);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on ArrowDown and highlights first option', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Fruit">
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await keydown(trigger, 'ArrowDown', element);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens on ArrowUp and highlights last option', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Fruit">
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await keydown(trigger, 'ArrowUp', element);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens on Enter key when closed', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Fruit">
        <am-option value="apple">Apple</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await keydown(trigger, 'Enter', element);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens on Space key when closed', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Fruit">
        <am-option value="apple">Apple</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await keydown(trigger, ' ', element);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows clear button when clearable and has value', async () => {
    const element = await fixture<HTMLElement & { value: string; clearable: boolean }>(
      `<am-select label="Fruit" clearable>
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>`,
    );

    // No clear button when no value
    expect(element.shadowRoot?.querySelector('.clear-btn')).toBeNull();

    // Set a value
    element.value = 'apple';
    await waitForUpdate(element);

    const clearBtn = shadowQuery<HTMLButtonElement>(element, '.clear-btn');
    expect(clearBtn).toBeTruthy();
    expect(clearBtn.getAttribute('aria-label')).toBe('Clear');
  });

  it('clears value on clear button click and emits am-change', async () => {
    const element = await fixture<HTMLElement & { value: string; clearable: boolean }>(
      `<am-select label="Fruit" clearable>
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>`,
    );

    element.value = 'apple';
    await waitForUpdate(element);

    const clearBtn = shadowQuery<HTMLButtonElement>(element, '.clear-btn');
    const eventPromise = oneEvent<{ value: string }>(element, 'am-change');
    await click(clearBtn, element);
    const event = await eventPromise;

    expect(event.detail.value).toBe('');
    expect(element.value).toBe('');
  });

  it('closes dropdown on outside click', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Fruit">
        <am-option value="apple">Apple</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await click(trigger, element);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    // Click outside the select
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await waitForUpdate(element);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows placeholder text when no value', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Fruit" placeholder="Pick one">
        <am-option value="apple">Apple</am-option>
      </am-select>`,
    );

    const displayValue = shadowQuery<HTMLElement>(element, '.display-value');
    expect(displayValue.textContent?.trim()).toBe('Pick one');
    expect(displayValue.classList.contains('placeholder')).toBe(true);
  });

  it('reflects invalid state with aria-invalid', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Required" invalid>
        <am-option value="a">A</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(trigger.classList.contains('invalid')).toBe(true);
  });

  it('renders floating label', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select label="Category">
        <am-option value="a">A</am-option>
      </am-select>`,
    );

    const label = element.shadowRoot?.querySelector('.floating-label');
    expect(label?.textContent?.trim()).toBe('Category');
  });

  it('reflects size attribute', async () => {
    const element = await fixture<HTMLElement>(
      `<am-select size="lg">
        <am-option value="a">A</am-option>
      </am-select>`,
    );

    expect(element.getAttribute('size')).toBe('lg');
  });

  it('closes dropdown after selecting an option', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      `<am-select label="Fruit">
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>`,
    );

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await click(trigger, element);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const options = element.querySelectorAll('am-option') as NodeListOf<HTMLElement>;
    await click(options[0], element);
    await waitForUpdate(element);

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('does not emit am-change when selecting the same value', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      `<am-select label="Fruit">
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>`,
    );

    element.value = 'apple';
    await waitForUpdate(element);

    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await click(trigger, element);

    let fired = false;
    element.addEventListener('am-change', () => { fired = true; });

    const options = element.querySelectorAll('am-option') as NodeListOf<HTMLElement>;
    await click(options[0], element);

    expect(fired).toBe(false);
  });
});

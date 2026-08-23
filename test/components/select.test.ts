import { describe, expect, it } from 'vitest';

import '../../src/components/select/select';
import { click, fixture, getMockInternals, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-option', () => {
  it('sets role="option" and fires am-change on click', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-option value="apple">Apple</am-option>',
    );

    expect(element.getAttribute('role')).toBe('option');

    const eventPromise = oneEvent<{ value: string }>(element, 'am-change');
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
    element.addEventListener('am-change', () => { fired = true; });
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

  it('selects an option and emits change', async () => {
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
    const eventPromise = oneEvent(element, 'change');
    await click(options[1], element);
    const event = await eventPromise;
    const target = event.target as HTMLElement & { value: string };

    expect(target.value).toBe('banana');
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

  it('clears value on clear button click and emits change', async () => {
    const element = await fixture<HTMLElement & { value: string; clearable: boolean }>(
      `<am-select label="Fruit" clearable>
        <am-option value="apple">Apple</am-option>
        <am-option value="banana">Banana</am-option>
      </am-select>`,
    );

    element.value = 'apple';
    await waitForUpdate(element);

    const clearBtn = shadowQuery<HTMLButtonElement>(element, '.clear-btn');
    const eventPromise = oneEvent(element, 'change');
    await click(clearBtn, element);
    const event = await eventPromise;
    const target = event.target as HTMLElement & { value: string };

    expect(target.value).toBe('');
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

  it('does not emit change when selecting the same value', async () => {
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
    element.addEventListener('change', () => { fired = true; });

    const options = element.querySelectorAll('am-option') as NodeListOf<HTMLElement>;
    await click(options[0], element);

    expect(fired).toBe(false);
  });
});

// PERF-03 — threshold-gated virtualization + state-driven activedescendant
// (jsdom logic lane). The virtualizer does not window rows in jsdom (layout is
// mocked), so the windowed row ARIA (ids/setsize/posinset) is proven in the
// browser lane (test/browser/combobox-virtual.test.ts). Here we prove the parts
// that are state-driven and therefore observable in jsdom: the threshold branch
// flips, the slotted projection is hidden, and aria-activedescendant tracks the
// highlighted index (computed from state, not from which rows are mounted).
// Virtualization activates above a 100-option threshold; these fixtures build
// 150 `am-option` custom elements and (08-05) trigger a lazy `import('@lit-labs/
// virtualizer')` on first render. Under the full parallel jsdom run the first
// such test can exceed the 5s default budget, so this block gets a wider timeout.
// Note: the virtualizer is left to load lazily — forcing it to attach in jsdom
// throws in its scroll path (no layout engine), so tests must not prewarm it.
describe('am-select — virtualization branch + activedescendant (PERF-03)', { timeout: 20000 }, () => {
  function makeOptions(n: number): string {
    return Array.from({ length: n }, (_, i) => `<am-option value="v${i}">Opt ${i}</am-option>`).join('');
  }

  type VirtualSelect = HTMLElement & { value: string; _highlightedIndex: number; _open: boolean };

  it('stays on the slotted (non-virtual) path at/below the threshold', async () => {
    const el = await fixture<VirtualSelect>(`<am-select label="Small">${makeOptions(50)}</am-select>`);
    await waitForUpdate(el);

    // Slot is visible (not hidden) and no virtualized rows are rendered.
    const slot = el.shadowRoot?.querySelector('slot');
    expect(slot?.classList.contains('options-hidden')).toBe(false);
    expect((el as unknown as { _isVirtual: boolean })._isVirtual).toBe(false);
  });

  it('activates virtualization above the threshold and hides the slotted projection', async () => {
    const el = await fixture<VirtualSelect>(`<am-select label="Big">${makeOptions(150)}</am-select>`);
    await waitForUpdate(el);
    await waitForUpdate(el);

    expect((el as unknown as { _isVirtual: boolean })._isVirtual).toBe(true);
    // The slot is hidden so the windowed rows are the only visible options, but
    // it stays present so queryAssignedElements + slotchange keep working.
    const slot = el.shadowRoot?.querySelector('slot');
    expect(slot).not.toBeNull();
    expect(slot?.classList.contains('options-hidden')).toBe(true);
  });

  it('sets aria-activedescendant on the listbox to the highlighted option id (state-driven)', async () => {
    const el = await fixture<VirtualSelect>(`<am-select label="Big">${makeOptions(150)}</am-select>`);
    await waitForUpdate(el);
    await waitForUpdate(el);

    const trigger = shadowQuery<HTMLButtonElement>(el, '.trigger');
    const listbox = shadowQuery<HTMLElement>(el, '[role="listbox"]');

    // Open the popup.
    await click(trigger, el);
    expect(el._open).toBe(true);

    // No active option before navigating.
    expect(listbox.getAttribute('aria-activedescendant')).toBeNull();

    // ArrowDown highlights the first option; activedescendant references its id.
    await keydown(trigger, 'ArrowDown', el);
    const activeId = listbox.getAttribute('aria-activedescendant');
    expect(activeId).not.toBeNull();
    expect(el._highlightedIndex).toBe(0);
    expect(activeId).toBe((el as unknown as { _optionId(i: number): string })._optionId(0));

    // End jumps to the last option (wraparound model, absolute index).
    await keydown(trigger, 'End', el);
    expect(el._highlightedIndex).toBe(149);
    expect(listbox.getAttribute('aria-activedescendant')).toBe(
      (el as unknown as { _optionId(i: number): string })._optionId(149),
    );
  });

  it('does not point aria-activedescendant at an absent id when the highlight is out of range (FIX-02)', async () => {
    const el = await fixture<VirtualSelect>(`<am-select label="Big">${makeOptions(150)}</am-select>`);
    await waitForUpdate(el);
    await waitForUpdate(el);

    const trigger = shadowQuery<HTMLButtonElement>(el, '.trigger');
    const listbox = shadowQuery<HTMLElement>(el, '[role="listbox"]');
    await click(trigger, el);

    // Force a stale out-of-bounds index; activedescendant must clamp to nothing
    // WITHOUT re-clamping the raw index (FIX-02 no-re-clamp).
    el._highlightedIndex = 9999;
    await waitForUpdate(el);

    expect(listbox.getAttribute('aria-activedescendant')).toBeNull();
    expect(el._highlightedIndex).toBe(9999);
  });

  it('ArrowUp on open wraps to the last option (preserves element-based wraparound)', async () => {
    const el = await fixture<VirtualSelect>(`<am-select label="Big">${makeOptions(150)}</am-select>`);
    await waitForUpdate(el);
    await waitForUpdate(el);

    const trigger = shadowQuery<HTMLButtonElement>(el, '.trigger');
    await keydown(trigger, 'ArrowUp', el);

    expect(el._open).toBe(true);
    // Wraparound: from the reset index (-1) ArrowUp lands on the last option.
    expect(el._highlightedIndex).toBe(149);
  });
});

describe('am-select — validation (jsdom lane)', () => {
  type ValidatingSelect = HTMLElement & {
    invalid: boolean;
    value: string;
    setCustomError(message: string): void;
    updateComplete: Promise<unknown>;
  };

  it('shows NO validation error on first paint for a required empty select (D-01)', async () => {
    const element = await fixture<ValidatingSelect>(
      `<am-select label="Fruit" required><am-option value="a">A</am-option></am-select>`,
    );

    expect(element.invalid).toBe(false);
    expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();
    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    expect(trigger.getAttribute('aria-describedby')).toBeNull();
  });

  it('surfaces the native message only after the trigger is touched (D-01 gate)', async () => {
    const element = await fixture<ValidatingSelect>(
      `<am-select label="Fruit" required><am-option value="a">A</am-option></am-select>`,
    );
    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');

    expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();

    trigger.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await element.updateComplete;
    await waitForUpdate(element);

    const error = element.shadowRoot?.querySelector('[part="error"]');
    expect(error).not.toBeNull();
    expect(element.invalid).toBe(true);
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    // aria-describedby points at the same-shadow-root message node (Pitfall 3).
    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(element.shadowRoot?.getElementById(describedBy!)).toBe(error);
  });

  it('setCustomError shows immediately and reflects the invalid attribute (D-03)', async () => {
    const element = await fixture<ValidatingSelect>(
      `<am-select label="Fruit"><am-option value="a">A</am-option></am-select>`,
    );

    element.setCustomError('Pick a fruit');
    await element.updateComplete;
    await waitForUpdate(element);

    expect(element.hasAttribute('invalid')).toBe(true);
    const error = element.shadowRoot?.querySelector('[part="error"]');
    expect(error?.textContent).toBe('Pick a fruit');
    expect(error?.getAttribute('aria-live')).toBe('polite');
    expect(error?.getAttribute('role')).toBeNull();
  });

  it("setCustomError('') clears the error when there is no native violation", async () => {
    const element = await fixture<ValidatingSelect>(
      `<am-select label="Fruit"><am-option value="a">A</am-option></am-select>`,
    );

    element.setCustomError('Server says no');
    await element.updateComplete;
    await waitForUpdate(element);
    expect(element.hasAttribute('invalid')).toBe(true);

    element.setCustomError('');
    await element.updateComplete;
    await waitForUpdate(element);

    expect(element.hasAttribute('invalid')).toBe(false);
    expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();
  });

  it('custom error wins over the native required message (D-03 precedence)', async () => {
    const element = await fixture<ValidatingSelect>(
      `<am-select label="Fruit" required><am-option value="a">A</am-option></am-select>`,
    );
    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');

    trigger.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    element.setCustomError('Custom wins');
    await element.updateComplete;
    await waitForUpdate(element);

    const error = element.shadowRoot?.querySelector('[part="error"]');
    expect(error?.textContent).toBe('Custom wins');
  });
});

// TEST-04 — dynamic option-update index clamp (jsdom logic lane).
// am-select navigates over its slotted <am-option> children. Replacing that
// slotted set with a shorter one while open must not leave a highlighted option
// out of range. Asserts the observable bound (green-on-arrival, D-05).
describe('am-select — dynamic option-update index clamp (TEST-04)', () => {
  function makeOptions(n: number): string {
    return Array.from({ length: n }, (_, i) => `<am-option value="v${i}">Opt ${i}</am-option>`).join('');
  }

  function currentOptions(el: HTMLElement): Array<HTMLElement & { highlighted: boolean }> {
    return Array.from(el.querySelectorAll('am-option')) as Array<HTMLElement & { highlighted: boolean }>;
  }

  async function openBig(count: number): Promise<HTMLElement> {
    const element = await fixture<HTMLElement>(`<am-select label="Big">${makeOptions(count)}</am-select>`);
    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await click(trigger, element); // open
    return element;
  }

  it('keeps the highlighted index within bounds when the slotted set shrinks', async () => {
    const element = await openBig(30);

    // Highlight near the end of the large list.
    (element as unknown as { _highlightedIndex: number })._highlightedIndex = 29;
    await waitForUpdate(element);

    // Replace slotted options with a much shorter set.
    element.innerHTML = makeOptions(2);
    await waitForUpdate(element);

    const options = currentOptions(element);
    expect(options.length).toBe(2);
    // The stale index-29 highlight must not survive onto the shrunken list:
    // no rendered option is left highlighted out of range. (`findIndex` alone
    // is < length by construction, so assert the concrete `-1` instead.)
    expect(options.findIndex((o) => o.highlighted)).toBe(-1);

    // Navigating must clamp back into range rather than dereferencing the
    // stale index — the highlight lands on a real, in-bounds option, and the
    // raw `_highlightedIndex` state is itself valid.
    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await keydown(trigger, 'ArrowDown', element);

    const navOptions = currentOptions(element);
    const highlighted = navOptions.findIndex((o) => o.highlighted);
    expect(highlighted).toBeGreaterThanOrEqual(0);
    expect(highlighted).toBeLessThan(navOptions.length);
    const rawIndex = (element as unknown as { _highlightedIndex: number })._highlightedIndex;
    expect(rawIndex).toBeGreaterThanOrEqual(0);
    expect(rawIndex).toBeLessThan(navOptions.length);
  });

  it('holds bounds through rapid successive slotted-set replacements', async () => {
    const element = await openBig(30);
    (element as unknown as { _highlightedIndex: number })._highlightedIndex = 29;
    await waitForUpdate(element);

    element.innerHTML = makeOptions(5);
    element.innerHTML = makeOptions(1);
    await waitForUpdate(element);

    const options = currentOptions(element);
    expect(options.length).toBe(1);
    // No stale highlight lingers after the rapid shrink.
    expect(options.findIndex((o) => o.highlighted)).toBe(-1);

    // A navigation keystroke clamps the highlight into the 1-option range.
    const trigger = shadowQuery<HTMLButtonElement>(element, '.trigger');
    await keydown(trigger, 'ArrowDown', element);

    const navOptions = currentOptions(element);
    const highlighted = navOptions.findIndex((o) => o.highlighted);
    expect(highlighted).toBeGreaterThanOrEqual(0);
    expect(highlighted).toBeLessThan(navOptions.length);
    const rawIndex = (element as unknown as { _highlightedIndex: number })._highlightedIndex;
    expect(rawIndex).toBeGreaterThanOrEqual(0);
    expect(rawIndex).toBeLessThan(navOptions.length);
  });
});


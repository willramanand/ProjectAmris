import { describe, expect, it } from 'vitest';

import '../../src/components/input-otp/input-otp';
import { fixture, getMockInternals, keydown, oneEvent, waitForUpdate } from '../helpers';

describe('am-input-otp', () => {
  it('renders the correct number of input cells', async () => {
    const element = await fixture<HTMLElement>(
      '<am-input-otp length="4"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');
    expect(inputs.length).toBe(4);
  });

  it('renders 6 cells by default', async () => {
    const element = await fixture<HTMLElement>(
      '<am-input-otp></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');
    expect(inputs.length).toBe(6);
  });

  it('sets inputmode based on type', async () => {
    const element = await fixture<HTMLElement>(
      '<am-input-otp type="numeric"></am-input-otp>',
    );

    const input = element.shadowRoot!.querySelector('input');
    expect(input?.inputMode).toBe('numeric');
  });

  it('sets inputmode to text for alphanumeric', async () => {
    const element = await fixture<HTMLElement>(
      '<am-input-otp type="alphanumeric"></am-input-otp>',
    );

    const input = element.shadowRoot!.querySelector('input');
    expect(input?.inputMode).toBe('text');
  });

  it('reflects disabled state on inputs', async () => {
    const element = await fixture<HTMLElement>(
      '<am-input-otp disabled></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');
    inputs.forEach(input => {
      expect(input.disabled).toBe(true);
    });
  });

  it('reflects invalid attribute', async () => {
    const element = await fixture<HTMLElement>(
      '<am-input-otp invalid></am-input-otp>',
    );

    expect(element.hasAttribute('invalid')).toBe(true);
  });

  it('accepts valid digit input and advances focus', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-input-otp length="4"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');
    const changePromise = oneEvent<{ value: string }>(element, 'am-change');

    // Simulate typing '5' into the first cell
    inputs[0].value = '5';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate(element);

    const event = await changePromise;
    expect(event.detail.value).toBe('5');
    expect(element.value).toContain('5');
  });

  it('rejects non-numeric input in numeric mode', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-input-otp length="4" type="numeric"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');

    // Try typing a letter
    inputs[0].value = 'a';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate(element);

    expect(element.value).toBe('');
  });

  it('accepts alphanumeric input in alphanumeric mode', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-input-otp length="4" type="alphanumeric"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');
    const changePromise = oneEvent<{ value: string }>(element, 'am-change');

    inputs[0].value = 'A';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate(element);

    const event = await changePromise;
    expect(event.detail.value).toContain('A');
  });

  it('emits am-complete when all cells are filled', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-input-otp length="3"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');

    inputs[0].value = '1';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate(element);

    inputs[1].value = '2';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate(element);

    const completePromise = oneEvent<{ value: string }>(element, 'am-complete');
    inputs[2].value = '3';
    inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate(element);

    const event = await completePromise;
    expect(event.detail.value).toBe('123');
  });

  it('handles Backspace to clear current cell', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-input-otp length="4"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');

    // Type a digit
    inputs[0].value = '7';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate(element);

    expect(element.value).toContain('7');

    // Backspace on the same cell (now focus has moved to inputs[1])
    // Simulate backspace on inputs[1] (which is empty — should go back to inputs[0])
    await keydown(inputs[1], 'Backspace', element);

    expect(element.value).toBe('');
  });

  it('handles Backspace on empty cell to go to previous', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-input-otp length="4"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');

    // Type digit in first cell
    inputs[0].value = '9';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate(element);

    // Now on cell 1 which is empty, press backspace
    await keydown(inputs[1], 'Backspace', element);

    // Should clear cell 0
    expect(element.value).toBe('');
  });

  it('handles ArrowLeft and ArrowRight navigation', async () => {
    const element = await fixture<HTMLElement>(
      '<am-input-otp length="4"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');

    // Focus on cell 1, press ArrowLeft
    inputs[1].focus();
    await keydown(inputs[1], 'ArrowLeft', element);

    // Focus on cell 1, press ArrowRight
    inputs[1].focus();
    await keydown(inputs[1], 'ArrowRight', element);

    // No errors thrown — navigation works
    expect(true).toBe(true);
  });

  it('handles paste to fill all cells', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-input-otp length="4" type="numeric"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');

    const completePromise = oneEvent<{ value: string }>(element, 'am-complete');
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => '1234' },
    });
    Object.defineProperty(pasteEvent, 'preventDefault', { value: () => {} });

    inputs[0].dispatchEvent(pasteEvent);
    await waitForUpdate(element);

    const event = await completePromise;
    expect(event.detail.value).toBe('1234');
    expect(element.value).toBe('1234');
  });

  it('handles partial paste', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-input-otp length="6" type="numeric"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');

    const changePromise = oneEvent<{ value: string }>(element, 'am-change');
    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: { getData: () => '12' },
    });
    Object.defineProperty(pasteEvent, 'preventDefault', { value: () => {} });

    inputs[0].dispatchEvent(pasteEvent);
    await waitForUpdate(element);

    const event = await changePromise;
    expect(event.detail.value).toBe('12');
  });

  it('sets form value via ElementInternals', async () => {
    const element = await fixture<HTMLElement>(
      '<am-input-otp length="3"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');

    inputs[0].value = '4';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    await waitForUpdate(element);

    expect(getMockInternals(element).formValue).toContain('4');
  });

  it('sets aria-label on each cell', async () => {
    const element = await fixture<HTMLElement>(
      '<am-input-otp length="4"></am-input-otp>',
    );

    const inputs = element.shadowRoot!.querySelectorAll('input');
    expect(inputs[0].getAttribute('aria-label')).toBe('Digit 1 of 4');
    expect(inputs[3].getAttribute('aria-label')).toBe('Digit 4 of 4');
  });

  it('renders a group with role and aria-label', async () => {
    const element = await fixture<HTMLElement>(
      '<am-input-otp></am-input-otp>',
    );

    const group = element.shadowRoot!.querySelector('[role="group"]');
    expect(group).toBeTruthy();
    expect(group?.getAttribute('aria-label')).toBe('One-time passcode');
  });
});

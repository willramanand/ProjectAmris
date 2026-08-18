import { describe, expect, it } from 'vitest';

import '../../src/components/input/input';
import {
  click,
  fixture,
  inputText,
  mount,
  oneEvent,
  shadowQuery,
  waitForUpdate,
} from '../helpers';

describe('am-input', () => {
  it('syncs the input value and emits input events', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-input label="Email"></am-input>',
    );
    const input = shadowQuery<HTMLInputElement>(element, 'input');
    const eventPromise = oneEvent(element, 'input');

    await inputText(input, 'hello@example.com', element);

    const event = await eventPromise;
    const target = event.target as HTMLElement & { value: string };

    expect(element.value).toBe('hello@example.com');
    expect(target.value).toBe('hello@example.com');
    expect(input.getAttribute('aria-label')).toBe('Email');
  });

  it('renders the clear button and clears the value when clicked', async () => {
    const element = document.createElement('am-input') as HTMLElement & {
      clearable: boolean;
      value: string;
    };
    element.clearable = true;
    element.value = 'Draft';

    await mount(element);
    await waitForUpdate(element);

    const clearEvent = oneEvent(element, 'am-clear');
    const clearButton = shadowQuery<HTMLButtonElement>(element, '.clear-btn');

    await click(clearButton, element);
    await clearEvent;

    expect(element.value).toBe('');
    expect(shadowQuery<HTMLInputElement>(element, 'input').value).toBe('');
  });

  describe('validation (jsdom lane)', () => {
    type ValidatingInput = HTMLElement & {
      invalid: boolean;
      setCustomError(message: string): void;
      updateComplete: Promise<unknown>;
    };

    it('shows NO validation error on first paint for a required empty input (D-01)', async () => {
      const element = await fixture<ValidatingInput>(
        '<am-input label="Name" required></am-input>',
      );

      expect(element.invalid).toBe(false);
      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();
      expect(shadowQuery<HTMLInputElement>(element, 'input').getAttribute('aria-invalid')).toBeNull();
    });

    it('surfaces the native message only after the field is touched (D-01 gate)', async () => {
      const element = await fixture<ValidatingInput>(
        '<am-input label="Name" required></am-input>',
      );
      const input = shadowQuery<HTMLInputElement>(element, 'input');

      // Not touched yet — still silent.
      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();

      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      await element.updateComplete;
      await waitForUpdate(element);

      const error = element.shadowRoot?.querySelector('[part="error"]');
      expect(error).not.toBeNull();
      expect(element.invalid).toBe(true);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      // aria-describedby points at the same-shadow-root message node.
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).not.toBeNull();
      expect(element.shadowRoot?.getElementById(describedBy!)).toBe(error);
    });

    it('setCustomError shows immediately and reflects the invalid attribute (D-03)', async () => {
      const element = await fixture<ValidatingInput>('<am-input label="Email"></am-input>');

      element.setCustomError('Email already registered');
      await element.updateComplete;
      await waitForUpdate(element);

      expect(element.hasAttribute('invalid')).toBe(true);
      const error = element.shadowRoot?.querySelector('[part="error"]');
      expect(error?.textContent).toBe('Email already registered');
      // Per-field (non-submit) errors announce politely.
      expect(error?.getAttribute('aria-live')).toBe('polite');
      expect(error?.getAttribute('role')).toBeNull();
    });

    it("setCustomError('') clears the error when there is no native violation", async () => {
      const element = await fixture<ValidatingInput>('<am-input label="Email"></am-input>');

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
  });
});

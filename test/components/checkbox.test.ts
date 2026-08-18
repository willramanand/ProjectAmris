import { describe, expect, it } from 'vitest';

import '../../src/components/checkbox/checkbox';
import {
  click,
  fixture,
  getMockInternals,
  keydown,
  oneEvent,
  shadowQuery,
  waitForUpdate,
} from '../helpers';

describe('am-checkbox', () => {
  it('toggles on click, updates aria state, and emits change', async () => {
    const element = await fixture<HTMLElement & { checked: boolean }>(
      '<am-checkbox>Accept terms</am-checkbox>',
    );
    const eventPromise = oneEvent(element, 'change');

    await click(element, element);

    const event = await eventPromise;
    const control = shadowQuery<HTMLElement>(element, '.control');
    const target = event.target as HTMLElement & { checked: boolean };

    expect(element.checked).toBe(true);
    expect(target.checked).toBe(true);
    expect(control.getAttribute('aria-checked')).toBe('true');
    expect(getMockInternals(element).formValue).toBe('on');
  });

  it('supports keyboard toggling from the visual control', async () => {
    const element = await fixture<HTMLElement & { checked: boolean }>(
      '<am-checkbox></am-checkbox>',
    );
    const control = shadowQuery<HTMLElement>(element, '.control');

    await keydown(control, ' ', element);

    expect(element.checked).toBe(true);
  });

  describe('validation (jsdom lane)', () => {
    type ValidatingCheckbox = HTMLElement & {
      checked: boolean;
      required: boolean;
      invalid: boolean;
      setCustomError(message: string): void;
      updateComplete: Promise<unknown>;
    };

    async function blur(control: HTMLElement, host: ValidatingCheckbox): Promise<void> {
      control.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      await host.updateComplete;
      await waitForUpdate(host);
    }

    it('shows NO validation error on first paint for a required unchecked checkbox (D-01)', async () => {
      const element = await fixture<ValidatingCheckbox>(
        '<am-checkbox required>Accept terms</am-checkbox>',
      );

      expect(element.invalid).toBe(false);
      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();
      expect(
        shadowQuery<HTMLElement>(element, '.control').getAttribute('aria-invalid'),
      ).toBeNull();
    });

    it('surfaces the native message only after the control is blurred (D-01 gate)', async () => {
      const element = await fixture<ValidatingCheckbox>(
        '<am-checkbox required>Accept terms</am-checkbox>',
      );
      const control = shadowQuery<HTMLElement>(element, '.control');

      // Not touched yet — still silent.
      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();

      await blur(control, element);

      const error = element.shadowRoot?.querySelector('[part="error"]');
      expect(error).not.toBeNull();
      expect(element.invalid).toBe(true);
      expect(control.getAttribute('aria-invalid')).toBe('true');
      // aria-describedby points at the same-shadow-root message node (Pitfall 3).
      const describedBy = control.getAttribute('aria-describedby');
      expect(describedBy).not.toBeNull();
      expect(element.shadowRoot?.getElementById(describedBy!)).toBe(error);
    });

    it('setCustomError shows immediately and reflects the invalid attribute (D-03)', async () => {
      const element = await fixture<ValidatingCheckbox>('<am-checkbox>Accept terms</am-checkbox>');

      element.setCustomError('You must agree to continue');
      await element.updateComplete;
      await waitForUpdate(element);

      expect(element.hasAttribute('invalid')).toBe(true);
      const error = element.shadowRoot?.querySelector('[part="error"]');
      expect(error?.textContent).toBe('You must agree to continue');
      // Per-field (non-submit) errors announce politely.
      expect(error?.getAttribute('aria-live')).toBe('polite');
      expect(error?.getAttribute('role')).toBeNull();
    });

    it("setCustomError('') clears the error when there is no native violation", async () => {
      const element = await fixture<ValidatingCheckbox>('<am-checkbox>Accept terms</am-checkbox>');

      element.setCustomError('Server rejected');
      await element.updateComplete;
      await waitForUpdate(element);
      expect(element.hasAttribute('invalid')).toBe(true);

      element.setCustomError('');
      await element.updateComplete;
      await waitForUpdate(element);

      expect(element.hasAttribute('invalid')).toBe(false);
      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();
    });

    it('custom error wins over the native constraint message (D-03 precedence)', async () => {
      const element = await fixture<ValidatingCheckbox>(
        '<am-checkbox required>Accept terms</am-checkbox>',
      );
      const control = shadowQuery<HTMLElement>(element, '.control');

      await blur(control, element);
      const nativeMessage = element.shadowRoot
        ?.querySelector('[part="error"]')
        ?.textContent;
      expect(nativeMessage).toBeTruthy();

      element.setCustomError('Custom takes priority');
      await element.updateComplete;
      await waitForUpdate(element);

      const error = element.shadowRoot?.querySelector('[part="error"]');
      expect(error?.textContent).toBe('Custom takes priority');
      expect(error?.textContent).not.toBe(nativeMessage);
    });
  });
});

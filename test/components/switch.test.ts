import { describe, expect, it } from 'vitest';

import '../../src/components/switch/switch';
import { click, fixture, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-switch', () => {
  it('toggles on click and emits change', async () => {
    const element = await fixture<HTMLElement & { checked: boolean }>(
      '<am-switch>Notifications</am-switch>',
    );
    const eventPromise = oneEvent(element, 'change');

    await click(element, element);

    const event = await eventPromise;
    const track = shadowQuery<HTMLElement>(element, '.track');
    const target = event.target as HTMLElement & { checked: boolean };

    expect(element.checked).toBe(true);
    expect(target.checked).toBe(true);
    expect(track.getAttribute('aria-checked')).toBe('true');
  });

  it('supports keyboard toggling and ignores interaction while loading', async () => {
    const element = await fixture<
      HTMLElement & { checked: boolean; loading: boolean }
    >('<am-switch></am-switch>');
    const track = shadowQuery<HTMLElement>(element, '.track');

    await keydown(track, ' ', element);
    expect(element.checked).toBe(true);

    element.loading = true;
    await click(element, element);

    expect(element.checked).toBe(true);
  });

  describe('validation (jsdom lane)', () => {
    type ValidatingSwitch = HTMLElement & {
      checked: boolean;
      required: boolean;
      invalid: boolean;
      setCustomError(message: string): void;
      updateComplete: Promise<unknown>;
    };

    async function blur(track: HTMLElement, host: ValidatingSwitch): Promise<void> {
      track.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      await host.updateComplete;
      await waitForUpdate(host);
    }

    it('shows NO validation error on first paint for a required unchecked switch (D-01)', async () => {
      const element = await fixture<ValidatingSwitch>('<am-switch required>Agree</am-switch>');

      expect(element.invalid).toBe(false);
      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();
      expect(
        shadowQuery<HTMLElement>(element, '.track').getAttribute('aria-invalid'),
      ).toBeNull();
    });

    it('surfaces the native message only after the track is blurred (D-01 gate)', async () => {
      const element = await fixture<ValidatingSwitch>('<am-switch required>Agree</am-switch>');
      const track = shadowQuery<HTMLElement>(element, '.track');

      expect(element.shadowRoot?.querySelector('[part="error"]')).toBeNull();

      await blur(track, element);

      const error = element.shadowRoot?.querySelector('[part="error"]');
      expect(error).not.toBeNull();
      expect(element.invalid).toBe(true);
      expect(track.getAttribute('aria-invalid')).toBe('true');
      const describedBy = track.getAttribute('aria-describedby');
      expect(describedBy).not.toBeNull();
      expect(element.shadowRoot?.getElementById(describedBy!)).toBe(error);
    });

    it('setCustomError shows immediately and reflects the invalid attribute (D-03)', async () => {
      const element = await fixture<ValidatingSwitch>('<am-switch>Notifications</am-switch>');

      element.setCustomError('This setting is required');
      await element.updateComplete;
      await waitForUpdate(element);

      expect(element.hasAttribute('invalid')).toBe(true);
      const error = element.shadowRoot?.querySelector('[part="error"]');
      expect(error?.textContent).toBe('This setting is required');
      expect(error?.getAttribute('aria-live')).toBe('polite');
      expect(error?.getAttribute('role')).toBeNull();
    });

    it("setCustomError('') clears the error when there is no native violation", async () => {
      const element = await fixture<ValidatingSwitch>('<am-switch>Notifications</am-switch>');

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
      const element = await fixture<ValidatingSwitch>('<am-switch required>Agree</am-switch>');
      const track = shadowQuery<HTMLElement>(element, '.track');

      await blur(track, element);
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

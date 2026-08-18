import { describe, expect, it } from 'vitest';

import '../../src/components/field/field';
import '../../src/components/hint-text/hint-text';
import '../../src/components/error-text/error-text';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

describe('am-field', () => {
  it('renders default slot for grouping form controls', async () => {
    const el = await fixture<HTMLElement>(
      '<am-field><am-label>X</am-label><input /></am-field>',
    );
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });

  describe('D-02 hint <-> error swap', () => {
    const markup = `<am-field>
      <input />
      <am-hint-text slot="hint">Hint</am-hint-text>
      <am-error-text slot="error">Error</am-error-text>
    </am-field>`;

    it('shows hint and hides error while the control is valid', async () => {
      const el = await fixture<HTMLElement>(markup);

      const hintSlot = shadowQuery<HTMLSlotElement>(el, 'slot[name="hint"]');
      const errorSlot = shadowQuery<HTMLSlotElement>(el, 'slot[name="error"]');

      expect(hintSlot.hasAttribute('hidden')).toBe(false);
      expect(errorSlot.hasAttribute('hidden')).toBe(true);
    });

    it('hides hint and shows error when the control becomes invalid, and reverses on clear', async () => {
      const el = await fixture<HTMLElement>(markup);
      const control = el.querySelector('input')!;
      const hintSlot = shadowQuery<HTMLSlotElement>(el, 'slot[name="hint"]');
      const errorSlot = shadowQuery<HTMLSlotElement>(el, 'slot[name="error"]');

      control.setAttribute('invalid', '');
      await Promise.resolve();
      await waitForUpdate(el);

      expect(hintSlot.hasAttribute('hidden')).toBe(true);
      expect(errorSlot.hasAttribute('hidden')).toBe(false);

      control.removeAttribute('invalid');
      await Promise.resolve();
      await waitForUpdate(el);

      expect(hintSlot.hasAttribute('hidden')).toBe(false);
      expect(errorSlot.hasAttribute('hidden')).toBe(true);
    });

    it('does not swap after the field is disconnected (observer torn down)', async () => {
      const el = await fixture<HTMLElement>(markup);
      const control = el.querySelector('input')!;
      const hintSlot = shadowQuery<HTMLSlotElement>(el, 'slot[name="hint"]');
      const errorSlot = shadowQuery<HTMLSlotElement>(el, 'slot[name="error"]');

      el.remove();

      control.setAttribute('invalid', '');
      await Promise.resolve();
      await waitForUpdate(el);

      expect(hintSlot.hasAttribute('hidden')).toBe(false);
      expect(errorSlot.hasAttribute('hidden')).toBe(true);
    });
  });
});

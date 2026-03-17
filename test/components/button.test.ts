import { describe, expect, it } from 'vitest';

import '../../src/components/button/button';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

describe('am-button', () => {
  it('renders the slotted label and applies size and variant classes', async () => {
    const element = await fixture<HTMLElement>(
      '<am-button variant="outlined" size="lg">Save</am-button>',
    );

    const button = shadowQuery<HTMLButtonElement>(element, 'button');
    const labelSlot = shadowQuery<HTMLSlotElement>(element, '.label slot');

    expect(element.textContent?.replace(/\s+/g, ' ').trim()).toContain('Save');
    expect(labelSlot).toBeTruthy();
    expect(button.classList.contains('outlined')).toBe(true);
    expect(button.classList.contains('lg')).toBe(true);
  });

  it('reflects the loading state to aria attributes and spinner markup', async () => {
    const element = await fixture<HTMLElement>('<am-button>Save</am-button>');

    (element as HTMLElement & { loading: boolean }).loading = true;
    await waitForUpdate(element);

    const button = shadowQuery<HTMLButtonElement>(element, 'button');

    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(element.getAttribute('aria-disabled')).toBe('true');
    expect(shadowQuery<HTMLElement>(element, '.loading-spinner')).toBeTruthy();
  });
});

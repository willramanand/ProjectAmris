import { describe, expect, it } from 'vitest';

import '../../src/components/badge/badge';
import { click, fixture, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-badge', () => {
  it('renders content with the correct variant attribute', async () => {
    const element = await fixture<HTMLElement>(
      '<am-badge variant="success">Active</am-badge>',
    );

    expect(element.getAttribute('variant')).toBe('success');
    expect(element.textContent?.trim()).toBe('Active');
    expect(shadowQuery<HTMLElement>(element, '.badge')).toBeTruthy();
  });

  it('reflects the size attribute', async () => {
    const element = await fixture<HTMLElement>(
      '<am-badge size="lg">Large</am-badge>',
    );

    expect(element.getAttribute('size')).toBe('lg');
  });

  it('renders a remove button when removable and emits am-remove', async () => {
    const element = await fixture<HTMLElement>(
      '<am-badge removable>React</am-badge>',
    );

    const removeBtn = shadowQuery<HTMLButtonElement>(element, '.remove-btn');
    expect(removeBtn).toBeTruthy();
    expect(removeBtn.getAttribute('aria-label')).toBe('Remove');

    const eventPromise = oneEvent(element, 'am-remove');
    await click(removeBtn, element);
    await eventPromise;
  });

  it('does not render remove button when not removable', async () => {
    const element = await fixture<HTMLElement>(
      '<am-badge>Tag</am-badge>',
    );

    expect(element.shadowRoot?.querySelector('.remove-btn')).toBeNull();
  });

  it('does not fire am-remove when disabled', async () => {
    const element = await fixture<HTMLElement & { disabled: boolean }>(
      '<am-badge removable disabled>Disabled</am-badge>',
    );

    let fired = false;
    element.addEventListener('am-remove', () => { fired = true; });

    const removeBtn = shadowQuery<HTMLButtonElement>(element, '.remove-btn');
    await click(removeBtn, element);

    expect(fired).toBe(false);
  });
});

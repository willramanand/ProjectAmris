import { describe, expect, it } from 'vitest';

import '../../src/components/icon-button/icon-button';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

describe('am-icon-button', () => {
  it('renders a button with aria-label', async () => {
    const element = await fixture<HTMLElement>(
      `<am-icon-button label="Close">
        <svg viewBox="0 0 24 24"><path d="M18 6L6 18" stroke="currentColor"/></svg>
      </am-icon-button>`,
    );

    const button = shadowQuery<HTMLButtonElement>(element, 'button');
    expect(button.getAttribute('aria-label')).toBe('Close');
    expect(button.type).toBe('button');
  });

  it('reflects variant and size', async () => {
    const element = await fixture<HTMLElement>(
      '<am-icon-button variant="primary" size="lg" label="Action"></am-icon-button>',
    );

    expect(element.getAttribute('variant')).toBe('primary');
    expect(element.getAttribute('size')).toBe('lg');
  });

  it('shows loading spinner and sets aria-busy', async () => {
    const element = await fixture<HTMLElement & { loading: boolean }>(
      '<am-icon-button label="Save"></am-icon-button>',
    );

    element.loading = true;
    await waitForUpdate(element);

    const button = shadowQuery<HTMLButtonElement>(element, 'button');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(element.getAttribute('aria-disabled')).toBe('true');
    expect(element.shadowRoot?.querySelector('.loading-spinner')).toBeTruthy();
  });

  it('disables the button when disabled', async () => {
    const element = await fixture<HTMLElement>(
      '<am-icon-button label="Delete" disabled></am-icon-button>',
    );

    const button = shadowQuery<HTMLButtonElement>(element, 'button');
    expect(button.disabled).toBe(true);
    expect(element.getAttribute('aria-disabled')).toBe('true');
  });
});

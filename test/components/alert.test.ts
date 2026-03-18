import { describe, expect, it } from 'vitest';

import '../../src/components/alert/alert';
import { click, fixture, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-alert', () => {
  it('renders with role="alert" and default variant', async () => {
    const element = await fixture<HTMLElement>(
      '<am-alert>Something happened.</am-alert>',
    );

    expect(element.getAttribute('role')).toBe('alert');
    expect(element.getAttribute('variant')).toBe('info');
    expect(element.getAttribute('open')).not.toBeNull();
  });

  it('reflects the variant attribute', async () => {
    const element = await fixture<HTMLElement>(
      '<am-alert variant="danger">Error!</am-alert>',
    );

    expect(element.getAttribute('variant')).toBe('danger');
  });

  it('hides when open is false', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      '<am-alert>Visible</am-alert>',
    );

    expect(element.open).toBe(true);

    element.open = false;
    await waitForUpdate(element);

    // :host(:not([open])) { display: none; }
    expect(element.hasAttribute('open')).toBe(false);
  });

  it('renders close button when closable and fires am-close', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      '<am-alert closable>Closable alert</am-alert>',
    );

    const closeBtn = shadowQuery<HTMLButtonElement>(element, '.close-btn');
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.getAttribute('aria-label')).toBe('Close');

    const eventPromise = oneEvent(element, 'am-close');
    await click(closeBtn, element);
    await eventPromise;

    expect(element.open).toBe(false);
  });

  it('does not render close button when not closable', async () => {
    const element = await fixture<HTMLElement>(
      '<am-alert>No close</am-alert>',
    );

    expect(element.shadowRoot?.querySelector('.close-btn')).toBeNull();
  });

  it('renders default icon for success variant', async () => {
    const element = await fixture<HTMLElement>(
      '<am-alert variant="success">Done</am-alert>',
    );

    const icon = element.shadowRoot?.querySelector('.icon svg');
    expect(icon).toBeTruthy();
  });

  it('renders default icon for warning variant', async () => {
    const element = await fixture<HTMLElement>(
      '<am-alert variant="warning">Caution</am-alert>',
    );

    const icon = element.shadowRoot?.querySelector('.icon svg');
    expect(icon).toBeTruthy();
  });

  it('renders default icon for danger variant', async () => {
    const element = await fixture<HTMLElement>(
      '<am-alert variant="danger">Error</am-alert>',
    );

    const icon = element.shadowRoot?.querySelector('.icon svg');
    expect(icon).toBeTruthy();
  });

  it('does not render default icon for neutral variant', async () => {
    const element = await fixture<HTMLElement>(
      '<am-alert variant="neutral">Neutral</am-alert>',
    );

    // neutral returns `nothing`, so no SVG in the icon slot fallback
    const icon = element.shadowRoot?.querySelector('.icon svg');
    expect(icon).toBeNull();
  });

  it('reflects banner attribute', async () => {
    const element = await fixture<HTMLElement>(
      '<am-alert banner>Banner alert</am-alert>',
    );

    expect(element.hasAttribute('banner')).toBe(true);
  });
});

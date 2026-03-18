import { describe, expect, it } from 'vitest';

import '../../src/components/breadcrumb/breadcrumb';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

describe('am-breadcrumb-item', () => {
  it('renders a link when href is provided', async () => {
    const element = await fixture<HTMLElement>(
      '<am-breadcrumb-item href="/home">Home</am-breadcrumb-item>',
    );

    const link = shadowQuery<HTMLAnchorElement>(element, 'a');
    expect(link.href).toContain('/home');
  });

  it('renders a span with aria-current when current', async () => {
    const element = await fixture<HTMLElement>(
      '<am-breadcrumb-item current>Page</am-breadcrumb-item>',
    );

    const span = shadowQuery<HTMLElement>(element, '.current-label');
    expect(span.getAttribute('aria-current')).toBe('page');
  });

  it('hides the separator when current', async () => {
    const element = await fixture<HTMLElement>(
      '<am-breadcrumb-item current>Current</am-breadcrumb-item>',
    );

    expect(element.hasAttribute('current')).toBe(true);
  });
});

describe('am-breadcrumb', () => {
  it('sets aria-label="Breadcrumb" on the host', async () => {
    const element = await fixture<HTMLElement>(
      `<am-breadcrumb>
        <am-breadcrumb-item href="/">Home</am-breadcrumb-item>
        <am-breadcrumb-item>Page</am-breadcrumb-item>
      </am-breadcrumb>`,
    );

    expect(element.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('renders a nav with role="navigation"', async () => {
    const element = await fixture<HTMLElement>(
      `<am-breadcrumb>
        <am-breadcrumb-item href="/">Home</am-breadcrumb-item>
      </am-breadcrumb>`,
    );

    const nav = shadowQuery<HTMLElement>(element, 'nav');
    expect(nav.getAttribute('role')).toBe('navigation');
  });

  it('auto-marks the last item as current', async () => {
    const element = await fixture<HTMLElement>(
      `<am-breadcrumb>
        <am-breadcrumb-item href="/">Home</am-breadcrumb-item>
        <am-breadcrumb-item href="/products">Products</am-breadcrumb-item>
        <am-breadcrumb-item>Widget</am-breadcrumb-item>
      </am-breadcrumb>`,
    );

    await waitForUpdate(element);

    const items = element.querySelectorAll('am-breadcrumb-item') as NodeListOf<
      HTMLElement & { current: boolean }
    >;

    expect(items[0].current).toBe(false);
    expect(items[1].current).toBe(false);
    expect(items[2].current).toBe(true);
  });
});

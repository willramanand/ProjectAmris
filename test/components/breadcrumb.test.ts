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

    // The separator is always rendered (it is decorative) but CSS-hidden for
    // the current item via `:host([current]) .separator { display: none }`.
    // jsdom does not apply shadow-DOM :host() rules, so assert both the
    // decorative element and that the component actually ships the hide rule.
    const separator = element.shadowRoot?.querySelector('.separator');
    expect(separator).not.toBeNull();
    expect(separator?.getAttribute('aria-hidden')).toBe('true');

    const styles = (element.constructor as unknown as { styles?: unknown }).styles;
    const styleText = (Array.isArray(styles) ? styles : [styles])
      .map((s) => (s as { cssText?: string } | undefined)?.cssText ?? '')
      .join('\n');
    expect(styleText).toMatch(/:host\(\[current\]\)\s*\.separator\s*\{\s*display:\s*none/);
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

// Folded in from the retired grouped display-trivial.test.ts (plan 01-04): the
// parent barrel imported above already registers am-breadcrumb-item.
describe('am-breadcrumb-item (anchor vs current)', () => {
  it('renders an anchor when href is set, plain span when current', async () => {
    const link = await fixture<HTMLElement>(
      '<am-breadcrumb-item href="/x">Home</am-breadcrumb-item>',
    );
    expect(link.shadowRoot?.querySelector('a')?.getAttribute('href')).toBe('/x');

    const current = await fixture<HTMLElement>(
      '<am-breadcrumb-item current>Now</am-breadcrumb-item>',
    );
    expect(current.hasAttribute('current')).toBe(true);
    expect(current.shadowRoot?.querySelector('a')).toBeNull();
  });
});

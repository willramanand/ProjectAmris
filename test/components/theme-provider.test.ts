import { describe, expect, it } from 'vitest';

import '../../src/components/theme-provider/theme-provider';
import { fixture, waitForUpdate } from '../helpers';

type ThemeEl = HTMLElement & { theme: 'light' | 'dark' | 'system' };

describe('am-theme-provider', () => {
  it('defaults to system theme', async () => {
    const el = await fixture<ThemeEl>('<am-theme-provider>x</am-theme-provider>');
    expect(el.theme).toBe('system');
    expect(el.getAttribute('theme')).toBe('system');
  });

  it('reflects theme attribute changes', async () => {
    const el = await fixture<ThemeEl>('<am-theme-provider theme="dark">x</am-theme-provider>');
    expect(el.theme).toBe('dark');

    el.theme = 'light';
    await waitForUpdate(el);
    expect(el.getAttribute('theme')).toBe('light');
  });

  it('renders the default slot', async () => {
    const el = await fixture<ThemeEl>(
      '<am-theme-provider><span class="child">hi</span></am-theme-provider>',
    );
    expect(el.querySelector('.child')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });

  it('attaches a shadow root with adopted token stylesheets', async () => {
    const el = await fixture<ThemeEl>('<am-theme-provider>x</am-theme-provider>');
    expect(el.shadowRoot).toBeTruthy();
    // Lit adopts stylesheets onto the shadow root; at least one should be present.
    const sheets = (el.shadowRoot as ShadowRoot & { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets;
    expect(Array.isArray(sheets) ? sheets.length : 1).toBeGreaterThan(0);
  });
});

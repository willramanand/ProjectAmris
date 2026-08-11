import { describe, expect, it } from 'vitest';

import '../../src/components/side-nav/side-nav';
import { fixture } from '../helpers';

// The single barrel import above registers BOTH am-side-nav and am-side-nav-item.
describe('am-side-nav', () => {
  it('exposes role=navigation and renders header/footer named slots', async () => {
    const el = await fixture<HTMLElement>(
      `<am-side-nav>
         <span slot="header">Menu</span>
         <am-side-nav-item href="/x">Item</am-side-nav-item>
         <span slot="footer">Footer</span>
       </am-side-nav>`,
    );
    expect(el.getAttribute('role')).toBe('navigation');
    const slotNames = Array.from(el.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(slotNames).toContain('header');
    expect(slotNames).toContain('footer');
  });
});

describe('am-side-nav-item', () => {
  it('reflects active and renders an anchor with href', async () => {
    const el = await fixture<HTMLElement>(
      '<am-side-nav-item href="/x" active>Item</am-side-nav-item>',
    );
    expect(el.hasAttribute('active')).toBe(true);
    expect(el.shadowRoot?.querySelector('a')?.getAttribute('href')).toBe('/x');
  });
});

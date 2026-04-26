import { describe, expect, it } from 'vitest';

import '../../src/components/table/table';
import '../../src/components/link-button/link-button';
import '../../src/components/icon/icon';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

describe('am-table', () => {
  it('renders slotted table content via the part="table" wrapper', async () => {
    const el = await fixture<HTMLElement>(
      `<am-table>
         <table>
           <thead><tr><th>Name</th></tr></thead>
           <tbody><tr><td>Alice</td></tr></tbody>
         </table>
       </am-table>`,
    );
    expect(shadowQuery<HTMLElement>(el, '[part="table"]')).toBeTruthy();
    expect(el.querySelector('table')).toBeTruthy();
  });

  it('reflects striped/hoverable/bordered/compact attrs', async () => {
    const el = await fixture<HTMLElement>(
      '<am-table striped hoverable compact><table></table></am-table>',
    );
    expect(el.hasAttribute('striped')).toBe(true);
    expect(el.hasAttribute('hoverable')).toBe(true);
    expect(el.hasAttribute('bordered')).toBe(true); // default true
    expect(el.hasAttribute('compact')).toBe(true);
  });

  it('injects a scoped <style> element into light DOM for native table styling', async () => {
    const el = await fixture<HTMLElement>('<am-table><table></table></am-table>');
    const styleEl = el.querySelector('style');
    expect(styleEl).toBeTruthy();
    expect(styleEl?.textContent).toContain('table');
  });
});

describe('am-link-button', () => {
  it('renders an anchor with the given href', async () => {
    const el = await fixture<HTMLElement>(
      '<am-link-button href="/signup">Sign up</am-link-button>',
    );
    const a = shadowQuery<HTMLAnchorElement>(el, 'a');
    expect(a.getAttribute('href')).toBe('/signup');
  });

  it('omits href and sets aria-disabled when disabled', async () => {
    const el = await fixture<HTMLElement>(
      '<am-link-button href="/x" disabled>x</am-link-button>',
    );
    const a = shadowQuery<HTMLAnchorElement>(el, 'a');
    expect(a.hasAttribute('href')).toBe(false);
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('tabindex')).toBe('-1');
  });

  it('passes target and rel through', async () => {
    const el = await fixture<HTMLElement>(
      '<am-link-button href="/x" target="_blank" rel="noopener">x</am-link-button>',
    );
    const a = shadowQuery<HTMLAnchorElement>(el, 'a');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener');
  });

  it('reflects variant and size', async () => {
    const el = await fixture<HTMLElement>(
      '<am-link-button href="/x" variant="outlined" size="lg">x</am-link-button>',
    );
    expect(el.getAttribute('variant')).toBe('outlined');
    expect(el.getAttribute('size')).toBe('lg');
  });

  it('renders prefix and suffix slots', async () => {
    const el = await fixture<HTMLElement>(
      `<am-link-button href="/x">
         <span slot="prefix" class="px">›</span>
         label
         <span slot="suffix" class="sx">←</span>
       </am-link-button>`,
    );
    const slots = el.shadowRoot?.querySelectorAll('slot');
    const slotNames = Array.from(slots ?? []).map((s) => s.getAttribute('name'));
    expect(slotNames).toContain('prefix');
    expect(slotNames).toContain('suffix');
  });
});

describe('am-icon', () => {
  it('renders the slotted SVG content', async () => {
    const el = await fixture<HTMLElement>(
      '<am-icon><svg viewBox="0 0 16 16"><path d="M0 0 L16 16"/></svg></am-icon>',
    );
    expect(el.querySelector('svg')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});

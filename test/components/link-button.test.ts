import { describe, expect, it } from 'vitest';

import '../../src/components/link-button/link-button';
import { fixture, shadowQuery } from '../helpers';

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

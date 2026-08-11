import { describe, expect, it } from 'vitest';

import '../../src/components/app-shell/app-shell';
import { fixture } from '../helpers';

describe('am-app-shell', () => {
  it('renders header, sidebar, main, footer slots', async () => {
    const el = await fixture<HTMLElement>(
      `<am-app-shell>
         <span slot="header">H</span>
         <span slot="sidebar">S</span>
         <span>main</span>
         <span slot="footer">F</span>
       </am-app-shell>`,
    );
    const slotNames = Array.from(el.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(slotNames).toContain('header');
    expect(slotNames).toContain('sidebar');
    expect(slotNames).toContain('footer');
  });
});

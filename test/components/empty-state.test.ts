import { describe, expect, it } from 'vitest';

import '../../src/components/empty-state/empty-state';
import { fixture } from '../helpers';

describe('am-empty-state', () => {
  it('renders icon, heading, and action named slots', async () => {
    const el = await fixture<HTMLElement>(
      `<am-empty-state>
         <span slot="icon">📭</span>
         <span slot="heading">Nothing here</span>
         <span>Description goes in default slot.</span>
         <button slot="action">Create</button>
       </am-empty-state>`,
    );
    const slotNames = Array.from(el.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(slotNames).toContain('icon');
    expect(slotNames).toContain('heading');
    expect(slotNames).toContain('action');
  });
});

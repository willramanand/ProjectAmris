import { describe, expect, it } from 'vitest';

import '../../src/components/panel/panel';
import { fixture } from '../helpers';

describe('am-panel', () => {
  it('reflects bordered attribute', async () => {
    const el = await fixture<HTMLElement>('<am-panel bordered>body</am-panel>');
    expect(el.hasAttribute('bordered')).toBe(true);
  });

  it('renders header and body slots', async () => {
    const el = await fixture<HTMLElement>(
      '<am-panel><span slot="header">Title</span><p>Body</p></am-panel>',
    );
    const headerSlot = el.shadowRoot?.querySelector('slot[name="header"]') as HTMLSlotElement;
    const bodySlot = el.shadowRoot?.querySelector('.body slot:not([name])') as HTMLSlotElement;
    expect(headerSlot.assignedElements()[0]?.textContent).toBe('Title');
    expect(bodySlot.assignedElements()[0]?.tagName).toBe('P');
  });

  it('exposes header and body parts', async () => {
    const el = await fixture<HTMLElement>('<am-panel>x</am-panel>');
    expect(el.shadowRoot?.querySelector('[part="header"]')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('[part="body"]')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('[part="panel"]')).toBeTruthy();
  });
});

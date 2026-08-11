import { describe, expect, it } from 'vitest';

import '../../src/components/visually-hidden/visually-hidden';
import { fixture } from '../helpers';

describe('am-visually-hidden', () => {
  it('renders a slot inside an element kept off-screen', async () => {
    const el = await fixture<HTMLElement>(
      '<am-visually-hidden>Screen reader only</am-visually-hidden>',
    );
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});

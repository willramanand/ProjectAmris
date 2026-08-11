import { describe, expect, it } from 'vitest';

import '../../src/components/icon/icon';
import { fixture } from '../helpers';

describe('am-icon', () => {
  it('renders the slotted SVG content', async () => {
    const el = await fixture<HTMLElement>(
      '<am-icon><svg viewBox="0 0 16 16"><path d="M0 0 L16 16"/></svg></am-icon>',
    );
    expect(el.querySelector('svg')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});

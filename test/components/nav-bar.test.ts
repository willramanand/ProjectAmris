import { describe, expect, it } from 'vitest';

import '../../src/components/nav-bar/nav-bar';
import { fixture } from '../helpers';

describe('am-nav-bar', () => {
  it('exposes role=navigation', async () => {
    const el = await fixture<HTMLElement>('<am-nav-bar></am-nav-bar>');
    expect(el.getAttribute('role')).toBe('navigation');
  });
});

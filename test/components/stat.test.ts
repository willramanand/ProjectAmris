import { describe, expect, it } from 'vitest';

import '../../src/components/stat/stat';
import { fixture } from '../helpers';

describe('am-stat', () => {
  it('reflects trend', async () => {
    const el = await fixture<HTMLElement>('<am-stat trend="up">42</am-stat>');
    expect(el.getAttribute('trend')).toBe('up');
  });
});

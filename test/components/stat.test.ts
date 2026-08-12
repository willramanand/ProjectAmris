import { describe, expect, it } from 'vitest';

import '../../src/components/stat/stat';
import { fixture, waitForUpdate } from '../helpers';

describe('am-stat', () => {
  it('reflects trend', async () => {
    // Drive the property (not markup) so the assertion exercises the
    // component's `reflect: true` rather than the HTML parser.
    const el = await fixture<HTMLElement & { trend: string }>('<am-stat>42</am-stat>');
    el.trend = 'up';
    await waitForUpdate(el);
    expect(el.getAttribute('trend')).toBe('up');
  });
});

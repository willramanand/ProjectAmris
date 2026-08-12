import { describe, expect, it } from 'vitest';

import '../../src/components/surface/surface';
import { fixture, waitForUpdate } from '../helpers';

describe('am-surface', () => {
  it('reflects variant, bordered, flush', async () => {
    // Drive the properties (not markup) so the assertion exercises the
    // component's `reflect: true` rather than the HTML parser.
    const el = await fixture<
      HTMLElement & { variant: string; bordered: boolean; flush: boolean }
    >('<am-surface>x</am-surface>');
    el.variant = 'raised';
    el.bordered = true;
    el.flush = true;
    await waitForUpdate(el);
    expect(el.getAttribute('variant')).toBe('raised');
    expect(el.hasAttribute('bordered')).toBe(true);
    expect(el.hasAttribute('flush')).toBe(true);
  });

  it('default variant is "default"', async () => {
    const el = await fixture<HTMLElement & { variant: string }>('<am-surface>x</am-surface>');
    expect(el.variant).toBe('default');
  });
});

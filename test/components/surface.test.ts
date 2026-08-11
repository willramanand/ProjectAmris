import { describe, expect, it } from 'vitest';

import '../../src/components/surface/surface';
import { fixture } from '../helpers';

describe('am-surface', () => {
  it('reflects variant, bordered, flush', async () => {
    const el = await fixture<HTMLElement>(
      '<am-surface variant="raised" bordered flush>x</am-surface>',
    );
    expect(el.getAttribute('variant')).toBe('raised');
    expect(el.hasAttribute('bordered')).toBe(true);
    expect(el.hasAttribute('flush')).toBe(true);
  });

  it('default variant is "default"', async () => {
    const el = await fixture<HTMLElement & { variant: string }>('<am-surface>x</am-surface>');
    expect(el.variant).toBe('default');
  });
});

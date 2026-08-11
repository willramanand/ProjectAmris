import { describe, expect, it } from 'vitest';

import '../../src/components/status-dot/status-dot';
import { fixture } from '../helpers';

describe('am-status-dot', () => {
  it('reflects variant, size, pulse', async () => {
    const el = await fixture<HTMLElement>(
      '<am-status-dot variant="success" size="lg" pulse></am-status-dot>',
    );
    expect(el.getAttribute('variant')).toBe('success');
    expect(el.getAttribute('size')).toBe('lg');
    expect(el.hasAttribute('pulse')).toBe(true);
  });
});

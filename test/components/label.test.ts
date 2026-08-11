import { describe, expect, it } from 'vitest';

import '../../src/components/label/label';
import { fixture } from '../helpers';

describe('am-label', () => {
  it('reflects required and optional, and exposes for association', async () => {
    const el = await fixture<HTMLElement & { for: string }>(
      '<am-label for="x" required>Name</am-label>',
    );
    expect(el.for).toBe('x');
    expect(el.hasAttribute('required')).toBe(true);
  });
});

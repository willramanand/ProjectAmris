import { describe, expect, it } from 'vitest';

import '../../src/components/skeleton/skeleton';
import { fixture } from '../helpers';

describe('am-skeleton', () => {
  it('sets role="status" and aria-label', async () => {
    const element = await fixture<HTMLElement>(
      '<am-skeleton></am-skeleton>',
    );

    expect(element.getAttribute('role')).toBe('status');
    expect(element.getAttribute('aria-label')).toBe('Loading');
  });

  it('defaults to text variant', async () => {
    const element = await fixture<HTMLElement>(
      '<am-skeleton></am-skeleton>',
    );

    expect(element.getAttribute('variant')).toBe('text');
  });

  it('reflects circular variant', async () => {
    const element = await fixture<HTMLElement>(
      '<am-skeleton variant="circular"></am-skeleton>',
    );

    expect(element.getAttribute('variant')).toBe('circular');
  });

  it('reflects rectangular variant', async () => {
    const element = await fixture<HTMLElement>(
      '<am-skeleton variant="rectangular"></am-skeleton>',
    );

    expect(element.getAttribute('variant')).toBe('rectangular');
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/divider/divider';
import { fixture, waitForUpdate } from '../helpers';

describe('am-divider', () => {
  it('sets role="separator" on the host', async () => {
    const element = await fixture<HTMLElement>(
      '<am-divider></am-divider>',
    );

    expect(element.getAttribute('role')).toBe('separator');
  });

  it('defaults to horizontal orientation', async () => {
    const element = await fixture<HTMLElement>(
      '<am-divider></am-divider>',
    );

    expect(element.getAttribute('orientation')).toBe('horizontal');
  });

  it('sets aria-orientation for vertical dividers', async () => {
    const element = await fixture<HTMLElement>(
      '<am-divider orientation="vertical"></am-divider>',
    );

    expect(element.getAttribute('aria-orientation')).toBe('vertical');
    expect(element.getAttribute('orientation')).toBe('vertical');
  });
});

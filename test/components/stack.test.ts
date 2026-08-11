import { describe, expect, it } from 'vitest';

import '../../src/components/stack/stack';
import { fixture, waitForUpdate } from '../helpers';

describe('am-stack', () => {
  it('reflects direction, align, justify, gap, wrap', async () => {
    const el = await fixture<HTMLElement>(
      '<am-stack direction="horizontal" align="center" justify="between" gap="4" wrap><span>a</span></am-stack>',
    );
    expect(el.getAttribute('direction')).toBe('horizontal');
    expect(el.getAttribute('align')).toBe('center');
    expect(el.getAttribute('justify')).toBe('between');
    expect(el.getAttribute('gap')).toBe('4');
    expect(el.hasAttribute('wrap')).toBe(true);
  });

  it('renders default slot content', async () => {
    const el = await fixture<HTMLElement>(
      '<am-stack><span class="child">x</span></am-stack>',
    );
    expect(el.querySelector('.child')).toBeTruthy();
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });

  it('updates direction prop dynamically', async () => {
    const el = await fixture<HTMLElement & { direction: string }>('<am-stack></am-stack>');
    el.direction = 'horizontal';
    await waitForUpdate(el);
    expect(el.getAttribute('direction')).toBe('horizontal');
  });
});

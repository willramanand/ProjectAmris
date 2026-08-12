import { describe, expect, it } from 'vitest';

import '../../src/components/stack/stack';
import { fixture, waitForUpdate } from '../helpers';

describe('am-stack', () => {
  it('reflects direction, align, justify, gap, wrap', async () => {
    // Drive the properties (not markup) so the assertion exercises the
    // component's `reflect: true` rather than the HTML parser.
    const el = await fixture<
      HTMLElement & {
        direction: string;
        align: string;
        justify: string;
        gap: string;
        wrap: boolean;
      }
    >('<am-stack><span>a</span></am-stack>');
    el.direction = 'horizontal';
    el.align = 'center';
    el.justify = 'between';
    el.gap = '4';
    el.wrap = true;
    await waitForUpdate(el);
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

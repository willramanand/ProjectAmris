import { describe, expect, it } from 'vitest';

import '../../src/components/grid/grid';
import { fixture, waitForUpdate } from '../helpers';

describe('am-grid', () => {
  it('reflects columns and gap', async () => {
    // Drive the properties (not markup) so the assertion exercises the
    // component's `reflect: true` rather than the HTML parser.
    const el = await fixture<HTMLElement & { columns: string; gap: string }>('<am-grid></am-grid>');
    el.columns = '3';
    el.gap = '6';
    await waitForUpdate(el);
    expect(el.getAttribute('columns')).toBe('3');
    expect(el.getAttribute('gap')).toBe('6');
  });

  it('defaults to empty columns (auto-fill mode)', async () => {
    const el = await fixture<HTMLElement & { columns: string }>('<am-grid></am-grid>');
    expect(el.columns).toBe('');
  });

  it('renders slot for children', async () => {
    const el = await fixture<HTMLElement>('<am-grid><div class="cell"></div></am-grid>');
    expect(el.querySelector('.cell')).toBeTruthy();
  });
});

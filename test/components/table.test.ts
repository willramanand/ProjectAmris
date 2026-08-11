import { describe, expect, it } from 'vitest';

import '../../src/components/table/table';
import { fixture, shadowQuery } from '../helpers';

describe('am-table', () => {
  it('renders slotted table content via the part="table" wrapper', async () => {
    const el = await fixture<HTMLElement>(
      `<am-table>
         <table>
           <thead><tr><th>Name</th></tr></thead>
           <tbody><tr><td>Alice</td></tr></tbody>
         </table>
       </am-table>`,
    );
    expect(shadowQuery<HTMLElement>(el, '[part="table"]')).toBeTruthy();
    expect(el.querySelector('table')).toBeTruthy();
  });

  it('reflects striped/hoverable/bordered/compact attrs', async () => {
    const el = await fixture<HTMLElement>(
      '<am-table striped hoverable compact><table></table></am-table>',
    );
    expect(el.hasAttribute('striped')).toBe(true);
    expect(el.hasAttribute('hoverable')).toBe(true);
    expect(el.hasAttribute('bordered')).toBe(true); // default true
    expect(el.hasAttribute('compact')).toBe(true);
  });

  it('injects a scoped <style> element into light DOM for native table styling', async () => {
    const el = await fixture<HTMLElement>('<am-table><table></table></am-table>');
    const styleEl = el.querySelector('style');
    expect(styleEl).toBeTruthy();
    expect(styleEl?.textContent).toContain('table');
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/progress-ring/progress-ring';
import { fixture } from '../helpers';

describe('am-progress-ring', () => {
  it('exposes role=progressbar with aria-valuenow on the inner svg', async () => {
    const el = await fixture<HTMLElement & { value: number; max: number }>(
      '<am-progress-ring value="40" max="100"></am-progress-ring>',
    );
    expect(el.value).toBe(40);
    const svg = el.shadowRoot?.querySelector('svg[role="progressbar"]') as SVGElement;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-valuenow')).toBe('40');
    expect(svg.getAttribute('aria-valuemax')).toBe('100');
  });

  it('omits aria-valuenow when indeterminate', async () => {
    const el = await fixture<HTMLElement>('<am-progress-ring indeterminate></am-progress-ring>');
    const svg = el.shadowRoot?.querySelector('svg[role="progressbar"]') as SVGElement;
    expect(svg.hasAttribute('aria-valuenow')).toBe(false);
  });
});

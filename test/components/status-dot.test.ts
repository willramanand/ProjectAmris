import { describe, expect, it } from 'vitest';

import '../../src/components/status-dot/status-dot';
import { fixture, waitForUpdate } from '../helpers';

describe('am-status-dot', () => {
  it('reflects variant, size, pulse', async () => {
    // Drive the properties (not markup) and assert they reflect to attributes.
    // Setting them in markup would only prove the HTML parser echoes them back;
    // driving the property exercises the component's `reflect: true`.
    const el = await fixture<
      HTMLElement & { variant: string; size: string; pulse: boolean }
    >('<am-status-dot></am-status-dot>');

    el.variant = 'success';
    el.size = 'lg';
    el.pulse = true;
    await waitForUpdate(el);

    expect(el.getAttribute('variant')).toBe('success');
    expect(el.getAttribute('size')).toBe('lg');
    expect(el.hasAttribute('pulse')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/timeline/timeline';
import { fixture, waitForUpdate } from '../helpers';

// The single barrel import above registers BOTH am-timeline and am-timeline-item.
describe('am-timeline', () => {
  it('renders a default slot for its items', async () => {
    const el = await fixture<HTMLElement>(
      '<am-timeline><am-timeline-item>One</am-timeline-item></am-timeline>',
    );
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});

describe('am-timeline-item', () => {
  it('reflects variant', async () => {
    // Drive the property (not markup) so the assertion exercises the
    // component's `reflect: true` rather than the HTML parser.
    const el = await fixture<HTMLElement & { variant: string }>('<am-timeline-item></am-timeline-item>');
    el.variant = 'success';
    await waitForUpdate(el);
    expect(el.getAttribute('variant')).toBe('success');
  });
});

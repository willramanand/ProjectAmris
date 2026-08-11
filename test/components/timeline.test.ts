import { describe, expect, it } from 'vitest';

import '../../src/components/timeline/timeline';
import { fixture } from '../helpers';

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
    const el = await fixture<HTMLElement>('<am-timeline-item variant="success"></am-timeline-item>');
    expect(el.getAttribute('variant')).toBe('success');
  });
});

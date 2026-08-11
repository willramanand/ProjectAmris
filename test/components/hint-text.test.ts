import { describe, expect, it } from 'vitest';

import '../../src/components/hint-text/hint-text';
import { fixture } from '../helpers';

describe('am-hint-text', () => {
  it('renders the hint text', async () => {
    const el = await fixture<HTMLElement>('<am-hint-text>Help</am-hint-text>');
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});

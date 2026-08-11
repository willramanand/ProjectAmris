import { describe, expect, it } from 'vitest';

import '../../src/components/error-text/error-text';
import { fixture } from '../helpers';

describe('am-error-text', () => {
  it('renders default slot and applies role=alert', async () => {
    const el = await fixture<HTMLElement>('<am-error-text>Required</am-error-text>');
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});

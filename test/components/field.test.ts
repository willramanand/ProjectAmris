import { describe, expect, it } from 'vitest';

import '../../src/components/field/field';
import { fixture } from '../helpers';

describe('am-field', () => {
  it('renders default slot for grouping form controls', async () => {
    const el = await fixture<HTMLElement>(
      '<am-field><am-label>X</am-label><input /></am-field>',
    );
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy();
  });
});

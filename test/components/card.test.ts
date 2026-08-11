import { describe, expect, it } from 'vitest';

import '../../src/components/card/card';
import { fixture } from '../helpers';

describe('am-card', () => {
  it('renders default slot', async () => {
    const el = await fixture<HTMLElement>('<am-card><p class="content">hi</p></am-card>');
    expect(el.querySelector('.content')).toBeTruthy();
  });
});

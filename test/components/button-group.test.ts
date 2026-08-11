import { describe, expect, it } from 'vitest';

import '../../src/components/button-group/button-group';
import { fixture } from '../helpers';

describe('am-button-group', () => {
  it('reflects orientation', async () => {
    const el = await fixture<HTMLElement>(
      '<am-button-group orientation="vertical"><button>a</button></am-button-group>',
    );
    expect(el.getAttribute('orientation')).toBe('vertical');
  });

  it('exposes role=group', async () => {
    const el = await fixture<HTMLElement>(
      '<am-button-group><button>a</button></am-button-group>',
    );
    expect(el.getAttribute('role')).toBe('group');
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/button-group/button-group';
import { fixture, waitForUpdate } from '../helpers';

describe('am-button-group', () => {
  it('reflects orientation', async () => {
    // Drive the property (not markup) so the assertion exercises the
    // component's `reflect: true` rather than the HTML parser.
    const el = await fixture<HTMLElement & { orientation: string }>(
      '<am-button-group><button>a</button></am-button-group>',
    );
    el.orientation = 'vertical';
    await waitForUpdate(el);
    expect(el.getAttribute('orientation')).toBe('vertical');
  });

  it('exposes role=group', async () => {
    const el = await fixture<HTMLElement>(
      '<am-button-group><button>a</button></am-button-group>',
    );
    expect(el.getAttribute('role')).toBe('group');
  });
});

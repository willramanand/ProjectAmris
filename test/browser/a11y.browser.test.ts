import { describe, expect, it } from 'vitest';

import { checkA11y, formatViolations } from '../a11y-helper';
import { fixture, waitForUpdate } from '../helpers';

// Representative set spanning a form control, an overlay, and a colored display
// component — enough to prove the in-browser axe lane exercises color-contrast
// and region against real Chromium computed styles (TEST-08, OQ-2).
import '../../src/components/button/button';
import '../../src/components/input/input';
import '../../src/components/badge/badge';
import '../../src/components/alert/alert';
import '../../src/components/dialog/dialog';

/**
 * Browser a11y lane — axe runs in-browser with `color-contrast` and `region`
 * ENABLED (the two rules the jsdom lane disables because it has no computed
 * styles). `{ includeDefaultDisabled: false }` re-enables them here.
 */
async function expectNoViolations(element: HTMLElement) {
  const violations = await checkA11y(element, [], { includeDefaultDisabled: false });
  expect(violations, formatViolations(violations)).toHaveLength(0);
}

describe('a11y (real browser, color-contrast + region enabled)', () => {
  it('am-button (primary) — colored surface, contrast checked', async () => {
    const el = await fixture('<am-button variant="primary">Submit</am-button>');
    await expectNoViolations(el);
  });

  it('am-input with label — form control', async () => {
    const el = await fixture('<am-input label="Email" type="email"></am-input>');
    await expectNoViolations(el);
  });

  it('am-badge (primary) — colored display element', async () => {
    const el = await fixture('<am-badge variant="primary">New</am-badge>');
    await expectNoViolations(el);
  });

  it('am-alert (info) — colored status surface', async () => {
    const el = await fixture('<am-alert variant="info">Something happened.</am-alert>');
    await expectNoViolations(el);
  });

  it('am-dialog (open) — overlay', async () => {
    const el = (await fixture('<am-dialog label="Confirm" open>Are you sure?</am-dialog>')) as HTMLElement & {
      open: boolean;
    };
    await waitForUpdate(el);
    await expectNoViolations(el);
  });
});

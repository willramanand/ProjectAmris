import { describe, expect, it } from 'vitest';

import '../../src/components/checkbox/checkbox';
import { fixture } from '../helpers';

/**
 * TEST-02 seed — real ElementInternals form participation in Chromium.
 *
 * This runs in the `browser` Vitest project, which OMITS test/setup.ts, so the
 * assertions exercise native ElementInternals + FormData rather than the jsdom
 * MockElementInternals (Pitfall 2). Plan 06 expands this to the remaining
 * form-associated controls.
 *
 * NOTE: this deliberately does NOT import getMockInternals — the mock does not
 * exist in the browser project.
 */
describe('form-association (real ElementInternals)', () => {
  it('reflects the checked value into a real FormData via native setFormValue', async () => {
    const form = await fixture<HTMLFormElement>(
      '<form><am-checkbox name="terms" checked>Accept</am-checkbox></form>',
    );

    // A real <form> only sees this value if the component reported it through
    // native ElementInternals.setFormValue — the jsdom mock stores it privately
    // and never reaches FormData, so this assertion is proof of the native path.
    expect(new FormData(form).get('terms')).toBe('on');
  });

  it('withdraws the value from FormData when unchecked (setFormValue(null))', async () => {
    const form = await fixture<HTMLFormElement>(
      '<form><am-checkbox name="terms" checked>Accept</am-checkbox></form>',
    );
    const checkbox = form.querySelector('am-checkbox') as HTMLElement & {
      checked: boolean;
      updateComplete: Promise<unknown>;
    };

    checkbox.checked = false;
    await checkbox.updateComplete;

    expect(new FormData(form).get('terms')).toBeNull();
  });

  it('runs against native browser APIs, not the jsdom setup mocks (Pitfall 2 guard)', () => {
    // The jsdom setup replaces these with plain JS shims; in real Chromium they
    // are native. `[native code]` in the source proves we are NOT loading the
    // test/setup.ts mock into the browser project.
    expect(HTMLDialogElement.prototype.showModal.toString()).toContain('native code');
    expect(HTMLElement.prototype.attachInternals.toString()).toContain('native code');
  });
});

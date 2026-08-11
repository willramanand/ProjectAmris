import { describe, expect, it } from 'vitest';

import '../../src/components/checkbox/checkbox';
import '../../src/components/input/input';
import '../../src/components/textarea/textarea';
import '../../src/components/radio/radio';
import '../../src/components/switch/switch';
import '../../src/components/number-field/number-field';
import '../../src/components/search-field/search-field';
import '../../src/components/slider/slider';
import { fixture } from '../helpers';

/**
 * TEST-02 — real ElementInternals form participation in Chromium.
 *
 * This runs in the `browser` Vitest project, which OMITS test/setup.ts, so the
 * assertions exercise native ElementInternals + FormData rather than the jsdom
 * MockElementInternals (Pitfall 2). Every value seen in `new FormData(form)`
 * proves the component reported it through the *native*
 * `ElementInternals.setFormValue` path — the jsdom mock stores the value
 * privately and never reaches FormData.
 *
 * NOTE: this deliberately does NOT import getMockInternals — the mock does not
 * exist in the browser project, and importing it would defeat the fidelity of
 * this suite.
 *
 * Validity: no form-associated control currently calls
 * `ElementInternals.setValidity` (grep of src/ confirms zero call sites), so a
 * `required` custom control does NOT invalidate its host `<form>` yet. The
 * validity assertions below therefore document the *real current behaviour*
 * (checkValidity stays true) and are flagged as a carried finding for the
 * validation-UX phase — they are NOT fixed here (test-only phase).
 */

type LitEl = HTMLElement & { updateComplete?: Promise<unknown> };

/** Await the host custom element's render so setFormValue has run. */
async function settle(host: Element | null): Promise<void> {
  const el = host as LitEl | null;
  if (el?.updateComplete) await el.updateComplete;
  await Promise.resolve();
}

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

  describe('am-input', () => {
    it('submits its value through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-input name="username" value="alice"></am-input></form>',
      );
      await settle(form.querySelector('am-input'));

      expect(new FormData(form).get('username')).toBe('alice');
    });

    it('reflects a value typed after mount', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-input name="username"></am-input></form>',
      );
      const input = form.querySelector('am-input') as HTMLElement & {
        value: string;
        updateComplete: Promise<unknown>;
      };
      input.value = 'bob';
      await input.updateComplete;

      expect(new FormData(form).get('username')).toBe('bob');
    });

    it('required + empty does NOT block submission yet (no setValidity — carried finding)', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-input name="username" required></am-input></form>',
      );
      await settle(form.querySelector('am-input'));

      // FINDING: am-input never calls internals.setValidity, so a required-but-
      // empty control leaves the form "valid". Documented, not fixed (Phase 4).
      expect(form.checkValidity()).toBe(true);
    });
  });

  describe('am-textarea', () => {
    it('submits its value through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-textarea name="bio" value="hello world"></am-textarea></form>',
      );
      await settle(form.querySelector('am-textarea'));

      expect(new FormData(form).get('bio')).toBe('hello world');
    });
  });

  describe('am-radio-group', () => {
    it('submits the selected radio value through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        `<form>
          <am-radio-group name="plan" value="pro">
            <am-radio value="free">Free</am-radio>
            <am-radio value="pro">Pro</am-radio>
          </am-radio-group>
        </form>`,
      );
      await settle(form.querySelector('am-radio-group'));

      expect(new FormData(form).get('plan')).toBe('pro');
    });

    it('reflects a group value change after mount', async () => {
      const form = await fixture<HTMLFormElement>(
        `<form>
          <am-radio-group name="plan" value="pro">
            <am-radio value="free">Free</am-radio>
            <am-radio value="pro">Pro</am-radio>
          </am-radio-group>
        </form>`,
      );
      const group = form.querySelector('am-radio-group') as HTMLElement & {
        value: string;
        updateComplete: Promise<unknown>;
      };
      group.value = 'free';
      await group.updateComplete;

      expect(new FormData(form).get('plan')).toBe('free');
    });
  });

  describe('am-switch', () => {
    it('submits its "on" value when checked via native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-switch name="notify" checked></am-switch></form>',
      );
      await settle(form.querySelector('am-switch'));

      expect(new FormData(form).get('notify')).toBe('on');
    });

    it('withdraws its value when toggled off (setFormValue(null))', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-switch name="notify" checked></am-switch></form>',
      );
      const sw = form.querySelector('am-switch') as HTMLElement & {
        checked: boolean;
        updateComplete: Promise<unknown>;
      };
      sw.checked = false;
      await sw.updateComplete;

      expect(new FormData(form).get('notify')).toBeNull();
    });
  });

  describe('am-number-field', () => {
    it('submits its numeric value as a string through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-number-field name="qty" value="5"></am-number-field></form>',
      );
      await settle(form.querySelector('am-number-field'));

      expect(new FormData(form).get('qty')).toBe('5');
    });
  });

  describe('am-slider', () => {
    it('submits its numeric value as a string through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-slider name="volume" value="30"></am-slider></form>',
      );
      await settle(form.querySelector('am-slider'));

      expect(new FormData(form).get('volume')).toBe('30');
    });
  });

  describe('am-search-field', () => {
    it('FINDING: does NOT participate in the form — not form-associated', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-search-field name="q" value="widgets"></am-search-field></form>',
      );
      await settle(form.querySelector('am-search-field'));

      // FINDING: am-search-field is NOT `formAssociated` and never attaches
      // ElementInternals. It renders a shadow-DOM <input name>, but a Shadow DOM
      // input cannot join the outer light-DOM form, so its value never reaches
      // FormData. Documented for the owning phase; not fixed here.
      expect(new FormData(form).get('q')).toBeNull();
    });
  });
});

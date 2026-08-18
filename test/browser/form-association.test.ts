import { describe, expect, it } from 'vitest';

import '../../src/components/checkbox/checkbox';
import '../../src/components/input/input';
import '../../src/components/textarea/textarea';
import '../../src/components/radio/radio';
import '../../src/components/switch/switch';
import '../../src/components/number-field/number-field';
import '../../src/components/search-field/search-field';
import '../../src/components/slider/slider';
import '../../src/components/select/select';
import '../../src/components/combobox/combobox';
import '../../src/components/rich-select/rich-select';
import '../../src/components/input-otp/input-otp';
import '../../src/components/date-picker/date-picker';
import '../../src/components/time-picker/time-picker';
import '../../src/components/color-picker/color-picker';
import '../../src/components/file-upload/file-upload';
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
 * Validity: as of Phase 4 (plan 04-01), `am-input` wires
 * `ElementInternals.setValidity` through the shared ValidationController, so a
 * `required`-but-empty `am-input` now DOES invalidate its host `<form>`. The
 * am-input validity assertion below was a carried finding from the test-only
 * phase (checkValidity stayed true) and is now updated to the resolved
 * behaviour. The other controls still lack setValidity and remain carried
 * findings until their expansion plans land.
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

    it('required + empty now blocks submission via native setValidity (FEAT-01 — finding resolved)', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-input name="username" required></am-input></form>',
      );
      await settle(form.querySelector('am-input'));

      // Phase 4 / plan 04-01 wired am-input to ElementInternals.setValidity via
      // the ValidationController, so a required-but-empty control now invalidates
      // its host form. This is the resolution of the prior carried finding.
      expect(form.checkValidity()).toBe(false);
    });

    it('becomes form-valid once a value is provided', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-input name="username" required value="alice"></am-input></form>',
      );
      await settle(form.querySelector('am-input'));

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

  describe('am-select', () => {
    it('submits the selected option value through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        `<form>
          <am-select name="country" value="us">
            <am-option value="us">United States</am-option>
            <am-option value="ca">Canada</am-option>
          </am-select>
        </form>`,
      );
      await settle(form.querySelector('am-select'));

      expect(new FormData(form).get('country')).toBe('us');
    });

    it('reflects a value change after mount', async () => {
      const form = await fixture<HTMLFormElement>(
        `<form>
          <am-select name="country" value="us">
            <am-option value="us">United States</am-option>
            <am-option value="ca">Canada</am-option>
          </am-select>
        </form>`,
      );
      const select = form.querySelector('am-select') as HTMLElement & {
        value: string;
        updateComplete: Promise<unknown>;
      };
      select.value = 'ca';
      await select.updateComplete;

      expect(new FormData(form).get('country')).toBe('ca');
    });
  });

  describe('am-combobox', () => {
    it('submits its value through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-combobox name="fruit" value="Apple"></am-combobox></form>',
      );
      await settle(form.querySelector('am-combobox'));

      expect(new FormData(form).get('fruit')).toBe('Apple');
    });
  });

  describe('am-rich-select', () => {
    it('submits its value through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-rich-select name="assignee" value="alice"></am-rich-select></form>',
      );
      await settle(form.querySelector('am-rich-select'));

      expect(new FormData(form).get('assignee')).toBe('alice');
    });
  });

  describe('am-input-otp', () => {
    it('submits the typed code through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-input-otp name="code" length="4"></am-input-otp></form>',
      );
      const otp = form.querySelector('am-input-otp') as HTMLElement & {
        value: string;
        updateComplete: Promise<unknown>;
      };
      await otp.updateComplete;

      const inputs = otp.shadowRoot!.querySelectorAll('input');
      const digits = ['1', '2', '3', '4'];
      for (let i = 0; i < digits.length; i++) {
        inputs[i].value = digits[i];
        inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
        await otp.updateComplete;
      }

      expect(new FormData(form).get('code')).toBe('1234');
    });
  });

  describe('am-date-picker', () => {
    it('submits its ISO date value through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-date-picker name="dob" value="2026-08-11"></am-date-picker></form>',
      );
      await settle(form.querySelector('am-date-picker'));

      expect(new FormData(form).get('dob')).toBe('2026-08-11');
    });
  });

  describe('am-time-picker', () => {
    it('submits its HH:MM value through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-time-picker name="start" value="14:30"></am-time-picker></form>',
      );
      await settle(form.querySelector('am-time-picker'));

      expect(new FormData(form).get('start')).toBe('14:30');
    });
  });

  describe('am-color-picker', () => {
    it('submits its hex value through native setFormValue', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-color-picker name="brand" value="#ff0000"></am-color-picker></form>',
      );
      await settle(form.querySelector('am-color-picker'));

      expect(new FormData(form).get('brand')).toBe('#ff0000');
    });
  });

  describe('am-file-upload', () => {
    it('FINDING: does NOT participate in the form — not form-associated, no name', async () => {
      const form = await fixture<HTMLFormElement>(
        '<form><am-file-upload name="doc"></am-file-upload></form>',
      );
      const upload = form.querySelector('am-file-upload') as HTMLElement & {
        updateComplete: Promise<unknown>;
      };
      await upload.updateComplete;

      // Drive a real file through the browser's native DataTransfer (this API is
      // genuinely available in Chromium, unlike the jsdom mock the plan warns of).
      const dt = new DataTransfer();
      dt.items.add(new File(['hello'], 'note.txt', { type: 'text/plain' }));
      const fileInput = upload.shadowRoot!.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', { value: dt.files, configurable: true });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await upload.updateComplete;

      // FINDING: am-file-upload is NOT `formAssociated`, exposes no `name`
      // property, and never calls setFormValue. Even with a real file attached
      // it contributes nothing to FormData. Documented for the owning phase;
      // not fixed here (test-only phase).
      expect(new FormData(form).get('doc')).toBeNull();
    });
  });
});

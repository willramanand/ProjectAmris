import { userEvent } from 'vitest/browser';
import { describe, expect, it } from 'vitest';

import '../../src/components/dialog/dialog';
import { click, fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * TEST-06 (Pitfall 2) — native `<dialog>` / top-layer against the REAL browser API.
 *
 * Runs in the `browser` Vitest project, which OMITS test/setup.ts. jsdom's mock
 * stubs `showModal()`/`close()` with plain JS that never joins the top layer, so
 * `:modal` and true top-layer semantics can only be proven in Chromium.
 *
 * NOTE: deliberately does NOT import getMockInternals or any setup.ts symbol —
 * the mock does not exist in the browser project.
 */

type DialogHost = HTMLElement & { open: boolean; closeOnBackdrop: boolean };

describe('native dialog / top-layer (real showModal)', () => {
  it('opening invokes the real showModal(): inner <dialog> reports open and is in the top layer', async () => {
    const host = await fixture<DialogHost>('<am-dialog label="Confirm">Body</am-dialog>');

    host.open = true;
    await waitForUpdate(host);

    const dialog = shadowQuery<HTMLDialogElement>(host, 'dialog');
    // Real showModal() sets `open` AND places the element in the top layer.
    expect(dialog.open).toBe(true);
    expect(dialog.matches(':modal')).toBe(true);
  });

  it('uses the genuine HTMLDialogElement.showModal (Pitfall 2 native-API guard)', () => {
    // `[native code]` proves the browser method is intact — i.e. the browser
    // project did NOT load the test/setup.ts mock that replaces showModal with
    // a JS shim.
    const showModal = HTMLDialogElement.prototype.showModal;
    expect(typeof showModal).toBe('function');
    expect(showModal.toString()).toContain('native code');
  });

  it('closing via the close button fires the native close path and leaves the dialog closed', async () => {
    const host = await fixture<DialogHost>('<am-dialog label="Confirm">Body</am-dialog>');
    host.open = true;
    await waitForUpdate(host);

    const dialog = shadowQuery<HTMLDialogElement>(host, 'dialog');
    expect(dialog.matches(':modal')).toBe(true);

    const closeBtn = shadowQuery<HTMLButtonElement>(host, '.close-btn');
    await click(closeBtn, host);

    expect(host.open).toBe(false);
    expect(dialog.open).toBe(false);
    expect(dialog.matches(':modal')).toBe(false);
  });

  it('closing via open=false runs the real close() and drops out of the top layer', async () => {
    const host = await fixture<DialogHost>('<am-dialog label="Confirm">Body</am-dialog>');
    host.open = true;
    await waitForUpdate(host);

    const dialog = shadowQuery<HTMLDialogElement>(host, 'dialog');
    expect(dialog.matches(':modal')).toBe(true);

    host.open = false;
    await waitForUpdate(host);

    expect(dialog.open).toBe(false);
    expect(dialog.matches(':modal')).toBe(false);
  });

  it('Escape triggers the native cancel/close path when backdrop-dismiss is enabled', async () => {
    const host = await fixture<DialogHost>('<am-dialog label="Confirm">Body</am-dialog>');
    host.closeOnBackdrop = true;
    host.open = true;
    await waitForUpdate(host);

    const dialog = shadowQuery<HTMLDialogElement>(host, 'dialog');
    expect(dialog.matches(':modal')).toBe(true);

    // A real Escape on a modal dialog dispatches the native `cancel` event, which
    // the component honors (closeOnBackdrop) to set open=false.
    await userEvent.keyboard('{Escape}');
    await waitForUpdate(host);

    expect(host.open).toBe(false);
    expect(dialog.open).toBe(false);
    expect(dialog.matches(':modal')).toBe(false);
  });
});

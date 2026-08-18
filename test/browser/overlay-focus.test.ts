import { userEvent } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';

import '../../src/components/dialog/dialog';
import '../../src/components/drawer/drawer';
import '../../src/components/command-palette/command-palette';
import '../../src/components/popover/popover';
import { deepActiveElement, fixture, waitForUpdate } from '../helpers';

/**
 * TEST-03 — overlay focus trap + restoration in real Chromium.
 *
 * Runs in the `browser` Vitest project, which OMITS test/setup.ts, so these
 * assertions exercise the REAL focus model (native `<dialog>` top-layer +
 * inert siblings) rather than the jsdom mock. jsdom cannot prove focus-trap
 * containment or top-layer inertness, which is exactly why this suite lives in
 * the browser lane.
 *
 * `deepActiveElement()` (test/helpers.ts) pierces shadow roots so we can assert
 * the trapped/restored element regardless of shadow boundaries.
 *
 * NOTE: deliberately does NOT import getMockInternals — the mock does not exist
 * in the browser project.
 */

type OpenableHost = HTMLElement & { open: boolean };

/** True when `node` is inside the overlay host's light OR shadow subtree. */
function withinOverlay(host: HTMLElement, node: Element | null): boolean {
  if (!node) return false;
  return host.contains(node) || Boolean(host.shadowRoot?.contains(node));
}

const openers: HTMLElement[] = [];

/** Create a real opener button, focus it, and track it for cleanup. */
function makeOpener(label: string): HTMLElement {
  const opener = document.createElement('button');
  opener.textContent = label;
  document.body.append(opener);
  opener.focus();
  openers.push(opener);
  return opener;
}

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

afterEach(() => {
  for (const opener of openers.splice(0)) opener.remove();
  document.querySelectorAll('am-dialog, am-drawer, am-command-palette, am-popover').forEach((el) => {
    (el as Partial<OpenableHost>).open = false;
    el.remove();
  });
});

describe('overlay focus trap + restoration (real Chromium)', () => {
  it('am-dialog: moves focus in, traps it, and restores to the opener', async () => {
    const opener = makeOpener('Open dialog');
    expect(deepActiveElement()).toBe(opener);

    const dialog = await fixture<OpenableHost>(`
      <am-dialog label="Confirm">
        <button class="d-first">First</button>
        <button class="d-second">Second</button>
      </am-dialog>
    `);

    dialog.open = true;
    await waitForUpdate(dialog);

    // Native showModal() moves focus into the dialog subtree.
    expect(withinOverlay(dialog, deepActiveElement())).toBe(true);

    // Focus trap: while the dialog is modal, siblings are inert — a programmatic
    // focus on the opener cannot steal focus back out of the top layer.
    opener.focus();
    expect(deepActiveElement()).not.toBe(opener);
    expect(withinOverlay(dialog, deepActiveElement())).toBe(true);

    // Tab cycling stays within the overlay (real keyboard via userEvent).
    await userEvent.tab();
    expect(withinOverlay(dialog, deepActiveElement())).toBe(true);
    await userEvent.tab();
    expect(withinOverlay(dialog, deepActiveElement())).toBe(true);

    // Restoration: closing returns focus to the element focused before opening.
    dialog.open = false;
    await waitForUpdate(dialog);
    expect(deepActiveElement()).toBe(opener);
  });

  it('am-drawer: moves focus in on open and restores to the opener on close', async () => {
    const opener = makeOpener('Open drawer');

    const drawer = await fixture<OpenableHost>(`
      <am-drawer label="Settings">
        <button class="dr-first">First</button>
      </am-drawer>
    `);

    drawer.open = true;
    await waitForUpdate(drawer);
    expect(withinOverlay(drawer, deepActiveElement())).toBe(true);

    // Modal inertness: opener cannot pull focus out of the drawer.
    opener.focus();
    expect(withinOverlay(drawer, deepActiveElement())).toBe(true);

    drawer.open = false;
    await waitForUpdate(drawer);
    expect(deepActiveElement()).toBe(opener);
  });

  it('am-command-palette: focuses its input on open and restores to the opener on close', async () => {
    const opener = makeOpener('Open palette');

    const palette = await fixture<OpenableHost>(
      '<am-command-palette></am-command-palette>',
    );

    palette.open = true;
    await waitForUpdate(palette);
    // The palette focuses its search input inside a requestAnimationFrame.
    await nextFrame();

    const active = deepActiveElement();
    expect(withinOverlay(palette, active)).toBe(true);
    expect((active as Element)?.tagName.toLowerCase()).toBe('input');

    palette.open = false;
    await waitForUpdate(palette);
    expect(deepActiveElement()).toBe(opener);
  });

  it('am-popover: is non-modal and preserves focus on the opener across open/close', async () => {
    // Popover has no <dialog>/top-layer — it intentionally does not trap or
    // relocate focus. Opening must not steal focus from the trigger; this
    // documents the non-modal focus contract.
    const popover = await fixture<OpenableHost>(`
      <am-popover trigger="manual">
        <button class="pop-trigger">Trigger</button>
        <div slot="content"><button class="pop-inner">Inner</button></div>
      </am-popover>
    `);
    const trigger = popover.querySelector<HTMLElement>('.pop-trigger')!;
    trigger.focus();
    openers.push(trigger);
    expect(deepActiveElement()).toBe(trigger);

    popover.open = true;
    await waitForUpdate(popover);
    await nextFrame();

    // Focus is preserved on the opener — popover does not steal it.
    expect(deepActiveElement()).toBe(trigger);

    popover.open = false;
    await waitForUpdate(popover);
    expect(deepActiveElement()).toBe(trigger);
  });

  it('am-dialog (FIX-03): closing with a removed opener is guarded — does not throw and does not focus the disconnected node', async () => {
    // am-dialog restores focus on close via `previouslyFocused.focus()`, now
    // gated by an `isConnected` guard (FIX-03). When the opener was removed
    // while the dialog was open, the guard skips the focus() call entirely:
    // closing does NOT throw and focus is NOT driven onto the removed node
    // (it falls to <body>). This asserts the guarded fix, not the prior gap.
    const opener = makeOpener('Disposable opener');

    const dialog = await fixture<OpenableHost>('<am-dialog label="X"></am-dialog>');
    dialog.open = true;
    await waitForUpdate(dialog);

    // Remove the opener while the dialog is open, then close.
    opener.remove();
    openers.splice(openers.indexOf(opener), 1);

    let threw = false;
    try {
      dialog.open = false;
      await waitForUpdate(dialog);
    } catch {
      threw = true;
    }

    // Guarded behavior: no throw, and focus is not driven onto the removed opener.
    expect(threw).toBe(false);
    expect(deepActiveElement()).not.toBe(opener);
  });
});

import { describe, expect, it, vi } from 'vitest';

import '../../src/components/drawer/drawer';
import { click, mount, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-drawer', () => {
  it('opens the dialog when open is set and emits am-open', async () => {
    const element = document.createElement('am-drawer') as HTMLElement & {
      open: boolean;
      label: string;
    };
    element.label = 'Settings';

    await mount(element);

    const openEvent = oneEvent(element, 'am-open');
    element.open = true;
    await waitForUpdate(element);
    await openEvent;

    const dialog = shadowQuery<HTMLDialogElement>(element, 'dialog');
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe('Settings');
  });

  it('closes the dialog and emits am-close', async () => {
    const element = document.createElement('am-drawer') as HTMLElement & {
      open: boolean;
    };
    element.open = true;
    await mount(element);
    await waitForUpdate(element);

    const closeEvent = oneEvent(element, 'am-close');
    element.open = false;
    await waitForUpdate(element);
    await closeEvent;

    const dialog = shadowQuery<HTMLDialogElement>(element, 'dialog');
    expect(dialog.open).toBe(false);
  });

  it('closes from the close button', async () => {
    const element = document.createElement('am-drawer') as HTMLElement & {
      open: boolean;
    };
    element.open = true;
    await mount(element);
    await waitForUpdate(element);

    const closeEvent = oneEvent(element, 'am-close');
    const closeBtn = shadowQuery<HTMLButtonElement>(element, '.close-btn');
    await click(closeBtn, element);
    await closeEvent;

    expect(element.open).toBe(false);
  });

  it('restores focus to a still-connected opener on close (FIX-03)', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open drawer';
    document.body.appendChild(opener);
    opener.focus();

    const element = document.createElement('am-drawer') as HTMLElement & {
      open: boolean;
    };
    await mount(element);

    element.open = true;
    await waitForUpdate(element);

    const focusSpy = vi.spyOn(opener, 'focus');

    const closeEvent = oneEvent(element, 'am-close');
    element.open = false;
    await waitForUpdate(element);
    await closeEvent;

    // Opener is still connected, so focus is restored to it.
    expect(focusSpy).toHaveBeenCalled();
    focusSpy.mockRestore();
    opener.remove();
  });

  it('does not focus a removed opener on close (FIX-03)', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open drawer';
    document.body.appendChild(opener);
    opener.focus();

    const element = document.createElement('am-drawer') as HTMLElement & {
      open: boolean;
    };
    await mount(element);

    element.open = true;
    await waitForUpdate(element);

    // Opener is removed while the drawer is open — its node is now disconnected.
    const focusSpy = vi.spyOn(opener, 'focus');
    opener.remove();

    // Closing must not throw and must not call focus() on the disconnected node
    // (the isConnected guard skips it).
    const closeEvent = oneEvent(element, 'am-close');
    expect(() => {
      element.open = false;
    }).not.toThrow();
    await waitForUpdate(element);
    await closeEvent;

    expect(focusSpy).not.toHaveBeenCalled();
    focusSpy.mockRestore();
  });

  it('reflects placement attribute', async () => {
    const element = await mount(
      document.createElement('am-drawer') as HTMLElement & { placement: string },
    );

    expect(element.getAttribute('placement')).toBe('end');

    (element as HTMLElement & { placement: string }).placement = 'start';
    await waitForUpdate(element);

    expect(element.getAttribute('placement')).toBe('start');
  });
});

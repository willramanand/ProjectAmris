import { describe, expect, it, vi } from 'vitest';

import '../../src/components/dialog/dialog';
import { click, mount, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-dialog', () => {
  it('emits am-open and am-close when the open property changes', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      label: string;
      open: boolean;
    };
    element.label = 'Confirm';

    await mount(element);

    const openEvent = oneEvent(element, 'am-open');
    element.open = true;
    await waitForUpdate(element);
    await openEvent;

    const dialog = shadowQuery<HTMLDialogElement>(element, 'dialog');
    expect(dialog.open).toBe(true);

    const closeEvent = oneEvent(element, 'am-close');
    element.open = false;
    await waitForUpdate(element);
    await closeEvent;

    expect(dialog.open).toBe(false);
  });

  it('closes from the close button', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      open: boolean;
    };

    await mount(element);
    element.open = true;
    await waitForUpdate(element);

    const closeEvent = oneEvent(element, 'am-close');
    const closeButton = shadowQuery<HTMLButtonElement>(element, '.close-btn');

    await click(closeButton, element);
    await closeEvent;

    expect(element.open).toBe(false);
  });

  it('sets aria-label from the label property', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      label: string;
      open: boolean;
    };
    element.label = 'My Dialog';
    await mount(element);
    element.open = true;
    await waitForUpdate(element);

    const dialog = shadowQuery<HTMLDialogElement>(element, 'dialog');
    expect(dialog.getAttribute('aria-label')).toBe('My Dialog');
  });

  it('does not show close button when closable is false', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      open: boolean;
      closable: boolean;
    };
    element.closable = false;
    await mount(element);
    element.open = true;
    await waitForUpdate(element);

    expect(element.shadowRoot?.querySelector('.close-btn')).toBeNull();
  });

  it('closes on backdrop click when closeOnBackdrop is true', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      open: boolean;
      closeOnBackdrop: boolean;
    };
    element.closeOnBackdrop = true;
    await mount(element);
    element.open = true;
    await waitForUpdate(element);

    const dialog = shadowQuery<HTMLDialogElement>(element, 'dialog');
    const rect = dialog.getBoundingClientRect();

    // Simulate clicking outside the dialog rect (backdrop)
    const closeEvent = oneEvent(element, 'am-close');
    const clickEvent = new MouseEvent('click', {
      clientX: rect.left - 10,
      clientY: rect.top - 10,
      bubbles: true,
      composed: true,
    });
    dialog.dispatchEvent(clickEvent);
    await waitForUpdate(element);
    await closeEvent;

    expect(element.open).toBe(false);
  });

  it('nudges when backdrop clicked and closeOnBackdrop is false', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      open: boolean;
      closeOnBackdrop: boolean;
    };
    element.closeOnBackdrop = false;
    await mount(element);
    element.open = true;
    await waitForUpdate(element);

    const dialog = shadowQuery<HTMLDialogElement>(element, 'dialog');
    const rect = dialog.getBoundingClientRect();

    // Click outside — should nudge, not close
    const clickEvent = new MouseEvent('click', {
      clientX: rect.left - 10,
      clientY: rect.top - 10,
      bubbles: true,
      composed: true,
    });
    dialog.dispatchEvent(clickEvent);
    await waitForUpdate(element);

    expect(element.open).toBe(true);
    expect(dialog.classList.contains('nudge')).toBe(true);
  });

  it('tears down the nudge animationend listener on disconnect (FIX-04)', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      open: boolean;
      closeOnBackdrop: boolean;
    };
    element.closeOnBackdrop = false;
    await mount(element);
    element.open = true;
    await waitForUpdate(element);

    const dialog = shadowQuery<HTMLDialogElement>(element, 'dialog');
    const rect = dialog.getBoundingClientRect();

    // Trigger a nudge (blocked backdrop click) so the animationend listener is
    // registered on the shadow <dialog>.
    dialog.dispatchEvent(
      new MouseEvent('click', {
        clientX: rect.left - 10,
        clientY: rect.top - 10,
        bubbles: true,
        composed: true,
      }),
    );
    await waitForUpdate(element);
    expect(dialog.classList.contains('nudge')).toBe(true);

    // The nudge listener is bound to this TeardownScope signal; capture it now.
    // jsdom does not auto-fire animationend, so we assert teardown deterministically
    // via the scope's abort signal rather than waiting for the animation.
    const { signal } = (
      element as unknown as { _teardown: { signal: AbortSignal } }
    )._teardown;
    expect(signal.aborted).toBe(false);

    // Disconnect mid-nudge: disconnectedCallback → _teardown.clear() aborts the
    // captured signal, removing the still-bound animationend listener.
    element.remove();
    expect(signal.aborted).toBe(true);
  });

  it('does not close on click inside dialog area', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      open: boolean;
      closeOnBackdrop: boolean;
    };
    element.closeOnBackdrop = true;
    await mount(element);
    element.open = true;
    await waitForUpdate(element);

    const dialog = shadowQuery<HTMLDialogElement>(element, 'dialog');
    const rect = dialog.getBoundingClientRect();

    // Click inside the dialog
    const clickEvent = new MouseEvent('click', {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
      composed: true,
    });
    dialog.dispatchEvent(clickEvent);
    await waitForUpdate(element);

    expect(element.open).toBe(true);
  });

  it('handles cancel event — closes when closeOnBackdrop is true', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      open: boolean;
      closeOnBackdrop: boolean;
    };
    element.closeOnBackdrop = true;
    await mount(element);
    element.open = true;
    await waitForUpdate(element);

    const dialog = shadowQuery<HTMLDialogElement>(element, 'dialog');
    const closeEvent = oneEvent(element, 'am-close');

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await waitForUpdate(element);
    await closeEvent;

    expect(element.open).toBe(false);
  });

  it('handles cancel event — nudges when closeOnBackdrop is false', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      open: boolean;
      closeOnBackdrop: boolean;
    };
    element.closeOnBackdrop = false;
    await mount(element);
    element.open = true;
    await waitForUpdate(element);

    const dialog = shadowQuery<HTMLDialogElement>(element, 'dialog');

    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await waitForUpdate(element);

    expect(element.open).toBe(true);
    expect(dialog.classList.contains('nudge')).toBe(true);
  });

  it('handles native close event', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      open: boolean;
    };
    await mount(element);
    element.open = true;
    await waitForUpdate(element);

    const dialog = shadowQuery<HTMLDialogElement>(element, 'dialog');

    dialog.dispatchEvent(new Event('close'));
    await waitForUpdate(element);

    expect(element.open).toBe(false);
  });

  it('reflects size attribute', async () => {
    const element = document.createElement('am-dialog') as HTMLElement & {
      size: string;
    };
    element.size = 'lg';
    await mount(element);

    expect(element.getAttribute('size')).toBe('lg');
  });

  it('restores focus to previously focused element on close', async () => {
    const focusTarget = document.createElement('button');
    focusTarget.textContent = 'Trigger';
    document.body.appendChild(focusTarget);
    focusTarget.focus();

    const element = document.createElement('am-dialog') as HTMLElement & {
      open: boolean;
    };
    await mount(element);

    element.open = true;
    await waitForUpdate(element);

    const closeEvent = oneEvent(element, 'am-close');
    element.open = false;
    await waitForUpdate(element);
    await closeEvent;

    expect(document.activeElement).toBe(focusTarget);
    focusTarget.remove();
  });

  it('does not focus a removed opener on close (FIX-03)', async () => {
    const focusTarget = document.createElement('button');
    focusTarget.textContent = 'Trigger';
    document.body.appendChild(focusTarget);
    focusTarget.focus();

    const element = document.createElement('am-dialog') as HTMLElement & {
      open: boolean;
    };
    await mount(element);

    element.open = true;
    await waitForUpdate(element);

    // Opener is removed while the dialog is open — its node is now disconnected.
    const focusSpy = vi.spyOn(focusTarget, 'focus');
    focusTarget.remove();

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
});

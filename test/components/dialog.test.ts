import { describe, expect, it } from 'vitest';

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
});

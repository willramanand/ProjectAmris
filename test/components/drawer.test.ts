import { describe, expect, it } from 'vitest';

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

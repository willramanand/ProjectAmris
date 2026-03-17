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
});

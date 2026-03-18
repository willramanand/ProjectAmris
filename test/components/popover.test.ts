import { describe, expect, it } from 'vitest';

import '../../src/components/popover/popover';
import { click, fixture, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-popover', () => {
  it('opens on trigger click and emits am-show', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-popover>
        <button>Open</button>
        <div slot="content">Popover body</div>
      </am-popover>`,
    );

    expect(element.open).toBe(false);

    const eventPromise = oneEvent(element, 'am-show');
    const trigger = shadowQuery<HTMLElement>(element, '.trigger');
    await click(trigger, element);
    await eventPromise;

    expect(element.open).toBe(true);
  });

  it('closes on second trigger click and emits am-hide', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-popover open>
        <button>Toggle</button>
        <div slot="content">Body</div>
      </am-popover>`,
    );

    await waitForUpdate(element);

    const eventPromise = oneEvent(element, 'am-hide');
    const trigger = shadowQuery<HTMLElement>(element, '.trigger');
    await click(trigger, element);
    await eventPromise;

    expect(element.open).toBe(false);
  });

  it('closes on Escape key', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-popover open>
        <button>Toggle</button>
        <div slot="content">Body</div>
      </am-popover>`,
    );

    await waitForUpdate(element);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitForUpdate(element);

    expect(element.open).toBe(false);
  });

  it('renders the arrow element when arrow prop is true', async () => {
    const element = await fixture<HTMLElement>(
      `<am-popover>
        <button>Open</button>
        <div slot="content">With arrow</div>
      </am-popover>`,
    );

    const arrowEl = shadowQuery<HTMLElement>(element, '.arrow');
    expect(arrowEl).toBeTruthy();
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/dropdown/dropdown';
import { click, fixture, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-dropdown', () => {
  it('opens on trigger click and emits am-show', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-dropdown>
        <button>Toggle</button>
        <div slot="content">Menu content</div>
      </am-dropdown>`,
    );

    expect(element.open).toBe(false);

    const eventPromise = oneEvent(element, 'am-show');
    const trigger = shadowQuery<HTMLElement>(element, '.trigger');
    await click(trigger, element);
    await eventPromise;

    expect(element.open).toBe(true);
  });

  it('closes on second click and emits am-hide', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-dropdown open>
        <button>Toggle</button>
        <div slot="content">Menu</div>
      </am-dropdown>`,
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
      `<am-dropdown open>
        <button>Toggle</button>
        <div slot="content">Menu</div>
      </am-dropdown>`,
    );

    await waitForUpdate(element);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitForUpdate(element);

    expect(element.open).toBe(false);
  });

  it('does not open when disabled', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-dropdown disabled>
        <button>Toggle</button>
        <div slot="content">Menu</div>
      </am-dropdown>`,
    );

    const trigger = shadowQuery<HTMLElement>(element, '.trigger');
    await click(trigger, element);

    expect(element.open).toBe(false);
  });
});

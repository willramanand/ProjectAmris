import { describe, expect, it, vi } from 'vitest';

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

// TEST-05 — global-listener teardown spies (jsdom lifecycle lane).
// am-dropdown attaches document-level `click` + `keydown` listeners when it
// opens and removes them when it closes (and on disconnect).
describe('am-dropdown — document listener teardown (TEST-05)', () => {
  type DropdownEl = HTMLElement & { open: boolean };

  async function makeDropdown(open = false): Promise<DropdownEl> {
    return fixture<DropdownEl>(
      `<am-dropdown ${open ? 'open' : ''}>
        <button>Toggle</button>
        <div slot="content">Menu</div>
      </am-dropdown>`,
    );
  }

  function handlers(el: DropdownEl): { click: EventListener; keydown: EventListener } {
    const priv = el as unknown as { _handleOutsideClick: EventListener; _handleKeydown: EventListener };
    return { click: priv._handleOutsideClick, keydown: priv._handleKeydown };
  }

  it('attaches click + keydown on open and removes them on close', async () => {
    const el = await makeDropdown();
    const { click: clickHandler, keydown: keyHandler } = handlers(el);
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    el.open = true;
    await waitForUpdate(el);
    expect(addSpy).toHaveBeenCalledWith('click', clickHandler);
    expect(addSpy).toHaveBeenCalledWith('keydown', keyHandler);

    el.open = false;
    await waitForUpdate(el);
    expect(removeSpy).toHaveBeenCalledWith('click', clickHandler);
    expect(removeSpy).toHaveBeenCalledWith('keydown', keyHandler);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('detaches document listeners on disconnect while open', async () => {
    const el = await makeDropdown(true);
    await waitForUpdate(el);
    const { click: clickHandler, keydown: keyHandler } = handlers(el);

    const removeSpy = vi.spyOn(document, 'removeEventListener');
    el.remove();
    await waitForUpdate(el);
    expect(removeSpy).toHaveBeenCalledWith('click', clickHandler);
    expect(removeSpy).toHaveBeenCalledWith('keydown', keyHandler);
    removeSpy.mockRestore();
  });
});

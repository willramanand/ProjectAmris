import { describe, expect, it, vi } from 'vitest';

import '../../src/components/popover/popover';
import { click, fixture, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-popover', () => {
  it('opens on trigger click and emits am-open', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-popover>
        <button>Open</button>
        <div slot="content">Popover body</div>
      </am-popover>`,
    );

    expect(element.open).toBe(false);

    const eventPromise = oneEvent(element, 'am-open');
    const trigger = shadowQuery<HTMLElement>(element, '.trigger');
    await click(trigger, element);
    await eventPromise;

    expect(element.open).toBe(true);
  });

  it('closes on second trigger click and emits am-close', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-popover open>
        <button>Toggle</button>
        <div slot="content">Body</div>
      </am-popover>`,
    );

    await waitForUpdate(element);

    const eventPromise = oneEvent(element, 'am-close');
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

// TEST-05 — global-listener teardown spies (jsdom lifecycle lane).
// am-popover (default click trigger) attaches document-level `click` + `keydown`
// listeners when it opens and removes them when it closes (and on disconnect).
describe('am-popover — document listener teardown (TEST-05)', () => {
  type PopoverEl = HTMLElement & { open: boolean };

  async function makePopover(open = false): Promise<PopoverEl> {
    return fixture<PopoverEl>(
      `<am-popover ${open ? 'open' : ''}>
        <button>Open</button>
        <div slot="content">Body</div>
      </am-popover>`,
    );
  }

  function handlers(el: PopoverEl): { click: EventListener; keydown: EventListener } {
    const priv = el as unknown as { _handleDocumentClick: EventListener; _handleKeydown: EventListener };
    return { click: priv._handleDocumentClick, keydown: priv._handleKeydown };
  }

  it('attaches click + keydown on open and removes them on close', async () => {
    const el = await makePopover();
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
    const el = await makePopover(true);
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

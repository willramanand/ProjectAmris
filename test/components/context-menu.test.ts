import { describe, expect, it, vi } from 'vitest';

import '../../src/components/context-menu/context-menu';
import '../../src/components/menu/menu';
import { fixture, oneEvent, waitForUpdate } from '../helpers';

type ContextMenuEl = HTMLElement & { open: boolean };

async function makeContextMenu(): Promise<ContextMenuEl> {
  return fixture<ContextMenuEl>(`
    <am-context-menu>
      <div class="trigger-area" style="padding: 2rem;">Right-click here</div>
      <am-menu slot="menu">
        <am-menu-item>Cut</am-menu-item>
        <am-menu-item>Copy</am-menu-item>
      </am-menu>
    </am-context-menu>
  `);
}

function dispatchContext(target: HTMLElement, x = 100, y = 100): void {
  target.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      composed: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
}

describe('am-context-menu', () => {
  it('opens on contextmenu event and emits am-open', async () => {
    const el = await makeContextMenu();
    expect(el.open).toBe(false);

    const showPromise = oneEvent(el, 'am-open');
    dispatchContext(el);
    await showPromise;

    expect(el.open).toBe(true);
  });

  it('closes on Escape and emits am-close', async () => {
    const el = await makeContextMenu();
    dispatchContext(el);
    await waitForUpdate(el);
    expect(el.open).toBe(true);

    const hidePromise = oneEvent(el, 'am-close');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await hidePromise;

    expect(el.open).toBe(false);
  });

  it('closes on outside click', async () => {
    const el = await makeContextMenu();
    dispatchContext(el);
    await waitForUpdate(el);
    expect(el.open).toBe(true);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await waitForUpdate(el);
    expect(el.open).toBe(false);
  });

  it('renders the slotted menu in the panel slot', async () => {
    const el = await makeContextMenu();
    const menu = el.querySelector('am-menu');
    expect(menu).toBeTruthy();
    expect(menu?.getAttribute('slot')).toBe('menu');
  });
});

// TEST-05 — global-listener teardown spies (jsdom lifecycle lane).
// am-context-menu attaches document-level `click`, `keydown`, and `contextmenu`
// listeners when it opens and removes them when it closes (and on disconnect).
describe('am-context-menu — document listener teardown (TEST-05)', () => {
  function handlers(el: ContextMenuEl): { click: EventListener; keydown: EventListener; contextmenu: EventListener } {
    const priv = el as unknown as {
      _handleOutsideClick: EventListener;
      _handleKeydown: EventListener;
      _handleDocumentContext: EventListener;
    };
    return { click: priv._handleOutsideClick, keydown: priv._handleKeydown, contextmenu: priv._handleDocumentContext };
  }

  it('attaches document listeners on open and removes them on close', async () => {
    const el = await makeContextMenu();
    const { click: clickHandler, keydown: keyHandler, contextmenu: ctxHandler } = handlers(el);
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    dispatchContext(el);
    await waitForUpdate(el);
    expect(el.open).toBe(true);
    expect(addSpy).toHaveBeenCalledWith('click', clickHandler);
    expect(addSpy).toHaveBeenCalledWith('keydown', keyHandler);
    expect(addSpy).toHaveBeenCalledWith('contextmenu', ctxHandler);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitForUpdate(el);
    expect(el.open).toBe(false);
    expect(removeSpy).toHaveBeenCalledWith('click', clickHandler);
    expect(removeSpy).toHaveBeenCalledWith('keydown', keyHandler);
    expect(removeSpy).toHaveBeenCalledWith('contextmenu', ctxHandler);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('detaches document listeners on disconnect while open', async () => {
    const el = await makeContextMenu();
    dispatchContext(el);
    await waitForUpdate(el);
    const { click: clickHandler, keydown: keyHandler, contextmenu: ctxHandler } = handlers(el);

    const removeSpy = vi.spyOn(document, 'removeEventListener');
    el.remove();
    await waitForUpdate(el);
    expect(removeSpy).toHaveBeenCalledWith('click', clickHandler);
    expect(removeSpy).toHaveBeenCalledWith('keydown', keyHandler);
    expect(removeSpy).toHaveBeenCalledWith('contextmenu', ctxHandler);
    removeSpy.mockRestore();
  });
});

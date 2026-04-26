import { describe, expect, it } from 'vitest';

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
  it('opens on contextmenu event and emits am-show', async () => {
    const el = await makeContextMenu();
    expect(el.open).toBe(false);

    const showPromise = oneEvent(el, 'am-show');
    dispatchContext(el);
    await showPromise;

    expect(el.open).toBe(true);
  });

  it('closes on Escape and emits am-hide', async () => {
    const el = await makeContextMenu();
    dispatchContext(el);
    await waitForUpdate(el);
    expect(el.open).toBe(true);

    const hidePromise = oneEvent(el, 'am-hide');
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

import { describe, expect, it } from 'vitest';

import '../../src/components/menu/menu';
import { click, fixture, keydown, oneEvent, waitForUpdate } from '../helpers';

async function makeMenu(): Promise<HTMLElement> {
  return fixture<HTMLElement>(`
    <am-menu>
      <am-menu-item>Cut</am-menu-item>
      <am-menu-item>Copy</am-menu-item>
      <am-menu-item disabled>Paste</am-menu-item>
      <am-menu-divider></am-menu-divider>
      <am-menu-item destructive>Delete</am-menu-item>
    </am-menu>
  `);
}

function items(menu: HTMLElement): HTMLElement[] {
  return Array.from(menu.querySelectorAll('am-menu-item')) as HTMLElement[];
}

describe('am-menu', () => {
  it('sets role=menu on host and role=menuitem on items', async () => {
    const menu = await makeMenu();
    expect(menu.getAttribute('role')).toBe('menu');
    items(menu).forEach((it) => expect(it.getAttribute('role')).toBe('menuitem'));
  });

  it('roving tabindex: first enabled item is tabindex=0, others -1', async () => {
    const menu = await makeMenu();
    await waitForUpdate(menu);
    const all = items(menu);
    expect(all[0].getAttribute('tabindex')).toBe('0');
    expect(all[1].getAttribute('tabindex')).toBe('-1');
    expect(all[3].getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown moves focus to the next enabled item, skipping disabled', async () => {
    const menu = await makeMenu();
    await waitForUpdate(menu);
    const all = items(menu);
    all[0].focus();
    await keydown(all[0], 'ArrowDown', menu);
    expect(all[1].getAttribute('tabindex')).toBe('0');

    await keydown(all[1], 'ArrowDown', menu);
    // Skips disabled "Paste" → "Delete"
    expect(all[3].getAttribute('tabindex')).toBe('0');
  });

  it('Home/End jump to first/last enabled item', async () => {
    const menu = await makeMenu();
    await waitForUpdate(menu);
    const all = items(menu);
    all[0].focus();

    await keydown(all[0], 'End', menu);
    expect(all[3].getAttribute('tabindex')).toBe('0');

    await keydown(all[3], 'Home', menu);
    expect(all[0].getAttribute('tabindex')).toBe('0');
  });

  it('Enter activates focused item via click', async () => {
    const menu = await makeMenu();
    await waitForUpdate(menu);
    const all = items(menu);
    all[0].focus();

    const eventPromise = oneEvent<{ item: HTMLElement }>(menu, 'am-select');
    await keydown(all[0], 'Enter', menu);
    const ev = await eventPromise;
    expect(ev.detail.item).toBe(all[0]);
  });

  it('disabled items do not fire am-select on click', async () => {
    const menu = await makeMenu();
    const all = items(menu);

    let fired = false;
    menu.addEventListener('am-select', () => { fired = true; });
    await click(all[2], menu); // disabled

    expect(fired).toBe(false);
  });
});

describe('am-menu-divider', () => {
  it('sets role=separator', async () => {
    const el = await fixture<HTMLElement>('<am-menu-divider></am-menu-divider>');
    expect(el.getAttribute('role')).toBe('separator');
  });
});

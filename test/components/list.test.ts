import { describe, expect, it } from 'vitest';

import '../../src/components/list/list';
import { click, fixture, keydown, oneEvent, waitForUpdate } from '../helpers';

describe('am-list-item', () => {
  it('sets role="listitem" on all items', async () => {
    const element = await fixture<HTMLElement>(
      '<am-list-item>Item text</am-list-item>',
    );

    expect(element.getAttribute('role')).toBe('listitem');
  });

  it('emits am-select on click when interactive', async () => {
    const element = await fixture<HTMLElement>(
      '<am-list-item interactive>Clickable</am-list-item>',
    );

    expect(element.getAttribute('tabindex')).toBe('0');

    const eventPromise = oneEvent(element, 'am-select');
    await click(element, element);
    await eventPromise;
  });

  it('activates via keyboard Enter when interactive', async () => {
    const element = await fixture<HTMLElement>(
      '<am-list-item interactive>Keyboard</am-list-item>',
    );

    const eventPromise = oneEvent(element, 'am-select');
    await keydown(element, 'Enter', element);
    await eventPromise;
  });

  it('does not emit am-select when disabled', async () => {
    const element = await fixture<HTMLElement>(
      '<am-list-item interactive disabled>Disabled</am-list-item>',
    );

    let fired = false;
    element.addEventListener('am-select', () => { fired = true; });

    await click(element, element);

    expect(fired).toBe(false);
  });

  it('reflects selected state', async () => {
    const element = await fixture<HTMLElement & { selected: boolean }>(
      '<am-list-item selected>Selected</am-list-item>',
    );

    expect(element.hasAttribute('selected')).toBe(true);
  });
});

describe('am-list', () => {
  it('sets role="list" on the container', async () => {
    const element = await fixture<HTMLElement>(
      `<am-list>
        <am-list-item>A</am-list-item>
        <am-list-item>B</am-list-item>
      </am-list>`,
    );

    expect(element.getAttribute('role')).toBe('list');
  });

  it('reflects the dividers attribute', async () => {
    const element = await fixture<HTMLElement>(
      '<am-list dividers></am-list>',
    );

    expect(element.hasAttribute('dividers')).toBe(true);
  });
});

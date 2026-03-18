import { describe, expect, it } from 'vitest';

import '../../src/components/tree-view/tree-view';
import { click, fixture, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-tree-item', () => {
  it('sets role="treeitem" on the host', async () => {
    const element = await fixture<HTMLElement>(
      '<am-tree-item label="README.md" value="readme"></am-tree-item>',
    );

    expect(element.getAttribute('role')).toBe('treeitem');
  });

  it('emits am-select on click', async () => {
    const element = await fixture<HTMLElement & { selected: boolean }>(
      '<am-tree-item label="File" value="file"></am-tree-item>',
    );

    const eventPromise = oneEvent<{ value: string; label: string }>(element, 'am-select');
    const row = shadowQuery<HTMLButtonElement>(element, '.row');
    await click(row, element);
    const event = await eventPromise;

    expect(event.detail.value).toBe('file');
    expect(event.detail.label).toBe('File');
    expect(element.selected).toBe(true);
  });

  it('sets aria-selected on the host element', async () => {
    const element = await fixture<HTMLElement & { selected: boolean }>(
      '<am-tree-item label="Item" value="item"></am-tree-item>',
    );

    expect(element.getAttribute('aria-selected')).toBe('false');

    const row = shadowQuery<HTMLButtonElement>(element, '.row');
    await click(row, element);

    expect(element.getAttribute('aria-selected')).toBe('true');
  });

  it('toggles open/closed on click when it has children', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-tree-item label="src" value="src">
        <am-tree-item label="index.ts" value="index"></am-tree-item>
      </am-tree-item>`,
    );
    await waitForUpdate(element);

    expect(element.open).toBe(false);

    const row = shadowQuery<HTMLButtonElement>(element, '.row');

    // Click to open
    const togglePromise = oneEvent<{ open: boolean; value: string }>(element, 'am-toggle');
    await click(row, element);
    const event = await togglePromise;

    expect(event.detail.open).toBe(true);
    expect(event.detail.value).toBe('src');
    expect(element.open).toBe(true);
    expect(element.getAttribute('aria-expanded')).toBe('true');

    // Click again to close
    const togglePromise2 = oneEvent<{ open: boolean; value: string }>(element, 'am-toggle');
    await click(row, element);
    const event2 = await togglePromise2;

    expect(event2.detail.open).toBe(false);
    expect(element.open).toBe(false);
  });

  it('does not set aria-expanded on leaf items', async () => {
    const element = await fixture<HTMLElement>(
      '<am-tree-item label="file.txt" value="file"></am-tree-item>',
    );

    expect(element.hasAttribute('aria-expanded')).toBe(false);
  });

  it('opens with ArrowRight when has children and closed', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-tree-item label="src" value="src">
        <am-tree-item label="index.ts" value="index"></am-tree-item>
      </am-tree-item>`,
    );
    await waitForUpdate(element);

    const row = shadowQuery<HTMLButtonElement>(element, '.row');
    await keydown(row, 'ArrowRight', element);

    expect(element.open).toBe(true);
  });

  it('closes with ArrowLeft when has children and open', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-tree-item label="src" value="src" open>
        <am-tree-item label="index.ts" value="index"></am-tree-item>
      </am-tree-item>`,
    );
    await waitForUpdate(element);

    const row = shadowQuery<HTMLButtonElement>(element, '.row');
    await keydown(row, 'ArrowLeft', element);

    expect(element.open).toBe(false);
  });

  it('selects on Enter key', async () => {
    const element = await fixture<HTMLElement & { selected: boolean }>(
      '<am-tree-item label="File" value="file"></am-tree-item>',
    );

    const row = shadowQuery<HTMLButtonElement>(element, '.row');
    const eventPromise = oneEvent<{ value: string }>(element, 'am-select');
    await keydown(row, 'Enter', element);
    await eventPromise;

    expect(element.selected).toBe(true);
  });

  it('selects on Space key', async () => {
    const element = await fixture<HTMLElement & { selected: boolean }>(
      '<am-tree-item label="File" value="file"></am-tree-item>',
    );

    const row = shadowQuery<HTMLButtonElement>(element, '.row');
    const eventPromise = oneEvent<{ value: string }>(element, 'am-select');
    await keydown(row, ' ', element);
    await eventPromise;

    expect(element.selected).toBe(true);
  });

  it('sets depth on child items', async () => {
    const element = await fixture<HTMLElement>(
      `<am-tree-item label="root" value="root">
        <am-tree-item label="child" value="child"></am-tree-item>
      </am-tree-item>`,
    );
    await waitForUpdate(element);

    const child = element.querySelector('am-tree-item') as HTMLElement & { depth: number };
    expect(child.depth).toBe(1);
  });
});

describe('am-tree-view', () => {
  it('sets role="tree" on the container', async () => {
    const element = await fixture<HTMLElement>(
      `<am-tree-view>
        <am-tree-item label="src" value="src">
          <am-tree-item label="index.ts" value="index"></am-tree-item>
        </am-tree-item>
      </am-tree-view>`,
    );

    expect(element.getAttribute('role')).toBe('tree');
  });

  it('deselects other items when one is selected', async () => {
    const element = await fixture<HTMLElement>(
      `<am-tree-view>
        <am-tree-item label="A" value="a"></am-tree-item>
        <am-tree-item label="B" value="b"></am-tree-item>
      </am-tree-view>`,
    );

    await waitForUpdate(element);

    const items = element.querySelectorAll('am-tree-item') as NodeListOf<
      HTMLElement & { selected: boolean }
    >;

    // Select first
    const rowA = shadowQuery<HTMLButtonElement>(items[0], '.row');
    await click(rowA, items[0]);
    await waitForUpdate(element);
    expect(items[0].selected).toBe(true);

    // Select second — first should deselect
    const rowB = shadowQuery<HTMLButtonElement>(items[1], '.row');
    await click(rowB, items[1]);
    await waitForUpdate(element);
    expect(items[0].selected).toBe(false);
    expect(items[1].selected).toBe(true);
  });
});

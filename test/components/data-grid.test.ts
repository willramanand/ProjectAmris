import { describe, expect, it } from 'vitest';

import '../../src/components/data-grid/data-grid';
import type { DataGridColumn } from '../../src/components/data-grid/data-grid';
import { click, fixture, keydown, oneEvent, waitForUpdate } from '../helpers';

type Row = Record<string, unknown>;
type GridEl = HTMLElement & {
  columns: DataGridColumn[];
  rows: Row[];
  selectable: boolean;
  selectedKeys: ReadonlyArray<string | number> | null;
  getRowId: (row: Row, index: number) => string | number;
};

const COLUMNS: DataGridColumn[] = [
  { key: 'name', label: 'Name', sortable: true, type: 'string' },
  { key: 'age', label: 'Age', sortable: true, type: 'number' },
];

const ROWS: Row[] = [
  { name: 'Charlie', age: 30 },
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 40 },
];

async function makeGrid(extra = ''): Promise<GridEl> {
  const el = await fixture<GridEl>(`<am-data-grid ${extra}></am-data-grid>`);
  el.columns = COLUMNS;
  el.rows = [...ROWS];
  await waitForUpdate(el);
  return el;
}

function bodyRows(el: GridEl): HTMLTableRowElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll('tbody tr') ?? []) as HTMLTableRowElement[];
}

function rowText(row: HTMLTableRowElement): string[] {
  return Array.from(row.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? '');
}

describe('am-data-grid', () => {
  it('renders rows and grid roles', async () => {
    const el = await makeGrid();
    const table = el.shadowRoot?.querySelector('table');
    expect(table?.getAttribute('role')).toBe('grid');
    expect(table?.getAttribute('aria-rowcount')).toBe('3');
    expect(bodyRows(el).length).toBe(3);
  });

  it('sorts ascending then descending then resets on header click', async () => {
    const el = await makeGrid();
    const headers = el.shadowRoot?.querySelectorAll('th[role="columnheader"]') as NodeListOf<HTMLElement>;
    const nameHeader = headers[0];

    await click(nameHeader, el);
    expect(rowText(bodyRows(el)[0])[0]).toBe('Alice');
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');

    await click(nameHeader, el);
    expect(rowText(bodyRows(el)[0])[0]).toBe('Charlie');
    expect(nameHeader.getAttribute('aria-sort')).toBe('descending');

    await click(nameHeader, el);
    // none — original insertion order
    expect(rowText(bodyRows(el)[0])[0]).toBe('Charlie');
    expect(rowText(bodyRows(el)[1])[0]).toBe('Alice');
    expect(nameHeader.getAttribute('aria-sort')).toBe('none');
  });

  it('uses numeric comparator when column type is number', async () => {
    const el = await makeGrid();
    const headers = el.shadowRoot?.querySelectorAll('th[role="columnheader"]') as NodeListOf<HTMLElement>;
    const ageHeader = headers[1];

    await click(ageHeader, el);
    const ages = bodyRows(el).map((r) => Number(rowText(r)[1]));
    expect(ages).toEqual([25, 30, 40]);
  });

  it('emits am-sort with key and direction', async () => {
    const el = await makeGrid();
    const headers = el.shadowRoot?.querySelectorAll('th[role="columnheader"]') as NodeListOf<HTMLElement>;
    const eventPromise = oneEvent<{ key: string; direction: string }>(el, 'am-sort');
    await click(headers[0], el);
    const ev = await eventPromise;
    expect(ev.detail).toEqual({ key: 'name', direction: 'asc' });
  });

  it('toggles selection on row click and emits am-row-select + am-selection-change', async () => {
    const el = await makeGrid('selectable');
    const rowSelectPromise = oneEvent<{ id: string | number; selected: boolean; keys: (string | number)[] }>(
      el,
      'am-row-select',
    );
    const selectionChangePromise = oneEvent<{ keys: (string | number)[] }>(el, 'am-selection-change');

    await click(bodyRows(el)[0], el);

    const rowSelectEv = await rowSelectPromise;
    const selectionEv = await selectionChangePromise;
    expect(rowSelectEv.detail.selected).toBe(true);
    expect(selectionEv.detail.keys).toEqual([0]);
    expect(bodyRows(el)[0].getAttribute('aria-selected')).toBe('true');
  });

  it('respects controlled selectedKeys (does not mutate internal state)', async () => {
    const el = await makeGrid('selectable');
    el.selectedKeys = [];
    await waitForUpdate(el);

    await click(bodyRows(el)[0], el);
    // Caller must update selectedKeys for it to take effect.
    expect(el.selectedKeys).toEqual([]);
    expect(bodyRows(el)[0].getAttribute('aria-selected')).toBe('false');
  });

  it('row roving tabindex: focused row is tabindex=0, others -1', async () => {
    const el = await makeGrid('selectable');
    const rows = bodyRows(el);
    expect(rows[0].getAttribute('tabindex')).toBe('0');
    expect(rows[1].getAttribute('tabindex')).toBe('-1');
    expect(rows[2].getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowDown/ArrowUp moves the focused row tabindex', async () => {
    const el = await makeGrid('selectable');
    const initial = bodyRows(el);
    await keydown(initial[0], 'ArrowDown', el);

    const after = bodyRows(el);
    expect(after[1].getAttribute('tabindex')).toBe('0');
    expect(after[0].getAttribute('tabindex')).toBe('-1');

    await keydown(after[1], 'ArrowUp', el);
    const final = bodyRows(el);
    expect(final[0].getAttribute('tabindex')).toBe('0');
  });

  it('Home/End jumps to first/last row', async () => {
    const el = await makeGrid('selectable');
    const rows = bodyRows(el);
    await keydown(rows[0], 'End', el);
    expect(bodyRows(el)[2].getAttribute('tabindex')).toBe('0');

    await keydown(bodyRows(el)[2], 'Home', el);
    expect(bodyRows(el)[0].getAttribute('tabindex')).toBe('0');
  });

  it('Space toggles selection on focused row', async () => {
    const el = await makeGrid('selectable');
    await keydown(bodyRows(el)[0], ' ', el);
    expect(bodyRows(el)[0].getAttribute('aria-selected')).toBe('true');
  });

  it('uses custom getRowId for selection identity', async () => {
    const el = await makeGrid('selectable');
    el.getRowId = (row: Row) => `row-${row.name}`;
    await waitForUpdate(el);

    const rowSelectPromise = oneEvent<{ id: string | number; keys: (string | number)[] }>(
      el,
      'am-row-select',
    );
    await click(bodyRows(el)[1], el); // Alice
    const ev = await rowSelectPromise;
    expect(ev.detail.id).toBe('row-Alice');
    expect(ev.detail.keys).toEqual(['row-Alice']);
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/data-grid/data-grid';
import type { GetRowId } from '../../src/components/data-grid/data-grid';
import { scrollVirtualizerToIndex } from '../../src/internal/helpers/virtualize-support';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * data-grid-virtual (PERF-02) — proves am-data-grid virtualizes 1000+ rows in a
 * real browser: full-total `aria-rowcount`, per-row `aria-rowindex`, a windowed
 * DOM subset, identity-keyed selection that survives scroll-out-and-back, and a
 * div-grid layout whose rows have non-zero height with aligned columns.
 *
 * Runs in the `browser` project (native Chromium): jsdom mocks ResizeObserver so
 * the virtualizer's windowing is not observable there.
 *
 * NOTE: does NOT import any test/setup.ts symbol (browser lane is native).
 */

interface Row extends Record<string, unknown> {
  id: string;
  name: string;
}

type GridHost = HTMLElement & {
  columns: unknown[];
  rows: Row[];
  selectable: boolean;
  getRowId: GetRowId;
};

const ROW_ID: GetRowId = (row) => (row as Row).id;

async function makeGrid(count: number): Promise<GridHost> {
  const host = await fixture<GridHost>(`<am-data-grid selectable></am-data-grid>`);
  host.columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
  ];
  host.rows = Array.from({ length: count }, (_v, i) => ({ id: `r${i}`, name: `Name ${i}` }));
  host.getRowId = ROW_ID;
  await waitForUpdate(host);
  return host;
}

function bodyRows(host: GridHost): HTMLElement[] {
  const body = shadowQuery<HTMLElement>(host, '.grid-body');
  return Array.from(body.querySelectorAll<HTMLElement>('.grid-row[role="row"]'));
}

async function waitForBodyRows(host: GridHost): Promise<HTMLElement[]> {
  for (let i = 0; i < 40; i++) {
    const rows = bodyRows(host);
    if (rows.length > 0) return rows;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  return bodyRows(host);
}

/**
 * Wait until the deferred virtualizer has resolved and WINDOWED the body — i.e.
 * the mounted row count has dropped below the full `total` (SIZE-02: the grid
 * first renders a cold-chunk repeat() body with all rows, then swaps to the
 * windowed virtualize() path once the lazily-imported chunk loads).
 */
async function waitForWindowed(host: GridHost, total: number): Promise<HTMLElement[]> {
  for (let i = 0; i < 80; i++) {
    const rows = bodyRows(host);
    if (rows.length > 0 && rows.length < total) return rows;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  return bodyRows(host);
}

async function waitForSortedIndex(host: GridHost, index: number): Promise<HTMLElement | null> {
  const body = shadowQuery<HTMLElement>(host, '.grid-body');
  for (let i = 0; i < 40; i++) {
    const node = body.querySelector<HTMLElement>(`.grid-row[data-sorted-index="${index}"]`);
    if (node) return node;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  return body.querySelector<HTMLElement>(`.grid-row[data-sorted-index="${index}"]`);
}

describe('am-data-grid virtualization (real Chromium)', () => {
  it('renders a role="grid" div-grid (not a <table>) with full-total aria-rowcount above the threshold', async () => {
    const host = await makeGrid(2000);
    await waitForBodyRows(host);

    // Div-grid path, not a native table (Pitfall 1).
    const grid = shadowQuery<HTMLElement>(host, '.grid');
    expect(grid.getAttribute('role')).toBe('grid');
    expect(host.shadowRoot?.querySelector('table')).toBeNull();

    // aria-rowcount is the FULL total from state, not the mounted-row count.
    expect(grid.getAttribute('aria-rowcount')).toBe('2000');

    host.remove();
  });

  it('mounts only a windowed subset of rows, each carrying a truthful aria-rowindex', async () => {
    const host = await makeGrid(2000);
    const rows = await waitForWindowed(host, 2000);

    // Windowed: nowhere near 2000 rows in the DOM.
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(200);

    // First mounted row is absolute index 0 → aria-rowindex 2 (header is row 1).
    const first = rows[0];
    expect(first.getAttribute('data-sorted-index')).toBe('0');
    expect(first.getAttribute('aria-rowindex')).toBe('2');

    // Every mounted row carries an aria-rowindex = data-sorted-index + 2.
    for (const row of rows) {
      const abs = Number(row.getAttribute('data-sorted-index'));
      expect(row.getAttribute('aria-rowindex')).toBe(String(abs + 2));
    }

    host.remove();
  });

  it('keeps a selected row selected after it is recycled out of view and scrolled back (identity-keyed, state-driven)', async () => {
    const host = await makeGrid(2000);
    await waitForWindowed(host, 2000);

    // Select the row at sorted index 5 by clicking it.
    const row5 = await waitForSortedIndex(host, 5);
    expect(row5).not.toBeNull();
    row5!.click();
    await waitForUpdate(host);
    expect(row5!.getAttribute('aria-selected')).toBe('true');

    // Scroll far away — row 5 must recycle out of the DOM.
    const body = shadowQuery<HTMLElement>(host, '.grid-body');
    scrollVirtualizerToIndex(body, 1600);
    for (let i = 0; i < 40; i++) {
      if (!body.querySelector('.grid-row[data-sorted-index="5"]')) break;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    expect(body.querySelector('.grid-row[data-sorted-index="5"]')).toBeNull();

    // Scroll back — the re-mounted row 5 is still selected (state-driven).
    scrollVirtualizerToIndex(body, 0);
    const rowBack = await waitForSortedIndex(host, 5);
    expect(rowBack).not.toBeNull();
    expect(rowBack!.getAttribute('aria-selected')).toBe('true');
    expect(rowBack!.classList.contains('selected')).toBe(true);

    host.remove();
  });

  it('cold-chunk: renders a functional unwindowed repeat() body first, then swaps to windowed virtualize() with identical aria-rowindex', async () => {
    // makeGrid awaits only updateComplete (microtasks); the deferred virtualizer
    // warm is rAF-scheduled, so the very first render is guaranteed to be the
    // cold-chunk repeat() fallback (per-instance `_virtualize` still undefined).
    const host = await makeGrid(250);

    // Cold-chunk fallback: before the virtualizer chunk resolves, the grid body
    // renders ALL rows via repeat() (unwindowed) — no windowing yet.
    const cold = bodyRows(host);
    expect(cold.length).toBe(250);

    // aria-rowindex is absolute-index based (header is row 1) in the fallback.
    expect(cold[0].getAttribute('data-sorted-index')).toBe('0');
    expect(cold[0].getAttribute('aria-rowindex')).toBe('2');
    expect(cold[249].getAttribute('aria-rowindex')).toBe('251');
    const coldRow10Index = cold[10].getAttribute('aria-rowindex');
    expect(coldRow10Index).toBe('12');

    // After the deferred virtualizer resolves, the grid swaps to a windowed subset.
    const warm = await waitForWindowed(host, 250);
    expect(warm.length).toBeGreaterThan(0);
    expect(warm.length).toBeLessThan(250);

    // aria-rowindex parity across the swap: the row at absolute index 10 keeps
    // the SAME aria-rowindex whether rendered via repeat() or virtualize().
    const warmRow10 = await waitForSortedIndex(host, 10);
    expect(warmRow10).not.toBeNull();
    expect(warmRow10!.getAttribute('aria-rowindex')).toBe(coldRow10Index);

    host.remove();
  });

  it('renders div-grid rows with non-zero height and columns aligned to the header', async () => {
    const host = await makeGrid(1200);
    const rows = await waitForWindowed(host, 1200);

    const dataRow = rows[0];
    expect(dataRow.getBoundingClientRect().height).toBeGreaterThan(0);

    // Header and data rows share the same computed column tracks (alignment).
    const headerRow = shadowQuery<HTMLElement>(host, '.grid-row.header-row');
    const headerTracks = getComputedStyle(headerRow).gridTemplateColumns;
    const dataTracks = getComputedStyle(dataRow).gridTemplateColumns;
    expect(headerTracks).not.toBe('');
    expect(headerTracks).toBe(dataTracks);

    host.remove();
  });
});

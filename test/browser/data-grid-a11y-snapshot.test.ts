import { page } from '@vitest/browser/context';
import { afterEach, describe, expect, it } from 'vitest';

import '../../src/components/data-grid/data-grid';
import type { GetRowId } from '../../src/components/data-grid/data-grid';
import { checkA11y, formatViolations } from '../a11y-helper';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * data-grid-a11y-snapshot (RPERF-04, D-04) — REPORT-ONLY hybrid a11y guard.
 *
 * The Phase-9 sort memo (RPERF-01) changes WHEN the sorted rows are recomputed,
 * never the rendered structure. This spec is the proof that it strips NO
 * accessibility DOM: it snapshots the data-grid's role + accessible-name tree
 * and asserts EXACT values for the load-bearing aria surface —
 * `aria-rowcount` / `aria-colcount` / `aria-multiselectable` / `aria-sort` /
 * `aria-rowindex` and the roving `tabindex` — before/after a sort, on the real
 * Chromium browser lane (jsdom cannot compute the accessible tree).
 *
 * Hybrid (F-3): explicit `shadowQuery` attribute reads are LOAD-BEARING; the
 * `toMatchAriaSnapshot` role/name tree is ADVISORY (A3). Covers the EMPTY and
 * SINGLE-row edges. Report-only — nothing here flips to enforcing (Phase 11).
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
  getRowId: GetRowId;
};

const ROW_ID: GetRowId = (row) => (row as Row).id;

/** Two sortable columns; the caller supplies the row set (may be empty). */
async function makeGrid(rows: Row[]): Promise<GridHost> {
  const host = await fixture<GridHost>('<am-data-grid></am-data-grid>');
  host.columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
  ];
  host.rows = rows;
  host.getRowId = ROW_ID;
  await waitForUpdate(host);
  return host;
}

function rowsOf(count: number): Row[] {
  return Array.from({ length: count }, (_v, i) => ({
    id: `r${String(i).padStart(3, '0')}`,
    name: `Name ${count - i}`,
  }));
}

/**
 * Apply an ascending sort on the first sortable column. Works on BOTH render
 * paths: the `<table>` path uses `th.sortable`; the div-grid (virtual) path
 * above the threshold uses `.grid-header-cell.sortable`.
 */
async function sortFirstColumn(host: GridHost): Promise<void> {
  const sortHeader =
    host.shadowRoot!.querySelector<HTMLElement>('th.sortable') ??
    host.shadowRoot!.querySelector<HTMLElement>('.grid-header-cell.sortable');
  if (!sortHeader) throw new Error('No sortable header found in either render path.');
  sortHeader.click();
  await waitForUpdate(host);
}

describe('am-data-grid a11y snapshot (real Chromium, report-only)', () => {
  // Guaranteed cleanup: `page.getByRole('grid')` queries the whole document, so
  // a host left mounted by a failing assertion would make the next test's
  // locator ambiguous (strict-mode violation). Remove every grid after each
  // test regardless of outcome.
  afterEach(() => {
    document.querySelectorAll('am-data-grid').forEach((el) => el.remove());
  });

  it('preserves the grid role/name tree + exact aria surface after a sort (table path)', async () => {
    const host = await makeGrid(rowsOf(3));
    await sortFirstColumn(host);

    // --- LOAD-BEARING: explicit aria attribute values via shadowQuery ---
    const table = shadowQuery<HTMLElement>(host, 'table');
    expect(table.getAttribute('role')).toBe('grid');
    expect(table.getAttribute('aria-rowcount')).toBe('3');
    expect(table.getAttribute('aria-colcount')).toBe('2');
    expect(table.getAttribute('aria-multiselectable')).toBe('false');

    // Sorted column reports 'ascending'; the other sortable column reports 'none'.
    const headers = Array.from(
      host.shadowRoot!.querySelectorAll<HTMLElement>('th[role="columnheader"]'),
    );
    expect(headers[0].getAttribute('aria-sort')).toBe('ascending');
    expect(headers[1].getAttribute('aria-sort')).toBe('none');

    // Roving focus: sortable headers are keyboard-reachable (tabindex 0); the
    // focused body row (index 0) is tabindex 0, the rest are -1.
    expect(headers[0].getAttribute('tabindex')).toBe('0');
    expect(headers[1].getAttribute('tabindex')).toBe('0');
    const bodyRows = Array.from(
      host.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr[role="row"]'),
    );
    expect(bodyRows).toHaveLength(3);
    expect(bodyRows[0].getAttribute('tabindex')).toBe('0');
    expect(bodyRows[1].getAttribute('tabindex')).toBe('-1');
    expect(bodyRows[2].getAttribute('tabindex')).toBe('-1');

    // --- ADVISORY: role + accessible-name tree ---
    await expect.element(page.getByRole('grid')).toMatchAriaSnapshot();

    // Complementary presence scan (mirrors a11y.browser.test.ts).
    const violations = await checkA11y(host, [], { includeDefaultDisabled: false });
    expect(violations, formatViolations(violations)).toHaveLength(0);

    host.remove();
  });

  it('carries aria-rowindex on the div-grid (virtual) path, header row = 1', async () => {
    // Above VIRTUALIZE_ROW_THRESHOLD (100) the grid renders the role="grid"
    // div-grid path. Before the deferred virtualizer chunk resolves it renders a
    // cold-chunk repeat() body with ALL rows, so aria-rowindex is deterministic
    // here without waiting for windowing — this is the only path that carries
    // aria-rowindex, and the sort memo must not strip it.
    const host = await makeGrid(rowsOf(150));
    await sortFirstColumn(host);

    const grid = shadowQuery<HTMLElement>(host, '.grid[role="grid"]');
    expect(grid.getAttribute('aria-rowcount')).toBe('150');
    expect(grid.getAttribute('aria-colcount')).toBe('2');

    // Header row is aria-rowindex 1; the first body row is aria-rowindex 2.
    const headerRow = shadowQuery<HTMLElement>(host, '.grid-row.header-row');
    expect(headerRow.getAttribute('aria-rowindex')).toBe('1');
    const firstBodyRow = host.shadowRoot!.querySelector<HTMLElement>(
      '.grid-body .grid-row[role="row"]',
    );
    expect(firstBodyRow?.getAttribute('aria-rowindex')).toBe('2');

    // Sorted header still reports 'ascending' in the div-grid path.
    const headerCell = shadowQuery<HTMLElement>(host, '.grid-header-cell.sortable');
    expect(headerCell.getAttribute('aria-sort')).toBe('ascending');

    host.remove();
  });

  it('EMPTY grid (rows=[]) keeps a byte-identical aria shape', async () => {
    const host = await makeGrid([]);

    const table = shadowQuery<HTMLElement>(host, 'table');
    expect(table.getAttribute('role')).toBe('grid');
    expect(table.getAttribute('aria-rowcount')).toBe('0');
    expect(table.getAttribute('aria-colcount')).toBe('2');
    expect(table.getAttribute('aria-multiselectable')).toBe('false');

    // Headers still present + keyboard-reachable with an aria-sort of 'none'.
    const headers = Array.from(
      host.shadowRoot!.querySelectorAll<HTMLElement>('th[role="columnheader"]'),
    );
    expect(headers).toHaveLength(2);
    expect(headers[0].getAttribute('aria-sort')).toBe('none');
    expect(headers[0].getAttribute('tabindex')).toBe('0');

    // No body rows.
    expect(host.shadowRoot!.querySelectorAll('tbody tr[role="row"]')).toHaveLength(0);

    await expect.element(page.getByRole('grid')).toMatchAriaSnapshot();

    host.remove();
  });

  it('SINGLE-row grid keeps a byte-identical aria shape', async () => {
    const host = await makeGrid(rowsOf(1));

    const table = shadowQuery<HTMLElement>(host, 'table');
    expect(table.getAttribute('role')).toBe('grid');
    expect(table.getAttribute('aria-rowcount')).toBe('1');
    expect(table.getAttribute('aria-colcount')).toBe('2');

    const bodyRows = Array.from(
      host.shadowRoot!.querySelectorAll<HTMLElement>('tbody tr[role="row"]'),
    );
    expect(bodyRows).toHaveLength(1);
    // The single row is the roving-focus target (tabindex 0).
    expect(bodyRows[0].getAttribute('tabindex')).toBe('0');

    await expect.element(page.getByRole('grid')).toMatchAriaSnapshot();

    host.remove();
  });
});

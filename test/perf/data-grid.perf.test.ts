import { afterAll, describe, expect, it } from 'vitest';

import '../../src/components/data-grid/data-grid';
import { AmDataGrid } from '../../src/components/data-grid/data-grid';
import type { GetRowId } from '../../src/components/data-grid/data-grid';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';
import {
  THROTTLE_PROFILE,
  assertStableCounts,
  countLifecycle,
  countMethod,
  domNodeCount,
  proveThrottleLive,
  raf,
  resetThrottle,
  summarize,
  writeScenario,
  type ScenarioMetrics,
} from './harness';

/**
 * data-grid.perf.test.ts — the D-06 heavy DATA-DISPLAY scenario: render + sort.
 *
 * Mounts am-data-grid with a representative row set and two sortable columns,
 * then performs one column sort. The row count is kept AT/BELOW the
 * auto-virtualization threshold (VIRTUALIZE_ROW_THRESHOLD = 100) so the
 * deterministic `<table>` path renders (the virtualizer's ResizeObserver
 * windowing would make DOM node counts non-deterministic — counts are the GATED
 * numbers and must be identical across repeats).
 *
 * Chromium-only under 6x-CPU + Slow-3G throttle; wall-clock report-only (D-07).
 * PURITY: no test/setup.ts symbol (Pitfall 2).
 */

const REPEATS = 5;
const ROW_COUNT = 80; // below VIRTUALIZE_ROW_THRESHOLD -> deterministic table path

interface Row extends Record<string, unknown> {
  id: string;
  name: string;
}

type GridHost = HTMLElement & {
  columns: unknown[];
  rows: Row[];
  getRowId: GetRowId;
  requestUpdate(): void;
};

const ROW_ID: GetRowId = (row) => (row as Row).id;

async function makeGrid(): Promise<GridHost> {
  const host = await fixture<GridHost>('<am-data-grid></am-data-grid>');
  host.columns = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
  ];
  host.rows = Array.from({ length: ROW_COUNT }, (_v, i) => ({
    id: `r${String(i).padStart(4, '0')}`,
    name: `Name ${ROW_COUNT - i}`,
  }));
  host.getRowId = ROW_ID;
  await waitForUpdate(host);
  return host;
}

describe('perf: data-grid (render + sort)', () => {
  afterAll(async () => {
    await resetThrottle();
  });

  it('measures render+sort counts under throttle, deterministic across 5 repeats', async () => {
    const { unthrottled, throttled } = await proveThrottleLive();
    expect(throttled).toBeGreaterThan(unthrottled);

    const life = countLifecycle(AmDataGrid);
    // sortComputes probe (RESEARCH F-1): counts how many times the sort actually
    // recomputes. update/updated/render/nodes cannot see a memo INSIDE a render,
    // so this dedicated count is the RPERF-01 improvement evidence.
    const sort = countMethod(AmDataGrid, '_computeSortedRows');
    const perRepeat: Record<string, number>[] = [];
    const wall: number[] = [];

    // One measured iteration: mount grid, sort one column, then force >=2 extra
    // re-renders that leave (rows, _sortKey, _sortDir) UNCHANGED.
    async function runOnce(): Promise<{ counts: Record<string, number>; wall: number }> {
      life.reset();
      sort.reset();
      const t0 = performance.now();

      const host = await makeGrid();
      // Sort by clicking the first sortable column header (table path). This is
      // the first sorted render -> compute #1.
      const sortHeader = shadowQuery<HTMLElement>(host, 'th.sortable');
      sortHeader.click();
      await waitForUpdate(host);

      // Memo-effectiveness: force two additional re-renders whose (rows, key,
      // dir) are identical to the sorted state above. A correct identity memo
      // computes the sorted order exactly ONCE across ALL of these sorted
      // renders (cache hit on every subsequent access); the un-memoized getter
      // recomputes on each, so `sortComputes` would be >1 (RED).
      host.requestUpdate();
      await waitForUpdate(host);
      host.requestUpdate();
      await waitForUpdate(host);
      await raf();

      const elapsed = performance.now() - t0;
      const counts = { ...life.counts, nodes: domNodeCount(host), sortComputes: sort.count };
      host.remove();
      return { counts, wall: elapsed };
    }

    try {
      // Warm-up (discarded) so all 5 recorded repeats are in the warmed state.
      await runOnce();
      for (let r = 0; r < REPEATS; r++) {
        const { counts, wall: w } = await runOnce();
        perRepeat.push(counts);
        wall.push(w);
      }
    } finally {
      life.restore();
      sort.restore();
    }

    const counts = assertStableCounts(perRepeat);
    expect(counts.render).toBeGreaterThan(0);
    // The grid mounts a meaningful DOM (rows + header cells), unlike the button control.
    expect(counts.nodes).toBeGreaterThan(50);
    // Memo-effectiveness (RPERF-01): three sorted renders (sort click + two
    // forced unchanged-state re-renders) must recompute the sorted order EXACTLY
    // ONCE. Un-memoized this is >1; the identity cache drops it to the tuned
    // constant. Deterministic across all 5 repeats (asserted above).
    expect(counts.sortComputes).toBe(1);

    const metrics: ScenarioMetrics = {
      counts,
      wallClock: summarize(wall),
      throttle: { profile: THROTTLE_PROFILE.name, unthrottled, throttled },
      repeats: REPEATS,
    };
    await writeScenario('data-grid', metrics);
  });
});

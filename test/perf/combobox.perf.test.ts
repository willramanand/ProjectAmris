import { afterAll, describe, expect, it } from 'vitest';

import '../../src/components/combobox/combobox';
import { AmCombobox } from '../../src/components/combobox/combobox';
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
 * combobox.perf.test.ts — the D-06 heavy FORM-INPUT scenario: filter-per-keystroke.
 *
 * Mounts am-combobox, focuses the input to open the dropdown, then types a fixed
 * query one character at a time — each keystroke re-filters the option list and
 * forces one Lit update cycle on the host. The option set is kept AT/BELOW the
 * auto-virtualization threshold (100) so the deterministic `repeat()` render path
 * is exercised (the virtualizer's ResizeObserver windowing would make DOM node
 * counts non-deterministic — counts are the GATED numbers, identical across
 * repeats).
 *
 * Chromium-only under 6x-CPU + Slow-3G throttle; wall-clock report-only (D-07).
 * PURITY: no test/setup.ts symbol (Pitfall 2).
 */

const REPEATS = 5;
const OPTION_COUNT = 80; // below the virtualization threshold -> deterministic repeat() path
const QUERY = 'Option 7'; // typed one char at a time (filter-per-keystroke)
const OPTIONS = Array.from({ length: OPTION_COUNT }, (_v, i) => `Option ${i}`);

type ComboboxHost = HTMLElement & { value: string; options: string[] };

async function makeCombobox(): Promise<ComboboxHost> {
  const el = await fixture<ComboboxHost>('<am-combobox label="Pick"></am-combobox>');
  el.options = [...OPTIONS];
  await waitForUpdate(el);
  return el;
}

/** Simulate filter-per-keystroke: focus, then type QUERY one character at a time. */
async function typeQuery(el: ComboboxHost): Promise<void> {
  const input = shadowQuery<HTMLInputElement>(el, 'input');
  input.focus();
  input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
  await waitForUpdate(el);

  for (let i = 1; i <= QUERY.length; i++) {
    input.value = QUERY.slice(0, i);
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await waitForUpdate(el);
  }
}

describe('perf: combobox (filter-per-keystroke)', () => {
  afterAll(async () => {
    await resetThrottle();
  });

  it('measures filter-per-keystroke counts under throttle, deterministic across 5 repeats', async () => {
    const { unthrottled, throttled } = await proveThrottleLive();
    expect(throttled).toBeGreaterThan(unthrottled);

    const life = countLifecycle(AmCombobox);
    // RPERF-02: count the memoized filter compute. `_computeFilteredOptions` runs
    // once per (options-identity, slotted-identity, value, remote) change — one
    // cache miss per keystroke — instead of the 4–5× per keystroke the former
    // independent `filterOptions` call sites recomputed.
    const filt = countMethod(AmCombobox, '_computeFilteredOptions');
    const perRepeat: Record<string, number>[] = [];
    const wall: number[] = [];

    // One measured iteration: mount, focus-open, type QUERY char by char.
    async function runOnce(): Promise<{ counts: Record<string, number>; wall: number }> {
      life.reset();
      filt.reset();
      const t0 = performance.now();

      const el = await makeCombobox();
      await typeQuery(el);
      await raf();

      const elapsed = performance.now() - t0;
      const counts = { ...life.counts, nodes: domNodeCount(el), filterCalls: filt.count };
      el.remove();
      return { counts, wall: elapsed };
    }

    try {
      // Warm-up (discarded): the first cold mount runs one fewer update cycle
      // than the warmed steady state; discarding it makes all 5 repeats identical.
      await runOnce();
      for (let r = 0; r < REPEATS; r++) {
        const { counts, wall: w } = await runOnce();
        perRepeat.push(counts);
        wall.push(w);
      }
    } finally {
      life.restore();
      filt.restore();
    }

    const counts = assertStableCounts(perRepeat);
    // Filter-per-keystroke: one host update cycle per typed character (at minimum).
    expect(counts.update).toBeGreaterThanOrEqual(QUERY.length);

    // RPERF-02 — the two-level identity memo collapses the former 4–5×/keystroke
    // recompute to exactly one `_computeFilteredOptions` per DISTINCT
    // (options-identity, value) state (D-01, memoize-only). For this scenario that
    // is QUERY.length keystroke computes (one cache miss per typed character) plus
    // the two mount states that carry distinct `_allOptions` identities: the empty
    // default (`options=[]`) render and the assigned `options=OPTIONS` render.
    // Untuned this counter reads 12; the memo drops it to 10, deterministic across
    // all 5 repeats (assertStableCounts above), while update/updated/render/nodes
    // stay identical — proof the memo changed no observable render structure.
    const TUNED_FILTER_CALLS = QUERY.length + 2;
    expect(counts.filterCalls).toBe(TUNED_FILTER_CALLS);

    const metrics: ScenarioMetrics = {
      counts,
      wallClock: summarize(wall),
      throttle: { profile: THROTTLE_PROFILE.name, unthrottled, throttled },
      repeats: REPEATS,
    };
    await writeScenario('combobox', metrics);
  });
});

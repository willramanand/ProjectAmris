import { afterAll, describe, expect, it } from 'vitest';

import '../../src/components/popover/popover';
import { AmPopover } from '../../src/components/popover/popover';
import { loadFloating } from '../../src/internal/helpers/lazy-load';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';
import {
  THROTTLE_PROFILE,
  assertStableCounts,
  countComputePosition,
  countLifecycle,
  countRepositions,
  domNodeCount,
  proveThrottleLive,
  raf,
  resetThrottle,
  summarize,
  writeScenario,
  type ScenarioMetrics,
} from './harness';

/**
 * overlay.perf.test.ts — the D-06 OVERLAY scenario: open + reposition.
 *
 * The representative overlay is am-popover because it routes positioning through
 * FloatingPositionController, so the _updatePosition count wrap observes it.
 * color-picker / rich-select call computePosition directly and bypass the
 * controller — deliberately NOT chosen (RESEARCH Pitfall 6, documented in harness.ts).
 *
 * Scenario = open, wait for the first floating-ui position write, then a second
 * controlled reposition (close + reopen). Two independent counters cross-check
 * the reposition work: countComputePosition (wraps the first-party controller
 * chokepoint — counts EVERY _updatePosition call) and countRepositions (a
 * zero-instrumentation MutationObserver on the panel's `style` attribute —
 * counts DISTINCT position changes).
 *
 * The cross-check relationship is `computePosition >= repositions >= 1`, not
 * strict equality: floating-ui's autoUpdate recomputes the position several times
 * per open (immediate call + ResizeObserver initial fire), and recomputes that
 * yield identical coordinates re-serialize the `style` attribute to the same
 * string, which a MutationObserver does NOT report. So the observer independently
 * confirms the controller genuinely moved the panel (repositions >= 1) and never
 * more often than it was called (computePosition >= repositions) — the wrap never
 * under-counts real DOM repositioning. Both numbers are asserted deterministic
 * across all 5 repeats.
 *
 * Chromium-only under 6x-CPU + Slow-3G throttle; wall-clock report-only (D-07).
 * PURITY: no test/setup.ts symbol (Pitfall 2).
 */

const REPEATS = 5;

type PopoverHost = HTMLElement & { open: boolean };

const MARKUP = `
  <am-popover trigger="manual" placement="bottom-start">
    <button class="pop-trigger">Trigger</button>
    <div slot="content">Popover panel content</div>
  </am-popover>
`;

/** Wait until floating-ui has written left/top onto the panel (async computePosition). */
async function waitForPosition(panel: HTMLElement): Promise<void> {
  for (let i = 0; i < 30; i++) {
    if (panel.style.left !== '' && panel.style.top !== '') return;
    await raf();
  }
}

describe('perf: overlay = am-popover (open + reposition)', () => {
  afterAll(async () => {
    await resetThrottle();
  });

  it('measures open+reposition counts under throttle, deterministic across 5 repeats', async () => {
    // Warm the memoized floating-ui loader chunk BEFORE applying the network
    // throttle. Post-full-deferral (Phase 8), opening the popover fetches
    // @floating-ui/dom via a dynamic import(); under the Slow-3G profile that
    // one-time COLD chunk fetch exceeds the fixed waitForPosition budget and
    // starves the first (warm-up) open of a position write (repositions == 0).
    // This scenario measures open+reposition WORK — the throttle-independent
    // computePosition/reposition counts plus the open+reposition wall-clock —
    // never the one-time chunk-fetch latency, so warming the shared memoized
    // loader here is the correct harness discipline (it mirrors the components'
    // real prefetch-on-intent) and leaves every recorded count/timing intact.
    await loadFloating();

    const { unthrottled, throttled } = await proveThrottleLive();
    expect(throttled).toBeGreaterThan(unthrottled);

    const life = countLifecycle(AmPopover);
    const perRepeat: Record<string, number>[] = [];
    const wall: number[] = [];

    // One measured iteration: open, then a controlled close+reopen reposition.
    async function runOnce(): Promise<{ counts: Record<string, number>; wall: number }> {
      life.reset();
      const cpos = countComputePosition();
      const t0 = performance.now();

      const host = await fixture<PopoverHost>(MARKUP);
      const panel = shadowQuery<HTMLElement>(host, '.popover');
      const repos = countRepositions(panel);

      // Open -> first position write.
      host.open = true;
      await waitForUpdate(host);
      await waitForPosition(panel);

      // Reposition: a controlled close + reopen (a second floating-ui cycle).
      // Do NOT touch panel.style here — any manual style write would be counted
      // by the MutationObserver and corrupt the reposition cross-check. The
      // reopen's autoUpdate re-runs _updatePosition (counted by the controller
      // wrap); its style write lands on the already-populated left/top.
      host.open = false;
      await waitForUpdate(host);
      host.open = true;
      await waitForUpdate(host);
      await waitForPosition(panel);
      await raf();

      const elapsed = performance.now() - t0;
      const computePositionCount = cpos.count;
      const repositionCount = repos.count;

      // Cross-check: the observer independently confirms real repositioning
      // (>= 1) and the controller wrap never under-counts it (calls >= writes).
      expect(repositionCount).toBeGreaterThanOrEqual(1);
      expect(computePositionCount).toBeGreaterThanOrEqual(repositionCount);

      const counts = {
        ...life.counts,
        computePosition: computePositionCount,
        repositions: repositionCount,
        nodes: domNodeCount(host),
      };

      repos.stop();
      cpos.restore();
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
    }

    const counts = assertStableCounts(perRepeat);
    // The overlay actually repositioned through the controller (non-zero chokepoint).
    expect(counts.computePosition).toBeGreaterThan(0);
    expect(counts.repositions).toBeGreaterThanOrEqual(1);
    expect(counts.computePosition).toBeGreaterThanOrEqual(counts.repositions);

    const metrics: ScenarioMetrics = {
      counts,
      wallClock: summarize(wall),
      throttle: { profile: THROTTLE_PROFILE.name, unthrottled, throttled },
      repeats: REPEATS,
    };
    await writeScenario('overlay', metrics);
  });
});

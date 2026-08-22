import { afterAll, describe, expect, it } from 'vitest';

import '../../src/components/button/button';
import { AmButton } from '../../src/components/button/button';
import { fixture, waitForUpdate } from '../helpers';
import {
  THROTTLE_PROFILE,
  assertStableCounts,
  countLifecycle,
  domNodeCount,
  proveThrottleLive,
  raf,
  resetThrottle,
  summarize,
  writeScenario,
  type ScenarioMetrics,
} from './harness';

/**
 * button.perf.test.ts — the D-06 LIGHT CONTROL / noise-floor contrast.
 *
 * am-button has no floating-ui controller and a trivial template, so its counts
 * form the low-water mark the heavy scenarios (data-grid, combobox, overlay) are
 * read against. Scenario = mount + a fixed sequence of property toggles, each
 * forcing one Lit update cycle. Runs Chromium-only under 6x-CPU + Slow-3G throttle;
 * counts are gated (identical across 5 repeats), wall-clock is report-only (D-07).
 *
 * PURITY: imports no test/setup.ts symbol (Pitfall 2).
 */

const REPEATS = 5;

type ButtonHost = HTMLElement & { loading: boolean; disabled: boolean };

describe('perf: button (light control / noise floor)', () => {
  afterAll(async () => {
    await resetThrottle();
  });

  it('measures render + prop-toggle counts under throttle, deterministic across 5 repeats', async () => {
    // Prove the throttle is live (and apply it) before measuring.
    const { unthrottled, throttled } = await proveThrottleLive();
    expect(throttled).toBeGreaterThan(unthrottled);

    const life = countLifecycle(AmButton);
    const perRepeat: Record<string, number>[] = [];
    const wall: number[] = [];

    // One measured iteration: mount + a fixed sequence of property toggles.
    async function runOnce(): Promise<{ counts: Record<string, number>; wall: number }> {
      life.reset();
      const t0 = performance.now();

      const host = await fixture<ButtonHost>('<am-button>Click</am-button>');
      host.loading = true;
      await waitForUpdate(host);
      host.loading = false;
      await waitForUpdate(host);
      host.disabled = true;
      await waitForUpdate(host);
      await raf();

      const elapsed = performance.now() - t0;
      const counts = { ...life.counts, nodes: domNodeCount(host) };
      host.remove();
      return { counts, wall: elapsed };
    }

    try {
      // Warm-up (discarded): the first cold mount can differ by a JIT/lazy-init
      // update; running it unmeasured makes all 5 recorded repeats identical.
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
    expect(counts.render).toBeGreaterThan(0);

    const metrics: ScenarioMetrics = {
      counts,
      wallClock: summarize(wall),
      throttle: { profile: THROTTLE_PROFILE.name, unthrottled, throttled },
      repeats: REPEATS,
    };
    await writeScenario('button', metrics);
  });
});

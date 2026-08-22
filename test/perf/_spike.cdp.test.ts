import { afterAll, describe, expect, it } from 'vitest';
import { cdp, commands } from 'vitest/browser';

/**
 * A2 SPIKE — `cdp()` CPU+network throttle privilege path (RESEARCH assumption A2,
 * Pitfall 1). This is the end-to-end TRACER for the entire Phase-7 perf lane:
 *
 *     vitest.config `perf` project (api.allowWrite/allowExec grant)
 *       → cdp() returns a Playwright CDPSession
 *       → Emulation.setCPUThrottlingRate + Network.emulateNetworkConditions apply
 *       → a fixed busy loop is measurably slower under throttle (throttle is LIVE)
 *       → commands.writeMetrics is wired as the Node-side persistence channel
 *
 * Proving this one-line-deep path here converts a possible mid-harness dead-end
 * (Plan 03) into a five-minute fix and PINS the exact config key shape.
 *
 * Runs ONLY in the Chromium-only `perf` project (D-11). Deliberately imports NO
 * setup.ts / mock symbol — native Chromium APIs only (Pitfall 2).
 */

// Chromium DevTools canonical Slow-3G preset (bytes/sec, ms). [RESEARCH A1 —
// tune from measured data in Plan 03; here only proving the command APPLIES.]
const SLOW_3G = {
  offline: false,
  downloadThroughput: (500 * 1024) / 8,
  uploadThroughput: (500 * 1024) / 8,
  latency: 400,
};

// D-01 pinned CPU multiplier for the worst-case-cellular profile.
const CPU_RATE = 6;

/** Optimization-resistant busy loop — returns an accumulator so it can't be dead-code-eliminated. */
function busyLoop(iterations: number): number {
  let acc = 0;
  for (let i = 0; i < iterations; i++) {
    acc += Math.sqrt(i) * Math.sin(i);
  }
  return acc;
}

function timed(iterations: number): number {
  const start = performance.now();
  const result = busyLoop(iterations);
  const elapsed = performance.now() - start;
  // Touch the result so the JIT keeps the loop.
  if (!Number.isFinite(result)) throw new Error('busyLoop produced a non-finite result');
  return elapsed;
}

describe('A2: cdp() throttle privilege path (perf lane tracer)', () => {
  afterAll(async () => {
    // Hygiene: undo the CPU throttle so it never leaks past this spike.
    try {
      const session = cdp();
      await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    } catch {
      // best-effort reset
    }
  });

  it('grants a CDPSession, applies CPU+network throttle, and slows a fixed workload', async () => {
    // 1. The config grant (api.allowWrite/allowExec) makes cdp() return a session.
    const session = cdp();
    expect(session).toBeDefined();
    expect(typeof session.send).toBe('function');

    // Sanity: the session actually talks to the DevTools protocol.
    const version = (await session.send('Browser.getVersion')) as { product?: string };
    expect(typeof version.product).toBe('string');

    const ITER = 6_000_000;

    // Warm up (let the JIT settle) so the delta reflects throttle, not compilation.
    timed(ITER);

    // 2. Baseline — unthrottled wall-clock for the fixed loop.
    const unthrottled = timed(ITER);

    // 3. Apply BOTH throttles via CDP (proves each command is accepted).
    await session.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });
    await session.send('Network.emulateNetworkConditions', SLOW_3G);

    // 4. Same loop under CPU throttle — must be measurably slower (throttle is live,
    //    not a silent no-op). A 6x CPU throttle gives a wide margin over noise.
    const throttled = timed(ITER);

    expect(throttled).toBeGreaterThan(unthrottled);

    // 5. The Node-side persistence channel is wired (Plan 03 calls it to write
    //    api/perf.json). Assert it is exposed without writing a stray file here.
    //    `BrowserCommands` is an augmentable interface (empty until Plan 03 declares
    //    the command's types), so read the member through a local cast.
    const wired = (commands as Record<string, unknown>).writeMetrics;
    expect(typeof wired).toBe('function');
  });
});

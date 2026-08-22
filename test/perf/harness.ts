import { cdp, commands } from 'vitest/browser';

import { FloatingPositionController } from '../../src/internal/controllers/floating-position.js';

/**
 * test/perf/harness.ts — the throttled runtime-perf harness (MEAS-02/03).
 *
 * Three responsibilities, all consumed by the four D-06 scenario specs:
 *   1. THROTTLE  — pin one named low-end profile and apply it via CDP (Chromium
 *      only, D-11): Emulation.setCPUThrottlingRate + Network.emulateNetworkConditions.
 *   2. INSTRUMENT — count engine-independent work by wrapping ONLY first-party
 *      prototypes the harness owns: the component's own Lit lifecycle hooks
 *      (update/updated/render — public ReactiveElement API) and the shared
 *      FloatingPositionController.prototype._updatePosition chokepoint, plus a
 *      MutationObserver on the overlay panel's `style` attribute as a
 *      zero-instrumentation reposition cross-check. @floating-ui/dom and Lit
 *      exports are NEVER patched.
 *   3. SUMMARIZE — reduce N wall-clock samples to { median, mean, sd, band }
 *      where band = mean + 3σ (D-07). Counts are the deterministic GATED numbers;
 *      wall-clock is the noisy, band-protected, REPORT-ONLY number.
 *
 * REPRESENTATIVE OVERLAY = am-popover. The overlay scenario uses am-popover
 * because it routes its positioning through FloatingPositionController, so the
 * _updatePosition count wrap observes it. color-picker and rich-select call
 * computePosition DIRECTLY (bypassing the controller) and are therefore
 * DELIBERATELY NOT chosen for the overlay scenario (RESEARCH Pitfall 6). If a
 * direct-caller ever needs measuring, the MutationObserver style cross-check
 * (countRepositions) works regardless of call path.
 *
 * PURITY (Pitfall 2): this module imports NO test/setup.ts symbol and no mock.
 * The perf lane runs on native Chromium APIs only.
 */

// ---------------------------------------------------------------------------
// 1. THROTTLE
// ---------------------------------------------------------------------------

/** A network tier for Network.emulateNetworkConditions (bytes/sec, ms). */
export interface NetworkTier {
  offline: boolean;
  downloadThroughput: number;
  uploadThroughput: number;
  latency: number;
}

/**
 * Chromium DevTools canonical 3G presets (RESEARCH A1 — tunable; Plan 04 re-pins
 * the chosen tier from measured candidate-grid data per MEAS-03).
 */
export const NETWORK_TIERS: Record<'Slow-3G' | 'Fast-3G', NetworkTier> = {
  'Slow-3G': {
    offline: false,
    downloadThroughput: (500 * 1024) / 8,
    uploadThroughput: (500 * 1024) / 8,
    latency: 400,
  },
  'Fast-3G': {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    latency: 150,
  },
};

export interface ThrottleProfile {
  name: string;
  /** Emulation.setCPUThrottlingRate multiplier (>1 = slower). */
  cpuRate: number;
  /** Key into {@link NETWORK_TIERS}. */
  network: keyof typeof NETWORK_TIERS;
}

/**
 * THE pinned low-end target profile (MEAS-03) — DATA-DERIVED, not guessed.
 *
 * INTENT (frozen, D-01): worst-case field/mobile — an older device on cellular,
 * not enterprise-desktop. The NUMBERS below are chosen from a measured candidate
 * grid, per MEAS-03 (Pitfall 15: never pin a perf profile by guess).
 *
 * CANDIDATE GRID measured (Plan 04) — CPU-throttle {4x, 6x} × network
 * {Slow-3G, Fast-3G}, 5 repeats/scenario, wall-clock medians (ms), Chromium-only
 * (D-11). The pick maximizes how cleanly the profile SEPARATES the heavy
 * optimization targets (combobox, data-grid) from the light control (overlay,
 * button) — a wider heavy/light gap means a more discriminating baseline for the
 * Phase 8–9 cuts:
 *
 *   corner        combobox  data-grid  overlay  button   heavy/light
 *   6x + Slow-3G     80.6      70.7      31.8    15.7      ≈2.53x  ← PINNED
 *   4x + Slow-3G     54.0      25.2      31.8    16.3      ≈1.70x  (data-grid < overlay)
 *   6x + Fast-3G     45.8      46.6      30.9    15.9      ≈1.51x
 *   4x + Fast-3G     29.6      18.5      32.1    16.5      ≈0.92x  (collapsed: overlay > heavy)
 *
 * RATIONALE for the pick: 6x + Slow-3G is the only corner where BOTH heavy
 * scenarios sit clearly above BOTH light ones (widest, most stable heavy/light
 * separation, ≈2.53x). Dropping to 4x CPU sinks data-grid below the overlay
 * control (separation muddied); easing to Fast-3G narrows the heavy medians and
 * shrinks the gap. The 6x CPU multiplier is what discriminates heavy from light;
 * the Slow-3G tier widened the gap further in these runs and encodes the
 * worst-case-cellular intent. Reversible (D-01): re-pin from a re-run of the grid.
 *
 * NOTE: counts (the GATED numbers) are throttle-independent and identical across
 * all four corners; the grid only moves the report-only wall-clock, which is what
 * the separation rationale is read against.
 */
export const THROTTLE_PROFILE: ThrottleProfile = {
  name: 'low-end-cellular',
  cpuRate: 6,
  network: 'Slow-3G',
};

/**
 * Apply BOTH the CPU and network throttle for `profile` via a Playwright
 * CDPSession obtained in-test through cdp() (requires the perf project's
 * api.allowWrite/allowExec grant — Plan 00 A2). Chromium-only (D-11).
 */
export async function applyThrottle(profile: ThrottleProfile = THROTTLE_PROFILE): Promise<void> {
  const session = cdp();
  await session.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuRate });
  await session.send('Network.emulateNetworkConditions', NETWORK_TIERS[profile.network]);
}

/** Undo the CPU throttle (call in afterAll so it never leaks past a spec). */
export async function resetThrottle(): Promise<void> {
  try {
    const session = cdp();
    await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await session.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  } catch {
    // best-effort reset
  }
}

/**
 * Optimization-resistant fixed workload — a compute anchor used to PROVE the CPU
 * throttle is live (throttled wall-clock measurably > unthrottled). Returns an
 * accumulator so the JIT can't dead-code-eliminate the loop.
 */
function busyLoop(iterations: number): number {
  let acc = 0;
  for (let i = 0; i < iterations; i++) {
    acc += Math.sqrt(i) * Math.sin(i);
  }
  return acc;
}

function timedBusyLoop(iterations: number): number {
  const start = performance.now();
  const result = busyLoop(iterations);
  const elapsed = performance.now() - start;
  if (!Number.isFinite(result)) throw new Error('busyLoop produced a non-finite result');
  return elapsed;
}

/**
 * Prove the throttle is LIVE and apply it. Measures a fixed compute anchor
 * unthrottled, applies `profile`, then measures the same anchor throttled. The
 * caller asserts `throttled > unthrottled` (throttle is not a silent no-op —
 * MEAS-02 truth #5). After this resolves the page is throttled, so the scenario
 * runs that follow are measured under throttle. A dedicated compute anchor
 * (rather than the scenario's own wall-clock) keeps this liveness check robust
 * even for the light `button` control whose scenario work is near the noise floor.
 */
export async function proveThrottleLive(
  profile: ThrottleProfile = THROTTLE_PROFILE,
): Promise<{ unthrottled: number; throttled: number }> {
  const ITER = 4_000_000;
  timedBusyLoop(ITER); // warm the JIT so the delta reflects throttle, not compilation
  const unthrottled = timedBusyLoop(ITER);
  await applyThrottle(profile);
  const throttled = timedBusyLoop(ITER);
  return { unthrottled, throttled };
}

// ---------------------------------------------------------------------------
// 2. INSTRUMENT (first-party prototypes only)
// ---------------------------------------------------------------------------

/** Lit lifecycle call counts for one component prototype. */
export interface LifecycleCounts {
  update: number;
  updated: number;
  render: number;
}

interface LifecycleProbe {
  counts: LifecycleCounts;
  /** Zero the counters (call at the start of each repeat). */
  reset: () => void;
  /** Restore the original prototype hooks (call in teardown). */
  restore: () => void;
}

// A minimal structural view of a Lit component constructor. Any component class
// is assignable. Wrapping the COMPONENT'S OWN prototype (its overridable
// ReactiveElement update/updated/render hooks) is first-party — it is NOT a Lit
// internal patch.
type LifecycleCtor = { prototype: object };

/**
 * Count update/updated/render on a component's own prototype (public,
 * overridable ReactiveElement hooks). Restores the originals in restore().
 */
export function countLifecycle(Ctor: LifecycleCtor): LifecycleProbe {
  const counts: LifecycleCounts = { update: 0, updated: 0, render: 0 };
  const originals: Partial<Record<keyof LifecycleCounts, unknown>> = {};
  const hooks: (keyof LifecycleCounts)[] = ['update', 'updated', 'render'];

  for (const hook of hooks) {
    const proto = Ctor.prototype as Record<string, unknown>;
    const orig = proto[hook] as (...args: unknown[]) => unknown;
    originals[hook] = orig;
    proto[hook] = function (this: unknown, ...args: unknown[]): unknown {
      counts[hook]++;
      return orig.apply(this, args);
    };
  }

  return {
    counts,
    reset: () => {
      counts.update = 0;
      counts.updated = 0;
      counts.render = 0;
    },
    restore: () => {
      const proto = Ctor.prototype as Record<string, unknown>;
      for (const hook of hooks) {
        proto[hook] = originals[hook];
      }
    },
  };
}

interface ComputePositionProbe {
  /** Number of FloatingPositionController._updatePosition invocations so far. */
  readonly count: number;
  reset: () => void;
  restore: () => void;
}

const UPDATE_POSITION = '_updatePosition';

/**
 * Count computePosition invocations by wrapping the SHARED first-party chokepoint
 * FloatingPositionController.prototype._updatePosition — the single call site
 * routing combobox/select/dropdown/popover/tooltip/date-picker positioning
 * (src/internal/controllers/floating-position.ts:116-130). @floating-ui/dom is
 * never patched.
 */
export function countComputePosition(): ComputePositionProbe {
  let n = 0;
  const proto = FloatingPositionController.prototype as unknown as Record<string, unknown>;
  const orig = proto[UPDATE_POSITION] as (...args: unknown[]) => unknown;
  proto[UPDATE_POSITION] = function (this: unknown, ...args: unknown[]): unknown {
    n++;
    return orig.apply(this, args);
  };
  return {
    get count() {
      return n;
    },
    reset: () => {
      n = 0;
    },
    restore: () => {
      proto[UPDATE_POSITION] = orig;
    },
  };
}

interface RepositionProbe {
  /** Number of observed `style`-attribute mutations on the panel. */
  readonly count: number;
  stop: () => void;
}

/**
 * Zero-instrumentation cross-check of reposition count: a MutationObserver on the
 * panel's `style` attribute counts the `Object.assign(floating.style, {...})`
 * writes _updatePosition performs on every reposition (floating-position.ts:128).
 * The count must AGREE with countComputePosition() (same call → same write).
 */
export function countRepositions(panel: HTMLElement): RepositionProbe {
  let n = 0;
  const obs = new MutationObserver((records) => {
    n += records.length;
  });
  obs.observe(panel, { attributes: true, attributeFilter: ['style'] });
  return {
    get count() {
      // Flush any queued records synchronously before reading.
      for (const _ of obs.takeRecords()) n++;
      return n;
    },
    stop: () => obs.disconnect(),
  };
}

/** Total DOM node count inside a host's shadow root (structural size metric). */
export function domNodeCount(host: HTMLElement): number {
  return host.shadowRoot?.querySelectorAll('*').length ?? 0;
}

// ---------------------------------------------------------------------------
// 3. SUMMARIZE (D-07: median + mean + 3σ band)
// ---------------------------------------------------------------------------

export interface Summary {
  median: number;
  mean: number;
  sd: number;
  /** mean + 3σ — the variance band Phase 11 sets enforcing thresholds outside. */
  band: number;
  samples: number[];
}

/**
 * Reduce wall-clock samples to { median (reported), mean, sd, band=mean+3σ }
 * (D-07). Counts are asserted identical across repeats elsewhere; this protects
 * the noisy wall-clock number.
 */
export function summarize(samples: number[]): Summary {
  const sorted = [...samples].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
  const sd = Math.sqrt(samples.reduce((s, x) => s + (x - mean) ** 2, 0) / samples.length);
  return { median, mean, sd, band: mean + 3 * sd, samples };
}

// ---------------------------------------------------------------------------
// Metrics shape + persistence
// ---------------------------------------------------------------------------

/** The per-scenario metrics object written to api/perf.json. */
export interface ScenarioMetrics {
  /** Deterministic gated counts (identical across all repeats). */
  counts: Record<string, number>;
  /** Report-only wall-clock summary (median + mean+3σ band). */
  wallClock: Summary;
  /** The throttle-liveness evidence (throttled must exceed unthrottled). */
  throttle: { profile: string; unthrottled: number; throttled: number };
  /** Number of repeats run (D-07 = 5). */
  repeats: number;
}

/** Committed perf report path (under api/, outside package.files — never ships). */
export const PERF_OUTPUT = 'api/perf.json';

type WriteMetricsFn = (path: string, data: unknown) => Promise<void>;

/**
 * Persist one scenario's metrics to api/perf.json via the Node-side writeMetrics
 * command (browser specs cannot touch the filesystem). The command MERGES by
 * top-level scenario key, so each of the four scenario specs contributes its own
 * entry to a single api/perf.json.
 */
export async function writeScenario(scenario: string, metrics: ScenarioMetrics): Promise<void> {
  const write = (commands as unknown as { writeMetrics: WriteMetricsFn }).writeMetrics;
  await write(PERF_OUTPUT, { [scenario]: metrics });
}

/**
 * Assert count metrics are byte-identical across every repeat (determinism — the
 * property that lets Phases 9/11 gate on them). Returns the canonical counts.
 */
export function assertStableCounts(perRepeat: Record<string, number>[]): Record<string, number> {
  const first = JSON.stringify(perRepeat[0]);
  for (let i = 1; i < perRepeat.length; i++) {
    if (JSON.stringify(perRepeat[i]) !== first) {
      throw new Error(
        `Non-deterministic counts across repeats: repeat 0 = ${first}, repeat ${i} = ${JSON.stringify(perRepeat[i])}`,
      );
    }
  }
  return perRepeat[0];
}

/** Await the microtask/rAF settle so async positioning + MutationObserver flush. */
export function raf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

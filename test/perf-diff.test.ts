import { describe, expect, it } from 'vitest';

// GATE-02 runtime-perf count-enforce exit-code contract (11-02 Task 1). Pins the
// pure exit-code decision of `scripts/perf-diff.mjs --enforce` WITHOUT spawning a
// process or measuring in a browser. Two pure functions carry the whole contract:
//   - `diff(baseline, current)` returns { addedScenarios, removedScenarios,
//     changed, wallClock, hasDrift }; `hasDrift` is COUNT-ONLY by construction —
//     wall-clock median/band are carried for a report-only render and can never
//     set drift (D-06).
//   - `enforcePerfExitCode(result)` returns 1 when `result.hasDrift`, else 0.
//
// `enforcePerfExitCode` lands in Task 2 — this import is RED until then. The
// analog is test/deep-import-purity.test.ts / test/size-baseline.test.ts, which
// import pure helpers from a `.mjs` script into a jsdom Vitest spec. No browser
// import; runs under the default jsdom project.
import { diff, enforcePerfExitCode } from '../scripts/perf-diff.mjs';

// Committed-baseline shape ({ counts, wallClock:{median,band}, throttle, repeats })
// keyed by scenario. Helper builds a single-scenario report so each test states
// only the counts + wall-clock it cares about.
const scenario = (
  counts: Record<string, number>,
  wallClock: { median: number; band: number } = { median: 10, band: 20 },
) => ({
  counts,
  wallClock,
  throttle: { profile: 'low-end-cellular' },
  repeats: 5,
});

describe('diff + enforcePerfExitCode: count-only enforcement (GATE-02)', () => {
  it('does NOT drift when counts are identical but wall-clock diverges wildly (exit 0)', () => {
    // THE load-bearing assertion: wall-clock is structurally excluded from the
    // gate. Identical counts, radically different median/band -> no drift, exit 0.
    const base = { overlay: scenario({ computePosition: 4, repositions: 2 }, { median: 5, band: 9 }) };
    const current = {
      overlay: scenario({ computePosition: 4, repositions: 2 }, { median: 999, band: 4321 }),
    };
    const result = diff(base, current);
    expect(result.hasDrift).toBe(false);
    expect(enforcePerfExitCode(result)).toBe(0);
  });

  it('drifts when a single count is raised by +1 (exit 1)', () => {
    const base = { overlay: scenario({ computePosition: 4, repositions: 2 }) };
    const current = { overlay: scenario({ computePosition: 5, repositions: 2 }) };
    const result = diff(base, current);
    expect(result.hasDrift).toBe(true);
    expect(enforcePerfExitCode(result)).toBe(1);
    const row = result.changed.overlay.find((r) => r.metric === 'computePosition');
    expect(row?.delta).toBe(1); // exact integer subtraction, no rounding
  });

  it('drifts when a count is LOWERED by 1 — a reduction is drift that must re-baseline (exit 1)', () => {
    const base = { overlay: scenario({ computePosition: 4 }) };
    const current = { overlay: scenario({ computePosition: 3 }) };
    const result = diff(base, current);
    expect(result.hasDrift).toBe(true);
    const row = result.changed.overlay.find((r) => r.metric === 'computePosition');
    expect(row?.delta).toBe(-1); // negative delta = improvement, still exit 1 until re-baselined
    expect(enforcePerfExitCode(result)).toBe(1);
  });

  it('drifts when a scenario is ADDED (exit 1)', () => {
    const base = { overlay: scenario({ computePosition: 4 }) };
    const current = {
      overlay: scenario({ computePosition: 4 }),
      button: scenario({ update: 4 }),
    };
    const result = diff(base, current);
    expect(result.addedScenarios).toEqual(['button']);
    expect(result.hasDrift).toBe(true);
    expect(enforcePerfExitCode(result)).toBe(1);
  });

  it('drifts when a scenario is REMOVED (exit 1)', () => {
    const base = {
      overlay: scenario({ computePosition: 4 }),
      button: scenario({ update: 4 }),
    };
    const current = { overlay: scenario({ computePosition: 4 }) };
    const result = diff(base, current);
    expect(result.removedScenarios).toEqual(['button']);
    expect(result.hasDrift).toBe(true);
    expect(enforcePerfExitCode(result)).toBe(1);
  });

  it('drifts when a count metric is ADDED or REMOVED within a scenario (exit 1)', () => {
    const base = { overlay: scenario({ computePosition: 4 }) };
    const current = { overlay: scenario({ computePosition: 4, repositions: 2 }) };
    const result = diff(base, current);
    expect(result.hasDrift).toBe(true);
    expect(enforcePerfExitCode(result)).toBe(1);
  });

  it('reports status `same` and no drift when a count exactly equals its baseline (exit 0)', () => {
    const base = { 'data-grid': scenario({ update: 5, nodes: 250, sortComputes: 1 }) };
    const current = { 'data-grid': scenario({ update: 5, nodes: 250, sortComputes: 1 }) };
    const result = diff(base, current);
    expect(result.hasDrift).toBe(false);
    expect(result.changed['data-grid']).toBeUndefined();
    expect(enforcePerfExitCode(result)).toBe(0);
  });

  it('uses exact integer deltas — no float rounding enters the count-delta path', () => {
    const base = { combobox: scenario({ filterCalls: 10 }) };
    const current = { combobox: scenario({ filterCalls: 13 }) };
    const result = diff(base, current);
    const row = result.changed.combobox.find((r) => r.metric === 'filterCalls');
    expect(row?.delta).toBe(3);
    expect(Number.isInteger(row?.delta)).toBe(true);
  });
});

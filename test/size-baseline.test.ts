import { describe, expect, it } from 'vitest';

// GATE-01 size-enforce exit-code contract (11-01 Task 1). Pins the pure
// exit-code decision of `scripts/size-baseline.mjs --enforce` WITHOUT spawning a
// process or running a real build: `enforceSizeExitCode(result, { tolerance })`
// takes a `diff()`-shaped result ({ rows, hasDrift }) and returns 1 on a real
// positive-delta regression beyond the per-row tolerance, else 0 (regression
// CEILING semantics — a shrink or unchanged row passes; RESEARCH Pattern 2).
//
// `enforceSizeExitCode` is added in Task 2 — this import is RED until then. The
// analog is test/deep-import-purity.test.ts, which imports pure helpers from a
// `.mjs` script into a jsdom Vitest spec. No browser import; runs under the
// default jsdom project.
import { diff, enforceSizeExitCode } from '../scripts/size-baseline.mjs';

// Build a synthetic `diff()`-shaped result from bare rows. Rows only need the
// fields the exit-code decision reads (`delta`, and optionally `base`); `name`
// and `status` are cosmetic here.
const resultOf = (rows: Array<{ name?: string; delta: number | null; base?: number }>) => ({
  rows: rows.map((r) => ({
    name: r.name ?? 'entry',
    base: r.base ?? null,
    current: null,
    delta: r.delta,
    status: r.delta == null ? 'added' : r.delta === 0 ? 'same' : 'changed',
  })),
  hasDrift: rows.some((r) => r.delta !== 0),
});

describe('enforceSizeExitCode: regression-ceiling exit decision (GATE-01)', () => {
  it('returns 1 for a positive delta beyond tolerance (a regression)', () => {
    const result = resultOf([{ name: 'core bundle', delta: 200 }]);
    expect(enforceSizeExitCode(result, { tolerance: 0 })).toBe(1);
  });

  it('returns 0 for a negative delta (a shrink)', () => {
    const result = resultOf([{ name: 'core bundle', delta: -200 }]);
    expect(enforceSizeExitCode(result, { tolerance: 0 })).toBe(0);
  });

  it('returns 0 for a zero delta (unchanged)', () => {
    const result = resultOf([{ name: 'core bundle', delta: 0 }]);
    expect(enforceSizeExitCode(result, { tolerance: 0 })).toBe(0);
  });

  it('absorbs a small positive delta within the tolerance margin (+8 <= 16 -> 0)', () => {
    const result = resultOf([{ name: 'core bundle', delta: 8 }]);
    expect(enforceSizeExitCode(result, { tolerance: 16 })).toBe(0);
  });

  it('trips when a positive delta exceeds the tolerance margin (+40 > 16 -> 1)', () => {
    const result = resultOf([{ name: 'core bundle', delta: 40 }]);
    expect(enforceSizeExitCode(result, { tolerance: 16 })).toBe(1);
  });

  it('treats a null delta (added/removed entry) as NOT a regression on its own delta', () => {
    // An `added` entry has delta null (no baseline to compare) — the ceiling rule
    // never regresses on a null delta, even with a real positive current size.
    const result = resultOf([{ name: 'new-thing (deep import)', delta: null }]);
    expect(enforceSizeExitCode(result, { tolerance: 0 })).toBe(0);
  });

  it('trips if ANY row regresses even when others are clean', () => {
    const result = resultOf([
      { name: 'core bundle', delta: -50 },
      { name: 'full bundle', delta: 0 },
      { name: 'data-grid (heavy deep import)', delta: 300 },
    ]);
    expect(enforceSizeExitCode(result, { tolerance: 16 })).toBe(1);
  });

  it('passes a wholly same-or-shrunk build', () => {
    const result = resultOf([
      { name: 'core bundle', delta: -10 },
      { name: 'full bundle', delta: 0 },
      { name: 'button (light deep import)', delta: -1 },
    ]);
    expect(enforceSizeExitCode(result, { tolerance: 16 })).toBe(0);
  });

  it('scales the per-row margin by 0.5% of the baseline when that exceeds the floor', () => {
    // base 20000 -> 0.5% = 100, which is larger than the 16 B floor. A +80 delta
    // sits under that per-row margin and must pass; a +120 delta trips it.
    expect(enforceSizeExitCode(resultOf([{ delta: 80, base: 20000 }]), { tolerance: 16 })).toBe(0);
    expect(enforceSizeExitCode(resultOf([{ delta: 120, base: 20000 }]), { tolerance: 16 })).toBe(1);
  });
});

describe('diff: exported shape the enforce path consumes', () => {
  it('produces { rows, hasDrift } with signed per-entry deltas', () => {
    const base = { unit: 'brotli-bytes', entries: { 'core bundle': 100 }, marginal: {} };
    const current = { unit: 'brotli-bytes', entries: { 'core bundle': 150 }, marginal: {} };
    const result = diff(base, current);
    expect(result.hasDrift).toBe(true);
    const core = result.rows.find((r) => r.name === 'core bundle');
    expect(core?.delta).toBe(50);
    // The enforce decision over this drift is a regression (positive delta).
    expect(enforceSizeExitCode(result, { tolerance: 0 })).toBe(1);
  });
});

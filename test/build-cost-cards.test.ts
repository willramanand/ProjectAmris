import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// DOCS-04 cost-cards generator contract (11-03). `scripts/build-cost-cards.mjs`
// mirrors `scripts/build-contract-doc.mjs`: it reads the committed measured
// baselines (api/size.baseline.json + api/perf.baseline.json) and renders a
// deterministic, code-point-ordered markdown doc that CI `git diff --exit-code`
// gates. These are the pure-function contracts the generator is built on:
//
//   - renderCostCards({ size, perf }) -> full markdown string (pure)
//   - buildCostCards({ sizePath, perfPath, outPath }) -> I/O wrapper
//
// The import is RED until Task 2 exports these from the generator.
import { buildCostCards, renderCostCards } from '../scripts/build-cost-cards.mjs';

// A size baseline whose entry names deliberately differ in order between
// `localeCompare` (case-insensitive: apple < pipe < Zebra) and code-point
// comparison (uppercase 'Z' 0x5A < lowercase 'a' 0x61 < 'p' 0x70). One entry
// name embeds a `|` to prove the cell escape.
const SIZE_FIXTURE = {
  unit: 'brotli-bytes',
  entries: {
    'Zebra entry': 1000,
    'apple entry': 2000,
    'pipe|entry': 3000,
  },
  marginal: {
    'apple entry': -1500,
  },
};

// A perf baseline with a distinctive wall-clock median (42.5) that must render
// only under a report-only/volatile section, never as a budget column.
const PERF_FIXTURE = {
  'Zeta scenario': {
    counts: { render: 2, update: 2, nodes: 5 },
    wallClock: { median: 42.5, band: 60.1 },
    throttle: { profile: 'low-end-cellular' },
    repeats: 5,
  },
  'alpha scenario': {
    counts: { render: 1, update: 1, nodes: 3 },
    wallClock: { median: 10.2, band: 12.3 },
    throttle: { profile: 'low-end-cellular' },
    repeats: 5,
  },
};

describe('build-cost-cards: renderCostCards (pure render)', () => {
  it('is deterministic — two calls with the same input return byte-identical strings', () => {
    const a = renderCostCards({ size: SIZE_FIXTURE, perf: PERF_FIXTURE });
    const b = renderCostCards({ size: SIZE_FIXTURE, perf: PERF_FIXTURE });
    expect(a).toBe(b);
  });

  it('orders entries by code-point, NOT localeCompare (Zebra before apple)', () => {
    const md = renderCostCards({ size: SIZE_FIXTURE, perf: PERF_FIXTURE });
    const zebraIdx = md.indexOf('Zebra entry');
    const appleIdx = md.indexOf('apple entry');
    expect(zebraIdx).toBeGreaterThanOrEqual(0);
    expect(appleIdx).toBeGreaterThanOrEqual(0);
    // Code-point: 'Z' (0x5A) < 'a' (0x61) so Zebra renders first. localeCompare
    // would sort apple first — this assertion fails if localeCompare is used.
    expect(zebraIdx).toBeLessThan(appleIdx);
  });

  it('escapes a `|` in a cell value so it cannot break the markdown table', () => {
    const md = renderCostCards({ size: SIZE_FIXTURE, perf: PERF_FIXTURE });
    // The escaped form is present; the raw unescaped `pipe|entry` is not.
    expect(md).toContain('pipe\\|entry');
    expect(md).not.toContain('pipe|entry');
  });

  it('renders the wall-clock median only under a report-only/volatile label, never as a budget column', () => {
    const md = renderCostCards({ size: SIZE_FIXTURE, perf: PERF_FIXTURE });
    // The doc carries an explicit report-only / volatile label for wall-clock.
    expect(md).toMatch(/report-only/i);
    expect(md).toMatch(/volatile/i);

    // The distinctive median value renders AFTER the report-only label (i.e.
    // inside the report-only section), not in a budget/size table above it.
    const reportIdx = md.toLowerCase().indexOf('report-only');
    const medianIdx = md.indexOf('42.5');
    expect(medianIdx).toBeGreaterThan(reportIdx);

    // The line carrying the wall-clock median must never present it as a
    // budget / limit / ceiling.
    const medianLine = md.split('\n').find((l) => l.includes('42.5')) ?? '';
    expect(medianLine).not.toMatch(/budget|limit|ceiling/i);

    // The size table header presents Brotli on-the-wire, not a wall-clock budget.
    const brotliHeader = md.split('\n').find((l) => /Brotli/i.test(l) && l.includes('|')) ?? '';
    expect(brotliHeader).not.toMatch(/wall.?clock/i);
  });
});

describe('build-cost-cards: buildCostCards (I/O round-trip)', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'cost-cards-'));
    writeFileSync(join(dir, 'size.json'), JSON.stringify(SIZE_FIXTURE));
    writeFileSync(join(dir, 'perf.json'), JSON.stringify(PERF_FIXTURE));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes a deterministic doc — a second run is byte-identical (idempotent whole-file write)', () => {
    const sizePath = join(dir, 'size.json');
    const perfPath = join(dir, 'perf.json');
    const outPath = join(dir, 'cost-cards.md');

    buildCostCards({ sizePath, perfPath, outPath });
    const first = readFileSync(outPath, 'utf8');
    buildCostCards({ sizePath, perfPath, outPath });
    const second = readFileSync(outPath, 'utf8');

    expect(first).toBe(second);
    // The rendered file matches the pure render for the same input.
    expect(first).toBe(renderCostCards({ size: SIZE_FIXTURE, perf: PERF_FIXTURE }));
  });
});

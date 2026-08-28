// Emits docs/cost-cards.md — the consumer-facing per-component COST CARDS
// (DOCS-04): measured brotli on-the-wire size + deterministic runtime-count cost
// for the measured representative set. Zero-dependency ESM Node script mirroring
// scripts/build-contract-doc.mjs: it reads ONLY the committed measured baselines
// (api/size.baseline.json + api/perf.baseline.json) — it NEVER re-measures (never
// invokes size-limit or the perf harness), so a jsdom/local re-measure can never
// publish wrong numbers. CI regenerates this file and `git diff --exit-code
// docs/cost-cards.md` fails on any stale committed copy (threat T-11-08).
//
// Entries and scenarios are sorted by CODE-POINT comparison (NOT localeCompare):
// this doc is drift-gated by `git diff --exit-code`, so ordering must be
// locale-independent — ICU collation can differ between the generating machine
// and CI (WR-01). Baseline values are rendered as plain markdown table cells with
// `|` escaped (threat T-11-09, mirrors build-contract-doc `cell()`).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const SIZE_BASELINE = resolve(root, 'api/size.baseline.json');
const PERF_BASELINE = resolve(root, 'api/perf.baseline.json');
const OUT = resolve(root, 'docs/cost-cards.md');

// --- Helpers (shared shape with build-contract-doc.mjs). ---
// Code-point comparison (NOT localeCompare) — see file header (WR-01).
const cp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
// Escape `|` so a value can never break the surrounding markdown table cell.
const cell = (v) => (v == null || v === '' ? '—' : String(v).replace(/\|/g, '\\|'));
// Brotli bytes -> kB, fixed 2dp (deterministic; negative marginals show savings).
const kb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;
// Wall-clock milliseconds, fixed 2dp (report-only readability; deterministic).
const ms = (n) => `${Number(n).toFixed(2)} ms`;

// ---------------------------------------------------------------------------
// Pure render — returns the WHOLE markdown string so CI can diff the entire doc.
// ---------------------------------------------------------------------------
export function renderCostCards({ size, perf }) {
  const entries = size?.entries ?? {};
  const marginal = size?.marginal ?? {};
  const entryNames = Object.keys(entries).sort(cp);
  const scenarioNames = Object.keys(perf ?? {}).sort(cp);

  const sections = [];

  sections.push('# Amris Cost Cards — Measured Size & Runtime Cost');
  sections.push('');
  sections.push(
    '> **Generated** by `node scripts/build-cost-cards.mjs` from the committed measured baselines (`api/size.baseline.json` + `api/perf.baseline.json`). Do NOT hand-edit — re-run the generator (`npm run build:cost-cards`). CI regenerates this file and fails on drift (`git diff --exit-code docs/cost-cards.md`). The generator NEVER re-measures — it reads the committed baselines only, so these numbers can never diverge from the enforced size/perf gates.',
  );
  sections.push('');
  sections.push(
    [
      '## Scope',
      '',
      'These cards cover the **measured representative span**, not all 60+ components:',
      'a light entry (`button`), overlay (`popover`), and heavy entries',
      '(`data-grid`, `combobox`), plus the whole-bundle and first-load composites.',
      'They let an enterprise consumer **budget** the banked size/runtime gains',
      'against a representative range without re-measuring every component.',
    ].join('\n'),
  );
  sections.push('');

  // --- SIZE table: measured brotli on-the-wire + marginal over core. ---
  const sizeLines = [
    '## Size cost (brotli on-the-wire)',
    '',
    `Measured brotli-compressed bytes from \`api/size.baseline.json\` (unit: \`${cell(
      size?.unit ?? 'brotli-bytes',
    )}\`). **Marginal over core** is the added cost a deep-import entry brings on top of the core bundle (negative = smaller than measuring it standalone, i.e. shared code already paid for).`,
    '',
    '| Entry | Brotli on-the-wire | Marginal over core |',
    '| ----- | ------------------ | ------------------ |',
  ];
  for (const name of entryNames) {
    const m = name in marginal ? kb(marginal[name]) : '—';
    sizeLines.push(`| ${cell(name)} | ${cell(kb(entries[name]))} | ${cell(m)} |`);
  }
  sections.push(sizeLines.join('\n'));
  sections.push('');

  // --- RUNTIME-COUNT tables: the deterministic per-scenario tick counts. ---
  const runtimeLines = [
    '## Runtime cost (deterministic counts)',
    '',
    'Deterministic instrumentation counts per scenario from `api/perf.baseline.json`',
    '(update/updated/render lifecycle ticks, DOM `nodes`, plus scenario-specific',
    'work such as `sortComputes`, `filterCalls`, `computePosition`, `repositions`,',
    '`middlewareBuilds`). These are **environment-independent counts** — the enforced',
    'runtime gate — not timings.',
    '',
  ];
  for (const scenario of scenarioNames) {
    const counts = perf[scenario]?.counts ?? {};
    runtimeLines.push(`### \`${cell(scenario)}\``);
    runtimeLines.push('');
    runtimeLines.push('| Metric | Count |');
    runtimeLines.push('| ------ | ----- |');
    for (const metric of Object.keys(counts).sort(cp)) {
      runtimeLines.push(`| ${cell(metric)} | ${cell(counts[metric])} |`);
    }
    runtimeLines.push('');
  }
  // Drop the trailing '' so section joins stay consistent.
  if (runtimeLines[runtimeLines.length - 1] === '') runtimeLines.pop();
  sections.push(runtimeLines.join('\n'));
  sections.push('');

  // --- WALL-CLOCK: explicitly report-only / volatile, NEVER a budget. ---
  const wallLines = [
    '## Wall-clock timing — report-only / volatile (NOT a budget)',
    '',
    'The wall-clock median and mean+3σ band below are **report-only and volatile**.',
    'They depend on the CI runner CPU, throttle profile, and background load, so they',
    'are **NOT a budget, ceiling, or limit** — do not gate on them and do not treat',
    'them as a hard consumer contract. The enforced runtime budget is the deterministic',
    'count table above; wall-clock is published only to give a rough felt-latency sense.',
    '',
    '| Scenario | Median | Mean+3σ band |',
    '| -------- | ------ | ------------ |',
  ];
  for (const scenario of scenarioNames) {
    const wc = perf[scenario]?.wallClock ?? {};
    const median = wc.median == null ? '—' : ms(wc.median);
    const band = wc.band == null ? '—' : ms(wc.band);
    wallLines.push(`| ${cell(scenario)} | ${cell(median)} | ${cell(band)} |`);
  }
  sections.push(wallLines.join('\n'));
  sections.push('');

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// I/O wrapper — read committed baselines, render, write the whole doc.
// ---------------------------------------------------------------------------
export function buildCostCards({ sizePath = SIZE_BASELINE, perfPath = PERF_BASELINE, outPath = OUT } = {}) {
  const size = JSON.parse(readFileSync(sizePath, 'utf8'));
  const perf = JSON.parse(readFileSync(perfPath, 'utf8'));
  const md = renderCostCards({ size, perf });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, md);
  return { outPath, entries: Object.keys(size.entries ?? {}).length, scenarios: Object.keys(perf ?? {}).length };
}

// Run only when invoked directly (never on import — the test imports the pure
// functions and must not trigger a file write).
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { outPath, entries, scenarios } = buildCostCards();
  console.log(`wrote ${outPath} — ${entries} size entries, ${scenarios} perf scenarios`);
}

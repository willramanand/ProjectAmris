// Committed per-entry BROTLI (on-the-wire) bundle-size baseline + report-only diff
// (MEAS-01 / MEAS-04). Zero-dependency Node script, cloning the scripts/cem-diff.mjs
// shape: load() / normalize (keyed by a stable entry name, sorted) / diff / formatReport
// / isMain guard.
//
// Key inversion vs cem-diff (CONTEXT D-08): cem-diff is an ENFORCING release gate
// (non-zero exit on drift). This baseline is REPORT-ONLY this phase — it prints the
// diff and exits 0 even when drift exists. The enforcing flip lands in Phase 11.
// Exit 2 is reserved for a usage error only.
//
// Unit: BROTLI bytes. .size-limit.json carries no `gzip:true`, so size-limit v13
// reports on-the-wire brotli by default (Pitfall 2). `@floating-ui/dom` is NOT in any
// delivered-payload `ignore` array, so the shipped floating-ui payload is counted and
// the Phase-8 deferral win becomes measurable; `lit` stays ignored (peer dep, never shipped).
//
// Modes:
//   node scripts/size-baseline.mjs --write   measure and (over)write api/size.baseline.json
//   node scripts/size-baseline.mjs --check    measure, diff vs the committed baseline, exit 0
//   node scripts/size-baseline.mjs            defaults to --check
// First-generation / empty-baseline edge: when api/size.baseline.json is absent, both
// modes write it and report "new baseline" rather than erroring (MEAS-05 empty edge).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { brotliCompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

const BASELINE_PATH = 'api/size.baseline.json';
const TOKENS_CSS_PATH = 'dist/styles/tokens.css';
const CORE_ENTRY = 'core bundle';
const UNIT = 'brotli-bytes';

const load = (p) => JSON.parse(readFileSync(p, 'utf8'));

// Resolve the size-limit CLI cross-platform. Invoking it through `process.execPath`
// (the current node binary) rather than `npx`/the `.bin` shim avoids the Windows
// `.cmd` shell-resolution problem that breaks execFileSync('npx', ...).
const sizeLimitBin = () => join(dirname(require.resolve('size-limit/package.json')), 'bin.js');

// Run `size-limit --json` and return a { [entryName]: brotliBytes } map. stdout is
// pure JSON; size-limit's esbuild warnings go to stderr and are discarded on success.
const measureSizeLimit = () => {
  const out = execFileSync(process.execPath, [sizeLimitBin(), '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const rows = JSON.parse(out);
  const entries = {};
  for (const r of rows) entries[r.name] = r.size;
  return entries;
};

// Build the current metric set. Deterministic: brotli byte counts over an unchanged
// dist/ are exact integers, so re-runs are byte-identical.
//
// Metric set (D-02 / D-05):
//   entries  — the size-limit JS entries (core, full, button, data-grid, the first-load
//              composite) plus a standalone tokens.css brotli measurement.
//   marginal — per-component cost over the shared core (component entry brotli minus
//              core-bundle brotli), so shared-chunk moves are not double-counted (Pitfall 2).
export const measure = () => {
  const entries = measureSizeLimit();
  // (a) tokens.css standalone brotli. size-limit measures JS entries only, not the CSS
  //     asset, so compress dist/styles/tokens.css directly with node:zlib for an
  //     on-the-wire brotli integer.
  entries['tokens.css'] = brotliCompressSync(readFileSync(TOKENS_CSS_PATH)).length;
  // (b) marginal-cost-over-core per component (Open Question 2 — arithmetic diff, brotli-
  //     consistent, over size-limit `import` syntax): component deep-import entry brotli
  //     minus the shared core-bundle brotli.
  const core = entries[CORE_ENTRY];
  const marginal = {};
  for (const name of Object.keys(entries))
    if (/deep import/.test(name)) marginal[name] = entries[name] - core;
  return { unit: UNIT, entries, marginal };
};

// Diff one named map (entries or marginal) keyed by name, key-sorted so re-runs never
// spuriously differ (MEAS-05 ordering edge).
const diffMap = (baseMap = {}, curMap = {}, prefix = '') => {
  const names = [...new Set([...Object.keys(baseMap), ...Object.keys(curMap)])].sort();
  return names.map((name) => {
    const base = baseMap[name];
    const cur = curMap[name];
    const status =
      base === undefined ? 'added' : cur === undefined ? 'removed' : base === cur ? 'same' : 'changed';
    return {
      name: prefix + name,
      base: base ?? null,
      current: cur ?? null,
      delta: base != null && cur != null ? cur - base : null,
      status,
    };
  });
};

// Diff two metric sets (entries + marginal). Returns { rows, hasDrift }.
export const diff = (baseline, current) => {
  const rows = [
    ...diffMap(baseline.entries, current.entries),
    ...diffMap(baseline.marginal, current.marginal, 'marginal: '),
  ];
  const hasDrift = rows.some((r) => r.status !== 'same');
  return { rows, hasDrift };
};

// Render a structured diff as a human-readable, report-only summary.
export const formatReport = (result) => {
  const lines = [];
  lines.push('Bundle-size baseline diff (brotli, report-only — MEAS-01/MEAS-04)');
  lines.push('================================================================');
  if (!result.hasDrift) {
    lines.push('No drift — committed baseline matches the current build (byte-identical brotli).');
    return lines.join('\n');
  }
  for (const r of result.rows) {
    if (r.status === 'same') continue;
    if (r.status === 'added') lines.push(`+ ${r.name}: (new) ${r.current} B`);
    else if (r.status === 'removed') lines.push(`- ${r.name}: (removed, was ${r.base} B)`);
    else {
      const sign = r.delta > 0 ? '+' : '';
      lines.push(`~ ${r.name}: ${r.base} B -> ${r.current} B (${sign}${r.delta} B)`);
    }
  }
  lines.push('');
  lines.push('Report-only this phase (D-08): drift never fails the build.');
  return lines.join('\n');
};

const writeBaseline = (data) => writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + '\n');

const USAGE = 'usage: node scripts/size-baseline.mjs [--write|--check]';

// CLI entry. Report-only: exits 0 in every mode; exit 2 only on a usage error.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const mode = process.argv[2] ?? '--check';
  if (mode !== '--write' && mode !== '--check') {
    console.error(USAGE);
    process.exit(2); // usage error -> the only non-zero exit
  }

  const current = measure();

  if (mode === '--write') {
    writeBaseline(current);
    console.log(`Wrote size baseline (${UNIT}) -> ${BASELINE_PATH}`);
    for (const name of Object.keys(current.entries).sort())
      console.log(`  ${name}: ${current.entries[name]} B`);
    process.exit(0);
  }

  // --check
  if (!existsSync(BASELINE_PATH)) {
    writeBaseline(current);
    console.log(`New baseline — ${BASELINE_PATH} was absent, wrote first-generation baseline.`);
    process.exit(0);
  }
  const result = diff(load(BASELINE_PATH), current);
  console.log(formatReport(result));
  process.exit(0); // REPORT-ONLY (D-08): 0 even on drift.
}

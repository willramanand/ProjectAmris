// Committed per-entry BROTLI (on-the-wire) bundle-size baseline + report-only diff
// (MEAS-01 / MEAS-04). Zero-dependency Node script, cloning the scripts/cem-diff.mjs
// shape: load() / normalize (keyed by a stable entry name, sorted) / diff / formatReport
// / isMain guard.
//
// Key inversion vs cem-diff (CONTEXT D-08): cem-diff is an ENFORCING release gate
// (non-zero exit on drift). This baseline's `--check`/`--write` modes are REPORT-ONLY
// — they print the diff and exit 0 even when drift exists. Phase 11 (GATE-01) adds a
// third `--enforce` mode that exits 1 on a per-entry brotli REGRESSION (a positive
// delta beyond tolerance), leaving `--check` byte-identical. Exit 2 stays reserved for
// a usage error only (an unknown mode) — never a size regression.
//
// Unit: BROTLI bytes. .size-limit.json carries no `gzip:true`, so size-limit v13
// reports on-the-wire brotli by default (Pitfall 2). `@floating-ui/dom` is NOT in any
// delivered-payload `ignore` array, so the shipped floating-ui payload is counted and
// the Phase-8 deferral win becomes measurable; `lit` stays ignored (peer dep, never shipped).
//
// Modes:
//   node scripts/size-baseline.mjs --write     measure and (over)write api/size.baseline.json
//   node scripts/size-baseline.mjs --check      measure, diff vs the committed baseline, exit 0
//   node scripts/size-baseline.mjs --enforce    measure, diff, exit 1 on a brotli REGRESSION (GATE-01)
//   node scripts/size-baseline.mjs              defaults to --check
// First-generation / empty-baseline edge: when api/size.baseline.json is absent, every
// mode writes it and reports "new baseline" rather than erroring (MEAS-05 empty edge).

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
      // `derived` marks a RELATIVE, computed row (marginal = entry - core) as
      // opposed to an absolute payload size. Enforcement must ignore derived
      // rows: a pure core-bundle shrink inflates every marginal delta (marginal
      // rises by the amount core dropped), which would otherwise trip the gate
      // on a genuine improvement (CR-01). Absolute `entries` rows (prefix '')
      // are the only enforceable payload sizes.
      derived: prefix !== '',
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

// --- Enforcement (GATE-01) ----------------------------------------------------
// Per-row regression tolerance FLOOR in brotli bytes. The effective per-row
// margin is the larger of this floor and 0.5% of that row's baseline value
// (computed in enforceSizeExitCode). Rationale (Pitfall 1): a size-limit PATCH
// bump on the Node-22-pinned lane can nudge a byte count a hair; a small margin
// keeps a zero-code PR from red-building while any real regression (well beyond
// the margin) still trips. A Node-MAJOR bump requires an explicit `--write`
// baseline re-commit. Set to 0 at the call site for exact-match enforcement.
export const SIZE_TOLERANCE = 16;

// Effective per-row margin: max(floor, 0.5% of the row's baseline). A row with
// no baseline (added entry, base null) contributes only the floor — but such a
// row also has delta null and is never a regression on its own delta anyway.
const perRowMargin = (row, floor) =>
  Math.max(floor, row.base != null ? Math.round(0.005 * row.base) : 0);

// Enforcing exit-code decision (GATE-01), mirroring cem-diff.mjs
// `releaseGateExitCode`: a PURE function of a `diff()`-shaped result so the
// exit decision is unit-testable without spawning a process. Regression-CEILING
// semantics (RESEARCH Pattern 2): return 1 when ANY row has a real positive
// delta beyond its per-row margin (a size regression), else 0. A shrink
// (negative delta), an unchanged row (zero delta), and an added/removed row
// (delta null — no baseline to compare) all pass. Never fails OPEN.
export const enforceSizeExitCode = (result, { tolerance = SIZE_TOLERANCE } = {}) => {
  // Enforce ONLY over absolute `entries` rows; derived `marginal` rows are
  // report-only (CR-01). A core-bundle shrink is a real payload win but raises
  // every marginal-over-core delta by the amount core dropped, so gating on
  // marginal rows fails the build on an improvement. A genuine core GROWTH is
  // still caught by the absolute `core bundle` entry row, so excluding marginal
  // rows loses no protection — it only removes false positives on the shrink
  // side (mirrors wall-clock being structurally excluded in perf-diff).
  const rows = (result?.rows ?? []).filter((r) => !r.derived);
  const regressed = rows.some((r) => r.delta != null && r.delta > perRowMargin(r, tolerance));
  return regressed ? 1 : 0;
};

// The offending rows for stderr reporting: positive-delta rows beyond margin.
// Excludes derived (marginal) rows so the reported offenders match the rows the
// gate actually enforces on (CR-01).
const regressingRows = (result, tolerance) =>
  (result?.rows ?? []).filter(
    (r) => !r.derived && r.delta != null && r.delta > perRowMargin(r, tolerance),
  );

// Render a structured diff as a human-readable summary. The footer is mode-aware
// (WR-03): under `--enforce` the "drift never fails the build" line is misleading
// (the script is about to exit 1 and fail the job), so it is inverted to state
// the enforcing behavior.
export const formatReport = (result, { enforce = false } = {}) => {
  const lines = [];
  lines.push(
    enforce
      ? 'Bundle-size baseline diff (brotli, ENFORCING GATE-01 — MEAS-01/MEAS-04)'
      : 'Bundle-size baseline diff (brotli, report-only — MEAS-01/MEAS-04)',
  );
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
  lines.push(
    enforce
      ? 'ENFORCING (GATE-01): an absolute per-entry brotli regression beyond tolerance fails the build.'
      : 'Report-only this phase (D-08): drift never fails the build.',
  );
  return lines.join('\n');
};

const writeBaseline = (data) => writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + '\n');

const USAGE = 'usage: node scripts/size-baseline.mjs [--write|--check|--enforce]';

// CLI entry. `--write` / `--check` stay report-only (exit 0 even on drift);
// `--enforce` (GATE-01) exits 1 on a per-row brotli regression. Exit 2 is
// reserved for a usage error only (an unknown mode) — never a size regression.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const mode = process.argv[2] ?? '--check';
  if (mode !== '--write' && mode !== '--check' && mode !== '--enforce') {
    console.error(USAGE);
    process.exit(2); // usage error -> the only exit-2 path
  }

  const current = measure();

  if (mode === '--write') {
    writeBaseline(current);
    console.log(`Wrote size baseline (${UNIT}) -> ${BASELINE_PATH}`);
    for (const name of Object.keys(current.entries).sort())
      console.log(`  ${name}: ${current.entries[name]} B`);
    process.exit(0);
  }

  // First-generation / empty-baseline edge (MEAS-05).
  if (!existsSync(BASELINE_PATH)) {
    // --enforce READS the committed baseline only — it must NEVER write it
    // (WR-01). Writing here was both fail-open (deleting the baseline silently
    // greened the gate) and a contract violation ("--enforce never writes the
    // baseline", ci.yml). Mirror perf-diff's safer handling: report guidance
    // and exit 0 WITHOUT minting a file. The committed baseline is created
    // explicitly via `--write`, so an absent baseline is never auto-minted in
    // enforce mode.
    if (mode === '--enforce') {
      console.log(
        `New baseline — ${BASELINE_PATH} is absent. Run ` +
          `\`node scripts/size-baseline.mjs --write\` to commit the first-generation ` +
          `baseline (enforce never writes it).`,
      );
      process.exit(0);
    }
    // --check: report-only first-run edge keeps writing the initial baseline.
    writeBaseline(current);
    console.log(`New baseline — ${BASELINE_PATH} was absent, wrote first-generation baseline.`);
    process.exit(0);
  }

  const result = diff(load(BASELINE_PATH), current);
  console.log(formatReport(result, { enforce: mode === '--enforce' }));

  if (mode === '--enforce') {
    // ENFORCING (GATE-01): reads the committed baseline only, never writes it.
    const code = enforceSizeExitCode(result, { tolerance: SIZE_TOLERANCE });
    if (code !== 0) {
      console.error(
        `\nSize regression gate FAILED (GATE-01): a per-entry brotli size grew beyond the ` +
          `tolerance (max(${SIZE_TOLERANCE} B, 0.5% of baseline)). Offending rows:`,
      );
      for (const r of regressingRows(result, SIZE_TOLERANCE))
        console.error(`  ${r.name}: +${r.delta} B (${r.base} B -> ${r.current} B)`);
      console.error(
        `\nShrink or hold these entries, or re-commit the baseline with ` +
          `\`node scripts/size-baseline.mjs --write\` if the growth is intentional.`,
      );
    }
    process.exit(code); // 1 on regression, 0 on same-or-shrunk.
  }

  process.exit(0); // --check: REPORT-ONLY (D-08): 0 even on drift.
}

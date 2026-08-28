// Committed runtime-perf baseline diff (MEAS-02/MEAS-03/MEAS-05). Zero-dependency
// Node script, cloning the scripts/cem-diff.mjs / scripts/size-baseline.mjs shape:
// load() / normalize (keyed by a stable id, sorted) / diff / formatReport / isMain guard.
//
// Key inversion vs cem-diff (CONTEXT D-08): cem-diff is an ENFORCING release gate
// (non-zero exit on drift). This perf diff defaults to REPORT-ONLY — it prints the
// diff and exits 0 even when count drift exists. Phase 11 (GATE-02) adds an opt-in
// `--enforce` mode that exits 1 on COUNT drift only; wall-clock stays structurally
// report-only in every mode. Exit 2 is reserved for a usage error only.
//
// WHAT GATES vs WHAT IS REPORT-ONLY (D-06/D-07, Pitfall 15):
//   counts     — the deterministic, engine-independent GATED numbers (Lit update/updated/
//                render call counts, computePosition/reposition counts, DOM node counts).
//                These are byte-stable across repeats, so they are the drift-visible metric.
//   wallClock  — median + mean+3σ band. VOLATILE / machine-variable: printed for information
//                only, NEVER contributes to drift this phase or any phase (D-06: wall-clock
//                is never the gated metric). Raw `samples` and the throttle-liveness
//                unthrottled/throttled timings are volatile too and are never compared.
//
// NORMALIZATION (cem-diff Pitfall 3, mirrored): rows are keyed by a stable identifier —
// `scenario:metric` — never array position; every compared list is key-sorted so re-runs
// never spuriously differ (MEAS-05 ordering / MEAS-02 boundary edges). A zero-delta run
// (baseline counts == current counts) reports no drift and exits 0 (idempotent).
//
// Modes:
//   node scripts/perf-diff.mjs <baseline.json> <current.json> [--enforce]
//       diff the committed baseline vs a fresh per-run report. Without --enforce:
//       report-only exit 0. With --enforce (GATE-02): exit 1 on any COUNT drift
//       (scenario/metric add/remove or a count delta), exit 0 otherwise; wall-clock
//       never contributes. --enforce READS both files only, never writes the baseline.
//       When <baseline.json> is absent, print "new baseline" and exit 0 (empty edge,
//       MEAS-05) — the committed baseline is written explicitly via --write, so a run
//       never silently mints a baseline from an unpinned profile.
//   node scripts/perf-diff.mjs --write [current.json] [baseline.json]
//       reduce a fresh api/perf.json to the committed baseline shape (counts + wallClock
//       median + mean+3σ band + throttle profile) and (over)write it. Defaults:
//       current = api/perf.json, baseline = api/perf.baseline.json.
//
// SINGLE-WRITER (T-07-07): diff mode only READS both files; it never writes the committed
// baseline. The baseline changes only via an explicit `--write` regeneration, so parallel
// CI perf runs (each writing its own api/perf.json report) cannot corrupt the committed
// baseline.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const load = (p) => JSON.parse(readFileSync(p, 'utf8'));

const DEFAULT_CURRENT = 'api/perf.json';
const DEFAULT_BASELINE = 'api/perf.baseline.json';

// ---------------------------------------------------------------------------
// Normalize: reduce a full per-run report to the committed-baseline shape.
// Keeps the gated `counts` verbatim and the report-only wall-clock down to
// { median, band } (D-07 — the variance band Phase 11 sets thresholds outside);
// drops volatile `samples`, mean, sd, and the throttle-liveness timings.
// ---------------------------------------------------------------------------
export const reduceToBaseline = (report) => {
  const out = {};
  for (const scenario of Object.keys(report).sort()) {
    const s = report[scenario] ?? {};
    const wc = s.wallClock ?? {};
    out[scenario] = {
      counts: { ...(s.counts ?? {}) },
      wallClock: { median: wc.median ?? null, band: wc.band ?? null },
      throttle: { profile: s.throttle?.profile ?? null },
      repeats: s.repeats ?? null,
    };
  }
  return out;
};

// Diff two count maps ({ metric: number }) keyed by metric name, key-sorted.
const diffCounts = (baseCounts = {}, curCounts = {}) => {
  const metrics = [...new Set([...Object.keys(baseCounts), ...Object.keys(curCounts)])].sort();
  return metrics.map((metric) => {
    const base = baseCounts[metric];
    const cur = curCounts[metric];
    const status =
      base === undefined
        ? 'added'
        : cur === undefined
          ? 'removed'
          : base === cur
            ? 'same'
            : 'changed';
    return {
      metric,
      base: base ?? null,
      current: cur ?? null,
      delta: base != null && cur != null ? cur - base : null,
      status,
    };
  });
};

// Compare two reports (baseline vs current), keyed by scenario. Only COUNTS drive
// drift; wall-clock is carried separately for a report-only render. Returns:
//   {
//     addedScenarios: string[],    // scenarios only in current
//     removedScenarios: string[],  // scenarios only in baseline
//     changed: { [scenario]: countRow[] },   // scenarios with a real count delta
//     wallClock: { [scenario]: { base, current } },  // report-only, all shared scenarios
//     hasDrift: boolean            // count drift only (D-06: wall-clock never drifts)
//   }
export const diff = (baseline, current) => {
  const baseScenarios = new Set(Object.keys(baseline));
  const curScenarios = new Set(Object.keys(current));

  const addedScenarios = [...curScenarios].filter((s) => !baseScenarios.has(s)).sort();
  const removedScenarios = [...baseScenarios].filter((s) => !curScenarios.has(s)).sort();

  const changed = {};
  const wallClock = {};
  for (const scenario of [...baseScenarios].filter((s) => curScenarios.has(s)).sort()) {
    const rows = diffCounts(baseline[scenario]?.counts, current[scenario]?.counts);
    const drifted = rows.filter((r) => r.status !== 'same');
    if (drifted.length) changed[scenario] = drifted;
    // report-only wall-clock band comparison (never affects hasDrift)
    wallClock[scenario] = {
      base: baseline[scenario]?.wallClock ?? null,
      current: current[scenario]?.wallClock ?? null,
    };
  }

  const hasDrift =
    addedScenarios.length > 0 || removedScenarios.length > 0 || Object.keys(changed).length > 0;

  return { addedScenarios, removedScenarios, changed, wallClock, hasDrift };
};

// Enforcing exit-code decision (GATE-02), mirroring cem-diff.mjs releaseGateExitCode
// and size-baseline.mjs enforceSizeExitCode: a pure, unit-testable function with no
// process spawn. Returns 1 when the COUNT-only `result.hasDrift` is true, else 0.
// Because `hasDrift` is computed above from count deltas + scenario add/remove ONLY
// (never wall-clock, D-06), wall-clock is structurally incapable of reaching a
// non-zero exit — the volatile metric can never gate CI.
export const enforcePerfExitCode = (result) => (result?.hasDrift ? 1 : 0);

// Collect drifted "scenario:metric" names and whether any drifted row is a count
// REDUCTION (negative delta = an improvement that should be re-baselined). Used by
// the --enforce CLI to name offenders on stderr and prompt a --write re-baseline.
export const enforceDetail = (result) => {
  const offenders = [];
  let hasReduction = false;
  for (const s of result.addedScenarios) offenders.push(`+scenario ${s}`);
  for (const s of result.removedScenarios) offenders.push(`-scenario ${s}`);
  for (const [scenario, rows] of Object.entries(result.changed)) {
    for (const r of rows) {
      offenders.push(`${scenario}:${r.metric}`);
      if (r.delta != null && r.delta < 0) hasReduction = true;
    }
  }
  return { offenders, hasReduction };
};

const fmtMs = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}ms`);

// Render a structured diff as a human-readable, report-only summary.
export const formatReport = (result) => {
  const lines = [];
  lines.push('Runtime-perf baseline diff (counts gated, wall-clock report-only — MEAS-02/03)');
  lines.push('==============================================================================');

  if (!result.hasDrift) {
    lines.push('No count drift — committed baseline matches the current run (counts byte-stable).');
  } else {
    if (result.addedScenarios.length)
      lines.push(`+ Added scenarios: ${result.addedScenarios.join(', ')}`);
    if (result.removedScenarios.length)
      lines.push(`- Removed scenarios: ${result.removedScenarios.join(', ')}`);
    for (const [scenario, rows] of Object.entries(result.changed)) {
      lines.push(`~ ${scenario} (counts)`);
      for (const r of rows) {
        if (r.status === 'added') lines.push(`    + ${r.metric}: (new) ${r.current}`);
        else if (r.status === 'removed') lines.push(`    - ${r.metric}: (removed, was ${r.base})`);
        else {
          const sign = r.delta > 0 ? '+' : '';
          lines.push(`    ~ ${r.metric}: ${r.base} -> ${r.current} (${sign}${r.delta})`);
        }
      }
    }
  }

  // Report-only wall-clock section — informational, never gated (D-06).
  lines.push('');
  lines.push('Wall-clock (report-only — median | mean+3σ band; volatile, never gated):');
  for (const scenario of Object.keys(result.wallClock).sort()) {
    const { base, current } = result.wallClock[scenario];
    lines.push(
      `  ${scenario}: baseline ${fmtMs(base?.median)} (band ${fmtMs(base?.band)}) ` +
        `| current ${fmtMs(current?.median)} (band ${fmtMs(current?.band)})`,
    );
  }

  lines.push('');
  lines.push('Report-only this phase (D-08): count drift never fails the build; wall-clock never gates.');
  return lines.join('\n');
};

const writeBaseline = (path, data) =>
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');

const USAGE =
  'usage: node scripts/perf-diff.mjs <baseline.json> <current.json> [--enforce]\n' +
  '       node scripts/perf-diff.mjs --write [current.json] [baseline.json]';

// CLI entry. Report-only diff exits 0; `--enforce` exits 1 on COUNT drift (GATE-02);
// --write exits 0; exit 2 only on a usage error.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);

  if (args[0] === '--write') {
    const currentPath = args[1] ?? DEFAULT_CURRENT;
    const baselinePath = args[2] ?? DEFAULT_BASELINE;
    if (!existsSync(currentPath)) {
      console.error(`perf-diff --write: current report not found: ${currentPath}`);
      process.exit(2);
    }
    const baseline = reduceToBaseline(load(currentPath));
    writeBaseline(baselinePath, baseline);
    console.log(`Wrote perf baseline -> ${baselinePath}`);
    for (const scenario of Object.keys(baseline).sort()) {
      const counts = baseline[scenario].counts;
      const pretty = Object.keys(counts)
        .sort()
        .map((m) => `${m}=${counts[m]}`)
        .join(' ');
      console.log(`  ${scenario}: ${pretty}`);
    }
    process.exit(0);
  }

  // GATE-02: `--enforce` flips the diff from report-only to enforcing on COUNTS.
  // Filter the flag out of the positional pair before validating (the positional
  // guard rejects args starting with `--`). Enforce mode READS both files only —
  // it never writes the committed baseline (single-writer, T-07-07 above).
  const enforce = args.includes('--enforce');
  const [baselinePath, currentPath] = args.filter((a) => a !== '--enforce');
  if (!baselinePath || !currentPath || baselinePath.startsWith('--')) {
    console.error(USAGE);
    process.exit(2); // usage error -> the only non-zero exit
  }

  if (!existsSync(baselinePath)) {
    // First-generation / empty edge (MEAS-05): no committed baseline yet. Report
    // and exit 0 — the committed baseline is minted explicitly via --write. This
    // holds under --enforce too: an absent baseline is never minted here.
    console.log(
      `New baseline — ${baselinePath} is absent. Run \`node scripts/perf-diff.mjs --write ${currentPath} ${baselinePath}\` ` +
        `to commit the first-generation perf baseline.`,
    );
    process.exit(0);
  }

  // The current report (api/perf.json) is produced by the perf harness. If it
  // is absent, `load(currentPath)` would throw an uncaught ENOENT and crash
  // with a stack trace (WR-02). A missing current report is a setup/usage error
  // — not drift and not a pass — so exit 2 (the reserved usage-error code),
  // symmetric with the `--write` current-missing guard above. Exiting 0 here
  // would fail the gate OPEN under --enforce.
  if (!existsSync(currentPath)) {
    console.error(
      `perf-diff: current report not found: ${currentPath}. Run \`npm run test:perf\` first.`,
    );
    process.exit(2);
  }

  const result = diff(load(baselinePath), load(currentPath));
  console.log(formatReport(result));

  if (!enforce) {
    process.exit(0); // REPORT-ONLY (D-08): 0 even on count drift.
  }

  // ENFORCING (GATE-02): non-zero on COUNT drift; wall-clock structurally excluded.
  const code = enforcePerfExitCode(result);
  if (code !== 0) {
    const { offenders, hasReduction } = enforceDetail(result);
    console.error(
      `\nPerf count gate FAILED (GATE-02): runtime counts drifted from the committed ` +
        `baseline (${baselinePath}). Offending count(s): ${offenders.join(', ')}.`,
    );
    if (hasReduction) {
      console.error(
        `One or more counts DROPPED (an improvement). Re-baseline via ` +
          `\`node scripts/perf-diff.mjs --write ${currentPath} ${baselinePath}\` to bank the win.`,
      );
    }
  }
  process.exit(code); // wall-clock can never reach this path (count-only hasDrift).
}

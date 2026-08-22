// Bundle-attribution confirm-only check (MEAS-05, CONTEXT D-09). Zero-dependency
// Node script. Asserts highlight.js appears in ZERO shipped chunks — the boundary
// is "absent from ALL entries", not merely "mostly absent". highlight.js is a
// Storybook-only devDependency with zero `src/` imports, so this is a confirm-only
// check: it seeds the Phase-11 tampering guard (T-07-09) against a future refactor
// silently pulling highlight.js into a shipped chunk. It does NOT move any
// dependency (Pitfall 7 — do not chase a phantom).
//
// Two independent attribution sources are cross-checked:
//   A) The rollup-plugin-visualizer machine-readable report (`bundle-stats.json`,
//      raw-data template) emitted by `VISUALIZE=1 npm run build` — the build-graph
//      truth: every module that landed in a shipped chunk, keyed by chunk.
//   B) A direct grep of every emitted `dist/**/*.js` chunk — the on-disk truth.
// Either source flagging highlight.js is a leak. When the report is absent (the
// check was run without a VISUALIZE build) source B alone still gives the shipped
// truth.
//
// Report-only exit (D-08): this phase the check reports and exits 0 even on a
// (hypothetical) leak — the enforcing flip is Phase 11. It exits non-zero (2) only
// on a usage error. Mirrors the isMain / report-only shape of `scripts/cem-diff.mjs`.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const TARGET = 'highlight.js';

// The identifiers a bundled copy of highlight.js would leave in a chunk: the
// package path, its `hljs` global namespace, and two stable public-API symbols.
const LEAK_MARKERS = [
  /highlight\.js/i,
  /\bhljs\b/,
  /registerLanguage/,
  /highlightAll/,
];

// Recursively collect every emitted `*.js` chunk under `dir` (skips source maps).
function collectChunks(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectChunks(full));
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

// Source A: scan the visualizer raw-data report's module graph. Returns
// { available, moduleCount, chunkNames, leaks: [moduleId...] } — leaks are module
// ids whose path references highlight.js.
export function scanVisualizerReport(reportPath) {
  if (!existsSync(reportPath)) {
    return { available: false, moduleCount: 0, chunkNames: [], leaks: [] };
  }
  const data = JSON.parse(readFileSync(reportPath, 'utf8'));
  const metas = data.nodeMetas ?? {};
  const ids = Object.keys(metas).map((uid) => metas[uid].id).filter(Boolean);
  // Shipped chunk names = the file names every module was assigned to.
  const chunkSet = new Set();
  for (const uid of Object.keys(metas)) {
    for (const chunk of Object.keys(metas[uid].moduleParts ?? {})) chunkSet.add(chunk);
  }
  const leaks = ids.filter((id) => /(^|[\\/])highlight\.js([\\/]|$)/i.test(id) || /highlight\.js/i.test(id));
  return {
    available: true,
    moduleCount: ids.length,
    chunkNames: [...chunkSet].sort(),
    leaks,
  };
}

// Source B: grep every emitted dist chunk for a bundled-highlight.js signature.
// Returns { chunkCount, scanned: [relPath...], leaks: [{ file, markers }...] }.
export function scanDistChunks(distDir) {
  const files = collectChunks(distDir);
  const scanned = [];
  const leaks = [];
  for (const file of files) {
    const rel = file.slice(distDir.length + 1).replace(/\\/g, '/');
    scanned.push(rel);
    const content = readFileSync(file, 'utf8');
    const markers = LEAK_MARKERS.filter((re) => re.test(content)).map((re) => re.source);
    if (markers.length) leaks.push({ file: rel, markers });
  }
  return { chunkCount: files.length, scanned, leaks };
}

// Render the confirm-only report. Always names highlight.js explicitly. Emits the
// exact phrase "found highlight.js in a shipped chunk" ONLY on a real leak.
export function formatReport({ report, dist, distDir }) {
  const lines = [];
  lines.push('Bundle-attribution check (MEAS-05, confirm-only) — target: highlight.js');
  lines.push('======================================================================');

  if (report.available) {
    lines.push(
      `visualizer report: ${report.moduleCount} modules across ${report.chunkNames.length} shipped chunks`,
    );
  } else {
    lines.push('visualizer report: bundle-stats.json not found — run `VISUALIZE=1 npm run build` to');
    lines.push('  generate it; falling back to the dist chunk grep (the on-disk shipped truth).');
  }
  lines.push(`dist chunks scanned: ${dist.chunkCount} file(s) under ${distDir}`);

  const leaked = report.leaks.length > 0 || dist.leaks.length > 0;
  if (!leaked) {
    lines.push('');
    lines.push(`RESULT: highlight.js is absent from ALL ${dist.chunkCount} shipped chunks` +
      (report.available ? ` and from all ${report.moduleCount} modules in the build graph.` : '.'));
    lines.push('highlight.js ships in zero chunks — MEAS-05 confirmed (confirm-only, no dependency move).');
    return { text: lines.join('\n'), leaked };
  }

  // Leak branch (report-only this phase; seeds the Phase-11 enforcing guard).
  lines.push('');
  if (report.leaks.length) {
    lines.push(`found highlight.js in a shipped chunk (build graph): ${report.leaks.join(', ')}`);
  }
  for (const l of dist.leaks) {
    lines.push(`found highlight.js in a shipped chunk: ${l.file} (markers: ${l.markers.join(', ')})`);
  }
  lines.push('');
  lines.push('RESULT: highlight.js LEAKED into a shipped chunk — this violates MEAS-05.');
  lines.push('(Reported only this phase per D-08; flips to an enforcing gate in Phase 11.)');
  return { text: lines.join('\n'), leaked };
}

// Programmatic entry: run the check against a repo root. Returns the render result.
export function runAttributionCheck(root) {
  const distDir = resolve(root, 'dist');
  const reportPath = resolve(root, 'bundle-stats.json');
  const report = scanVisualizerReport(reportPath);
  const dist = scanDistChunks(distDir);
  return formatReport({ report, dist, distDir });
}

// CLI entry: `node scripts/attribution-check.mjs`. Report-only (D-08): exits 0 even
// on a leak this phase; exits 2 only on a usage error (missing dist).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const distDir = resolve(root, 'dist');
  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    console.error('usage error: dist/ not found — run `npm run build` (or `VISUALIZE=1 npm run build`) first.');
    process.exit(2); // usage error -> fail non-zero
  }
  const { text } = runAttributionCheck(root);
  console.log(text);
  process.exit(0); // report-only this phase (D-08)
}

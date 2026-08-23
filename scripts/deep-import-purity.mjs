// Deep-import purity assertion (SIZE-04, CONTEXT D-06 outcome). Zero-dependency
// Node script. The phase's verification capstone: once every Wave-2 overlay has
// dropped its static @floating-ui/dom import, this guard proves the deferral is
// airtight — @floating-ui/dom must NEVER appear as a STATIC import specifier
// anywhere in the emitted dist/, and must appear ONLY behind a dynamic import()
// (the single shared lazy-load chunk). That is exactly the leak class the carried
// 08-03/08-07 finding caught: an inline `import { type Placement } from
// '@floating-ui/dom'` is NOT erased under verbatimModuleSyntax and emits a bare
// runtime `import"@floating-ui/dom"` — a STATIC specifier this guard flags.
//
// Two signals, both computed off the SHARED import parser in
// assert-no-bundled-lit.mjs (no re-implemented parser — collectDistJs /
// stripCommentNoise / collectImportSpecifiers are reused verbatim):
//   1. STATIC purity — for every dist/**/*.js, floating-ui appearing as a `from`
//      or bare side-effect `import '...'` specifier is an offender. The strong
//      global assertion (zero static floating-ui anywhere) implies the plan's
//      per-entry requirement (non-overlay entries like button/input carry zero
//      floating-ui in their static graph), which is additionally reported by
//      walking each dist/components/*/index.js entry's relative static graph.
//   2. DYNAMIC presence — floating-ui MUST still appear as a dynamic import('...')
//      specifier somewhere (the loader chunk); its total absence would mean the
//      dep was dropped, not deferred.
//
// STATIC vs DYNAMIC split: collectImportSpecifiers returns the union of all
// specifiers (static + dynamic). We additionally collect the dynamic-only subset
// with a single focused regex and subtract it occurrence-by-occurrence, so the
// shared parser stays the source of truth and only the dynamic detector is added.
//
// REPORT-ONLY THIS PHASE (D-08): prints offenders but exits 0 unconditionally
// (usage error exits 2). The enforcing flip — exit non-zero on a detected static
// leak — lands in Phase 11, mirroring assert-no-bundled-lit.mjs.
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import {
  collectDistJs,
  stripCommentNoise,
  collectImportSpecifiers,
} from './assert-no-bundled-lit.mjs';

// @floating-ui/dom and every @floating-ui/* subpath (core, utils, dom).
export const FLOATING_UI_SPECIFIER = /^@floating-ui(\/|$)/;

// Representative NON-overlay component entries (from .size-limit.json). These
// never use floating-ui, so their static graphs must be trivially floating-free;
// naming them makes the "non-overlay purity" claim explicit in the report.
export const NON_OVERLAY_ENTRIES = ['button', 'input'];

/** Dynamic-only specifiers: `import('...')`. One focused regex, no full parser. */
export function collectDynamicSpecifiers(code) {
  const specifiers = [];
  const pattern = /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
  let match;
  while ((match = pattern.exec(code)) !== null) specifiers.push(match[2]);
  return specifiers;
}

/**
 * Split a chunk's floating-ui usage into STATIC vs DYNAMIC specifiers. Uses the
 * shared collectImportSpecifiers (union of all import/re-export/dynamic sources)
 * as the source of truth, then subtracts the dynamic subset occurrence-by-
 * occurrence so what remains is the static (`from` / bare side-effect) usage.
 * Comment noise is stripped first so an incidental mention cannot self-flag.
 */
export function classifyFloatingUsage(rawCode) {
  const code = stripCommentNoise(rawCode);
  const all = collectImportSpecifiers(code);
  const dynamic = collectDynamicSpecifiers(code);

  // Remove each dynamic occurrence once from the union to leave the static set.
  const staticAll = [...all];
  for (const spec of dynamic) {
    const idx = staticAll.indexOf(spec);
    if (idx !== -1) staticAll.splice(idx, 1);
  }

  return {
    staticSpecifiers: staticAll.filter((s) => FLOATING_UI_SPECIFIER.test(s)),
    dynamicSpecifiers: dynamic.filter((s) => FLOATING_UI_SPECIFIER.test(s)),
  };
}

/** Relative static import specifiers from one file (for static-graph walking). */
function relativeStaticImports(rawCode) {
  const code = stripCommentNoise(rawCode);
  const dynamic = new Set(collectDynamicSpecifiers(code));
  return collectImportSpecifiers(code).filter(
    (s) => /^\.{1,2}\//.test(s) && !dynamic.has(s),
  );
}

/** Resolve a relative specifier from `fromFile` to an on-disk dist path. */
function resolveRelative(fromFile, specifier) {
  const resolved = resolve(dirname(fromFile), specifier);
  if (existsSync(resolved) && statSync(resolved).isFile()) return resolved;
  // Tolerate a missing `.js` extension (bundlers usually emit it explicitly).
  const withJs = `${resolved}.js`;
  if (existsSync(withJs)) return withJs;
  return null;
}

/**
 * Walk the STATIC import graph reachable from an entry file (following only
 * relative static imports — bare specifiers are external and never re-enter dist).
 * Returns the set of reachable dist file paths, including the entry itself.
 */
export function staticGraphFrom(entryFile) {
  const seen = new Set();
  const queue = [entryFile];
  while (queue.length) {
    const file = queue.pop();
    if (!file || seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const code = readFileSync(file, 'utf8');
    for (const spec of relativeStaticImports(code)) {
      const next = resolveRelative(file, spec);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  return seen;
}

/**
 * Scan a built dist directory. Returns:
 *   fileCount              — number of dist/**\/*.js scanned
 *   staticFloatingOffenders — `${file} :: ${specifier}` for each STATIC floating-ui import
 *   dynamicFloatingFiles    — files that contain a DYNAMIC floating-ui import()
 *   nonOverlayReport        — per named non-overlay entry: { entry, present, offenders }
 *   clean                   — no static offenders AND at least one dynamic presence
 */
export function runPurityCheck(distDir = 'dist') {
  const files = collectDistJs(distDir);
  const staticFloatingOffenders = [];
  const dynamicFloatingFiles = [];
  const staticOffenderFiles = new Set();

  for (const file of files) {
    const { staticSpecifiers, dynamicSpecifiers } = classifyFloatingUsage(
      readFileSync(file, 'utf8'),
    );
    for (const spec of staticSpecifiers) {
      staticFloatingOffenders.push(`${file} :: ${spec}`);
      staticOffenderFiles.add(file);
    }
    if (dynamicSpecifiers.length > 0) dynamicFloatingFiles.push(file);
  }

  // Per named non-overlay entry: confirm its static graph reaches no offender.
  const nonOverlayReport = [];
  for (const name of NON_OVERLAY_ENTRIES) {
    const entry = join(distDir, 'components', name, 'index.js');
    if (!existsSync(entry)) {
      nonOverlayReport.push({ entry: name, present: false, offenders: [] });
      continue;
    }
    const graph = staticGraphFrom(entry);
    const offenders = [...graph].filter((f) => staticOffenderFiles.has(f));
    nonOverlayReport.push({ entry: name, present: true, offenders });
  }

  const clean = staticFloatingOffenders.length === 0 && dynamicFloatingFiles.length > 0;
  return {
    distDir,
    fileCount: files.length,
    staticFloatingOffenders,
    dynamicFloatingFiles,
    nonOverlayReport,
    clean,
  };
}

export function formatReport(result) {
  const lines = [];
  lines.push('Deep-import purity assertion (SIZE-04, report-only — D-08)');
  lines.push('=========================================================');

  if (result.fileCount === 0) {
    lines.push(`No dist/**/*.js found under "${result.distDir}". Run \`npm run build\` first.`);
    return lines.join('\n');
  }

  lines.push(`Scanned ${result.fileCount} dist/**/*.js file(s).`);
  lines.push(
    `Dynamic floating-ui import() presence: ${result.dynamicFloatingFiles.length} file(s) ` +
      `(floating-ui is deferred, not dropped).`,
  );

  if (result.staticFloatingOffenders.length === 0) {
    lines.push('OK: zero STATIC @floating-ui/dom specifiers anywhere — floating-ui is dynamic-only.');
  } else {
    lines.push(
      `FOUND ${result.staticFloatingOffenders.length} STATIC @floating-ui/dom specifier(s) ` +
        `(floating-ui leaked into the static graph):`,
    );
    for (const hit of result.staticFloatingOffenders) lines.push(`  - ${hit}`);
  }

  // Non-overlay entry purity (button/input carry zero floating-ui).
  for (const row of result.nonOverlayReport) {
    if (!row.present) {
      lines.push(`  (non-overlay entry "${row.entry}" not built — skipped)`);
    } else if (row.offenders.length === 0) {
      lines.push(`  non-overlay entry "${row.entry}": static graph is floating-ui-free.`);
    } else {
      lines.push(`  non-overlay entry "${row.entry}": LEAK via ${row.offenders.join(', ')}`);
    }
  }

  if (result.dynamicFloatingFiles.length === 0) {
    lines.push('WARNING: no dynamic floating-ui import() found — was the dep dropped instead of deferred?');
  }

  if (!result.clean) {
    lines.push('');
    lines.push('REPORT-ONLY this phase (D-08): the enforcing flip lands in Phase 11.');
  }

  return lines.join('\n');
}

// CLI entry: `node scripts/deep-import-purity.mjs [distDir]`. Report-only (D-08).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [, , distArg, ...rest] = process.argv;
  if (rest.length > 0) {
    console.error('usage: node scripts/deep-import-purity.mjs [distDir]');
    process.exit(2); // usage error -> fail non-zero
  }
  const result = runPurityCheck(distArg || 'dist');
  console.log(formatReport(result));
  process.exit(0); // REPORT-ONLY (D-08): always 0 this phase; enforcing flip is Phase 11.
}

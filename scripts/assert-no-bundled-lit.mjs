// No-bundled-Lit dist guard (MEAS-04, CONTEXT D-03). Zero-dependency Node
// script. The size-limit-INDEPENDENT half of MEAS-04: size-limit `ignore`s
// `lit`, so it would happily pass a build that accidentally inlined a full copy
// of Lit (RESEARCH Pitfall 4/5). This guard proves Lit is never inlined by
// grepping every emitted `dist/**/*.js` for Lit's global version-marker
// identifiers and by asserting Lit is only ever referenced as a bare external
// module specifier — never a relative/bundled path.
//
// Two signals:
//   1. Inlined-marker grep — Lit's three sub-packages each register a global
//      version array on import:
//        (globalThis.reactiveElementVersions ??= []).push("<v>")   // @lit/reactive-element
//        (globalThis.litHtmlVersions        ??= []).push("<v>")   // lit-html
//        (globalThis.litElementVersions     ??= []).push("<v>")   // lit-element
//      Those identifiers appear VERBATIM only when a copy of Lit source is
//      inlined into a chunk. Absent from an externalized (bare `from"lit"`)
//      build. Validated against the real installed Lit source by the Plan 00 A3
//      spike (test/perf/_spike.lit-markers.test.ts, exported as
//      LIT_INLINE_MARKERS).
//   2. Bare-specifier check — every dist import whose specifier is a Lit package
//      must be a bare module specifier (`lit`, `lit/...`, `@lit/...`,
//      `@lit-labs/...`), never a relative path (`./`, `../`). A relative
//      "lit"-named import would mean Lit was relocated/inlined rather than
//      externalized.
//
// Grep hygiene (T-07-04): sourcemap comments and block comments are stripped
// before scanning, and marker matching uses exact JS-identifier boundaries, so
// an incidental textual mention in a comment or banner cannot self-invalidate
// the count in either direction.
//
// REPORT-ONLY THIS PHASE (D-08): the script prints any offenders but exits 0
// unconditionally (usage error exits 2). The enforcing flip — exit non-zero on a
// detected inlined copy — lands in Phase 11.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// CONFIRMED inlined-Lit version-marker set (Plan 00 A3 spike / LIT_INLINE_MARKERS).
// If Lit ever renames a global, re-run test/perf/_spike.lit-markers.test.ts and
// update both that constant and this list.
export const LIT_INLINE_MARKERS = [
  'reactiveElementVersions',
  'litHtmlVersions',
  'litElementVersions',
];

// Bare Lit package specifiers are allowed (externalized). Anything else that
// looks like Lit but resolves via a relative path is an offender.
const LIT_BARE_SPECIFIER = /^(lit|@lit|@lit-labs)(\/|$)/;

/** Recursively collect every emitted `*.js` under a dist directory. */
export function collectDistJs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name));
}

/**
 * Strip sourcemap comments and block comments so an incidental textual mention
 * of a marker (e.g. a license banner) cannot produce a false positive. Line
 * comments are NOT stripped: minified dist files are frequently a single line,
 * and `https://` inside a string would otherwise nuke the whole file.
 */
export function stripCommentNoise(code) {
  return code
    .replace(/\/\/[#@]\s*sourceMappingURL=.*$/gm, '') // sourcemap pragma
    .replace(/\/\*[\s\S]*?\*\//g, ''); // block comments / license banners
}

/** Exact JS-identifier match (identifier chars are [A-Za-z0-9_$]). */
function containsIdentifier(code, identifier) {
  const boundary = new RegExp(`(?<![\\w$])${identifier}(?![\\w$])`);
  return boundary.test(code);
}

/** Collect module specifiers from static/dynamic import + re-export sources. */
export function collectImportSpecifiers(code) {
  const specifiers = [];
  const patterns = [
    /\bfrom\s*(['"])([^'"]+)\1/g, // import ... from '...' / export ... from '...'
    /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g, // dynamic import('...')
    /\bimport\s*(['"])([^'"]+)\1/g, // bare side-effect import '...'
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) specifiers.push(match[2]);
  }
  return specifiers;
}

/**
 * Scan a set of dist files. Returns { markerHits, relativeLitImports, litBareImportCount }.
 * - markerHits: `${file} :: ${marker}` for each inlined-Lit marker found.
 * - relativeLitImports: `${file} :: ${specifier}` for any Lit-looking import via a relative path.
 * - litBareImportCount: number of bare Lit specifiers seen (informational — confirms externalization).
 */
export function scanFiles(files) {
  const markerHits = [];
  const relativeLitImports = [];
  let litBareImportCount = 0;

  for (const file of files) {
    const cleaned = stripCommentNoise(readFileSync(file, 'utf8'));

    for (const marker of LIT_INLINE_MARKERS) {
      if (containsIdentifier(cleaned, marker)) markerHits.push(`${file} :: ${marker}`);
    }

    for (const specifier of collectImportSpecifiers(cleaned)) {
      if (LIT_BARE_SPECIFIER.test(specifier)) {
        litBareImportCount += 1;
      } else if (/(^|\/)lit(\/|$)/i.test(specifier) && /^\.{1,2}\//.test(specifier)) {
        // Relative path whose final segment is a `lit` module — a relocated/inlined copy.
        relativeLitImports.push(`${file} :: ${specifier}`);
      }
    }
  }

  return { markerHits, relativeLitImports, litBareImportCount };
}

export function runGuard(distDir = 'dist') {
  const files = collectDistJs(distDir);
  return { distDir, fileCount: files.length, ...scanFiles(files) };
}

export function formatReport(result) {
  const lines = [];
  lines.push('No-bundled-Lit dist guard (MEAS-04, report-only — D-08)');
  lines.push('=======================================================');

  if (result.fileCount === 0) {
    lines.push(`No dist/**/*.js found under "${result.distDir}". Run \`npm run build\` first.`);
    return lines.join('\n');
  }

  lines.push(`Scanned ${result.fileCount} dist/**/*.js file(s).`);
  lines.push(`Bare Lit external imports observed: ${result.litBareImportCount} (Lit stays external).`);

  if (result.markerHits.length === 0) {
    lines.push('OK: zero inlined-Lit version markers found — Lit is not bundled.');
  } else {
    lines.push(`FOUND ${result.markerHits.length} inlined-Lit marker(s) (Lit source appears bundled):`);
    for (const hit of result.markerHits) lines.push(`  - ${hit}`);
  }

  if (result.relativeLitImports.length > 0) {
    lines.push(`FOUND ${result.relativeLitImports.length} relative Lit import(s) (should be bare specifiers):`);
    for (const hit of result.relativeLitImports) lines.push(`  - ${hit}`);
  }

  if (result.markerHits.length > 0 || result.relativeLitImports.length > 0) {
    lines.push('');
    lines.push('REPORT-ONLY this phase (D-08): the enforcing flip lands in Phase 11.');
  }

  return lines.join('\n');
}

// CLI entry: `node scripts/assert-no-bundled-lit.mjs [distDir]`. Report-only (D-08).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const [, , distArg, ...rest] = process.argv;
  if (rest.length > 0) {
    console.error('usage: node scripts/assert-no-bundled-lit.mjs [distDir]');
    process.exit(2); // usage error -> fail non-zero
  }
  const result = runGuard(distArg || 'dist');
  console.log(formatReport(result));
  process.exit(0); // REPORT-ONLY (D-08): always 0 this phase; enforcing flip is Phase 11.
}

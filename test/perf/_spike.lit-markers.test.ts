import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * A3 SPIKE — validate the inlined-Lit version-marker strings (RESEARCH Pitfall 4,
 * assumption A3) BEFORE Plan 02's `assert-no-bundled-lit.mjs` greps `dist/` for
 * them.
 *
 * Lit's three sub-packages each register a global version array on import:
 *   (globalThis.reactiveElementVersions ??= []).push("<v>")   // @lit/reactive-element
 *   (globalThis.litHtmlVersions        ??= []).push("<v>")   // lit-html
 *   (globalThis.litElementVersions     ??= []).push("<v>")   // lit-element
 * Those three identifiers therefore appear VERBATIM in any build that inlines a
 * copy of Lit, and are ABSENT from a build that externalizes Lit (bare `from"lit"`
 * specifier). This spike confirms they are reliable positive markers of an
 * inlined copy, using the REAL installed Lit source as the deliberately-bundled
 * fixture — so Plan 02 can grep `dist/**` for them with confidence.
 *
 * This is a pure string/bundling check (no throttling, no layout), so it runs on
 * the jsdom lane — but stays mock-free: it reads files, it does not use any
 * setup.ts mock symbol.
 */

// CONFIRMED marker set (validated below) — Plan 02's no-bundled-Lit guard consumes
// exactly these three identifiers. If Lit ever renames a global, re-run this spike
// and update BOTH this constant and Plan 02's grep list.
export const LIT_INLINE_MARKERS = [
  'reactiveElementVersions',
  'litHtmlVersions',
  'litElementVersions',
] as const;

// Each marker's source file in the REAL installed (production) Lit build. Reading
// these gives a genuine "deliberately-bundled Lit" blob without a custom bundler.
const MARKER_SOURCE: Record<(typeof LIT_INLINE_MARKERS)[number], string> = {
  reactiveElementVersions: 'node_modules/@lit/reactive-element/reactive-element.js',
  litHtmlVersions: 'node_modules/lit-html/lit-html.js',
  litElementVersions: 'node_modules/lit-element/lit-element.js',
};

/** A representative EXTERNALIZED dist module: imports Lit as a bare specifier, inlines nothing. */
const EXTERNALIZED_FIXTURE = [
  'import { LitElement, html, css } from "lit";',
  'import { customElement, property } from "lit/decorators.js";',
  'export class AmThing extends LitElement {',
  '  render() { return html`<span>${this.label}</span>`; }',
  '}',
  'customElements.define("am-thing", AmThing);',
].join('\n');

/** Recursively collect every emitted `*.js` under a dist directory. */
function collectJs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => join(entry.parentPath, entry.name));
}

describe('A3: Lit inlined-version-marker strings', () => {
  it('each confirmed marker appears verbatim in a deliberately-bundled Lit source blob', () => {
    for (const marker of LIT_INLINE_MARKERS) {
      const sourcePath = MARKER_SOURCE[marker];
      expect(existsSync(sourcePath), `missing Lit source fixture: ${sourcePath}`).toBe(true);
      const bundled = readFileSync(sourcePath, 'utf8');
      expect(bundled.includes(marker), `marker "${marker}" not found in ${sourcePath}`).toBe(true);
    }
  });

  it('the confirmed markers are ABSENT from an externalized (bare-specifier) module', () => {
    // Externalized output references `"lit"` as a bare import and inlines no Lit
    // source, so none of the three version-marker globals appear.
    expect(EXTERNALIZED_FIXTURE.includes('from "lit"')).toBe(true);
    for (const marker of LIT_INLINE_MARKERS) {
      expect(EXTERNALIZED_FIXTURE.includes(marker)).toBe(false);
    }
  });

  it('the real externalized dist output contains zero markers (when dist is built)', () => {
    // The actual guard Plan 02 runs. In a fresh worktree `dist/` is not built yet;
    // the fixture-based proofs above already validate the markers, so document the
    // dependency rather than forcing an expensive build in this spike.
    if (!existsSync('dist')) {
      console.info(
        '[A3 spike] dist/ not built — skipping real-dist grep. Plan 02 runs this ' +
          'after `npm run build`; the bundled/externalized fixtures above already ' +
          'confirm the marker set.',
      );
      return;
    }

    const emitted = collectJs('dist');
    expect(emitted.length, 'no dist/**/*.js found to scan').toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of emitted) {
      const contents = readFileSync(file, 'utf8');
      for (const marker of LIT_INLINE_MARKERS) {
        if (contents.includes(marker)) offenders.push(`${file} :: ${marker}`);
      }
    }
    expect(offenders, `inlined Lit markers found in dist: ${offenders.join(', ')}`).toEqual([]);
  });
});

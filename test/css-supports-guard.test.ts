import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * COMPAT-06 CSS-feature audit — source-level guard-shape assertion.
 *
 * Every in-repo `:has()` usage is the identical empty-slot-collapse pattern
 * `.X:not(:has(::slotted(*))) { display: none; }`. Un-guarded, an engine that
 * does not support `:has()` DROPS the selector (not throws) and the component
 * renders in a subtly wrong state. D-05 (CONTEXT.md) mandates guarding EVERY
 * usage: a functional default OUTSIDE `@supports selector(:has(*))` and the
 * modern collapse rule INSIDE it.
 *
 * This spec asserts the guard SHAPE directly against each component's source
 * (no browser needed — it is a static text assertion, runs in the jsdom lane).
 * The behavioral proof (above-floor rendering unchanged on real Chromium) lives
 * in test/browser/supports-guards.test.ts.
 *
 * The `GUARDED_FILES` array is the single source of truth for the audit surface;
 * Tasks 2/3 append entries mechanically as more files are guarded.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

interface GuardedFile {
  /** Path relative to repo root. */
  path: string;
  /** Selectors whose `:not(:has(::slotted(*)))` rule must be guarded. */
  selectors: string[];
}

const GUARDED_FILES: GuardedFile[] = [
  { path: 'src/components/card/card.ts', selectors: ['.header', '.footer'] },
  { path: 'src/components/panel/panel.ts', selectors: ['.header'] },
  { path: 'src/components/dialog/dialog.ts', selectors: ['.footer'] },
  {
    path: 'src/components/app-shell/app-shell.ts',
    selectors: ['.header', '.sidebar', '.footer'],
  },
  { path: 'src/components/drawer/drawer.ts', selectors: ['.footer'] },
  { path: 'src/components/side-nav/side-nav.ts', selectors: ['.header', '.footer'] },
];

const SUPPORTS_CONDITION = '@supports selector(:has(*))';

/** Escape a CSS class selector for use inside a RegExp. */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract the [start, end) character ranges of every top-level
 * `@supports selector(:has(*)) { ... }` block by brace matching. Ranges cover
 * the block body so we can test whether a rule's index falls inside a guard.
 */
function supportsRanges(source: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let searchFrom = 0;

  for (;;) {
    const conditionIndex = source.indexOf(SUPPORTS_CONDITION, searchFrom);
    if (conditionIndex === -1) break;

    const openBrace = source.indexOf('{', conditionIndex);
    if (openBrace === -1) break;

    let depth = 0;
    let end = -1;
    for (let i = openBrace; i < source.length; i += 1) {
      const char = source[i];
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break;

    ranges.push([conditionIndex, end]);
    searchFrom = end + 1;
  }

  return ranges;
}

function isInsideAnyRange(index: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([start, end]) => index >= start && index <= end);
}

describe('COMPAT-06 @supports selector(:has(*)) guards', () => {
  for (const { path, selectors } of GUARDED_FILES) {
    describe(path, () => {
      const source = readFileSync(resolve(repoRoot, path), 'utf8');
      const ranges = supportsRanges(source);

      it('declares the @supports selector(:has(*)) guard', () => {
        expect(source).toContain(SUPPORTS_CONDITION);
        expect(ranges.length).toBeGreaterThan(0);
      });

      it('never uses the empty selector(:has()) gotcha form', () => {
        // Safari reports selector(:has()) as false even where it supports :has()
        // — the guard must always use the non-empty :has(*) argument (Q5 gotcha).
        expect(source).not.toContain('selector(:has())');
      });

      for (const selector of selectors) {
        describe(`${selector}`, () => {
          const collapseRule = `${selector}:not(:has(::slotted(*)))`;

          it(`nests ${collapseRule} INSIDE the @supports guard`, () => {
            let searchFrom = 0;
            let occurrences = 0;
            for (;;) {
              const index = source.indexOf(collapseRule, searchFrom);
              if (index === -1) break;
              occurrences += 1;
              expect(
                isInsideAnyRange(index, ranges),
                `${collapseRule} at index ${index} must be inside an @supports block`,
              ).toBe(true);
              searchFrom = index + collapseRule.length;
            }
            expect(occurrences).toBeGreaterThan(0);
          });

          it(`keeps a functional-default ${selector} rule OUTSIDE the guard`, () => {
            // Match the bare selector rule opener (e.g. `.header {`) but never the
            // `:not(:has(...))` collapse rule nor a compound like `.header + .body`.
            const ruleOpener = new RegExp(`${escapeForRegExp(selector)}\\s*\\{`, 'g');
            let match: RegExpExecArray | null;
            let foundFunctionalDefault = false;

            while ((match = ruleOpener.exec(source)) !== null) {
              const openIndex = match.index + match[0].length - 1;
              if (isInsideAnyRange(match.index, ranges)) continue;

              // Read the rule body to its matching close brace.
              let depth = 0;
              let end = -1;
              for (let i = openIndex; i < source.length; i += 1) {
                if (source[i] === '{') depth += 1;
                else if (source[i] === '}') {
                  depth -= 1;
                  if (depth === 0) {
                    end = i;
                    break;
                  }
                }
              }
              const body = source.slice(openIndex + 1, end === -1 ? undefined : end);
              if (/display\s*:/.test(body)) {
                foundFunctionalDefault = true;
                break;
              }
            }

            expect(
              foundFunctionalDefault,
              `expected a ${selector} rule with an explicit display declaration outside @supports`,
            ).toBe(true);
          });
        });
      }
    });
  }
});

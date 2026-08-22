import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * MEAS-04 — second, size-limit-INDEPENDENT no-bundled-Lit guard (CONTEXT D-03).
 *
 * size-limit `ignore`s `lit`, so it cannot see an accidentally-inlined copy
 * (RESEARCH Pitfall 4/5). D-03 therefore mandates TWO independent guards. This
 * is the config half: it freezes the canonical `external` array in
 * `vite.config.ts` so a chunking refactor cannot silently stop externalizing
 * Lit. (The other half is the dist-grep in `scripts/assert-no-bundled-lit.mjs`.)
 *
 * It is a pure static config assertion — no DOM, no browser — so it runs on the
 * jsdom `verify` lane (RESEARCH Wave 0 Gaps line 453). It reads `vite.config.ts`
 * as text (the byte-stable snapshot source) rather than importing/executing the
 * config, so it neither triggers the config's filesystem side effects nor
 * depends on a `__dirname`-bearing Node context.
 */

// Vitest's root is the repo root (where vite.config.ts lives), so resolve from
// process.cwd() — jsdom does not expose a `file:` scheme on import.meta.url.
const VITE_CONFIG_PATH = resolve(process.cwd(), 'vite.config.ts');

/**
 * Extract the raw source entries of the `external:` array from vite.config.ts.
 * The array contains only string literals and slash-delimited regex literals
 * (no nested brackets, no `]`), so a single non-greedy bracket capture is safe.
 */
function readExternalEntries(): string[] {
  const source = readFileSync(VITE_CONFIG_PATH, 'utf8');
  const match = source.match(/external:\s*\[([^\]]*)\]/);
  if (!match) throw new Error('Could not locate the `external:` array in vite.config.ts');
  return match[1]
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/**
 * Parse one raw source entry (`'lit'` or `/^lit\//`) into a runtime matcher
 * mirroring how Rollup applies the `external` array: a string matches by exact
 * equality, a regex literal matches by `.test()`.
 */
function toMatcher(rawEntry: string): (specifier: string) => boolean {
  if (rawEntry.startsWith('/') && rawEntry.lastIndexOf('/') > 0) {
    const body = rawEntry.slice(1, rawEntry.lastIndexOf('/'));
    const pattern = new RegExp(body);
    return (specifier) => pattern.test(specifier);
  }
  const literal = rawEntry.replace(/^['"]|['"]$/g, '');
  return (specifier) => specifier === literal;
}

function isExternalized(entries: string[], specifier: string): boolean {
  return entries.map(toMatcher).some((matches) => matches(specifier));
}

describe('MEAS-04: vite external array freezes Lit externalization', () => {
  const entries = readExternalEntries();

  it('freezes the canonical external array (byte-stable — D-03 snapshot source)', () => {
    // Any edit to vite.config.ts:220 that reorders, drops, or alters an entry
    // fails here and must be an intentional, reviewed snapshot update. Each
    // expected value is the exact source token as it appears in the config.
    expect(entries).toEqual([
      "'lit'",
      '/^lit\\//',
      '/^@lit\\//',
      '/^@lit-labs\\//',
      "'@floating-ui/dom'",
      '/^@floating-ui\\//',
    ]);
  });

  it('still externalizes the bare `lit` peer dependency (must never be bundled)', () => {
    // The literal 'lit' entry is the load-bearing one: it externalizes the peer
    // dependency itself. If it is removed the snapshot above already fails; this
    // asserts the behavioral consequence directly.
    expect(entries).toContain("'lit'");
    expect(isExternalized(entries, 'lit')).toBe(true);
  });

  it('externalizes every Lit / @lit / @lit-labs subpath', () => {
    for (const specifier of [
      'lit',
      'lit/decorators.js',
      'lit/directives/class-map.js',
      'lit/directives/live.js',
      '@lit/context',
      '@lit-labs/virtualizer/virtualize.js',
    ]) {
      expect(isExternalized(entries, specifier), `${specifier} must be externalized`).toBe(true);
    }
  });

  it('externalizes @floating-ui/dom and its subpaths', () => {
    expect(isExternalized(entries, '@floating-ui/dom')).toBe(true);
    expect(isExternalized(entries, '@floating-ui/core')).toBe(true);
  });

  it('does NOT externalize unrelated first-party specifiers', () => {
    // Guards against an over-broad pattern that would accidentally externalize
    // (and thus fail to ship) the library's own modules.
    for (const specifier of ['./chunks/button-abcd.js', '@willramanand/amris', 'highlight.js']) {
      expect(isExternalized(entries, specifier), `${specifier} must stay internal`).toBe(false);
    }
  });
});

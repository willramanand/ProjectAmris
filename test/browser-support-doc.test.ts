import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Node-side documentation-structure assertions for BROWSER_SUPPORT.md (COMPAT-05).
 *
 * No browser or jsdom DOM is exercised — this reads the Markdown file from disk and
 * asserts that the graceful-degradation contract Phase 10 actually shipped is
 * documented (and that stale pre-Phase-10 "forms/CSS just don't work" framing is gone).
 * Runs under the `jsdom` project purely because that is the default logic lane.
 *
 * The doc lives at the repo root; vitest runs with `process.cwd()` at the repo root
 * (`import.meta.url` is not a usable file:// URL under the jsdom environment).
 */
const DOC = readFileSync(resolve(process.cwd(), 'BROWSER_SUPPORT.md'), 'utf8');

describe('BROWSER_SUPPORT.md — Graceful Degradation matrix (COMPAT-05)', () => {
  it('has the Graceful Degradation (v1.1) section', () => {
    expect(DOC).toContain('## Graceful Degradation (v1.1)');
  });

  it('documents the opt-in compat-forms import by exact path', () => {
    expect(DOC).toContain('@willramanand/amris/compat-forms');
  });

  it('states the XOR (no double-submit) guarantee', () => {
    expect(DOC).toContain('XOR');
  });

  it('names the capabilities.ts independent-probe helper', () => {
    expect(DOC).toContain('capabilities.ts');
  });

  it('lists an ARIA reflection floor row distinct from the form-association row', () => {
    // COMPAT-01 probes form-association and ARIA reflection independently, so the
    // "Why this floor" table must carry both as separate, named concerns.
    expect(DOC).toMatch(/ARIA reflection/i);
    expect(DOC).toMatch(/form-association/i);
  });
});

/**
 * Returns the body of a `##`-level section (from its heading up to the next `## `),
 * so assertions can scope to a single section rather than the whole document.
 */
function section(heading: string): string {
  const start = DOC.indexOf(heading);
  expect(start, `section "${heading}" not found`).toBeGreaterThan(-1);
  const rest = DOC.slice(start + heading.length);
  const next = rest.indexOf('\n## ');
  return next === -1 ? rest : rest.slice(0, next);
}

describe('BROWSER_SUPPORT.md — no stale pre-Phase-10 claims (COMPAT-05)', () => {
  it('qualifies the below-floor forms claim with the compat-forms opt-in', () => {
    // Assert the NEW qualifying content is present in the same section as the
    // forms discussion (not a fragile negative on the old blanket sentence).
    const notWork = section('## What does **not** work below the floor');
    expect(notWork).toContain('@willramanand/amris/compat-forms');
  });

  it('frames the empty-slot reservation as an intentional guarded fallback', () => {
    const notWork = section('## What does **not** work below the floor');
    expect(notWork).toMatch(/@supports selector\(:has\(\*\)\)/);
  });

  it('no longer lists the custom-hidden-input strategy as unimplemented future work', () => {
    // COMPAT-03 shipped it; the "Future work" bullet must be gone.
    const future = section('## Future work');
    expect(future).not.toMatch(/^\s*-\s+A custom-hidden-input strategy/im);
  });

  it('states the hard ElementInternals polyfill is permanently out of scope', () => {
    const future = section('## Future work');
    expect(future).toMatch(/permanently out of scope/i);
  });
});

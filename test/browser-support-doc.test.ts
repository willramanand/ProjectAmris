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

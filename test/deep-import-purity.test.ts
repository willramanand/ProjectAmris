import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// SIZE-04 deep-import purity assertion (08-07 Task 1). The script proves that
// @floating-ui/dom never appears as a STATIC import specifier anywhere in the
// built dist/, and appears ONLY behind a dynamic import() (the shared loader
// chunk). It reuses the collectDistJs / stripCommentNoise / collectImportSpecifiers
// helpers from assert-no-bundled-lit.mjs (no re-implemented import parser) and is
// report-only this phase (exit 0; usage error exit 2). These are the pure-function
// contracts the CLI is built on.
import {
  FLOATING_UI_SPECIFIER,
  classifyFloatingUsage,
  runPurityCheck,
} from '../scripts/deep-import-purity.mjs';

describe('deep-import-purity: FLOATING_UI_SPECIFIER matcher', () => {
  it('matches @floating-ui/dom and its subpaths, not unrelated specifiers', () => {
    expect(FLOATING_UI_SPECIFIER.test('@floating-ui/dom')).toBe(true);
    expect(FLOATING_UI_SPECIFIER.test('@floating-ui/core')).toBe(true);
    expect(FLOATING_UI_SPECIFIER.test('@floating-ui/utils')).toBe(true);
    expect(FLOATING_UI_SPECIFIER.test('lit')).toBe(false);
    expect(FLOATING_UI_SPECIFIER.test('./chunks/lazy-load-x.js')).toBe(false);
  });
});

describe('deep-import-purity: classifyFloatingUsage (static vs dynamic split)', () => {
  it('classifies a `from` import of floating-ui as STATIC', () => {
    const { staticSpecifiers, dynamicSpecifiers } = classifyFloatingUsage(
      `import { computePosition } from '@floating-ui/dom';`,
    );
    expect(staticSpecifiers).toContain('@floating-ui/dom');
    expect(dynamicSpecifiers).toHaveLength(0);
  });

  it('classifies a bare side-effect import of floating-ui as STATIC (the minified leak form)', () => {
    // The exact shape verbatimModuleSyntax emitted from the inline `type`
    // leak we fixed in popover/tooltip: a bare runtime `import"@floating-ui/dom"`.
    const { staticSpecifiers, dynamicSpecifiers } = classifyFloatingUsage(
      `import"@floating-ui/dom";export{a};`,
    );
    expect(staticSpecifiers).toContain('@floating-ui/dom');
    expect(dynamicSpecifiers).toHaveLength(0);
  });

  it('classifies a dynamic import() of floating-ui as DYNAMIC only', () => {
    const { staticSpecifiers, dynamicSpecifiers } = classifyFloatingUsage(
      `var i=null;function n(){return i??=import("@floating-ui/dom")}`,
    );
    expect(dynamicSpecifiers).toContain('@floating-ui/dom');
    expect(staticSpecifiers).toHaveLength(0);
  });

  it('captures a subpath dynamic import as DYNAMIC', () => {
    const { staticSpecifiers, dynamicSpecifiers } = classifyFloatingUsage(
      `return import('@floating-ui/core')`,
    );
    expect(dynamicSpecifiers).toContain('@floating-ui/core');
    expect(staticSpecifiers).toHaveLength(0);
  });

  it('ignores incidental floating-ui mentions inside block comments', () => {
    const { staticSpecifiers, dynamicSpecifiers } = classifyFloatingUsage(
      `/* uses @floating-ui/dom via loader */ export const x = 1;`,
    );
    expect(staticSpecifiers).toHaveLength(0);
    expect(dynamicSpecifiers).toHaveLength(0);
  });

  it('ignores non-floating specifiers entirely', () => {
    const { staticSpecifiers, dynamicSpecifiers } = classifyFloatingUsage(
      `import { html } from 'lit'; import('./chunks/data-grid-x.js');`,
    );
    expect(staticSpecifiers).toHaveLength(0);
    expect(dynamicSpecifiers).toHaveLength(0);
  });
});

describe('deep-import-purity: runPurityCheck over a fixture dist', () => {
  let cleanDist: string;
  let leakyDist: string;

  beforeAll(() => {
    // A CLEAN fixture: floating-ui only behind a dynamic import() in a shared
    // loader chunk; non-overlay entries (button/input) reach it via nothing.
    cleanDist = mkdtempSync(join(tmpdir(), 'purity-clean-'));
    mkdirSync(join(cleanDist, 'chunks'), { recursive: true });
    mkdirSync(join(cleanDist, 'components', 'button'), { recursive: true });
    mkdirSync(join(cleanDist, 'components', 'popover'), { recursive: true });
    writeFileSync(
      join(cleanDist, 'chunks', 'lazy-load-x.js'),
      `var i=null;function n(){return i??=import("@floating-ui/dom")}export{n};`,
    );
    writeFileSync(
      join(cleanDist, 'components', 'button', 'index.js'),
      `import{html}from'lit';export class B{}`,
    );
    // Overlay entry references the loader chunk statically, but floating-ui itself
    // stays behind the dynamic import() inside that chunk.
    writeFileSync(
      join(cleanDist, 'components', 'popover', 'index.js'),
      `import{n}from'../../chunks/lazy-load-x.js';export class P{}`,
    );

    // A LEAKY fixture: an overlay entry statically imports floating-ui (the
    // regression the assertion must detect).
    leakyDist = mkdtempSync(join(tmpdir(), 'purity-leaky-'));
    mkdirSync(join(leakyDist, 'components', 'popover'), { recursive: true });
    writeFileSync(
      join(leakyDist, 'components', 'popover', 'index.js'),
      `import"@floating-ui/dom";export class P{}`,
    );
  });

  afterAll(() => {
    rmSync(cleanDist, { recursive: true, force: true });
    rmSync(leakyDist, { recursive: true, force: true });
  });

  it('reports CLEAN when floating-ui is only behind a dynamic import()', () => {
    const result = runPurityCheck(cleanDist);
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.staticFloatingOffenders).toHaveLength(0);
    expect(result.dynamicFloatingFiles.length).toBeGreaterThan(0);
    expect(result.clean).toBe(true);
  });

  it('DETECTS a non-overlay/overlay static floating-ui leak (proves the assertion bites)', () => {
    const result = runPurityCheck(leakyDist);
    expect(result.staticFloatingOffenders.length).toBeGreaterThan(0);
    expect(result.clean).toBe(false);
    // The offender names the file that statically imported floating-ui.
    expect(result.staticFloatingOffenders.join(' ')).toMatch(/popover/);
  });
});

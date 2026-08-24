import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  __resetLazyLoadCachesForTest,
  __resetLazyLoadImportersForTest,
  __setLazyLoadImportersForTest,
  loadFloating,
  loadVirtualizer,
} from '../../src/internal/helpers/lazy-load';

/**
 * lazy-load-retry (D-05 / CR-01) — a rejected dynamic `import()` must NOT poison
 * the memoized loader cache.
 *
 * Before the fix, `floatingPromise ??= import(...)` left a REJECTED promise in
 * the slot after one transient chunk failure (a redeploy 404, offline blip,
 * parse error), so every later `loadFloating()` returned that same rejected
 * promise forever — permanently bricking positioning/virtualization page-wide
 * with no recovery short of a full reload. Prefetch-on-intent widened the blast
 * radius by caching the rejection before the user ever clicked. The fix nulls
 * the slot on reject so the next call re-imports and can succeed, making the
 * combobox/select `_ensureVirtualizer` retry guards work as documented.
 *
 * Runs on the real Chromium browser lane (Task 2 precondition: Task 1 left it
 * green). A one-shot REJECTING importer is injected via the `@internal`
 * `__setLazyLoadImportersForTest` seam — vitest browser-mode `vi.mock` cannot
 * simulate a rejected dynamic import (its factory is evaluated once at setup and
 * cannot reject per-call). The retry importer is the REAL static bare-specifier
 * `import()`, so the retry resolves to the genuine module (recovery proven
 * end-to-end, not merely a manual cache reset).
 *
 * NOTE: deliberately imports no `test/setup.ts` symbol (browser lane is native).
 */

describe('lazy-load retry after a rejected import (CR-01, real Chromium)', () => {
  beforeEach(() => {
    __resetLazyLoadCachesForTest();
    __resetLazyLoadImportersForTest();
  });

  afterEach(() => {
    __resetLazyLoadCachesForTest();
    __resetLazyLoadImportersForTest();
  });

  it('loadFloating retries after a rejected import() instead of caching the rejection', async () => {
    let calls = 0;
    __setLazyLoadImportersForTest({
      floating: () => {
        calls += 1;
        if (calls === 1) {
          return Promise.reject(new Error('simulated cold-chunk failure (floating-ui)'));
        }
        return import('@floating-ui/dom');
      },
    });

    // First call: transient chunk failure — rethrows (never swallowed).
    await expect(loadFloating()).rejects.toThrow(/simulated cold-chunk failure \(floating-ui\)/);

    // The slot was nulled on reject, so a subsequent call starts a FRESH import()
    // that resolves to the real module. (The buggy `??=` returned the cached
    // rejected promise here and rejected again — a permanent brick.)
    const mod = await loadFloating();
    expect(typeof mod.computePosition).toBe('function');
    expect(typeof mod.autoUpdate).toBe('function');
    // Exactly one retry happened (first reject + one successful re-import).
    expect(calls).toBe(2);
  });

  it('loadVirtualizer retries after a rejected import() instead of caching the rejection', async () => {
    let calls = 0;
    __setLazyLoadImportersForTest({
      virtualizer: () => {
        calls += 1;
        if (calls === 1) {
          return Promise.reject(new Error('simulated cold-chunk failure (virtualizer)'));
        }
        return import('@lit-labs/virtualizer/virtualize.js');
      },
    });

    await expect(loadVirtualizer()).rejects.toThrow(/simulated cold-chunk failure \(virtualizer\)/);

    const mod = await loadVirtualizer();
    expect(typeof mod.virtualize).toBe('function');
    expect(calls).toBe(2);
  });

  it('happy path memoizes to the SAME promise instance (no double fetch)', async () => {
    // Default (real) importers — no rejection injected.
    const p1 = loadFloating();
    const p2 = loadFloating();
    expect(p1).toBe(p2);
    await expect(p1).resolves.toBeDefined();

    const v1 = loadVirtualizer();
    const v2 = loadVirtualizer();
    expect(v1).toBe(v2);
    await expect(v1).resolves.toBeDefined();
  });
});

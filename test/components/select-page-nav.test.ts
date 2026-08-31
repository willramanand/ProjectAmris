import { html } from 'lit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import '../../src/components/select/select';
import {
  __resetLazyLoadCachesForTest,
  __resetLazyLoadImportersForTest,
  __setLazyLoadImportersForTest,
} from '../../src/internal/helpers/lazy-load';
import { click, fixture, keydown, shadowQuery, waitForUpdate } from '../helpers';

// COVERAGE (ci-coverage-gate-fail) — virtualized PageUp/PageDown navigation
// (_pageVirtualHighlight), the public focus() method, and the lazy-virtualizer
// swap (_renderVirtualOptions .then + renderItem/keyFunction). All three are
// reachable under jsdom: page nav is pure model math, focus() delegates to the
// trigger, and the deferred virtualizer load is driven through the lazy-load
// test-importer seam. A fake virtualize directive is injected for every test in
// this file so the deferred import is deterministic and never touches the real
// (browser-only, layout-dependent) `@lit-labs/virtualizer` scroll path.

type SelectEl = HTMLElement & {
  value: string;
  _highlightedIndex: number;
  _open: boolean;
};

function makeOptions(n: number): string {
  return Array.from({ length: n }, (_, i) => `<am-option value="v${i}">Opt ${i}</am-option>`).join('');
}

/**
 * Fake `@lit-labs/virtualizer` module — renders ALL rows unwindowed but invokes
 * keyFunction + renderItem per item so the component's real row template runs.
 */
function fakeVirtualizerModule() {
  return {
    virtualize: (config: {
      items: unknown[];
      keyFunction: (item: unknown) => unknown;
      renderItem: (item: unknown, index: number) => unknown;
    }) =>
      html`<div data-virtualized>
        ${config.items.map((item, index) => {
          config.keyFunction(item);
          return config.renderItem(item, index);
        })}
      </div>`,
  };
}

async function flushVirtualizerSwap(el: HTMLElement): Promise<void> {
  await waitForUpdate(el);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await waitForUpdate(el);
  await waitForUpdate(el);
}

describe('am-select — virtualized page navigation + focus (coverage)', { timeout: 20000 }, () => {
  beforeEach(() => {
    __resetLazyLoadCachesForTest();
    __setLazyLoadImportersForTest({
      virtualizer: async () =>
        fakeVirtualizerModule() as unknown as typeof import('@lit-labs/virtualizer/virtualize.js'),
    });
  });

  afterEach(() => {
    __resetLazyLoadImportersForTest();
    __resetLazyLoadCachesForTest();
  });

  async function makeBig(count = 150): Promise<SelectEl> {
    const el = await fixture<SelectEl>(`<am-select label="Big">${makeOptions(count)}</am-select>`);
    await waitForUpdate(el);
    await waitForUpdate(el);
    return el;
  }

  it('PageDown jumps the highlight forward by a page and PageUp back', async () => {
    const el = await makeBig();
    const trigger = shadowQuery<HTMLButtonElement>(el, '.trigger');
    await click(trigger, el); // open

    await keydown(trigger, 'PageDown', el);
    // base 0 + OPTION_PAGE_SIZE (10) -> index 10.
    expect(el._highlightedIndex).toBe(10);

    await keydown(trigger, 'PageUp', el);
    // 10 - 10 -> index 0.
    expect(el._highlightedIndex).toBe(0);
  });

  it('PageDown clamps at the final option', async () => {
    const el = await makeBig();
    const trigger = shadowQuery<HTMLButtonElement>(el, '.trigger');
    await click(trigger, el);

    await keydown(trigger, 'End', el); // -> last (149)
    expect(el._highlightedIndex).toBe(149);

    await keydown(trigger, 'PageDown', el);
    // Already at the end; the page jump clamps to the last index.
    expect(el._highlightedIndex).toBe(149);
  });

  it('does not page-navigate while the popup is closed', async () => {
    const el = await makeBig();
    const trigger = shadowQuery<HTMLButtonElement>(el, '.trigger');

    expect(el._open).toBe(false);
    await keydown(trigger, 'PageDown', el);

    // The virtualized page handler is gated on _open, so nothing highlights.
    expect(el._highlightedIndex).toBe(-1);
  });

  it('focus() delegates to the trigger', async () => {
    const el = await makeBig();
    const trigger = shadowQuery<HTMLButtonElement>(el, '.trigger');
    const spy = vi.spyOn(trigger, 'focus');

    (el as unknown as { focus(options?: FocusOptions): void }).focus();

    expect(spy).toHaveBeenCalled();
  });

  it('swaps to the virtualize() path and renders every row with per-row ARIA', async () => {
    const el = await makeBig();
    await flushVirtualizerSwap(el);

    // The marker proves renderItem/keyFunction ran inside virtualize().
    expect(el.shadowRoot?.querySelector('[data-virtualized]')).not.toBeNull();
    const rows = el.shadowRoot?.querySelectorAll('.v-option') ?? [];
    expect(rows.length).toBe(150);
    // aria-setsize reflects the FULL model total on the windowed rows.
    expect(rows[0]?.getAttribute('aria-setsize')).toBe('150');
    expect(rows[0]?.getAttribute('role')).toBe('option');
  });
});

import { html } from 'lit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../src/components/combobox/combobox';
import {
  __resetLazyLoadCachesForTest,
  __resetLazyLoadImportersForTest,
  __setLazyLoadImportersForTest,
} from '../../src/internal/helpers/lazy-load';
import { click, fixture, inputText, keydown, shadowQuery, waitForUpdate } from '../helpers';

// COVERAGE (ci-coverage-gate-fail) — the SELECT-mode (search-in-trigger) surface,
// the public focus() method, and the lazy-virtualizer swap. These are plain DOM
// interactions reachable under jsdom; the virtualizer .then swap is driven
// deterministically through the lazy-load test-importer seam (the SAME seam the
// browser cold-load spec uses to inject a rejecting importer). Windowing itself
// stays browser-only — the injected fake renders unwindowed rows, but the
// per-row ARIA shape produced by renderItem/keyFunction is identical either way.

type ComboboxEl = HTMLElement & {
  value: string;
  options: string[];
  disabled: boolean;
  readonly: boolean;
  searchInTrigger: boolean;
};

const FRUITS = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry'];

async function makeSelectMode(extra = ''): Promise<ComboboxEl> {
  const el = await fixture<ComboboxEl>(
    `<am-combobox label="Fruit" search-in-trigger ${extra}></am-combobox>`,
  );
  el.options = [...FRUITS];
  await waitForUpdate(el);
  return el;
}

async function makeTextMode(): Promise<ComboboxEl> {
  const el = await fixture<ComboboxEl>('<am-combobox label="Fruit"></am-combobox>');
  el.options = [...FRUITS];
  await waitForUpdate(el);
  return el;
}

function isOpen(el: ComboboxEl): boolean {
  return (el as unknown as { _open: boolean })._open;
}

function selectOptions(el: ComboboxEl): HTMLElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll('.option') ?? []) as HTMLElement[];
}

/**
 * Fake `@lit-labs/virtualizer` module for the jsdom lane: the directive renders
 * ALL items unwindowed but DOES invoke keyFunction + renderItem per item (so the
 * component's real per-row templates execute), wrapped in a marker element that
 * proves the virtualize() branch — not the repeat() fallback — produced the rows.
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

describe('am-combobox — select mode (search-in-trigger)', () => {
  it('opens the dropdown when the select-mode wrapper is clicked', async () => {
    const el = await makeSelectMode();
    const wrapper = shadowQuery<HTMLElement>(el, '.wrapper.select-mode');

    expect(isOpen(el)).toBe(false);
    await click(wrapper, el);

    expect(isOpen(el)).toBe(true);
  });

  it('filters options through the dropdown search input', async () => {
    const el = await makeSelectMode();
    await click(shadowQuery<HTMLElement>(el, '.wrapper.select-mode'), el);

    const search = shadowQuery<HTMLInputElement>(el, '.dropdown-search');
    await inputText(search, 'ap', el);

    const visible = selectOptions(el).map((o) => o.textContent?.trim());
    expect(visible).toEqual(['Apple', 'Apricot']);
  });

  it('navigates with ArrowDown/ArrowUp and selects on Enter from the dropdown search', async () => {
    const el = await makeSelectMode();
    await click(shadowQuery<HTMLElement>(el, '.wrapper.select-mode'), el);

    const search = shadowQuery<HTMLInputElement>(el, '.dropdown-search');
    await keydown(search, 'ArrowDown', el); // -> Apple (0)
    await keydown(search, 'ArrowDown', el); // -> Apricot (1)
    await keydown(search, 'ArrowUp', el); // -> Apple (0)
    await keydown(search, 'Enter', el);

    expect(el.value).toBe('Apple');
    expect(isOpen(el)).toBe(false);
  });

  it('closes on Escape from the dropdown search and clears the query', async () => {
    const el = await makeSelectMode();
    await click(shadowQuery<HTMLElement>(el, '.wrapper.select-mode'), el);

    const search = shadowQuery<HTMLInputElement>(el, '.dropdown-search');
    await inputText(search, 'ban', el);
    await keydown(search, 'Escape', el);

    expect(isOpen(el)).toBe(false);
    expect((el as unknown as { _dropdownQuery: string })._dropdownQuery).toBe('');
  });

  it('toggles open/closed via Enter and Space on the select-mode wrapper', async () => {
    const el = await makeSelectMode();
    const wrapper = shadowQuery<HTMLElement>(el, '.wrapper.select-mode');

    await keydown(wrapper, 'Enter', el);
    expect(isOpen(el)).toBe(true);

    await keydown(wrapper, ' ', el);
    expect(isOpen(el)).toBe(false);
  });

  it('does not toggle open when disabled (guarded _toggleSelect via wrapper keydown)', async () => {
    const el = await makeSelectMode('disabled');
    const wrapper = shadowQuery<HTMLElement>(el, '.wrapper.select-mode');

    await keydown(wrapper, 'Enter', el);

    expect(isOpen(el)).toBe(false);
  });
});

describe('am-combobox — wrapper click + focus() (coverage)', () => {
  it('focuses the input when the text-mode wrapper is clicked', async () => {
    const el = await makeTextMode();
    const input = shadowQuery<HTMLInputElement>(el, 'input');
    const spy = vi.spyOn(input, 'focus');

    await click(shadowQuery<HTMLElement>(el, '.wrapper'), el);

    expect(spy).toHaveBeenCalled();
  });

  it('focus() delegates to the inner input', async () => {
    const el = await makeTextMode();
    const input = shadowQuery<HTMLInputElement>(el, 'input');
    const spy = vi.spyOn(input, 'focus');

    (el as unknown as { focus(options?: FocusOptions): void }).focus();

    expect(spy).toHaveBeenCalled();
  });
});

describe('am-combobox — lazy virtualizer swap (coverage)', () => {
  afterEach(() => {
    __resetLazyLoadImportersForTest();
    __resetLazyLoadCachesForTest();
  });

  async function makeBig(count: number): Promise<ComboboxEl> {
    const el = await fixture<ComboboxEl>('<am-combobox label="Big"></am-combobox>');
    el.options = Array.from({ length: count }, (_, i) => `Item ${i}`);
    return el;
  }

  it('kicks the deferred load and swaps to the virtualize() path above the threshold', async () => {
    __resetLazyLoadCachesForTest();
    __setLazyLoadImportersForTest({
      virtualizer: async () =>
        fakeVirtualizerModule() as unknown as typeof import('@lit-labs/virtualizer/virtualize.js'),
    });

    const el = await makeBig(120);
    await flushVirtualizerSwap(el);

    // The marker proves renderItem/keyFunction ran inside virtualize(), not the
    // repeat() fallback, and every option row rendered.
    expect(el.shadowRoot?.querySelector('[data-virtualized]')).not.toBeNull();
    expect(selectOptions(el).length).toBe(120);
  });

  it('stays on the repeat() fallback and allows retry when the virtualizer import rejects', async () => {
    __resetLazyLoadCachesForTest();
    __setLazyLoadImportersForTest({
      virtualizer: () =>
        Promise.reject(new Error('simulated cold-chunk failure (virtualizer)')) as unknown as Promise<
          typeof import('@lit-labs/virtualizer/virtualize.js')
        >,
    });

    const el = await makeBig(120);
    await flushVirtualizerSwap(el);

    // No windowed marker; the unwindowed repeat() fallback stands and is usable.
    expect(el.shadowRoot?.querySelector('[data-virtualized]')).toBeNull();
    expect(selectOptions(el).length).toBe(120);
    // The guard is cleared so a later render can retry the fetch (D-05).
    expect((el as unknown as { _virtualizerRequested: boolean })._virtualizerRequested).toBe(false);
  });
});

import { LitElement, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { virtualize } from '@lit-labs/virtualizer/virtualize.js';
import { describe, expect, it } from 'vitest';

import { scrollVirtualizerToIndex } from '../../src/internal/helpers/virtualize-support';
import '../../src/components/select/select';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * virtualize-smoke — de-risks the labs/pre-1.0 `@lit-labs/virtualizer` v2.1.1
 * runtime API BEFORE `am-data-grid` depends on it (A1–A4).
 *
 * Runs in the `browser` Vitest project (native Chromium). jsdom mocks
 * ResizeObserver, so windowing/recycling is only provable here — the jsdom lane
 * cannot exercise the virtualizer's measurement at all.
 *
 * Asserts the three properties the grid relies on:
 *  1. Only a WINDOWED subset of item nodes is in the DOM (not all 2000).
 *  2. The FULL logical count lives in component state, independent of the DOM.
 *  3. Scrolling to a far index brings that item's node into the DOM (the
 *     `element(idx).scrollIntoView()` proxy path used by keyboard nav).
 *
 * NOTE: deliberately does NOT import any test/setup.ts symbol (browser lane is
 * native, mock-free).
 */

@customElement('smoke-virtual-list')
class SmokeVirtualList extends LitElement {
  @property({ type: Number }) count = 2000;
  @query('.scroller') scroller!: HTMLElement;

  private get _items(): number[] {
    return Array.from({ length: this.count }, (_v, i) => i);
  }

  render() {
    return html`
      <div
        class="scroller"
        style="height: 300px; overflow: auto; display: block;"
      >
        ${virtualize({
          items: this._items,
          keyFunction: (i: number) => i,
          renderItem: (i: number) =>
            html`<div class="v-item" data-index=${i} style="height: 40px;">Item ${i}</div>`,
        })}
      </div>
    `;
  }
}

type SmokeHost = SmokeVirtualList;

async function waitForItems(host: SmokeHost): Promise<NodeListOf<HTMLElement>> {
  for (let i = 0; i < 40; i++) {
    const items = host.scroller?.querySelectorAll<HTMLElement>('.v-item');
    if (items && items.length > 0) return items;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  return host.scroller.querySelectorAll<HTMLElement>('.v-item');
}

async function waitForIndexInDom(host: SmokeHost, index: number): Promise<HTMLElement | null> {
  for (let i = 0; i < 40; i++) {
    const node = host.scroller?.querySelector<HTMLElement>(`.v-item[data-index="${index}"]`);
    if (node) return node;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  return host.scroller?.querySelector<HTMLElement>(`.v-item[data-index="${index}"]`) ?? null;
}

describe('@lit-labs/virtualizer virtualize() directive (real Chromium)', () => {
  it('renders only a windowed subset while the full logical count stays in state', async () => {
    const host = await fixture<SmokeHost>(`<smoke-virtual-list></smoke-virtual-list>`);
    await waitForUpdate(host);
    const items = await waitForItems(host);

    // Full logical count is state-driven, not DOM-derived (Pitfall 2).
    expect(host.count).toBe(2000);

    // Only a small window is mounted — nowhere near the full 2000.
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(200);

    host.remove();
  });

  it('scrolls a far, virtualized-out index into the DOM via the virtualizerRef proxy (A2)', async () => {
    const host = await fixture<SmokeHost>(`<smoke-virtual-list></smoke-virtual-list>`);
    await waitForUpdate(host);
    await waitForItems(host);

    const target = 1500;
    // Not initially mounted (it is far below the initial viewport window).
    expect(host.scroller.querySelector(`.v-item[data-index="${target}"]`)).toBeNull();

    scrollVirtualizerToIndex(host.scroller, target);
    const node = await waitForIndexInDom(host, target);

    expect(node).not.toBeNull();
    expect(node?.dataset.index).toBe(String(target));

    host.remove();
  });
});

/**
 * SIZE-02 cold-chunk fallback (select) — with the virtualizer now behind a
 * dynamic `import()` (08-05), an above-threshold `am-select` must render a
 * functional UNWINDOWED `repeat()` on the first open frame (before the chunk
 * resolves) and then SWAP to the windowed `virtualize()` directive once loaded,
 * with selection working on both paths (D-05). Proven only in the browser lane:
 * jsdom mocks ResizeObserver so the virtualizer never windows.
 */
type BigSelect = HTMLElement & { value: string };

function bigSelectMarkup(count: number): string {
  const options = Array.from(
    { length: count },
    (_v, i) => `<am-option value="opt-${i}">Option ${i}</am-option>`,
  ).join('');
  return `<am-select label="Big">${options}</am-select>`;
}

function optionRows(host: HTMLElement): NodeListOf<HTMLElement> {
  return host.shadowRoot!.querySelectorAll<HTMLElement>('.v-option');
}

describe('am-select deferred virtualizer cold-chunk fallback (real Chromium)', () => {
  it('renders a functional unwindowed repeat() before load, then swaps to windowed virtualize()', async () => {
    const count = 150; // > VIRTUALIZE_ROW_THRESHOLD (100) → virtualized path
    const el = await fixture<BigSelect>(bigSelectMarkup(count));

    const trigger = shadowQuery<HTMLButtonElement>(el, '.trigger');
    trigger.click();
    // First render commits with the virtualizer directive still unresolved, so
    // the cold path renders every option via repeat() — fully functional.
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const coldRows = optionRows(el);
    expect(coldRows.length).toBe(count);

    // Every cold row carries the same state-driven ARIA the windowed path uses.
    expect(coldRows[0].getAttribute('role')).toBe('option');
    expect(coldRows[0].getAttribute('aria-setsize')).toBe(String(count));
    expect(coldRows[0].getAttribute('aria-posinset')).toBe('1');

    // Once the virtualizer chunk resolves it swaps to the windowed directive —
    // only a small subset of rows stays mounted.
    let rows = optionRows(el);
    for (let i = 0; i < 60 && rows.length >= count; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      rows = optionRows(el);
    }
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(count);

    // Selection is behavior-preserving on the windowed path: clicking the first
    // mounted row commits its value via state (Pitfall 2).
    optionRows(el)[0].click();
    await waitForUpdate(el);
    expect(el.value).toBe('opt-0');

    el.remove();
  });
});

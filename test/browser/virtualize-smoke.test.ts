import { LitElement, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { virtualize } from '@lit-labs/virtualizer/virtualize.js';
import { describe, expect, it } from 'vitest';

import { scrollVirtualizerToIndex } from '../../src/internal/helpers/virtualize-support';
import { fixture, waitForUpdate } from '../helpers';

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

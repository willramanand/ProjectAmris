import { describe, expect, it } from 'vitest';

import '../../src/components/rich-select/rich-select';
import type { RichOption } from '../../src/components/rich-select/rich-select';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * SIZE-01 / Pitfall F1 — the no-`0,0`-frame (hidden-until-positioned) invariant
 * for `am-rich-select`, the second D-06 inline migration (08-03).
 *
 * Its own file (NOT an extension of 08-01's popover spec or 08-02's
 * tooltip/color-picker specs) so parallel Wave-2 plans never write the same test
 * file. Runs in the `browser` Vitest project (real Chromium layout + a real
 * `customElements` registry + a genuine dynamic-`import()` gap for the deferred
 * floating-ui chunk).
 *
 * rich-select now positions via {@link FloatingPositionController}, whose
 * `start()` awaits `loadFloating()` before the first `computePosition`. That
 * `await` seam inserts a window between the listbox opening and its first
 * positioning. The locked mitigation (D-02) is hidden-until-positioned — the
 * listbox stays `visibility:hidden` until the controller's `onPositioned`
 * reveals it, so it is NEVER painted at viewport `0,0`.
 *
 * The assertion polls frames across the async loader gap: on no frame may the
 * listbox be simultaneously VISIBLE and UNPOSITIONED, and once revealed it must
 * sit at a non-`(0,0)`, viewport-anchored rect below the trigger, with a
 * `min-width` matching the trigger.
 *
 * NOTE: deliberately does NOT import getMockInternals or any setup.ts symbol
 * (the browser lane is native / mock-free).
 */

type RichSelectHost = HTMLElement & { options: RichOption[] };

const OPTIONS: RichOption[] = [
  { value: 'alice', label: 'Alice', description: 'Engineering' },
  { value: 'bob', label: 'Bob', description: 'Design' },
  { value: 'carol', label: 'Carol', description: 'Product' },
];

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** True once floating-ui has written a left AND top onto the listbox. */
function isPositioned(listbox: HTMLElement): boolean {
  return listbox.style.left !== '' && listbox.style.top !== '';
}

/** True when the listbox is actually painted (computed visibility is visible). */
function isVisible(listbox: HTMLElement): boolean {
  return getComputedStyle(listbox).visibility === 'visible';
}

describe('rich-select hidden-until-positioned (real Chromium, no 0,0 frame)', () => {
  it('never paints the rich-select listbox visible while unpositioned across the async loader gap', async () => {
    const host = await fixture<RichSelectHost>(`
      <am-rich-select label="Assignee" style="width: 12rem;"></am-rich-select>
    `);
    host.options = [...OPTIONS];
    await waitForUpdate(host);

    const trigger = shadowQuery<HTMLElement>(host, '.trigger');
    const listbox = shadowQuery<HTMLElement>(host, '.listbox');

    // Before opening: the listbox is hidden and unpositioned.
    expect(isVisible(listbox)).toBe(false);

    // Open by clicking the trigger (rich-select toggles its internal _open state).
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await waitForUpdate(host);

    // Poll frames spanning the deferred-import gap. The invariant: at no observed
    // frame may the listbox be visible before its first computePosition wrote
    // left/top. Once positioned AND revealed, stop.
    let sawVisibleWhileUnpositioned = false;
    let revealed = false;
    for (let i = 0; i < 90; i++) {
      const positioned = isPositioned(listbox);
      const visible = isVisible(listbox);
      if (visible && !positioned) sawVisibleWhileUnpositioned = true;
      if (positioned && visible) {
        revealed = true;
        break;
      }
      await nextFrame();
    }

    // Pitfall F1 guard: the listbox was never painted before it was anchored.
    expect(sawVisibleWhileUnpositioned).toBe(false);
    // And it did eventually reveal (the deferral did not leave it stuck hidden).
    expect(revealed).toBe(true);

    // The revealed listbox sits at a non-(0,0), viewport-anchored rect below the trigger.
    const listboxRect = listbox.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    expect(listboxRect.width).toBeGreaterThan(0);
    expect(listboxRect.height).toBeGreaterThan(0);
    expect(listboxRect.top === 0 && listboxRect.left === 0).toBe(false);
    expect(listboxRect.top).toBeGreaterThanOrEqual(triggerRect.bottom - 1);

    // The `size` middleware matched the listbox min-width to the trigger width.
    expect(listboxRect.width).toBeGreaterThanOrEqual(triggerRect.width - 1);
  });
});

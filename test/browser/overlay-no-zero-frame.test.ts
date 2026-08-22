import { describe, expect, it } from 'vitest';

import '../../src/components/popover/popover';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * SIZE-01 / Pitfall F1 — the no-`0,0`-frame (hidden-until-positioned) invariant.
 *
 * Runs in the `browser` Vitest project (real Chromium layout + a real
 * `customElements` registry + a genuine dynamic-`import()` gap for the deferred
 * floating-ui chunk). This is the guard for the risk the deferral introduces:
 * the `await loadFloating()` seam inserts a window between `open` and the first
 * `computePosition`. The locked mitigation (D-02) is hidden-until-positioned —
 * the panel stays `visibility:hidden` until the first `computePosition` writes
 * `left/top`, so it is NEVER painted at viewport `0,0`.
 *
 * The assertion polls frames across the async loader gap: on no frame may the
 * panel be simultaneously VISIBLE and UNPOSITIONED, and once revealed it must
 * sit at a non-`(0,0)`, viewport-anchored rect below the trigger.
 *
 * NOTE: deliberately does NOT import getMockInternals or any setup.ts symbol
 * (the browser lane is native / mock-free).
 */

type PopoverHost = HTMLElement & { open: boolean };

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** True once floating-ui has written a left AND top onto the panel. */
function isPositioned(panel: HTMLElement): boolean {
  return panel.style.left !== '' && panel.style.top !== '';
}

/** True when the panel is actually painted (computed visibility is visible). */
function isVisible(panel: HTMLElement): boolean {
  return getComputedStyle(panel).visibility === 'visible';
}

describe('overlay hidden-until-positioned (real Chromium, no 0,0 frame)', () => {
  it('never paints the popover panel visible while unpositioned across the async loader gap', async () => {
    const host = await fixture<PopoverHost>(`
      <am-popover trigger="manual" placement="bottom-start">
        <button class="pop-trigger">Trigger</button>
        <div slot="content">Popover panel content</div>
      </am-popover>
    `);

    const trigger = host.querySelector<HTMLElement>('.pop-trigger')!;
    const panel = shadowQuery<HTMLElement>(host, '.popover');

    // Before opening: the panel is hidden and unpositioned.
    expect(isVisible(panel)).toBe(false);

    host.open = true;
    await waitForUpdate(host);

    // Poll frames spanning the deferred-import gap. The invariant: at no observed
    // frame may the panel be visible before its first computePosition wrote
    // left/top. Once positioned AND revealed, stop.
    let sawVisibleWhileUnpositioned = false;
    let revealed = false;
    for (let i = 0; i < 90; i++) {
      const positioned = isPositioned(panel);
      const visible = isVisible(panel);
      if (visible && !positioned) sawVisibleWhileUnpositioned = true;
      if (positioned && visible) {
        revealed = true;
        break;
      }
      await nextFrame();
    }

    // Pitfall F1 guard: the panel was never painted before it was anchored.
    expect(sawVisibleWhileUnpositioned).toBe(false);
    // And it did eventually reveal (the deferral did not leave it stuck hidden).
    expect(revealed).toBe(true);

    // The revealed panel sits at a non-(0,0), viewport-anchored rect below the trigger.
    const panelRect = panel.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    expect(panelRect.width).toBeGreaterThan(0);
    expect(panelRect.height).toBeGreaterThan(0);
    expect(panelRect.top === 0 && panelRect.left === 0).toBe(false);
    expect(panelRect.top).toBeGreaterThan(triggerRect.top);
    expect(panelRect.top).toBeGreaterThanOrEqual(triggerRect.bottom - 1);
  });
});

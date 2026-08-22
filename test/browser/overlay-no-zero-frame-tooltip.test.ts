import { describe, expect, it } from 'vitest';

import '../../src/components/tooltip/tooltip';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * SIZE-01 / Pitfall F1 — the no-`0,0`-frame invariant for the TOOLTIP overlay.
 *
 * Its own spec file (never extends 08-01's popover `overlay-no-zero-frame.test.ts`)
 * so parallel Wave-2 plans never write the same test file. Runs in the `browser`
 * Vitest project (real Chromium layout + a real `customElements` registry + a
 * genuine dynamic-`import()` gap for the deferred floating-ui chunk).
 *
 * The deferral inserts an `await loadFloating()` seam between show-on-intent and
 * the first `computePosition`. The tooltip reveals via opacity while it is
 * `position: fixed` with no `left/top` yet, so across that gap it must NEVER be
 * painted at viewport `(0,0)`: an un-positioned fixed element stays at its static
 * in-flow position (offset here by a host margin), never the top-left corner. The
 * assertion polls frames spanning the loader gap, asserts no un-positioned frame
 * ever lands the tip at `(0,0)`, and that once positioned it sits at a non-`(0,0)`,
 * viewport-anchored rect below its trigger.
 *
 * NOTE: deliberately does NOT import getMockInternals or any setup.ts symbol
 * (the browser lane is native / mock-free).
 */

type TooltipHost = HTMLElement & { content: string; placement: string; delay: number };

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** True once floating-ui has written a left AND top onto the tip. */
function isPositioned(tip: HTMLElement): boolean {
  return tip.style.left !== '' && tip.style.top !== '';
}

/** True when the tip currently occupies the viewport (0,0) corner with real size. */
function paintedAtZero(tip: HTMLElement): boolean {
  const r = tip.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.left === 0 && r.top === 0;
}

describe('tooltip hidden-until-positioned (real Chromium, no 0,0 frame)', () => {
  it('never paints the tooltip at (0,0) while unpositioned across the async loader gap', async () => {
    const host = await fixture<TooltipHost>(`
      <am-tooltip content="Save your changes" placement="bottom" delay="0"
                  style="margin: 120px">
        <button class="tip-trigger">Save</button>
      </am-tooltip>
    `);

    const trigger = host.querySelector<HTMLElement>('.tip-trigger')!;
    const tip = shadowQuery<HTMLElement>(host, '.tooltip');

    // Before showing: the tip is unpositioned and NOT at the (0,0) corner.
    expect(isPositioned(tip)).toBe(false);
    expect(paintedAtZero(tip)).toBe(false);

    // Show on intent (delay=0 → the show timer + async positioning resolve across
    // the following frames).
    const innerTrigger = shadowQuery<HTMLElement>(host, '.trigger');
    innerTrigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    await waitForUpdate(host);

    // Poll frames spanning the deferred-import gap. Invariant: at no observed
    // frame may the tip be painted at (0,0) before its first computePosition wrote
    // left/top. Once positioned, stop.
    let sawZeroWhileUnpositioned = false;
    let revealed = false;
    for (let i = 0; i < 90; i++) {
      const positioned = isPositioned(tip);
      if (!positioned && paintedAtZero(tip)) sawZeroWhileUnpositioned = true;
      if (positioned) {
        revealed = true;
        break;
      }
      await nextFrame();
    }

    // Pitfall F1 guard: the tip was never painted at the (0,0) corner unanchored.
    expect(sawZeroWhileUnpositioned).toBe(false);
    // And it did eventually position (the deferral did not leave it stuck).
    expect(revealed).toBe(true);

    // The positioned tip sits at a non-(0,0), viewport-anchored rect below the trigger.
    const tipRect = tip.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    expect(tipRect.width).toBeGreaterThan(0);
    expect(tipRect.height).toBeGreaterThan(0);
    expect(tipRect.top === 0 && tipRect.left === 0).toBe(false);
    expect(tipRect.top).toBeGreaterThan(triggerRect.top);
    expect(tipRect.top).toBeGreaterThanOrEqual(triggerRect.bottom - 1);
  });
});

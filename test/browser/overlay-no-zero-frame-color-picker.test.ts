import { describe, expect, it } from 'vitest';

import '../../src/components/color-picker/color-picker';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * SIZE-01 / Pitfall F1 — the no-`0,0`-frame invariant for the COLOR-PICKER overlay.
 *
 * Its own spec file (never extends 08-01's popover `overlay-no-zero-frame.test.ts`
 * nor Task 1's tooltip spec) so parallel Wave-2 plans never write the same test
 * file. Runs in the `browser` Vitest project (real Chromium layout + real
 * `customElements` registry + a genuine dynamic-`import()` gap for the deferred
 * floating-ui chunk).
 *
 * color-picker positions ONE-SHOT (Pitfall CP1): a single `computePosition` per
 * open, NO autoUpdate, routed straight through the shared loader — never the
 * FloatingPositionController. The panel reveals via opacity (`.panel.open`) while
 * it is `position: fixed` with no `left/top` yet, so across the `await
 * loadFloating()` gap it must NEVER be painted at viewport `(0,0)`: an
 * un-positioned fixed panel stays at its static in-flow position (offset here by a
 * host margin), never the top-left corner. The assertion polls frames spanning the
 * loader gap, asserts no un-positioned frame lands the panel at `(0,0)`, and that
 * once positioned it sits at a non-`(0,0)`, viewport-anchored rect below its trigger.
 *
 * NOTE: deliberately does NOT import getMockInternals or any setup.ts symbol
 * (the browser lane is native / mock-free — Chromium implements ElementInternals).
 */

type ColorPickerHost = HTMLElement & { value: string };

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** True once floating-ui has written a left AND top onto the panel. */
function isPositioned(panel: HTMLElement): boolean {
  return panel.style.left !== '' && panel.style.top !== '';
}

/** True when the panel currently occupies the viewport (0,0) corner with real size. */
function paintedAtZero(panel: HTMLElement): boolean {
  const r = panel.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.left === 0 && r.top === 0;
}

describe('color-picker hidden-until-positioned (real Chromium, no 0,0 frame)', () => {
  it('never paints the panel at (0,0) while unpositioned across the async loader gap', async () => {
    const host = await fixture<ColorPickerHost>(`
      <am-color-picker value="#6366f1" style="margin: 120px"></am-color-picker>
    `);

    const trigger = shadowQuery<HTMLElement>(host, '.trigger');
    const panel = shadowQuery<HTMLElement>(host, '.panel');

    // Before opening: the panel is unpositioned and NOT at the (0,0) corner.
    expect(isPositioned(panel)).toBe(false);
    expect(paintedAtZero(panel)).toBe(false);

    // Open: click toggles _open → updated() fires the ONE-SHOT async _updatePosition().
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await waitForUpdate(host);

    // Poll frames spanning the deferred-import gap. Invariant: at no observed frame
    // may the panel be painted at (0,0) before its single computePosition wrote
    // left/top. Once positioned, stop.
    let sawZeroWhileUnpositioned = false;
    let revealed = false;
    for (let i = 0; i < 90; i++) {
      const positioned = isPositioned(panel);
      if (!positioned && paintedAtZero(panel)) sawZeroWhileUnpositioned = true;
      if (positioned) {
        revealed = true;
        break;
      }
      await nextFrame();
    }

    // Pitfall F1 guard: the panel was never painted at the (0,0) corner unanchored.
    expect(sawZeroWhileUnpositioned).toBe(false);
    // And it did eventually position (the one-shot deferral resolved).
    expect(revealed).toBe(true);

    // The positioned panel sits at a non-(0,0), viewport-anchored rect below the trigger.
    const panelRect = panel.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    expect(panelRect.width).toBeGreaterThan(0);
    expect(panelRect.height).toBeGreaterThan(0);
    expect(panelRect.top === 0 && panelRect.left === 0).toBe(false);
    expect(panelRect.top).toBeGreaterThan(triggerRect.top);
    expect(panelRect.top).toBeGreaterThanOrEqual(triggerRect.bottom - 1);
  });
});

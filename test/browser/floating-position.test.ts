import { describe, expect, it } from 'vitest';

import '../../src/components/popover/popover';
import { deepActiveElement, fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * TEST-06 — floating-ui positioning in a real browser.
 *
 * Runs in the `browser` Vitest project (native layout). This is the only
 * fidelity area with no in-repo analog: jsdom returns all-zero
 * getBoundingClientRect()s, so floating-ui's computePosition() cannot produce a
 * real, viewport-anchored rect there. Chromium computes genuine geometry, which
 * is what we assert here — real computed geometry, NOT exact pixels.
 *
 * am-popover is the representative floating-ui overlay: its `.popover` panel is
 * positioned relative to `firstElementChild` via computePosition/autoUpdate
 * (bottom-start, offset 8).
 *
 * NOTE: deliberately does NOT import getMockInternals or any setup.ts symbol.
 */

type PopoverHost = HTMLElement & { open: boolean };

/** Wait until floating-ui has written a left/top onto the panel (async computePosition). */
async function waitForPosition(panel: HTMLElement): Promise<void> {
  for (let i = 0; i < 20; i++) {
    if (panel.style.left !== '' && panel.style.top !== '') return;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

describe('floating-ui positioning (real Chromium layout)', () => {
  it('positions an opened popover with a non-zero, viewport-anchored rect offset from its trigger', async () => {
    const host = await fixture<PopoverHost>(`
      <am-popover trigger="manual" placement="bottom-start">
        <button class="pop-trigger">Trigger</button>
        <div slot="content">Popover panel content</div>
      </am-popover>
    `);

    const trigger = host.querySelector<HTMLElement>('.pop-trigger')!;
    const panel = shadowQuery<HTMLElement>(host, '.popover');

    host.open = true;
    await waitForUpdate(host);
    await waitForPosition(panel);

    const panelRect = panel.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();

    // Real layout produced a non-zero box (jsdom would report all zeros).
    expect(panelRect.width).toBeGreaterThan(0);
    expect(panelRect.height).toBeGreaterThan(0);

    // The panel is anchored to the viewport (finite, on-screen coordinates).
    expect(Number.isFinite(panelRect.top)).toBe(true);
    expect(Number.isFinite(panelRect.left)).toBe(true);
    expect(panelRect.top).toBeGreaterThanOrEqual(0);
    expect(panelRect.left).toBeGreaterThanOrEqual(0);
    expect(panelRect.right).toBeLessThanOrEqual(window.innerWidth + 1);

    // The panel is placed RELATIVE to the trigger, not parked at (0,0):
    // bottom-start with offset 8 puts it just below and left-aligned to the trigger.
    expect(panelRect.top).toBeGreaterThan(triggerRect.top);
    expect(panelRect.top).toBeGreaterThanOrEqual(triggerRect.bottom - 1);
    expect(panelRect.top - triggerRect.bottom).toBeLessThanOrEqual(24);
    expect(Math.abs(panelRect.left - triggerRect.left)).toBeLessThanOrEqual(24);
  });

  it('preserves focus on the trigger after the async open (ordering contract intact)', async () => {
    // After start() became async (await loadFloating()), the open→position→
    // focus→autoUpdate ordering contract must still hold: the deferred-import
    // seam must not let focus/autoUpdate run ahead and steal focus. am-popover is
    // non-modal and never relocates focus, so the correct post-open target is the
    // trigger it was on — this asserts the async seam introduced no focus race.
    const host = await fixture<PopoverHost>(`
      <am-popover trigger="manual" placement="bottom-start">
        <button class="pop-trigger">Trigger</button>
        <div slot="content"><button class="pop-inner">Inner</button></div>
      </am-popover>
    `);

    const trigger = host.querySelector<HTMLElement>('.pop-trigger')!;
    const panel = shadowQuery<HTMLElement>(host, '.popover');

    trigger.focus();
    expect(deepActiveElement()).toBe(trigger);

    host.open = true;
    await waitForUpdate(host);
    await waitForPosition(panel);

    // Focus stayed on the trigger across the async open (no focus theft / reorder).
    expect(deepActiveElement()).toBe(trigger);

    host.remove();
  });
});

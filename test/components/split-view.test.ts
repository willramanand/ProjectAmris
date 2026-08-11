import { describe, expect, it } from 'vitest';

import '../../src/components/split-view/split-view';
import { fixture, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

// Behavioral coverage for the one genuinely interactive component of the display
// set (D-04). Assertions target only what the source actually implements:
// pointer-drag resize + [0,100] clamp. split-view has NO keyboard resize and NO
// aria-valuenow, so this file deliberately asserts neither.
describe('am-split-view', () => {
  it('reflects orientation and mirrors it onto the divider aria-orientation', async () => {
    const el = await fixture<HTMLElement & { orientation: string }>(
      '<am-split-view><div slot="start">a</div><div slot="end">b</div></am-split-view>',
    );
    expect(el.getAttribute('orientation')).toBe('horizontal');
    expect(shadowQuery<HTMLElement>(el, '.divider').getAttribute('aria-orientation')).toBe(
      'horizontal',
    );

    el.orientation = 'vertical';
    await waitForUpdate(el);
    expect(el.getAttribute('orientation')).toBe('vertical');
    expect(shadowQuery<HTMLElement>(el, '.divider').getAttribute('aria-orientation')).toBe(
      'vertical',
    );
  });

  it('renders start and end named slots plus a role=separator divider part', async () => {
    const el = await fixture<HTMLElement>(
      '<am-split-view><div slot="start">a</div><div slot="end">b</div></am-split-view>',
    );
    const slotNames = Array.from(el.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(slotNames).toContain('start');
    expect(slotNames).toContain('end');

    const divider = shadowQuery<HTMLElement>(el, '[part="divider"]');
    expect(divider.getAttribute('role')).toBe('separator');
  });

  it('clamps an out-of-range position when applying pane sizing', async () => {
    const el = await fixture<HTMLElement & { position: number }>(
      '<am-split-view><div slot="start">a</div><div slot="end">b</div></am-split-view>',
    );

    // Source clamps to Math.max(0, Math.min(100, position)) in updated().
    el.position = 150;
    await waitForUpdate(el);
    expect(el.style.getPropertyValue('--_start-flex')).toBe('100');
    expect(el.style.getPropertyValue('--_end-flex')).toBe('0');

    el.position = -10;
    await waitForUpdate(el);
    expect(el.style.getPropertyValue('--_start-flex')).toBe('0');
    expect(el.style.getPropertyValue('--_end-flex')).toBe('100');
  });

  it('fires am-resize with a clamped position during a pointer drag', async () => {
    const el = await fixture<HTMLElement & { position: number }>(
      '<am-split-view><div slot="start">a</div><div slot="end">b</div></am-split-view>',
    );
    const divider = shadowQuery<HTMLElement>(el, '[part="divider"]');

    // jsdom does not implement pointer capture; stub the no-ops the drag handlers call.
    (divider as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};
    (divider as unknown as { releasePointerCapture: () => void }).releasePointerCapture = () => {};

    const resized = oneEvent<{ position: number }>(el, 'am-resize');
    divider.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, bubbles: true }),
    );
    divider.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 1, clientX: 100, clientY: 100, bubbles: true }),
    );
    const event = await resized;
    divider.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: 1, clientX: 100, clientY: 100, bubbles: true }),
    );

    // jsdom has no layout (zero-size rects), so assert the drag clamp bounds [5,95],
    // not exact geometry.
    expect(Number.isFinite(event.detail.position)).toBe(true);
    expect(event.detail.position).toBeGreaterThanOrEqual(5);
    expect(event.detail.position).toBeLessThanOrEqual(95);
  });
});

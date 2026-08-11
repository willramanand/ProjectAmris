import { describe, expect, it, vi } from 'vitest';

import '../../src/components/tooltip/tooltip';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

describe('am-tooltip', () => {
  it('renders a tooltip element with role="tooltip"', async () => {
    const element = await fixture<HTMLElement>(
      `<am-tooltip content="Help text">
        <button>Hover me</button>
      </am-tooltip>`,
    );
    const tooltip = shadowQuery<HTMLElement>(element, '[role="tooltip"]');

    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent?.trim()).toBe('Help text');
  });

  it('does not render tooltip when content is empty', async () => {
    const element = await fixture<HTMLElement>(
      `<am-tooltip>
        <button>No tip</button>
      </am-tooltip>`,
    );

    expect(element.shadowRoot?.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('shows tooltip on mouseenter after delay', async () => {
    vi.useFakeTimers();

    const element = await fixture<HTMLElement & { delay: number }>(
      `<am-tooltip content="Tip" delay="50">
        <button>Hover</button>
      </am-tooltip>`,
    );

    const trigger = shadowQuery<HTMLElement>(element, '.trigger');
    trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    vi.advanceTimersByTime(50);
    await waitForUpdate(element);

    expect(element.hasAttribute('visible')).toBe(true);

    vi.useRealTimers();
  });

  it('hides tooltip on mouseleave', async () => {
    vi.useFakeTimers();

    const element = await fixture<HTMLElement & { delay: number }>(
      `<am-tooltip content="Tip" delay="0">
        <button>Hover</button>
      </am-tooltip>`,
    );

    const trigger = shadowQuery<HTMLElement>(element, '.trigger');

    // Show it
    trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    vi.advanceTimersByTime(0);
    await waitForUpdate(element);

    // Hide it
    trigger.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    vi.advanceTimersByTime(100);
    await waitForUpdate(element);

    expect(element.hasAttribute('visible')).toBe(false);

    vi.useRealTimers();
  });

  it('does not show when disabled', async () => {
    vi.useFakeTimers();

    const element = await fixture<HTMLElement>(
      `<am-tooltip content="Tip" delay="0" disabled>
        <button>Hover</button>
      </am-tooltip>`,
    );

    const trigger = shadowQuery<HTMLElement>(element, '.trigger');
    trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    vi.advanceTimersByTime(0);
    await waitForUpdate(element);

    expect(element.hasAttribute('visible')).toBe(false);

    vi.useRealTimers();
  });

  // TEST-05 — global-listener teardown (jsdom lifecycle lane).
  // FINDING (Phase 3 FIX-02): unlike the other overlays, am-tooltip attaches NO
  // document-level listeners. Show/hide is driven entirely by element-scoped
  // mouseenter/leave/focusin/out handlers on the shadow `.trigger`, with
  // floating-ui `autoUpdate` cleaned up on hide. There is therefore no
  // document-listener leak surface. This asserts that real, current behavior
  // (green-on-arrival, D-05) rather than an assumed document listener.
  describe('am-tooltip — listener lifecycle (TEST-05)', () => {
    it('does not attach document-level click/keydown listeners across a show/hide cycle', async () => {
      vi.useFakeTimers();

      const element = await fixture<HTMLElement & { delay: number }>(
        `<am-tooltip content="Tip" delay="0">
          <button>Hover</button>
        </am-tooltip>`,
      );

      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');
      const trigger = shadowQuery<HTMLElement>(element, '.trigger');

      // Show.
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      vi.advanceTimersByTime(0);
      await waitForUpdate(element);
      expect(element.hasAttribute('visible')).toBe(true);

      // Hide (balanced visibility cycle — the observable teardown for tooltip).
      trigger.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      vi.advanceTimersByTime(100);
      await waitForUpdate(element);
      expect(element.hasAttribute('visible')).toBe(false);

      // Real behavior: no document-level click/keydown listener is ever added,
      // so none needs tearing down.
      expect(addSpy).not.toHaveBeenCalledWith('click', expect.anything());
      expect(addSpy).not.toHaveBeenCalledWith('keydown', expect.anything());

      addSpy.mockRestore();
      removeSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});

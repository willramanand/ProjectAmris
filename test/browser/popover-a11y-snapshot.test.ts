import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import '../../src/components/popover/popover';
import { checkA11y, formatViolations } from '../a11y-helper';
import { deepActiveElement, fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * popover-a11y-snapshot (RPERF-04, D-04) — REPORT-ONLY hybrid a11y guard.
 *
 * The Phase-9 middleware-slice cache (RPERF-03) changes WHEN the base middleware
 * is assembled, never the rendered DOM: computePosition output is byte-identical
 * and no node is reordered or dropped. This spec is the proof that the churn edit
 * strips NO accessibility DOM from the representative overlay (am-popover — the
 * same overlay the perf scenario measures, so it is apples-to-apples): it
 * snapshots the trigger role + accessible-name tree and asserts EXACT values for
 * the load-bearing structure — the trigger wrapper, the positioned panel, the
 * arrow, their `part` names, and trigger focusability — on the real Chromium
 * browser lane (jsdom cannot compute the accessible tree or real positioning).
 *
 * Hybrid (F-3): explicit `shadowQuery` reads + `deepActiveElement()` are
 * LOAD-BEARING; the `toMatchAriaSnapshot` role/name tree is ADVISORY (A3).
 * Report-only — nothing here flips to enforcing (Phase 11).
 *
 * NOTE: does NOT import any test/setup.ts symbol (browser lane is native).
 */

type PopoverHost = HTMLElement & { open: boolean };

const MARKUP = `
  <am-popover trigger="manual" placement="bottom-start">
    <button class="pop-trigger">Trigger</button>
    <div slot="content">Popover panel content</div>
  </am-popover>
`;

/** Wait until floating-ui has written left/top onto the panel (async computePosition). */
async function waitForPosition(panel: HTMLElement): Promise<void> {
  for (let i = 0; i < 30; i++) {
    if (panel.style.left !== '' && panel.style.top !== '') return;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

describe('am-popover a11y snapshot (real Chromium, report-only)', () => {
  // `page.getByRole('button')` queries the whole document, so a host left mounted
  // by a failing assertion would make the next test's locator ambiguous. Remove
  // every popover after each test regardless of outcome.
  afterEach(() => {
    document.querySelectorAll('am-popover').forEach((el) => el.remove());
  });

  it('preserves the trigger/panel/arrow DOM + trigger focusability when opened', async () => {
    const host = await fixture<PopoverHost>(MARKUP);
    const trigger = host.querySelector<HTMLButtonElement>('.pop-trigger')!;
    const panel = shadowQuery<HTMLElement>(host, '.popover');

    // --- LOAD-BEARING (closed): trigger wrapper + panel + arrow present, with
    // their frozen ::part names; the panel starts hidden-until-positioned. ---
    const triggerWrapper = shadowQuery<HTMLElement>(host, '.trigger');
    expect(triggerWrapper).toBeTruthy();
    expect(panel.getAttribute('part')).toBe('popover');
    const arrow = shadowQuery<HTMLElement>(host, '.arrow');
    expect(arrow.getAttribute('part')).toBe('arrow');
    expect(panel.classList.contains('positioned')).toBe(false);

    // Open -> first computePosition writes left/top and reveals the panel.
    host.open = true;
    await waitForUpdate(host);
    await waitForPosition(panel);

    // --- LOAD-BEARING (open): panel is revealed (positioned) and still carries
    // its part; the slotted trigger stays focusable across the async open. ---
    expect(panel.classList.contains('positioned')).toBe(true);
    expect(panel.getAttribute('part')).toBe('popover');
    expect(shadowQuery<HTMLElement>(host, '.arrow').getAttribute('part')).toBe('arrow');

    trigger.focus();
    expect(deepActiveElement()).toBe(trigger);

    // --- ADVISORY: trigger role + accessible-name tree ---
    await expect.element(page.getByRole('button', { name: 'Trigger' })).toMatchAriaSnapshot();

    // Complementary presence scan (mirrors a11y.browser.test.ts).
    const violations = await checkA11y(host, [], { includeDefaultDisabled: false });
    expect(violations, formatViolations(violations)).toHaveLength(0);

    host.remove();
  });

  it('re-hides the panel on close (positioned reset) without stripping DOM', async () => {
    const host = await fixture<PopoverHost>(MARKUP);
    const panel = shadowQuery<HTMLElement>(host, '.popover');

    host.open = true;
    await waitForUpdate(host);
    await waitForPosition(panel);
    expect(panel.classList.contains('positioned')).toBe(true);

    host.open = false;
    await waitForUpdate(host);

    // Panel + arrow DOM survive the close; only the reveal gate resets.
    expect(panel.classList.contains('positioned')).toBe(false);
    expect(panel.getAttribute('part')).toBe('popover');
    expect(shadowQuery<HTMLElement>(host, '.arrow').getAttribute('part')).toBe('arrow');

    host.remove();
  });
});

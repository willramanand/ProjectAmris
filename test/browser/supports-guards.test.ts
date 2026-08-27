import { describe, expect, it } from 'vitest';

import { fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * COMPAT-06 above-floor regression proof (landmine 3): the
 * `@supports selector(:has(*))` guards must not change above-floor rendering.
 *
 * IMPORTANT EMPIRICAL FINDING (verified in Chromium this phase):
 * `selector(:has(::slotted(*)))` reports FALSE — `::slotted()` is a
 * pseudo-ELEMENT and is INVALID inside `:has()` per the Selectors spec, so the
 * `.X:not(:has(::slotted(*)))` collapse rule is dropped by the engine and has
 * ALWAYS been an inert no-op (empty slots render at their natural display, never
 * `display: none`). Wrapping that inert rule in `@supports selector(:has(*))`
 * (which is TRUE on Chromium) is therefore byte-identical to the pre-change bare
 * rule. Whether the empty-slot-collapse feature should be repaired is a separate,
 * behavior-CHANGING decision out of COMPAT-06's behavior-preserving scope — see
 * the plan SUMMARY deviation + WINDOWS ledger.
 *
 * This spec proves the guard is a SAFE no-op above the floor: the functional
 * default authored OUTSIDE each `@supports` block preserves each region's
 * natural display (`block` for card/panel/app-shell/side-nav; `flex` for the
 * dialog/drawer footers), for BOTH empty and non-empty slots — exactly as the
 * component rendered before the guard was added.
 *
 * Plan 07 widens this spec's engine matrix to WebKit + Firefox; today it runs on
 * the Chromium-only `browser` project (no config change needed here).
 */
import '../../src/components/card/card';

/** getComputedStyle().display of a shadow-part region on a mounted host. */
function regionDisplay(host: HTMLElement, selector: string): string {
  const region = shadowQuery<HTMLElement>(host, selector);
  return getComputedStyle(region).display;
}

describe('COMPAT-06 @supports :has() guards — above-floor unchanged (Chromium)', () => {
  describe('am-card', () => {
    it('renders header/footer at their functional default (block) with empty slots', async () => {
      const el = await fixture<HTMLElement>('<am-card>Body only</am-card>');
      await waitForUpdate(el);

      // Byte-identical to pre-change: the `:not(:has(::slotted(*)))` collapse
      // selector is invalid on every engine, so empty slots have always rendered
      // at their functional default rather than collapsing.
      expect(regionDisplay(el, '.header')).toBe('block');
      expect(regionDisplay(el, '.footer')).toBe('block');
    });

    it('renders header/footer at their functional default (block) with non-empty slots', async () => {
      const el = await fixture<HTMLElement>(
        '<am-card><span slot="header">Title</span>Body<span slot="footer">Actions</span></am-card>',
      );
      await waitForUpdate(el);

      expect(regionDisplay(el, '.header')).toBe('block');
      expect(regionDisplay(el, '.footer')).toBe('block');
    });
  });
});

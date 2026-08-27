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
import '../../src/components/panel/panel';
import '../../src/components/dialog/dialog';
import '../../src/components/app-shell/app-shell';

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

  describe('am-panel', () => {
    it('renders header at its functional default (block), empty and non-empty', async () => {
      const empty = await fixture<HTMLElement>('<am-panel>Body</am-panel>');
      await waitForUpdate(empty);
      expect(regionDisplay(empty, '.header')).toBe('block');

      const filled = await fixture<HTMLElement>(
        '<am-panel><span slot="header">Title</span>Body</am-panel>',
      );
      await waitForUpdate(filled);
      expect(regionDisplay(filled, '.header')).toBe('block');
    });
  });

  describe('am-dialog', () => {
    it('renders footer at its functional default (flex), empty and non-empty', async () => {
      const empty = (await fixture<HTMLElement>(
        '<am-dialog label="Confirm" open>Body</am-dialog>',
      )) as HTMLElement & { open: boolean };
      await waitForUpdate(empty);
      // The dialog footer's functional default is `display: flex` (authored
      // outside the @supports block); the guard must not clobber it.
      expect(regionDisplay(empty, '.footer')).toBe('flex');

      const filled = (await fixture<HTMLElement>(
        '<am-dialog label="Confirm" open>Body<span slot="footer">OK</span></am-dialog>',
      )) as HTMLElement & { open: boolean };
      await waitForUpdate(filled);
      expect(regionDisplay(filled, '.footer')).toBe('flex');
    });
  });

  describe('am-app-shell', () => {
    it('renders header/sidebar/footer at their functional default (block)', async () => {
      const empty = await fixture<HTMLElement>('<am-app-shell>Main</am-app-shell>');
      await waitForUpdate(empty);
      expect(regionDisplay(empty, '.header')).toBe('block');
      expect(regionDisplay(empty, '.sidebar')).toBe('block');
      expect(regionDisplay(empty, '.footer')).toBe('block');

      const filled = await fixture<HTMLElement>(
        '<am-app-shell><span slot="header">H</span><span slot="sidebar">S</span>Main<span slot="footer">F</span></am-app-shell>',
      );
      await waitForUpdate(filled);
      expect(regionDisplay(filled, '.header')).toBe('block');
      expect(regionDisplay(filled, '.sidebar')).toBe('block');
      expect(regionDisplay(filled, '.footer')).toBe('block');
    });
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/accordion/accordion';
import { click, fixture, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-accordion-item', () => {
  it('toggles open on header click and emits am-toggle', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-accordion-item>
        <span slot="header">Section 1</span>
        Content for section 1.
      </am-accordion-item>`,
    );
    const header = shadowQuery<HTMLButtonElement>(element, '.header');

    expect(element.open).toBe(false);
    expect(header.getAttribute('aria-expanded')).toBe('false');

    const eventPromise = oneEvent<{ open: boolean }>(element, 'am-toggle');
    await click(header, element);
    const event = await eventPromise;

    expect(element.open).toBe(true);
    expect(event.detail.open).toBe(true);
    expect(header.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles via keyboard Enter', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-accordion-item>
        <span slot="header">Section</span>
        Body
      </am-accordion-item>`,
    );
    const header = shadowQuery<HTMLButtonElement>(element, '.header');

    await keydown(header, 'Enter', element);

    expect(element.open).toBe(true);
  });

  it('does not toggle when disabled', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      `<am-accordion-item disabled>
        <span slot="header">Disabled</span>
        Body
      </am-accordion-item>`,
    );
    const header = shadowQuery<HTMLButtonElement>(element, '.header');

    await click(header, element);

    expect(element.open).toBe(false);
  });
});

describe('am-accordion', () => {
  it('closes other items in single mode', async () => {
    const element = await fixture<HTMLElement>(
      `<am-accordion single>
        <am-accordion-item open>
          <span slot="header">First</span>
          Content 1
        </am-accordion-item>
        <am-accordion-item>
          <span slot="header">Second</span>
          Content 2
        </am-accordion-item>
      </am-accordion>`,
    );

    await waitForUpdate(element);

    const items = element.querySelectorAll('am-accordion-item') as NodeListOf<
      HTMLElement & { open: boolean }
    >;

    expect(items[0].open).toBe(true);
    expect(items[1].open).toBe(false);

    // Click the second item's header
    const secondHeader = shadowQuery<HTMLButtonElement>(items[1], '.header');
    await click(secondHeader, items[1]);
    await waitForUpdate(element);

    expect(items[0].open).toBe(false);
    expect(items[1].open).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/pagination/pagination';
import { click, fixture, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-pagination', () => {
  it('sets role="navigation" and aria-label', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="10" page="1"></am-pagination>',
    );

    expect(element.getAttribute('role')).toBe('navigation');
    expect(element.getAttribute('aria-label')).toBe('Pagination');
  });

  it('marks the current page with aria-current', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="5" page="3"></am-pagination>',
    );

    const buttons = element.shadowRoot!.querySelectorAll('button');
    const currentBtn = Array.from(buttons).find(b => b.getAttribute('aria-current') === 'page');

    expect(currentBtn).toBeTruthy();
    expect(currentBtn!.textContent?.trim()).toBe('3');
  });

  it('emits am-change when clicking a page', async () => {
    const element = await fixture<HTMLElement & { page: number }>(
      '<am-pagination total="5" page="1"></am-pagination>',
    );

    // Find the button for page 2
    const buttons = element.shadowRoot!.querySelectorAll('button');
    const page2Btn = Array.from(buttons).find(b => b.textContent?.trim() === '2');
    expect(page2Btn).toBeTruthy();

    const eventPromise = oneEvent<{ page: number }>(element, 'am-change');
    await click(page2Btn!, element);
    const event = await eventPromise;

    expect(event.detail.page).toBe(2);
    expect(element.page).toBe(2);
  });

  it('disables the previous button on page 1', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="5" page="1"></am-pagination>',
    );

    const prevBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="Previous page"]');
    expect(prevBtn.disabled).toBe(true);
  });

  it('disables the next button on the last page', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="5" page="5"></am-pagination>',
    );

    const nextBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="Next page"]');
    expect(nextBtn.disabled).toBe(true);
  });

  it('navigates via next/previous buttons', async () => {
    const element = await fixture<HTMLElement & { page: number }>(
      '<am-pagination total="5" page="3"></am-pagination>',
    );

    const nextBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="Next page"]');
    const eventPromise = oneEvent<{ page: number }>(element, 'am-change');
    await click(nextBtn, element);
    const event = await eventPromise;

    expect(event.detail.page).toBe(4);
    expect(element.page).toBe(4);
  });

  it('shows ellipsis for large page counts', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="50" page="25" siblings="1"></am-pagination>',
    );

    const ellipses = element.shadowRoot!.querySelectorAll('.ellipsis');
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });

  it('shows all pages when total is small', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="5" page="3"></am-pagination>',
    );

    const buttons = element.shadowRoot!.querySelectorAll('button');
    // Should have: prev, 1, 2, 3, 4, 5, next = 7 buttons
    const pageButtons = Array.from(buttons).filter(b => !b.hasAttribute('aria-label'));
    expect(pageButtons.length).toBe(5);
  });

  it('navigates via previous button', async () => {
    const element = await fixture<HTMLElement & { page: number }>(
      '<am-pagination total="5" page="3"></am-pagination>',
    );

    const prevBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="Previous page"]');
    const eventPromise = oneEvent<{ page: number }>(element, 'am-change');
    await click(prevBtn, element);
    const event = await eventPromise;

    expect(event.detail.page).toBe(2);
  });

  it('does not emit am-change when clicking current page', async () => {
    const element = await fixture<HTMLElement & { page: number }>(
      '<am-pagination total="5" page="3"></am-pagination>',
    );

    let fired = false;
    element.addEventListener('am-change', () => { fired = true; });

    const buttons = element.shadowRoot!.querySelectorAll('button');
    const currentBtn = Array.from(buttons).find(b => b.getAttribute('aria-current') === 'page');
    await click(currentBtn!, element);

    expect(fired).toBe(false);
  });

  it('shows right ellipsis only near the start', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="50" page="2" siblings="1"></am-pagination>',
    );

    const ellipses = element.shadowRoot!.querySelectorAll('.ellipsis');
    expect(ellipses.length).toBe(1);
  });

  it('shows left ellipsis only near the end', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="50" page="49" siblings="1"></am-pagination>',
    );

    const ellipses = element.shadowRoot!.querySelectorAll('.ellipsis');
    expect(ellipses.length).toBe(1);
  });
});

describe('am-pagination simple variant', () => {
  it('renders simple variant with first/prev/next/last buttons', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="10" page="5" variant="simple"></am-pagination>',
    );

    const firstBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="First page"]');
    const prevBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="Previous page"]');
    const nextBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="Next page"]');
    const lastBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="Last page"]');

    expect(firstBtn).toBeTruthy();
    expect(prevBtn).toBeTruthy();
    expect(nextBtn).toBeTruthy();
    expect(lastBtn).toBeTruthy();
  });

  it('shows page indicator text', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="10" page="5" variant="simple"></am-pagination>',
    );

    const indicator = element.shadowRoot?.querySelector('.page-indicator');
    expect(indicator?.textContent).toContain('5');
    expect(indicator?.textContent).toContain('10');
  });

  it('navigates to first page', async () => {
    const element = await fixture<HTMLElement & { page: number }>(
      '<am-pagination total="10" page="5" variant="simple"></am-pagination>',
    );

    const firstBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="First page"]');
    const eventPromise = oneEvent<{ page: number }>(element, 'am-change');
    await click(firstBtn, element);
    const event = await eventPromise;

    expect(event.detail.page).toBe(1);
  });

  it('navigates to last page', async () => {
    const element = await fixture<HTMLElement & { page: number }>(
      '<am-pagination total="10" page="5" variant="simple"></am-pagination>',
    );

    const lastBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="Last page"]');
    const eventPromise = oneEvent<{ page: number }>(element, 'am-change');
    await click(lastBtn, element);
    const event = await eventPromise;

    expect(event.detail.page).toBe(10);
  });

  it('disables first/prev on page 1', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="10" page="1" variant="simple"></am-pagination>',
    );

    const firstBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="First page"]');
    const prevBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="Previous page"]');

    expect(firstBtn.disabled).toBe(true);
    expect(prevBtn.disabled).toBe(true);
  });

  it('disables next/last on last page', async () => {
    const element = await fixture<HTMLElement>(
      '<am-pagination total="10" page="10" variant="simple"></am-pagination>',
    );

    const nextBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="Next page"]');
    const lastBtn = shadowQuery<HTMLButtonElement>(element, 'button[aria-label="Last page"]');

    expect(nextBtn.disabled).toBe(true);
    expect(lastBtn.disabled).toBe(true);
  });
});

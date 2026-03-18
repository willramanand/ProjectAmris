import { describe, expect, it } from 'vitest';

import '../../src/components/tabs/tabs';
import { click, fixture, keydown, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-tabs', () => {
  async function createTabs(attrs = '') {
    const element = await fixture<HTMLElement & { activePanel: string; variant: string }>(
      `<am-tabs ${attrs}>
        <am-tab slot="nav" panel="one">Tab 1</am-tab>
        <am-tab slot="nav" panel="two">Tab 2</am-tab>
        <am-tab slot="nav" panel="three" disabled>Tab 3</am-tab>
        <am-tab-panel name="one">Content 1</am-tab-panel>
        <am-tab-panel name="two">Content 2</am-tab-panel>
        <am-tab-panel name="three">Content 3</am-tab-panel>
      </am-tabs>`,
    );
    await waitForUpdate(element);
    return element;
  }

  it('auto-selects the first tab on init', async () => {
    const element = await createTabs();

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<
      HTMLElement & { selected: boolean; panel: string }
    >;
    const panels = element.querySelectorAll('am-tab-panel') as NodeListOf<
      HTMLElement & { active: boolean }
    >;

    expect(element.activePanel).toBe('one');
    expect(tabs[0].selected).toBe(true);
    expect(tabs[1].selected).toBe(false);
    expect(panels[0].active).toBe(true);
    expect(panels[1].active).toBe(false);
  });

  it('switches tab on click and emits am-tab-change', async () => {
    const element = await createTabs();

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;

    const eventPromise = oneEvent<{ panel: string }>(element, 'am-tab-change');
    await click(tabs[1], element);
    const event = await eventPromise;

    expect(event.detail.panel).toBe('two');
    expect(element.activePanel).toBe('two');

    const panels = element.querySelectorAll('am-tab-panel') as NodeListOf<
      HTMLElement & { active: boolean }
    >;
    expect(panels[0].active).toBe(false);
    expect(panels[1].active).toBe(true);
  });

  it('sets correct ARIA attributes', async () => {
    const element = await createTabs();

    const tablist = shadowQuery<HTMLElement>(element, '[role="tablist"]');
    expect(tablist).toBeTruthy();
    expect(tablist.getAttribute('aria-orientation')).toBe('horizontal');

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;
    const tabButton = shadowQuery<HTMLButtonElement>(tabs[0], 'button');
    expect(tabButton.getAttribute('role')).toBe('tab');
    expect(tabButton.getAttribute('aria-selected')).toBe('true');

    const panels = element.querySelectorAll('am-tab-panel') as NodeListOf<HTMLElement>;
    expect(panels[0].getAttribute('role')).toBe('tabpanel');
  });

  it('skips disabled tabs when clicking', async () => {
    const element = await createTabs();

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;

    // Click the disabled tab
    await click(tabs[2], element);

    // Should remain on first tab
    expect(element.activePanel).toBe('one');
  });

  it('navigates forward with ArrowRight in horizontal mode', async () => {
    const element = await createTabs();

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;

    const eventPromise = oneEvent<{ panel: string }>(element, 'am-tab-change');
    await keydown(tabs[0], 'ArrowRight', element);
    const event = await eventPromise;

    expect(event.detail.panel).toBe('two');
    expect(element.activePanel).toBe('two');
  });

  it('navigates backward with ArrowLeft in horizontal mode', async () => {
    const element = await createTabs();

    // First go to tab two
    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;
    await click(tabs[1], element);
    expect(element.activePanel).toBe('two');

    const eventPromise = oneEvent<{ panel: string }>(element, 'am-tab-change');
    await keydown(tabs[1], 'ArrowLeft', element);
    const event = await eventPromise;

    expect(event.detail.panel).toBe('one');
  });

  it('wraps around forward from last enabled tab', async () => {
    const element = await createTabs();

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;

    // Go to tab two (last enabled)
    await click(tabs[1], element);
    expect(element.activePanel).toBe('two');

    // ArrowRight should wrap to first tab (skipping disabled tab three)
    const eventPromise = oneEvent<{ panel: string }>(element, 'am-tab-change');
    await keydown(tabs[1], 'ArrowRight', element);
    const event = await eventPromise;

    expect(event.detail.panel).toBe('one');
  });

  it('navigates to first tab with Home key', async () => {
    const element = await createTabs();

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;

    // Go to tab two first
    await click(tabs[1], element);
    expect(element.activePanel).toBe('two');

    const eventPromise = oneEvent<{ panel: string }>(element, 'am-tab-change');
    await keydown(tabs[1], 'Home', element);
    const event = await eventPromise;

    expect(event.detail.panel).toBe('one');
  });

  it('navigates to last tab with End key', async () => {
    const element = await createTabs();

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;

    // End should go to last enabled tab (tab two, since three is disabled)
    const eventPromise = oneEvent<{ panel: string }>(element, 'am-tab-change');
    await keydown(tabs[0], 'End', element);
    const event = await eventPromise;

    expect(event.detail.panel).toBe('two');
  });

  it('uses ArrowDown/ArrowUp in vertical mode', async () => {
    const element = await createTabs('variant="vertical"');

    const tablist = shadowQuery<HTMLElement>(element, '[role="tablist"]');
    expect(tablist.getAttribute('aria-orientation')).toBe('vertical');

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;

    // ArrowDown should navigate forward in vertical mode
    const eventPromise = oneEvent<{ panel: string }>(element, 'am-tab-change');
    await keydown(tabs[0], 'ArrowDown', element);
    const event = await eventPromise;

    expect(event.detail.panel).toBe('two');
  });

  it('ArrowUp navigates backward in vertical mode', async () => {
    const element = await createTabs('variant="vertical"');

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;

    // Go to tab two
    await click(tabs[1], element);
    expect(element.activePanel).toBe('two');

    const eventPromise = oneEvent<{ panel: string }>(element, 'am-tab-change');
    await keydown(tabs[1], 'ArrowUp', element);
    const event = await eventPromise;

    expect(event.detail.panel).toBe('one');
  });

  it('does not respond to ArrowLeft/ArrowRight in vertical mode', async () => {
    const element = await createTabs('variant="vertical"');

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;

    // ArrowRight should do nothing in vertical mode
    await keydown(tabs[0], 'ArrowRight', element);

    expect(element.activePanel).toBe('one');
  });

  it('reflects active-panel attribute', async () => {
    const element = await createTabs('active-panel="two"');

    expect(element.activePanel).toBe('two');

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<
      HTMLElement & { selected: boolean }
    >;
    expect(tabs[0].selected).toBe(false);
    expect(tabs[1].selected).toBe(true);
  });

  it('does not emit am-tab-change when clicking already active tab', async () => {
    const element = await createTabs();

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;
    let fired = false;
    element.addEventListener('am-tab-change', () => { fired = true; });

    // Click the already-active first tab
    await click(tabs[0], element);

    expect(fired).toBe(false);
    expect(element.activePanel).toBe('one');
  });

  it('propagates variant to child tabs', async () => {
    const element = await createTabs('variant="pill"');

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<
      HTMLElement & { variant: string }
    >;

    expect(tabs[0].variant).toBe('pill');
    expect(tabs[1].variant).toBe('pill');
  });

  it('tab button has correct tabindex based on selection', async () => {
    const element = await createTabs();

    const tabs = element.querySelectorAll('am-tab') as NodeListOf<HTMLElement>;
    const selectedButton = shadowQuery<HTMLButtonElement>(tabs[0], 'button');
    const unselectedButton = shadowQuery<HTMLButtonElement>(tabs[1], 'button');

    expect(selectedButton.getAttribute('tabindex')).toBe('0');
    expect(unselectedButton.getAttribute('tabindex')).toBe('-1');
  });
});

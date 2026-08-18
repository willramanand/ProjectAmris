import { describe, expect, it } from 'vitest';

import '../../src/components/combobox/combobox';
import '../../src/components/select/select';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * combobox-virtual (PERF-03) — proves the am-combobox and am-select option
 * popups virtualize 1000+ options in a real browser, a11y-correct:
 *
 * - `aria-setsize` on rendered options equals the FULL filtered total (state),
 *   never the mounted-window count (Pitfall 2 / T-04-22).
 * - Navigating to an option outside the window (End) scrolls it into the DOM and
 *   sets `aria-activedescendant` to an id that resolves to a LIVE node — never a
 *   dangling id (T-04-21). Scroll happens BEFORE activedescendant is surfaced.
 * - Selecting a far (virtualized) option preserves the form value through native
 *   ElementInternals even after recycling — value is state-driven, not node-driven.
 * - Only a windowed subset of options is mounted at once.
 *
 * Runs in the `browser` Vitest project (native Chromium): jsdom mocks
 * ResizeObserver, so the virtualizer's windowing + scroll-into-view is not
 * observable there. This suite OMITS test/setup.ts, so FormData assertions
 * exercise the real native ElementInternals path.
 */

const raf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

async function waitForNodes(host: HTMLElement, selector: string): Promise<HTMLElement[]> {
  for (let i = 0; i < 60; i++) {
    const nodes = Array.from(host.shadowRoot?.querySelectorAll<HTMLElement>(selector) ?? []);
    if (nodes.length > 0) return nodes;
    await raf();
  }
  return Array.from(host.shadowRoot?.querySelectorAll<HTMLElement>(selector) ?? []);
}

// ============================================================================
// am-combobox (string-array options, text mode)
// ============================================================================

type ComboboxEl = HTMLElement & {
  value: string;
  options: string[];
  updateComplete: Promise<unknown>;
};

const COMBO_OPTIONS = Array.from({ length: 1000 }, (_v, i) => `Option ${i}`);

async function makeCombobox(nameAttr = ''): Promise<ComboboxEl> {
  const el = await fixture<ComboboxEl>(`<am-combobox label="Pick" ${nameAttr}></am-combobox>`);
  el.options = [...COMBO_OPTIONS];
  await waitForUpdate(el);
  return el;
}

async function openCombobox(el: ComboboxEl): Promise<HTMLInputElement> {
  const input = shadowQuery<HTMLInputElement>(el, 'input');
  input.focus();
  input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
  await waitForUpdate(el);
  await waitForNodes(el, '.option');
  return input;
}

describe('am-combobox virtualization (real Chromium)', () => {
  it('mounts only a windowed subset of options, each carrying the full-total aria-setsize', async () => {
    const el = await makeCombobox();
    await openCombobox(el);

    const options = await waitForNodes(el, '.option');
    // Windowed: nowhere near 1000 option nodes in the DOM.
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThan(200);

    // Every rendered option reports the FULL filtered total, not the window size.
    for (const opt of options) {
      expect(opt.getAttribute('aria-setsize')).toBe('1000');
    }
    // aria-posinset is the 1-based absolute index (first mounted option is 0 → 1).
    expect(options[0].getAttribute('aria-posinset')).toBe('1');

    el.remove();
  });

  it('End scrolls a far option into the window and points aria-activedescendant at a LIVE id', async () => {
    const el = await makeCombobox();
    const input = await openCombobox(el);

    // Navigate to the last option — far outside the initial window.
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }));
    await waitForUpdate(el);

    // Wait for the virtualizer to mount the target and the activedescendant to
    // resolve to a live node in the shadow root.
    let activeId: string | null = null;
    let live: Element | null = null;
    for (let i = 0; i < 60; i++) {
      activeId = input.getAttribute('aria-activedescendant');
      live = activeId ? (el.shadowRoot?.getElementById(activeId) ?? null) : null;
      if (live) break;
      await raf();
    }

    expect(activeId).not.toBeNull();
    // The referenced id resolves to a LIVE option node (never a dangling id).
    expect(live).not.toBeNull();
    expect(live?.getAttribute('role')).toBe('option');
    // It is the last option (absolute posinset 1000).
    expect(live?.getAttribute('aria-posinset')).toBe('1000');
    expect(live?.textContent?.trim()).toBe('Option 999');

    el.remove();
  });

  it('preserves the form value after selecting a far (virtualized) option (native setFormValue)', async () => {
    const form = await fixture<HTMLFormElement>(
      '<form><am-combobox name="pick" label="Pick"></am-combobox></form>',
    );
    const el = form.querySelector('am-combobox') as ComboboxEl;
    el.options = [...COMBO_OPTIONS];
    await waitForUpdate(el);

    const input = await openCombobox(el);

    // Jump to the last option, then commit it with Enter.
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }));
    await waitForUpdate(el);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await waitForUpdate(el);

    expect(el.value).toBe('Option 999');
    // The value reaches a real FormData through native ElementInternals even
    // though the option node was virtualized out of the initial window.
    expect(new FormData(form).get('pick')).toBe('Option 999');

    form.remove();
  });
});

// ============================================================================
// am-select (slotted am-option elements)
// ============================================================================

type SelectEl = HTMLElement & { value: string; updateComplete: Promise<unknown> };

function selectOptionsMarkup(n: number): string {
  return Array.from({ length: n }, (_v, i) => `<am-option value="v${i}">Opt ${i}</am-option>`).join('');
}

async function openSelect(el: SelectEl): Promise<HTMLButtonElement> {
  const trigger = shadowQuery<HTMLButtonElement>(el, '.trigger');
  trigger.click();
  await waitForUpdate(el);
  await waitForNodes(el, '.v-option');
  return trigger;
}

describe('am-select virtualization (real Chromium)', () => {
  it('mounts only a windowed subset of options, each carrying the full-total aria-setsize', async () => {
    const el = await fixture<SelectEl>(`<am-select label="Pick">${selectOptionsMarkup(1000)}</am-select>`);
    await waitForUpdate(el);
    await waitForUpdate(el);
    await openSelect(el);

    const options = await waitForNodes(el, '.v-option');
    expect(options.length).toBeGreaterThan(0);
    expect(options.length).toBeLessThan(200);

    for (const opt of options) {
      expect(opt.getAttribute('aria-setsize')).toBe('1000');
    }
    expect(options[0].getAttribute('aria-posinset')).toBe('1');

    // The slotted projection is hidden; the windowed rows are the visible options.
    const slot = el.shadowRoot?.querySelector('slot');
    expect(slot?.classList.contains('options-hidden')).toBe(true);

    el.remove();
  });

  it('End scrolls a far option into the window and points aria-activedescendant at a LIVE id', async () => {
    const el = await fixture<SelectEl>(`<am-select label="Pick">${selectOptionsMarkup(1000)}</am-select>`);
    await waitForUpdate(el);
    await waitForUpdate(el);
    const trigger = await openSelect(el);
    const listbox = shadowQuery<HTMLElement>(el, '[role="listbox"]');

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }));
    await waitForUpdate(el);

    let activeId: string | null = null;
    let live: Element | null = null;
    for (let i = 0; i < 60; i++) {
      activeId = listbox.getAttribute('aria-activedescendant');
      live = activeId ? (el.shadowRoot?.getElementById(activeId) ?? null) : null;
      if (live) break;
      await raf();
    }

    expect(activeId).not.toBeNull();
    expect(live).not.toBeNull();
    expect(live?.getAttribute('role')).toBe('option');
    expect(live?.getAttribute('aria-posinset')).toBe('1000');
    expect(live?.textContent?.trim()).toBe('Opt 999');

    el.remove();
  });

  it('preserves the form value after selecting a far (virtualized) option (native setFormValue)', async () => {
    const form = await fixture<HTMLFormElement>(
      `<form><am-select name="country" label="Pick">${selectOptionsMarkup(1000)}</am-select></form>`,
    );
    const el = form.querySelector('am-select') as SelectEl;
    await waitForUpdate(el);
    await waitForUpdate(el);

    const trigger = await openSelect(el);

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true }));
    await waitForUpdate(el);
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    await waitForUpdate(el);

    expect(el.value).toBe('v999');
    expect(new FormData(form).get('country')).toBe('v999');

    form.remove();
  });
});

import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import '../../src/components/combobox/combobox';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

/**
 * combobox-a11y-snapshot (RPERF-04, D-04) — the report-only accessible-name/role
 * guard proving the Plan 02 filter memo (RPERF-02) strips NO accessibility DOM.
 *
 * Runs in the `browser` Vitest project (real Chromium): the accessibility tree,
 * `aria-activedescendant` resolution, and the `role=combobox` + option
 * `aria-posinset`/`aria-setsize`/`aria-selected` attributes are computed from the
 * real engine, not jsdom mocks. Report-only — no gating flip (Phase 11).
 *
 * Hybrid design (RESEARCH F-3 / A3): `toMatchAriaSnapshot()` captures the role +
 * accessible-name tree (advisory, stored in the committed `.snap`); the
 * load-bearing assertions are the EXACT attribute values read via `shadowQuery`
 * (A3 — Chromium AX-name computation can drift, but the attribute strings the memo
 * must preserve are exact). Small option sets (< 100, the virtualization
 * threshold) keep the deterministic `repeat()` render path so the DOM is stable.
 *
 * NOTE: in text mode `value` IS the filter query, so the "all options visible"
 * states use `value=''`; a `value` that equals an option filters to that single
 * matching row (which is where `aria-selected="true"` is observable).
 */

const OPTIONS = ['Apple', 'Banana', 'Cherry'];

const raf = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

type ComboboxEl = HTMLElement & {
  value: string;
  options: string[];
  updateComplete: Promise<unknown>;
};

async function makeCombobox(opts: string[], value = ''): Promise<ComboboxEl> {
  const el = await fixture<ComboboxEl>('<am-combobox label="Pick"></am-combobox>');
  el.options = [...opts];
  if (value) el.value = value;
  await waitForUpdate(el);
  return el;
}

async function open(el: ComboboxEl): Promise<HTMLInputElement> {
  const input = shadowQuery<HTMLInputElement>(el, 'input');
  input.focus();
  input.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
  await waitForUpdate(el);
  return input;
}

async function optionRows(el: ComboboxEl): Promise<HTMLElement[]> {
  return Array.from(el.shadowRoot?.querySelectorAll<HTMLElement>('.option') ?? []);
}

describe('combobox a11y name/role snapshot (real Chromium, report-only)', () => {
  it('open combobox: role=combobox + accessible-name tree + in-range aria-activedescendant', async () => {
    const el = await makeCombobox(OPTIONS);
    const input = await open(el);

    // (1) Advisory: role + accessible-name tree of the focusable combobox
    // (stored in the committed .snap; drift here flags an accessible-name change).
    await expect.element(page.getByRole('combobox')).toMatchAriaSnapshot();

    // (2) Load-bearing: the input IS the role=combobox focusable.
    expect(input.getAttribute('role')).toBe('combobox');

    // Move the highlight in range (ArrowDown -> index 0); aria-activedescendant
    // must resolve to a LIVE option id.
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true }));
    await waitForUpdate(el);
    const activeId = input.getAttribute('aria-activedescendant');
    expect(activeId).not.toBeNull();
    const active = activeId ? el.shadowRoot?.getElementById(activeId) : null;
    expect(active).not.toBeNull();
    expect(active?.getAttribute('role')).toBe('option');
    expect(active?.getAttribute('aria-posinset')).toBe('1');

    // (3) Load-bearing: option rows carry exact posinset/setsize/selected.
    const rows = await optionRows(el);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.getAttribute('aria-posinset'))).toEqual(['1', '2', '3']);
    for (const r of rows) expect(r.getAttribute('aria-setsize')).toBe('3');
    // aria-selected is driven by `value` — empty value selects nothing.
    expect(rows.map((r) => r.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false']);

    el.remove();
  });

  it('a value matching an option marks that row aria-selected="true" (value-driven, not node presence)', async () => {
    // value === 'Apple' both filters to the single matching row AND selects it.
    const el = await makeCombobox(OPTIONS, 'Apple');
    await open(el);

    const rows = await optionRows(el);
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent?.trim()).toBe('Apple');
    expect(rows[0].getAttribute('aria-selected')).toBe('true');
    expect(rows[0].getAttribute('aria-posinset')).toBe('1');
    expect(rows[0].getAttribute('aria-setsize')).toBe('1');

    el.remove();
  });

  it('out-of-range highlight clamps aria-activedescendant to nothing (FIX-02, no dangling id)', async () => {
    const el = await makeCombobox(OPTIONS);
    const input = await open(el);

    // Force a transiently-stale index beyond the rendered total. The clamp must
    // yield NO activedescendant rather than point at an absent id (FIX-02) —
    // WITHOUT re-clamping the state.
    (el as unknown as { _highlightedIndex: number })._highlightedIndex = 99;
    (el as unknown as { requestUpdate(): void }).requestUpdate();
    await waitForUpdate(el);

    expect(input.getAttribute('aria-activedescendant')).toBeNull();

    el.remove();
  });

  it('empty-results state: a single aria-disabled "No results" option row, no posinset rows', async () => {
    const el = await makeCombobox(OPTIONS);
    const input = await open(el);

    // Type a query that matches nothing -> the empty "No results" row shape.
    input.value = 'zzz';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await waitForUpdate(el);
    await raf();

    // No real option rows remain.
    const rows = await optionRows(el);
    expect(rows).toHaveLength(0);

    const empty = shadowQuery<HTMLElement>(el, '.empty');
    expect(empty.getAttribute('role')).toBe('option');
    expect(empty.getAttribute('aria-disabled')).toBe('true');
    expect(empty.textContent?.trim()).toBe('No results');

    el.remove();
  });

  it('single-option state: one option row, aria-setsize=1 / aria-posinset=1 (integer positions)', async () => {
    const el = await makeCombobox(['Solo']);
    await open(el);

    const rows = await optionRows(el);
    expect(rows).toHaveLength(1);
    // aria-setsize/aria-posinset are INTEGER positions (array-index derived), not
    // string length — a single option is setsize 1, posinset 1 (edge: encoding).
    expect(rows[0].getAttribute('aria-setsize')).toBe('1');
    expect(rows[0].getAttribute('aria-posinset')).toBe('1');
    expect(rows[0].getAttribute('aria-selected')).toBe('false');
    expect(rows[0].getAttribute('role')).toBe('option');

    el.remove();
  });
});

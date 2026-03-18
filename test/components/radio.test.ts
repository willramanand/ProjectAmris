import { describe, expect, it } from 'vitest';

import '../../src/components/radio/radio';
import {
  click,
  fixture,
  getMockInternals,
  keydown,
  oneEvent,
  shadowQuery,
  waitForUpdate,
} from '../helpers';

describe('am-radio', () => {
  it('selects on click and emits am-change', async () => {
    const element = await fixture<HTMLElement & { checked: boolean; value: string }>(
      '<am-radio value="a">Option A</am-radio>',
    );
    const eventPromise = oneEvent<{ checked: boolean; value: string }>(element, 'am-change');

    await click(element, element);

    const event = await eventPromise;
    const control = shadowQuery<HTMLElement>(element, '.control');

    expect(element.checked).toBe(true);
    expect(event.detail.checked).toBe(true);
    expect(event.detail.value).toBe('a');
    expect(control.getAttribute('aria-checked')).toBe('true');
    expect(getMockInternals(element).formValue).toBe('a');
  });

  it('does not toggle off when already checked', async () => {
    const element = await fixture<HTMLElement & { checked: boolean }>(
      '<am-radio value="a" checked>Option A</am-radio>',
    );

    await click(element, element);

    expect(element.checked).toBe(true);
  });

  it('supports keyboard selection with Space', async () => {
    const element = await fixture<HTMLElement & { checked: boolean }>(
      '<am-radio value="b"></am-radio>',
    );
    const control = shadowQuery<HTMLElement>(element, '.control');

    await keydown(control, ' ', element);

    expect(element.checked).toBe(true);
  });

  it('supports keyboard selection with Enter', async () => {
    const element = await fixture<HTMLElement & { checked: boolean }>(
      '<am-radio value="b"></am-radio>',
    );
    const control = shadowQuery<HTMLElement>(element, '.control');

    await keydown(control, 'Enter', element);

    expect(element.checked).toBe(true);
  });

  it('does not select when disabled', async () => {
    const element = await fixture<HTMLElement & { checked: boolean }>(
      '<am-radio value="c" disabled>Disabled</am-radio>',
    );

    await click(element, element);

    expect(element.checked).toBe(false);
  });

  it('forwards aria-label to the inner control', async () => {
    const element = await fixture<HTMLElement>(
      '<am-radio value="x" aria-label="Select row"></am-radio>',
    );
    const control = shadowQuery<HTMLElement>(element, '.control');

    expect(control.getAttribute('aria-label')).toBe('Select row');
  });

  it('sets aria-disabled when disabled', async () => {
    const element = await fixture<HTMLElement>(
      '<am-radio value="x" disabled></am-radio>',
    );
    const control = shadowQuery<HTMLElement>(element, '.control');

    expect(control.getAttribute('aria-disabled')).toBe('true');
  });

  it('clears form value when unchecked', async () => {
    const element = await fixture<HTMLElement & { checked: boolean; value: string }>(
      '<am-radio value="a" checked></am-radio>',
    );

    expect(getMockInternals(element).formValue).toBe('a');

    element.checked = false;
    await waitForUpdate(element);

    expect(getMockInternals(element).formValue).toBeNull();
  });
});

describe('am-radio-group', () => {
  it('selects a radio and deselects others via click', async () => {
    const group = await fixture<HTMLElement & { value: string }>(
      `<am-radio-group label="Plan" value="free">
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
      </am-radio-group>`,
    );

    await waitForUpdate(group);

    const radios = group.querySelectorAll('am-radio') as NodeListOf<
      HTMLElement & { checked: boolean; value: string }
    >;

    expect(radios[0].checked).toBe(true);
    expect(radios[1].checked).toBe(false);

    const eventPromise = oneEvent<{ value: string }>(group, 'am-change');
    await click(radios[1], group);
    const event = await eventPromise;

    expect(event.detail.value).toBe('pro');
    expect(group.value).toBe('pro');
    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(true);
  });

  it('sets the radiogroup role and aria-label', async () => {
    const group = await fixture<HTMLElement>(
      '<am-radio-group label="Size"></am-radio-group>',
    );

    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Size');
  });

  it('removes aria-label when label is cleared', async () => {
    const group = await fixture<HTMLElement & { label: string }>(
      '<am-radio-group label="Size"></am-radio-group>',
    );

    expect(group.getAttribute('aria-label')).toBe('Size');

    group.label = '';
    await waitForUpdate(group);

    expect(group.hasAttribute('aria-label')).toBe(false);
  });

  it('navigates forward with ArrowDown', async () => {
    const group = await fixture<HTMLElement & { value: string }>(
      `<am-radio-group label="Plan" value="free">
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
        <am-radio value="enterprise">Enterprise</am-radio>
      </am-radio-group>`,
    );

    await waitForUpdate(group);

    const radios = group.querySelectorAll('am-radio') as NodeListOf<HTMLElement>;
    const eventPromise = oneEvent<{ value: string }>(group, 'am-change');
    await keydown(radios[0], 'ArrowDown', group);
    const event = await eventPromise;

    expect(event.detail.value).toBe('pro');
    expect(group.value).toBe('pro');
  });

  it('navigates forward with ArrowRight', async () => {
    const group = await fixture<HTMLElement & { value: string }>(
      `<am-radio-group label="Plan" value="free">
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
      </am-radio-group>`,
    );

    await waitForUpdate(group);

    const radios = group.querySelectorAll('am-radio') as NodeListOf<HTMLElement>;
    const eventPromise = oneEvent<{ value: string }>(group, 'am-change');
    await keydown(radios[0], 'ArrowRight', group);
    const event = await eventPromise;

    expect(event.detail.value).toBe('pro');
  });

  it('navigates backward with ArrowUp', async () => {
    const group = await fixture<HTMLElement & { value: string }>(
      `<am-radio-group label="Plan" value="pro">
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
        <am-radio value="enterprise">Enterprise</am-radio>
      </am-radio-group>`,
    );

    await waitForUpdate(group);

    const radios = group.querySelectorAll('am-radio') as NodeListOf<HTMLElement>;
    const eventPromise = oneEvent<{ value: string }>(group, 'am-change');
    await keydown(radios[1], 'ArrowUp', group);
    const event = await eventPromise;

    expect(event.detail.value).toBe('free');
  });

  it('navigates backward with ArrowLeft', async () => {
    const group = await fixture<HTMLElement & { value: string }>(
      `<am-radio-group label="Plan" value="pro">
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
      </am-radio-group>`,
    );

    await waitForUpdate(group);

    const radios = group.querySelectorAll('am-radio') as NodeListOf<HTMLElement>;
    const eventPromise = oneEvent<{ value: string }>(group, 'am-change');
    await keydown(radios[1], 'ArrowLeft', group);
    const event = await eventPromise;

    expect(event.detail.value).toBe('free');
  });

  it('wraps around forward from last radio', async () => {
    const group = await fixture<HTMLElement & { value: string }>(
      `<am-radio-group label="Plan" value="pro">
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
      </am-radio-group>`,
    );

    await waitForUpdate(group);

    const radios = group.querySelectorAll('am-radio') as NodeListOf<HTMLElement>;
    const eventPromise = oneEvent<{ value: string }>(group, 'am-change');
    await keydown(radios[1], 'ArrowDown', group);
    const event = await eventPromise;

    expect(event.detail.value).toBe('free');
  });

  it('wraps around backward from first radio', async () => {
    const group = await fixture<HTMLElement & { value: string }>(
      `<am-radio-group label="Plan" value="free">
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
      </am-radio-group>`,
    );

    await waitForUpdate(group);

    const radios = group.querySelectorAll('am-radio') as NodeListOf<HTMLElement>;
    const eventPromise = oneEvent<{ value: string }>(group, 'am-change');
    await keydown(radios[0], 'ArrowUp', group);
    const event = await eventPromise;

    expect(event.detail.value).toBe('pro');
  });

  it('sets form value from group value', async () => {
    const group = await fixture<HTMLElement & { value: string }>(
      `<am-radio-group label="Plan" value="pro">
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
      </am-radio-group>`,
    );

    await waitForUpdate(group);

    expect(getMockInternals(group).formValue).toBe('pro');
  });

  it('disables all radios when group is disabled', async () => {
    const group = await fixture<HTMLElement & { disabled: boolean }>(
      `<am-radio-group label="Plan" value="free" disabled>
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
      </am-radio-group>`,
    );

    await waitForUpdate(group);

    const radios = group.querySelectorAll('am-radio') as NodeListOf<
      HTMLElement & { disabled: boolean }
    >;

    expect(radios[0].disabled).toBe(true);
    expect(radios[1].disabled).toBe(true);
  });

  it('sets roving tabindex — only selected radio is tabbable', async () => {
    const group = await fixture<HTMLElement & { value: string }>(
      `<am-radio-group label="Plan" value="pro">
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
      </am-radio-group>`,
    );

    await waitForUpdate(group);

    const radios = group.querySelectorAll('am-radio') as NodeListOf<HTMLElement>;
    const control0 = shadowQuery<HTMLElement>(radios[0], '.control');
    const control1 = shadowQuery<HTMLElement>(radios[1], '.control');

    expect(control0.getAttribute('tabindex')).toBe('-1');
    expect(control1.getAttribute('tabindex')).toBe('0');
  });

  it('gives first enabled radio tabindex 0 when no value set', async () => {
    const group = await fixture<HTMLElement & { value: string }>(
      `<am-radio-group label="Plan">
        <am-radio value="free">Free</am-radio>
        <am-radio value="pro">Pro</am-radio>
      </am-radio-group>`,
    );

    await waitForUpdate(group);

    const radios = group.querySelectorAll('am-radio') as NodeListOf<HTMLElement>;
    const control0 = shadowQuery<HTMLElement>(radios[0], '.control');
    const control1 = shadowQuery<HTMLElement>(radios[1], '.control');

    expect(control0.getAttribute('tabindex')).toBe('0');
    expect(control1.getAttribute('tabindex')).toBe('-1');
  });
});

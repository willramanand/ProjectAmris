import { describe, expect, it } from 'vitest';

import '../../src/components/checkbox/checkbox';
import {
  click,
  fixture,
  getMockInternals,
  keydown,
  oneEvent,
  shadowQuery,
} from '../helpers';

describe('am-checkbox', () => {
  it('toggles on click, updates aria state, and emits am-change', async () => {
    const element = await fixture<HTMLElement & { checked: boolean }>(
      '<am-checkbox>Accept terms</am-checkbox>',
    );
    const eventPromise = oneEvent<{ checked: boolean }>(element, 'am-change');

    await click(element, element);

    const event = await eventPromise;
    const control = shadowQuery<HTMLElement>(element, '.control');

    expect(element.checked).toBe(true);
    expect(event.detail.checked).toBe(true);
    expect(control.getAttribute('aria-checked')).toBe('true');
    expect(getMockInternals(element).formValue).toBe('on');
  });

  it('supports keyboard toggling from the visual control', async () => {
    const element = await fixture<HTMLElement & { checked: boolean }>(
      '<am-checkbox></am-checkbox>',
    );
    const control = shadowQuery<HTMLElement>(element, '.control');

    await keydown(control, ' ', element);

    expect(element.checked).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/switch/switch';
import { click, fixture, keydown, oneEvent, shadowQuery } from '../helpers';

describe('am-switch', () => {
  it('toggles on click and emits change', async () => {
    const element = await fixture<HTMLElement & { checked: boolean }>(
      '<am-switch>Notifications</am-switch>',
    );
    const eventPromise = oneEvent(element, 'change');

    await click(element, element);

    const event = await eventPromise;
    const track = shadowQuery<HTMLElement>(element, '.track');
    const target = event.target as HTMLElement & { checked: boolean };

    expect(element.checked).toBe(true);
    expect(target.checked).toBe(true);
    expect(track.getAttribute('aria-checked')).toBe('true');
  });

  it('supports keyboard toggling and ignores interaction while loading', async () => {
    const element = await fixture<
      HTMLElement & { checked: boolean; loading: boolean }
    >('<am-switch></am-switch>');
    const track = shadowQuery<HTMLElement>(element, '.track');

    await keydown(track, ' ', element);
    expect(element.checked).toBe(true);

    element.loading = true;
    await click(element, element);

    expect(element.checked).toBe(true);
  });
});

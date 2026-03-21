import { describe, expect, it } from 'vitest';

import '../../src/components/search-field/search-field';
import {
  click,
  fixture,
  inputText,
  keydown,
  oneEvent,
  shadowQuery,
  waitForUpdate,
} from '../helpers';

describe('am-search-field', () => {
  it('syncs input value and emits input', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-search-field placeholder="Search..."></am-search-field>',
    );
    const input = shadowQuery<HTMLInputElement>(element, 'input');
    const eventPromise = oneEvent(element, 'input');

    await inputText(input, 'test query', element);

    const event = await eventPromise;
    const target = event.target as HTMLElement & { value: string };
    expect(element.value).toBe('test query');
    expect(target.value).toBe('test query');
  });

  it('emits am-search on Enter key', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-search-field></am-search-field>',
    );
    const input = shadowQuery<HTMLInputElement>(element, 'input');

    element.value = 'find me';
    await waitForUpdate(element);

    const eventPromise = oneEvent<{ value: string }>(element, 'am-search');
    await keydown(input, 'Enter', element);
    const event = await eventPromise;

    expect(event.detail.value).toBe('find me');
  });

  it('shows clear button when value exists and clears on click', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-search-field></am-search-field>',
    );
    const input = shadowQuery<HTMLInputElement>(element, 'input');

    await inputText(input, 'something', element);

    const clearBtn = shadowQuery<HTMLButtonElement>(element, '.clear-btn');
    expect(clearBtn).toBeTruthy();

    const clearEvent = oneEvent(element, 'am-clear');
    await click(clearBtn, element);
    await clearEvent;

    expect(element.value).toBe('');
  });

  it('uses placeholder as aria-label', async () => {
    const element = await fixture<HTMLElement>(
      '<am-search-field placeholder="Find items"></am-search-field>',
    );
    const input = shadowQuery<HTMLInputElement>(element, 'input');

    expect(input.getAttribute('aria-label')).toBe('Find items');
  });
});

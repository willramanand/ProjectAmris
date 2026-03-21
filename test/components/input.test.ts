import { describe, expect, it } from 'vitest';

import '../../src/components/input/input';
import {
  click,
  fixture,
  inputText,
  mount,
  oneEvent,
  shadowQuery,
  waitForUpdate,
} from '../helpers';

describe('am-input', () => {
  it('syncs the input value and emits input events', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-input label="Email"></am-input>',
    );
    const input = shadowQuery<HTMLInputElement>(element, 'input');
    const eventPromise = oneEvent(element, 'input');

    await inputText(input, 'hello@example.com', element);

    const event = await eventPromise;
    const target = event.target as HTMLElement & { value: string };

    expect(element.value).toBe('hello@example.com');
    expect(target.value).toBe('hello@example.com');
    expect(input.getAttribute('aria-label')).toBe('Email');
  });

  it('renders the clear button and clears the value when clicked', async () => {
    const element = document.createElement('am-input') as HTMLElement & {
      clearable: boolean;
      value: string;
    };
    element.clearable = true;
    element.value = 'Draft';

    await mount(element);
    await waitForUpdate(element);

    const clearEvent = oneEvent(element, 'am-clear');
    const clearButton = shadowQuery<HTMLButtonElement>(element, '.clear-btn');

    await click(clearButton, element);
    await clearEvent;

    expect(element.value).toBe('');
    expect(shadowQuery<HTMLInputElement>(element, 'input').value).toBe('');
  });
});

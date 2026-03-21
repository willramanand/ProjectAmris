import { describe, expect, it } from 'vitest';

import '../../src/components/textarea/textarea';
import {
  click,
  fixture,
  inputText,
  mount,
  oneEvent,
  shadowQuery,
  waitForUpdate,
} from '../helpers';

describe('am-textarea', () => {
  it('syncs the textarea value and emits input', async () => {
    const element = await fixture<HTMLElement & { value: string }>(
      '<am-textarea label="Notes"></am-textarea>',
    );
    const textarea = shadowQuery<HTMLTextAreaElement>(element, 'textarea');
    const eventPromise = oneEvent(element, 'input');

    await inputText(textarea, 'Hello world', element);

    const event = await eventPromise;
    const target = event.target as HTMLElement & { value: string };

    expect(element.value).toBe('Hello world');
    expect(target.value).toBe('Hello world');
    expect(textarea.getAttribute('aria-label')).toBe('Notes');
  });

  it('renders the clear button and clears the value', async () => {
    const element = document.createElement('am-textarea') as HTMLElement & {
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
  });

  it('shows floating label in floated state when focused', async () => {
    const element = await fixture<HTMLElement>(
      '<am-textarea label="Bio"></am-textarea>',
    );

    const textarea = shadowQuery<HTMLTextAreaElement>(element, 'textarea');
    textarea.dispatchEvent(new Event('focus', { bubbles: true, composed: true }));
    await waitForUpdate(element);

    const wrapper = shadowQuery<HTMLElement>(element, '.wrapper');
    expect(wrapper.classList.contains('floated')).toBe(true);
    expect(wrapper.classList.contains('focused')).toBe(true);
  });

  it('reflects invalid state', async () => {
    const element = await fixture<HTMLElement & { invalid: boolean }>(
      '<am-textarea label="Required" invalid></am-textarea>',
    );

    const wrapper = shadowQuery<HTMLElement>(element, '.wrapper');
    expect(wrapper.classList.contains('invalid')).toBe(true);

    const textarea = shadowQuery<HTMLTextAreaElement>(element, 'textarea');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
  });
});

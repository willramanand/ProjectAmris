import { describe, expect, it } from 'vitest';

import '../../src/components/spinner/spinner';
import { fixture, shadowQuery } from '../helpers';

describe('am-spinner', () => {
  it('renders with role="status" and default label', async () => {
    const element = await fixture<HTMLElement>(
      '<am-spinner></am-spinner>',
    );

    const spinner = shadowQuery<HTMLElement>(element, '[role="status"]');
    expect(spinner).toBeTruthy();
    expect(spinner.getAttribute('aria-label')).toBe('Loading');
  });

  it('uses a custom label', async () => {
    const element = await fixture<HTMLElement>(
      '<am-spinner label="Saving"></am-spinner>',
    );

    const spinner = shadowQuery<HTMLElement>(element, '[role="status"]');
    expect(spinner.getAttribute('aria-label')).toBe('Saving');
  });

  it('reflects the size attribute', async () => {
    const element = await fixture<HTMLElement>(
      '<am-spinner size="lg"></am-spinner>',
    );

    expect(element.getAttribute('size')).toBe('lg');
  });

  it('renders the spinner div', async () => {
    const element = await fixture<HTMLElement>(
      '<am-spinner></am-spinner>',
    );

    const spinner = shadowQuery<HTMLElement>(element, '.spinner');
    expect(spinner).toBeTruthy();
  });
});

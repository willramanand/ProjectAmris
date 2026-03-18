import { describe, expect, it } from 'vitest';

import '../../src/components/progress/progress';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

describe('am-progress', () => {
  it('renders a progressbar with correct ARIA attributes', async () => {
    const element = await fixture<HTMLElement>(
      '<am-progress value="60" label="Upload"></am-progress>',
    );
    const track = shadowQuery<HTMLElement>(element, '[role="progressbar"]');

    expect(track.getAttribute('aria-label')).toBe('Upload');
    expect(track.getAttribute('aria-valuenow')).toBe('60');
    expect(track.getAttribute('aria-valuemin')).toBe('0');
    expect(track.getAttribute('aria-valuemax')).toBe('100');
  });

  it('clamps the progress percentage to 0–100', async () => {
    const element = await fixture<HTMLElement & { value: number; max: number }>(
      '<am-progress value="150" max="100"></am-progress>',
    );
    const track = shadowQuery<HTMLElement>(element, '[role="progressbar"]');

    // Clamped to 100
    expect(track.getAttribute('aria-valuenow')).toBe('100');
  });

  it('reflects variant and size attributes', async () => {
    const element = await fixture<HTMLElement>(
      '<am-progress variant="success" size="lg"></am-progress>',
    );

    expect(element.getAttribute('variant')).toBe('success');
    expect(element.getAttribute('size')).toBe('lg');
  });

  it('renders indeterminate state without aria-valuenow', async () => {
    const element = await fixture<HTMLElement>(
      '<am-progress indeterminate></am-progress>',
    );
    const track = shadowQuery<HTMLElement>(element, '[role="progressbar"]');

    expect(element.hasAttribute('indeterminate')).toBe(true);
  });

  it('uses default label when none provided', async () => {
    const element = await fixture<HTMLElement>(
      '<am-progress value="20"></am-progress>',
    );
    const track = shadowQuery<HTMLElement>(element, '[role="progressbar"]');

    expect(track.getAttribute('aria-label')).toBe('Progress');
  });
});

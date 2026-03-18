import { describe, expect, it } from 'vitest';

import '../../src/components/avatar/avatar';
import { fixture, shadowQuery, waitForUpdate } from '../helpers';

describe('am-avatar', () => {
  it('renders an image when src is provided', async () => {
    const element = await fixture<HTMLElement>(
      '<am-avatar src="https://example.com/photo.jpg" alt="Jane Doe"></am-avatar>',
    );
    const img = shadowQuery<HTMLImageElement>(element, 'img');

    expect(img.src).toContain('photo.jpg');
    expect(img.alt).toBe('Jane Doe');
  });

  it('renders initials when no src is given', async () => {
    const element = await fixture<HTMLElement>(
      '<am-avatar initials="JD"></am-avatar>',
    );
    const initials = shadowQuery<HTMLElement>(element, '.initials');

    expect(initials.textContent).toBe('JD');
    expect(initials.getAttribute('aria-label')).toBe('JD');
  });

  it('renders fallback icon when neither src nor initials are provided', async () => {
    const element = await fixture<HTMLElement>(
      '<am-avatar></am-avatar>',
    );
    const fallback = shadowQuery<SVGElement>(element, '.fallback-icon');

    expect(fallback).toBeTruthy();
    expect(fallback.getAttribute('aria-hidden')).toBe('true');
  });

  it('falls back to initials on image error', async () => {
    const element = await fixture<HTMLElement & { src: string }>(
      '<am-avatar src="bad-url.jpg" initials="AB"></am-avatar>',
    );

    const img = shadowQuery<HTMLImageElement>(element, 'img');
    img.dispatchEvent(new Event('error'));
    await waitForUpdate(element);

    const initials = shadowQuery<HTMLElement>(element, '.initials');
    expect(initials.textContent).toBe('AB');
  });

  it('reflects size and shape attributes', async () => {
    const element = await fixture<HTMLElement>(
      '<am-avatar size="lg" shape="square" initials="XY"></am-avatar>',
    );

    expect(element.getAttribute('size')).toBe('lg');
    expect(element.getAttribute('shape')).toBe('square');
  });
});

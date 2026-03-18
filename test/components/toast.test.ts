import { describe, expect, it, vi } from 'vitest';

import '../../src/components/toast/toast';
import { AmToast, AmToastRegion } from '../../src/components/toast/toast';
import { click, fixture, oneEvent, shadowQuery, waitForUpdate } from '../helpers';

describe('am-toast', () => {
  it('renders with role="status" and aria-live', async () => {
    const element = await fixture<HTMLElement>(
      '<am-toast open>Saved!</am-toast>',
    );

    expect(element.getAttribute('role')).toBe('status');
    expect(element.getAttribute('aria-live')).toBe('polite');
    expect(element.hasAttribute('open')).toBe(true);
  });

  it('reflects variant attribute', async () => {
    const element = await fixture<HTMLElement>(
      '<am-toast variant="success" open>Done</am-toast>',
    );

    expect(element.getAttribute('variant')).toBe('success');
  });

  it('renders close button when closable', async () => {
    const element = await fixture<HTMLElement>(
      '<am-toast open closable>Notification</am-toast>',
    );

    const closeBtn = shadowQuery<HTMLButtonElement>(element, '.close-btn');
    expect(closeBtn).toBeTruthy();
    expect(closeBtn.getAttribute('aria-label')).toBe('Dismiss');
  });

  it('does not render close button when not closable', async () => {
    const element = await fixture<HTMLElement & { closable: boolean }>(
      '<am-toast open>Notification</am-toast>',
    );

    element.closable = false;
    await waitForUpdate(element);

    expect(element.shadowRoot?.querySelector('.close-btn')).toBeNull();
  });

  it('hides when open is false', async () => {
    const element = await fixture<HTMLElement & { open: boolean }>(
      '<am-toast>Hidden</am-toast>',
    );

    expect(element.open).toBe(false);
    expect(element.hasAttribute('open')).toBe(false);
  });

  it('auto-dismisses after duration', async () => {
    vi.useFakeTimers();

    const element = await fixture<HTMLElement & { open: boolean; duration: number }>(
      '<am-toast open duration="100">Quick</am-toast>',
    );

    expect(element.open).toBe(true);

    vi.advanceTimersByTime(100);
    // The dismiss sets a 300ms fallback timeout
    vi.advanceTimersByTime(300);

    expect(element.open).toBe(false);

    vi.useRealTimers();
  });

  it('does not auto-dismiss when duration is 0', async () => {
    vi.useFakeTimers();

    const element = await fixture<HTMLElement & { open: boolean; duration: number }>(
      '<am-toast open duration="0">Persistent</am-toast>',
    );

    expect(element.open).toBe(true);

    vi.advanceTimersByTime(10000);

    expect(element.open).toBe(true);

    vi.useRealTimers();
  });

  it('fires am-close when dismissed', async () => {
    vi.useFakeTimers();

    const element = await fixture<HTMLElement & { open: boolean; duration: number }>(
      '<am-toast open duration="50">Bye</am-toast>',
    );

    let closed = false;
    element.addEventListener('am-close', () => { closed = true; });

    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(300);

    expect(closed).toBe(true);
    expect(element.open).toBe(false);

    vi.useRealTimers();
  });

  it('dismisses on close button click', async () => {
    vi.useFakeTimers();

    const element = await fixture<HTMLElement & { open: boolean; duration: number }>(
      '<am-toast open duration="0" closable>Click to close</am-toast>',
    );

    const closeBtn = shadowQuery<HTMLButtonElement>(element, '.close-btn');
    let closed = false;
    element.addEventListener('am-close', () => { closed = true; });

    await click(closeBtn, element);
    // _dismiss adds 'dismissing' class and has a 300ms fallback
    vi.advanceTimersByTime(300);

    expect(closed).toBe(true);
    expect(element.open).toBe(false);

    vi.useRealTimers();
  });

  it('pauses timer on mouse enter and resumes on mouse leave', async () => {
    vi.useFakeTimers();

    const element = await fixture<HTMLElement & { open: boolean; duration: number }>(
      '<am-toast open duration="200">Hover me</am-toast>',
    );

    const toast = shadowQuery<HTMLElement>(element, '.toast');

    // Advance halfway
    vi.advanceTimersByTime(100);
    expect(element.open).toBe(true);

    // Mouse enter — pauses timer
    toast.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    // Advance way past the original duration — should stay open
    vi.advanceTimersByTime(500);
    expect(element.open).toBe(true);

    // Mouse leave — resumes timer with remaining time (~100ms)
    toast.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

    // Advance past remaining time
    vi.advanceTimersByTime(150);
    vi.advanceTimersByTime(300); // dismiss fallback

    expect(element.open).toBe(false);

    vi.useRealTimers();
  });

  it('renders countdown ring when duration > 0', async () => {
    const element = await fixture<HTMLElement>(
      '<am-toast open duration="5000" closable>With ring</am-toast>',
    );

    const ring = element.shadowRoot?.querySelector('.countdown-ring');
    expect(ring).toBeTruthy();
    expect(ring?.querySelector('circle')).toBeTruthy();
  });

  it('does not render countdown ring when duration is 0', async () => {
    const element = await fixture<HTMLElement>(
      '<am-toast open duration="0" closable>No ring</am-toast>',
    );

    const ring = element.shadowRoot?.querySelector('.countdown-ring');
    expect(ring).toBeNull();
  });

  it('renders default icon per variant', async () => {
    const infoToast = await fixture<HTMLElement>(
      '<am-toast open variant="info">Info</am-toast>',
    );
    expect(infoToast.shadowRoot?.querySelector('.icon svg')).toBeTruthy();

    const successToast = await fixture<HTMLElement>(
      '<am-toast open variant="success">Success</am-toast>',
    );
    expect(successToast.shadowRoot?.querySelector('.icon svg')).toBeTruthy();

    const warningToast = await fixture<HTMLElement>(
      '<am-toast open variant="warning">Warning</am-toast>',
    );
    expect(warningToast.shadowRoot?.querySelector('.icon svg')).toBeTruthy();

    const dangerToast = await fixture<HTMLElement>(
      '<am-toast open variant="danger">Danger</am-toast>',
    );
    expect(dangerToast.shadowRoot?.querySelector('.icon svg')).toBeTruthy();
  });

  it('restarts timer when duration changes', async () => {
    vi.useFakeTimers();

    const element = await fixture<HTMLElement & { open: boolean; duration: number }>(
      '<am-toast open duration="500">Timer test</am-toast>',
    );

    // Change duration before original fires
    vi.advanceTimersByTime(100);
    element.duration = 200;
    await waitForUpdate(element);

    // Advance past new duration
    vi.advanceTimersByTime(200);
    vi.advanceTimersByTime(300);

    expect(element.open).toBe(false);

    vi.useRealTimers();
  });
});

describe('am-toast-region', () => {
  it('renders with placement attribute', async () => {
    const element = await fixture<HTMLElement>(
      '<am-toast-region placement="top-right"></am-toast-region>',
    );

    expect(element.getAttribute('placement')).toBe('top-right');
  });

  it('defaults to bottom-center placement', async () => {
    const element = await fixture<HTMLElement>(
      '<am-toast-region></am-toast-region>',
    );

    expect(element.getAttribute('placement')).toBe('bottom-center');
  });

  it('creates a toast via the toast() instance method', async () => {
    const region = await fixture<AmToastRegion>(
      '<am-toast-region></am-toast-region>',
    );

    const toast = region.toast({ message: 'Hello!', variant: 'success' });

    expect(toast).toBeInstanceOf(AmToast);
    expect(toast.variant).toBe('success');
    expect(toast.open).toBe(true);
    expect(toast.textContent).toBe('Hello!');

    // Toast should be a child of the region
    expect(region.querySelector('am-toast')).toBe(toast);
  });

  it('toast() respects duration and closable options', async () => {
    const region = await fixture<AmToastRegion>(
      '<am-toast-region></am-toast-region>',
    );

    const toast = region.toast({ message: 'Custom', duration: 10000, closable: false });

    expect(toast.duration).toBe(10000);
    expect(toast.closable).toBe(false);
  });

  it('removes toast from region on am-close', async () => {
    vi.useFakeTimers();

    const region = await fixture<AmToastRegion>(
      '<am-toast-region></am-toast-region>',
    );

    region.toast({ message: 'Auto remove', duration: 50 });

    expect(region.querySelector('am-toast')).toBeTruthy();

    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(300);

    expect(region.querySelector('am-toast')).toBeNull();

    vi.useRealTimers();
  });

  it('static show() creates region if none exists', () => {
    // Remove any existing region
    document.querySelectorAll('am-toast-region').forEach(el => el.remove());

    const toast = AmToastRegion.show({ message: 'Auto region', variant: 'info' });

    expect(toast).toBeInstanceOf(AmToast);
    expect(document.querySelector('am-toast-region')).toBeTruthy();
    expect(toast.variant).toBe('info');

    // Cleanup
    document.querySelector('am-toast-region')?.remove();
  });

  it('static show() reuses existing region', async () => {
    const region = await fixture<AmToastRegion>(
      '<am-toast-region></am-toast-region>',
    );

    const toast = AmToastRegion.show({ message: 'Reuse', variant: 'warning' });

    expect(toast.variant).toBe('warning');
    // Should be child of the already-existing region
    expect(region.querySelector('am-toast')).toBe(toast);
  });
});

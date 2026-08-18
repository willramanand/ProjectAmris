import { describe, expect, it, vi } from 'vitest';
import type { ReactiveControllerHost } from 'lit';

import {
  ValidationController,
  type ValidationControllerOptions,
} from '../../src/internal/controllers/validation';

/**
 * D-03 precedence + D-01 timing logic for the shared ValidationController, in
 * the jsdom logic lane. This suite drives the controller in isolation with a
 * stub host and a stub ElementInternals whose `validationMessage` we control
 * directly — it does NOT depend on jsdom's native constraint engine, so the
 * precedence rules are asserted deterministically. Real ElementInternals timing
 * is proven separately in the Chromium browser lane (validation-timing /
 * validation-aria).
 */

type StubInternals = { validationMessage: string };

function makeController(nativeMessage = ''): {
  controller: ValidationController;
  internals: StubInternals;
  requestUpdate: ReturnType<typeof vi.fn>;
} {
  const internals: StubInternals = { validationMessage: nativeMessage };
  const requestUpdate = vi.fn();
  const host = {
    addController: vi.fn(),
    requestUpdate,
  } as unknown as ReactiveControllerHost & HTMLElement;

  const opts: ValidationControllerOptions = {
    internals: () => internals as unknown as ElementInternals,
    anchor: () => null,
    describedById: 'err-1',
  };

  const controller = new ValidationController(host, opts);
  return { controller, internals, requestUpdate };
}

describe('ValidationController — D-03 precedence + D-01 timing', () => {
  it('registers itself with the host on construction', () => {
    const requestUpdate = vi.fn();
    const addController = vi.fn();
    const host = { addController, requestUpdate } as unknown as ReactiveControllerHost &
      HTMLElement;
    new ValidationController(host, {
      internals: () => ({ validationMessage: '' }) as unknown as ElementInternals,
      anchor: () => null,
      describedById: 'err-x',
    });
    expect(addController).toHaveBeenCalledOnce();
  });

  it('does NOT show the native message until markTouched (D-01 timing gate)', () => {
    const { controller } = makeController('Constraints not satisfied');
    // Pristine: a native violation exists but the field has not been touched.
    expect(controller.invalid).toBe(false);

    controller.markTouched();
    expect(controller.invalid).toBe(true);
    expect(controller.message).toBe('Constraints not satisfied');
  });

  it('custom error overrides the native message (D-03 custom-wins)', () => {
    const { controller } = makeController('Constraints not satisfied');
    controller.setCustomError('Email already registered');
    // A programmatic custom error shows immediately (no touch required) and wins.
    expect(controller.invalid).toBe(true);
    expect(controller.message).toBe('Email already registered');
  });

  it("setCustomError('') falls back to the native constraint message", () => {
    const { controller } = makeController('Constraints not satisfied');
    controller.markTouched();
    controller.setCustomError('Email already registered');
    expect(controller.message).toBe('Email already registered');

    controller.setCustomError('');
    expect(controller.message).toBe('Constraints not satisfied');
    expect(controller.invalid).toBe(true);
  });

  it("setCustomError('') with no native violation clears the error entirely (EDGE)", () => {
    const { controller } = makeController(''); // no native violation
    controller.setCustomError('Server says no');
    expect(controller.invalid).toBe(true);

    controller.setCustomError('');
    expect(controller.message).toBe('');
    expect(controller.invalid).toBe(false);
  });

  it('never throws when internals access fails; resolves to empty/valid', () => {
    const requestUpdate = vi.fn();
    const host = { addController: vi.fn(), requestUpdate } as unknown as ReactiveControllerHost &
      HTMLElement;
    const controller = new ValidationController(host, {
      internals: () => {
        throw new Error('internals not attached');
      },
      anchor: () => null,
      describedById: 'err-throw',
    });

    controller.markTouched();
    expect(() => controller.message).not.toThrow();
    expect(controller.message).toBe('');
    expect(controller.invalid).toBe(false);
  });

  it('requests a host update on setCustomError and markTouched', () => {
    const { controller, requestUpdate } = makeController('');
    controller.setCustomError('x');
    controller.markTouched();
    expect(requestUpdate).toHaveBeenCalledTimes(2);
  });

  it('exposes the stable describedById for host aria-describedby wiring', () => {
    const { controller } = makeController('');
    expect(controller.describedById).toBe('err-1');
  });
});

import { describe, expect, it } from 'vitest';

import '../../src/components/input/input';
import {
  syncFormFallback,
  teardownFormFallback,
} from '../../src/internal/helpers/form-participation';
import { fixture } from '../helpers';

/**
 * COMPAT-03 real-browser fidelity proof (D-03: value + native validation).
 *
 * Real Chromium is always ABOVE the ElementInternals floor, so this spec cannot
 * force capability-off natively (the jsdom lane does that). Instead it drives the
 * fallback helpers DIRECTLY against a real `am-input` host mounted in a real
 * `<form>` — as Plan 02's unit test does, but now against a REAL component
 * instance and asserting NATIVE (not jsdom-mock) `FormData` + constraint
 * validation. The host markup carries no `name`, so the host's own (empty)
 * ElementInternals value is not serialized and the Light-DOM mirror is the sole
 * contributor for the probed name (isolating the fallback channel).
 *
 * Widened to WebKit + Firefox by Plan 07; runs on the `browser` (Chromium)
 * project today.
 */

type LitEl = HTMLElement & { updateComplete?: Promise<unknown> };

/** Await the host custom element's render before touching the light-DOM mirror. */
async function settle(host: Element | null): Promise<void> {
  const el = host as LitEl | null;
  if (el?.updateComplete) await el.updateComplete;
  await Promise.resolve();
}

describe('form-fallback (Light-DOM hidden-input mirror, real browser)', () => {
  it('mirrors the value into a real FormData (parity + idempotent single node + teardown)', async () => {
    const form = await fixture<HTMLFormElement>('<form><am-input></am-input></form>');
    const host = form.querySelector('am-input') as HTMLElement;
    await settle(host);

    syncFormFallback(host, { name: 'email', value: 'user@example.com' });
    expect(new FormData(form).get('email')).toBe('user@example.com');

    // Re-sync updates the SAME node — no duplicate append.
    syncFormFallback(host, { name: 'email', value: 'changed@example.com' });
    expect(host.querySelectorAll('input[data-am-fallback]').length).toBe(1);
    expect(new FormData(form).get('email')).toBe('changed@example.com');

    // Teardown removes the mirror; the value leaves FormData (no leak).
    teardownFormFallback(host);
    expect(host.querySelectorAll('input[data-am-fallback]').length).toBe(0);
    expect(new FormData(form).get('email')).toBeNull();
  });

  it('projects native `required` so the form is invalid while empty and valid once filled', async () => {
    const form = await fixture<HTMLFormElement>('<form><am-input></am-input></form>');
    const host = form.querySelector('am-input') as HTMLElement;
    await settle(host);

    // required + empty -> native constraint validation blocks submit.
    syncFormFallback(host, { name: 'email', value: '', required: true });
    expect(form.checkValidity()).toBe(false);

    // Filled -> the constraint is satisfied.
    syncFormFallback(host, { name: 'email', value: 'user@example.com', required: true });
    expect(form.checkValidity()).toBe(true);

    teardownFormFallback(host);
  });

  it('projects native `pattern` so a non-matching value invalidates the form', async () => {
    const form = await fixture<HTMLFormElement>('<form><am-input></am-input></form>');
    const host = form.querySelector('am-input') as HTMLElement;
    await settle(host);

    // digits-only pattern; a lettered value fails native constraint validation.
    syncFormFallback(host, { name: 'code', value: 'abc', required: true, pattern: '\\d+' });
    expect(form.checkValidity()).toBe(false);

    // A matching value satisfies it.
    syncFormFallback(host, { name: 'code', value: '123', required: true, pattern: '\\d+' });
    expect(form.checkValidity()).toBe(true);

    teardownFormFallback(host);
  });
});

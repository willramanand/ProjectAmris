import { afterEach, describe, expect, it, vi } from 'vitest';

// COMPAT-03 standalone proof (10-02 Task 1). form-participation.ts is
// capabilities.ts-agnostic and depends on no component, so these specs drive it
// with a plain synthetic host (`<div>`) and rely on jsdom's native <form> /
// FormData serialization of real <input> elements. The XOR gate (fallback engages
// only below the ElementInternals floor) is the caller's responsibility, proven in
// the browser lane in Plans 04/05/06 — not here.
import {
  __resetFormParticipationForTest,
  enableFormFallback,
  isFormFallbackEnabled,
  syncFormFallback,
  teardownFormFallback,
  warnBelowFloorOnce,
} from '../src/internal/helpers/form-participation.js';

afterEach(() => {
  __resetFormParticipationForTest();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('syncFormFallback — idempotent find-or-create', () => {
  it('appends a single light-DOM hidden <input>, and a second call updates it in place', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    syncFormFallback(host, { name: 'field', value: 'first', required: false });
    expect(host.querySelectorAll('input').length).toBe(1);

    const input = host.querySelector('input') as HTMLInputElement;
    // The mirror is a LIGHT-DOM child of the host (not inside a shadow root).
    expect(input.parentNode).toBe(host);
    expect(input.type).toBe('hidden');
    expect(input.hidden).toBe(true);
    expect(input.getAttribute('aria-hidden')).toBe('true');

    // Second call: same node updated, no duplicate appended.
    syncFormFallback(host, { name: 'field', value: 'second', required: true, pattern: '\\d+' });
    expect(host.querySelectorAll('input').length).toBe(1);
    expect(host.querySelector('input')).toBe(input);
    expect(input.value).toBe('second');
    expect(input.required).toBe(true);
    expect(input.getAttribute('pattern')).toBe('\\d+');

    // pattern omitted on a later update clears the previously-set attribute.
    syncFormFallback(host, { name: 'field', value: 'third' });
    expect(input.hasAttribute('pattern')).toBe(false);
  });
});

describe('syncFormFallback — native FormData parity', () => {
  it('serializes the mirrored value through the enclosing native <form>', () => {
    const form = document.createElement('form');
    const host = document.createElement('div');
    form.appendChild(host);
    document.body.appendChild(form);

    syncFormFallback(host, { name: 'x', value: 'hello' });

    expect(new FormData(form).get('x')).toBe('hello');
  });
});

describe('teardownFormFallback — removal and no leak', () => {
  it('removes the input and leaves zero nodes across a connect/sync/teardown cycle', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    syncFormFallback(host, { name: 'x', value: 'a' });
    expect(host.querySelectorAll('input').length).toBe(1);

    teardownFormFallback(host);
    expect(host.querySelectorAll('input').length).toBe(0);

    // A subsequent sync + teardown cycle must not accumulate stale nodes.
    syncFormFallback(host, { name: 'x', value: 'b' });
    expect(host.querySelectorAll('input').length).toBe(1);
    teardownFormFallback(host);
    expect(host.querySelectorAll('input').length).toBe(0);
  });
});

describe('warnBelowFloorOnce — one-time global dedup', () => {
  it('warns exactly once regardless of tag, and again only after a reset', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    warnBelowFloorOnce('am-input');
    warnBelowFloorOnce('am-input');
    warnBelowFloorOnce('am-select');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('am-input');
    expect(warn.mock.calls[0][0]).toContain('@willramanand/amris/compat-forms');

    __resetFormParticipationForTest();
    warnBelowFloorOnce('am-checkbox');
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('enableFormFallback / isFormFallbackEnabled — opt-in toggling', () => {
  it('defaults false, flips true on enable, and resets back to false', () => {
    expect(isFormFallbackEnabled()).toBe(false);

    enableFormFallback();
    expect(isFormFallbackEnabled()).toBe(true);

    __resetFormParticipationForTest();
    expect(isFormFallbackEnabled()).toBe(false);
  });
});

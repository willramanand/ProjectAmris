import { afterEach, describe, expect, it, vi } from 'vitest';

import { TeardownScope } from '../../src/internal/helpers/teardown-scope';

describe('TeardownScope', () => {
  // Safety net: never let fake-timer mode bleed into other suites, even if an
  // assertion throws before an inline vi.useRealTimers() runs.
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('timeout()', () => {
    it('fires the handler after its delay when not cleared', () => {
      vi.useFakeTimers();
      const scope = new TeardownScope();

      let fired = 0;
      scope.timeout(() => { fired += 1; }, 300);

      expect(fired).toBe(0);
      vi.advanceTimersByTime(300);
      expect(fired).toBe(1);
    });

    it('does not fire the handler when clear() is called before the delay elapses', () => {
      vi.useFakeTimers();
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
      const scope = new TeardownScope();

      let fired = 0;
      scope.timeout(() => { fired += 1; }, 300);

      scope.clear();
      expect(clearSpy).toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(fired).toBe(0);

      clearSpy.mockRestore();
    });
  });

  describe('signal', () => {
    it('removes signal-bound listeners on clear()', () => {
      const scope = new TeardownScope();
      const target = new EventTarget();

      let calls = 0;
      target.addEventListener('ping', () => { calls += 1; }, { signal: scope.signal });

      target.dispatchEvent(new Event('ping'));
      expect(calls).toBe(1);

      scope.clear();

      target.dispatchEvent(new Event('ping'));
      expect(calls).toBe(1); // no additional delivery after clear()
    });

    it('returns a fresh, non-aborted signal after clear() so the scope is reusable', () => {
      const scope = new TeardownScope();
      const staleSignal = scope.signal;

      scope.clear();

      const freshSignal = scope.signal;
      expect(staleSignal.aborted).toBe(true);
      expect(freshSignal.aborted).toBe(false);
      expect(freshSignal).not.toBe(staleSignal);

      // A listener registered against the post-clear signal still fires.
      const target = new EventTarget();
      let calls = 0;
      target.addEventListener('ping', () => { calls += 1; }, { signal: freshSignal });
      target.dispatchEvent(new Event('ping'));
      expect(calls).toBe(1);
    });
  });
});

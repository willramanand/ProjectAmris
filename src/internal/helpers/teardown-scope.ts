/**
 * TeardownScope — a fire-and-forget teardown tracker for a single component's
 * transient timers and abortable listeners.
 *
 * It registers no custom element, so it never appears on the frozen CEM/public
 * surface (D-09). It lives under `src/internal/` and is imported only by
 * component source — never re-exported from `src/index.ts` / `src/index.all.ts`.
 *
 * A component holds one scope, schedules fire-and-forget timers via
 * {@link timeout}, and attaches abortable listeners with
 * `addEventListener(type, handler, { signal: scope.signal })`. A single
 * {@link clear} call cancels every pending timer AND removes every
 * `signal`-bound listener (via `AbortController.abort()`), then installs a
 * fresh controller so the same scope is reusable across repeated
 * open/dismiss cycles.
 *
 * This is the shared teardown discipline established by FIX-01 (toast) and
 * reused by FIX-04 (dialog animation cleanup) in the same phase.
 */
export class TeardownScope {
  private _timers = new Set<ReturnType<typeof setTimeout>>();
  private _controller = new AbortController();

  /**
   * Schedule a fire-and-forget timer. The handle is tracked so {@link clear}
   * can cancel it, and self-deletes from the tracking set once it fires.
   */
  timeout(handler: () => void, ms: number): void {
    const handle = setTimeout(() => {
      this._timers.delete(handle);
      handler();
    }, ms);
    this._timers.add(handle);
  }

  /**
   * The current abort signal. Pass to
   * `addEventListener(type, fn, { signal })` so the listener is removed
   * automatically when {@link clear} is called (via `AbortController.abort()`).
   */
  get signal(): AbortSignal {
    return this._controller.signal;
  }

  /**
   * Cancel every pending timer and remove every `signal`-bound listener, then
   * install a fresh `AbortController` so the scope can be reused.
   */
  clear(): void {
    for (const handle of this._timers) {
      clearTimeout(handle);
    }
    this._timers.clear();
    this._controller.abort();
    this._controller = new AbortController();
  }
}

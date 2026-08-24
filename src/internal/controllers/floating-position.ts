import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type {
  Middleware,
  MiddlewareData,
  Placement,
  Strategy,
} from '@floating-ui/dom';
import { loadFloating } from '../helpers/lazy-load.js';

/**
 * An option that is either a fixed value or a getter resolved lazily at
 * position time. Getters let a host reflect a live property (e.g. popover's
 * `placement` / `offset`, or a per-update `arrow` middleware whose element is a
 * `@query` that only resolves after render) without re-constructing the
 * controller. Fixed values (combobox/select/date-picker) keep working unchanged.
 */
export type Resolvable<T> = T | (() => T);

function resolve<T>(value: Resolvable<T> | undefined): T | undefined {
  return typeof value === 'function' ? (value as () => T)() : value;
}

/**
 * Per-host options for {@link FloatingPositionController}.
 *
 * `reference` and `floating` are accessor callbacks (not eagerly-captured
 * elements) so each overlay host can resolve its own Shadow-DOM nodes lazily —
 * combobox anchors to its `.wrapper`, dropdown to its trigger, etc. The base
 * middleware stack (`offset → flip → shift`) is applied to every host; any
 * host-specific middleware (e.g. combobox's `size` width-matcher or popover's
 * `arrow`) is appended via `middleware`.
 *
 * `placement`, `strategy`, `offset`, and `middleware` accept either a value or a
 * getter ({@link Resolvable}); getters are resolved on every reposition so hosts
 * with live positioning properties (popover/tooltip/dropdown) stay behavior-
 * preserving.
 */
export interface FloatingPositionOptions {
  /** Resolves the anchor element the floating element positions against. */
  reference: () => HTMLElement | null | undefined;
  /** Resolves the floating element to position. */
  floating: () => HTMLElement | null | undefined;
  /** Floating-UI placement. Defaults to `'bottom-start'`. */
  placement?: Resolvable<Placement>;
  /** Floating-UI positioning strategy. Omitted when not provided. */
  strategy?: Resolvable<Strategy>;
  /** Main-axis offset in pixels. Defaults to `4`. */
  offset?: Resolvable<number>;
  /**
   * Extra middleware appended after the base `offset → flip → shift` stack. The
   * getter receives the deferred-loaded `@floating-ui/dom` module so hosts build
   * their host-specific middleware (`arrow`, `size`) from the SAME dynamically
   * imported module rather than a static import (D-06) — e.g. popover:
   * `(mod) => this.arrowEl ? [mod.arrow({ element: this.arrowEl })] : []`.
   *
   * A plain `Middleware[]` value or a zero-arg getter is still accepted for
   * hosts not yet migrated off their static floating-ui import (the module
   * argument is simply ignored in those forms); this keeps the controller
   * surface-preserving while the migration lands overlay-by-overlay.
   */
  middleware?: Middleware[] | ((mod: typeof import('@floating-ui/dom')) => Middleware[]);
  /**
   * Invoked after every successful reposition with the resolved coordinates,
   * final placement, and middleware data. Hosts that render an arrow (popover,
   * tooltip) use this to place the arrow from `middlewareData.arrow`,
   * preserving the readback the inline implementations previously did.
   */
  onPositioned?: (data: {
    x: number;
    y: number;
    placement: Placement;
    middlewareData: MiddlewareData;
  }) => void;
}

/**
 * FloatingPositionController — a Lit Reactive Controller that wraps the
 * `computePosition` + `autoUpdate` lifecycle duplicated across the library's
 * overlay components (combobox, select, dropdown, popover, tooltip, date-picker).
 *
 * It registers no custom element, so it never appears on the frozen CEM/public
 * surface (D-09). The host calls {@link start} when it opens and {@link stop}
 * when it closes; teardown on disconnect is mirrored in {@link hostDisconnected}.
 *
 * autoUpdate gating (PERF-04): the loop is host-gated — the controller starts
 * `autoUpdate` only when the host calls {@link start} (on its false→true open
 * transition) and tears it down on {@link stop} (true→false close) and on
 * {@link hostDisconnected}. No positioning loop runs while an overlay is closed,
 * and none dangles after disconnect. Positioning while open is unchanged
 * (behavior-preserving).
 */
export class FloatingPositionController implements ReactiveController {
  private _cleanup: (() => void) | null = null;
  private opts: FloatingPositionOptions;
  // Monotonic generation token. Incremented on every start()/stop() so an
  // in-flight start() that is still awaiting the deferred floating-ui module can
  // detect it was superseded (a close-during-load) and abandon its run instead
  // of arming a dangling autoUpdate loop after the overlay already closed.
  private _startToken = 0;

  // Cached static base middleware slice [offset, flip, shift] (RPERF-03, D-03).
  // floating-ui middleware are stateless config objects reusable across
  // computePosition calls (A1, browser-proven), so rebuilding `flip()` /
  // `shift({padding:8})` / `offset(n)` on every autoUpdate tick is pure churn.
  // The slice is rebuilt via _buildMiddleware ONLY when the resolved offset
  // changes (or on the first tick) — once per config-change, not once per tick.
  // Getter-backed options (placement/offset/host middleware) are still
  // re-resolved every tick, so a live getter that returns a new value is
  // reflected immediately (never frozen); only the base-slice object
  // construction is memoized.
  private _baseSlice: Middleware[] | null = null;
  private _cachedOffset: number | null = null;

  constructor(host: ReactiveControllerHost & HTMLElement, opts: FloatingPositionOptions) {
    this.opts = opts;
    host.addController(this);
  }

  /**
   * Begin tracking the reference element and positioning the floating element.
   *
   * Now async (D-01/D-06): floating-ui is loaded via the shared memoized
   * {@link loadFloating} loader — usually already resolved by the host's
   * prefetch-on-intent — before the first `computePosition`. Hosts call this
   * fire-and-forget on their open transition; the returned promise resolves once
   * autoUpdate is armed (or the run is abandoned). The open→position→focus→
   * autoUpdate ordering contract is preserved: autoUpdate only starts AFTER the
   * module resolves, and the reveal stays gated on the first `computePosition`
   * writing `left/top` (hidden-until-positioned, D-02).
   */
  async start(): Promise<void> {
    // Mirror the host's inline `this._cleanupAutoUpdate?.()` before re-starting.
    this.stop();
    const token = this._startToken;
    const mod = await loadFloating();
    // A stop()/start() during the await bumped the token — abandon this run so a
    // close-during-load never leaves an autoUpdate loop running while closed.
    if (token !== this._startToken) return;
    const reference = this.opts.reference();
    const floating = this.opts.floating();
    if (!reference || !floating) return;
    this._cleanup = mod.autoUpdate(reference, floating, () =>
      this._updatePosition(mod, reference, floating),
    );
  }

  /** Stop tracking and release the autoUpdate cleanup. */
  stop(): void {
    // Invalidate any in-flight start() still awaiting loadFloating().
    this._startToken++;
    this._cleanup?.();
    this._cleanup = null;
  }

  hostDisconnected(): void {
    this.stop();
  }

  /**
   * Assemble the static base middleware slice `[offset, flip, shift]` for a
   * resolved offset value. `flip()` and `shift({padding:8})` carry no host
   * inputs; `offset(n)` depends only on the resolved offset. The result is
   * cached by {@link _updatePosition} and reused across autoUpdate ticks while
   * the resolved offset is unchanged, so this runs once per config-change rather
   * than once per tick (RPERF-03). The final middleware array order
   * `[offset, flip, shift, ...hostMiddleware]` is preserved exactly by the
   * caller, so `computePosition` input — and therefore output — is byte-identical.
   */
  private _buildMiddleware(
    mod: typeof import('@floating-ui/dom'),
    offsetValue: number,
  ): Middleware[] {
    return [mod.offset(offsetValue), mod.flip(), mod.shift({ padding: 8 })];
  }

  private async _updatePosition(
    mod: typeof import('@floating-ui/dom'),
    reference: HTMLElement,
    floating: HTMLElement,
  ): Promise<void> {
    // Getter-backed options are RE-RESOLVED every tick (never cached) so a live
    // popover/tooltip/dropdown placement/offset is always current (D-03); fixed
    // values resolve to themselves at negligible cost.
    const placement = resolve(this.opts.placement) ?? 'bottom-start';
    const strategy = resolve(this.opts.strategy);
    const offsetValue = resolve(this.opts.offset) ?? 4;

    // Rebuild the cached [offset, flip, shift] base slice only when the resolved
    // offset changes (or on the first tick). This is the per-tick churn removed
    // by RPERF-03; the autoUpdate tick count (and thus computePosition) is
    // unchanged by design (F-2). A getter that returns a NEW offset between ticks
    // triggers a rebuild, so nothing is frozen stale.
    if (this._baseSlice === null || offsetValue !== this._cachedOffset) {
      this._baseSlice = this._buildMiddleware(mod, offsetValue);
      this._cachedOffset = offsetValue;
    }

    // The host tail is rebuilt every tick — getter middleware (e.g. popover's
    // `arrow`, which reads a live `@query` node) must never be cached or a
    // toggled-off arrow would persist (surface-observable). Array order
    // [offset, flip, shift, ...host] is preserved exactly.
    const mw = this.opts.middleware;
    const hostMiddleware = typeof mw === 'function' ? mw(mod) : (mw ?? []);

    const {
      x,
      y,
      placement: resolvedPlacement,
      middlewareData,
    } = await mod.computePosition(reference, floating, {
      placement,
      ...(strategy ? { strategy } : {}),
      middleware: [...this._baseSlice, ...hostMiddleware],
    });
    Object.assign(floating.style, { left: `${x}px`, top: `${y}px` });
    this.opts.onPositioned?.({ x, y, placement: resolvedPlacement, middlewareData });
  }
}

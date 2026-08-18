import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  computePosition,
  autoUpdate,
  flip,
  shift,
  offset,
  type Middleware,
  type MiddlewareData,
  type Placement,
  type Strategy,
} from '@floating-ui/dom';

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
  /** Extra middleware appended after the base `offset → flip → shift` stack. */
  middleware?: Resolvable<Middleware[]>;
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

  constructor(host: ReactiveControllerHost & HTMLElement, opts: FloatingPositionOptions) {
    this.opts = opts;
    host.addController(this);
  }

  /** Begin tracking the reference element and positioning the floating element. */
  start(): void {
    // Mirror the host's inline `this._cleanupAutoUpdate?.()` before re-starting.
    this.stop();
    const reference = this.opts.reference();
    const floating = this.opts.floating();
    if (!reference || !floating) return;
    this._cleanup = autoUpdate(reference, floating, () =>
      this._updatePosition(reference, floating),
    );
  }

  /** Stop tracking and release the autoUpdate cleanup. */
  stop(): void {
    this._cleanup?.();
    this._cleanup = null;
  }

  hostDisconnected(): void {
    this.stop();
  }

  private async _updatePosition(reference: HTMLElement, floating: HTMLElement): Promise<void> {
    const strategy = resolve(this.opts.strategy);
    const { x, y, placement, middlewareData } = await computePosition(reference, floating, {
      placement: resolve(this.opts.placement) ?? 'bottom-start',
      ...(strategy ? { strategy } : {}),
      middleware: [
        offset(resolve(this.opts.offset) ?? 4),
        flip(),
        shift({ padding: 8 }),
        ...(resolve(this.opts.middleware) ?? []),
      ],
    });
    Object.assign(floating.style, { left: `${x}px`, top: `${y}px` });
    this.opts.onPositioned?.({ x, y, placement, middlewareData });
  }
}

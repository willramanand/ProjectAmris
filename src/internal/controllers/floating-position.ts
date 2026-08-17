import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  computePosition,
  autoUpdate,
  flip,
  shift,
  offset,
  type Middleware,
  type Placement,
  type Strategy,
} from '@floating-ui/dom';

/**
 * Per-host options for {@link FloatingPositionController}.
 *
 * `reference` and `floating` are accessor callbacks (not eagerly-captured
 * elements) so each overlay host can resolve its own Shadow-DOM nodes lazily —
 * combobox anchors to its `.wrapper`, dropdown to its trigger, etc. The base
 * middleware stack (`offset → flip → shift`) is applied to every host; any
 * host-specific middleware (e.g. combobox's `size` width-matcher) is appended
 * via `middleware`.
 */
export interface FloatingPositionOptions {
  /** Resolves the anchor element the floating element positions against. */
  reference: () => HTMLElement | null | undefined;
  /** Resolves the floating element to position. */
  floating: () => HTMLElement | null | undefined;
  /** Floating-UI placement. Defaults to `'bottom-start'`. */
  placement?: Placement;
  /** Floating-UI positioning strategy. Omitted when not provided. */
  strategy?: Strategy;
  /** Main-axis offset in pixels. Defaults to `4`. */
  offset?: number;
  /** Extra middleware appended after the base `offset → flip → shift` stack. */
  middleware?: Middleware[];
}

/**
 * FloatingPositionController — a Lit Reactive Controller that wraps the
 * `computePosition` + `autoUpdate` lifecycle duplicated across the library's
 * overlay components (combobox, dropdown, popover, tooltip, …).
 *
 * It registers no custom element, so it never appears on the frozen CEM/public
 * surface (D-09). The host calls {@link start} when it opens and {@link stop}
 * when it closes; teardown on disconnect is mirrored in {@link hostDisconnected}.
 *
 * Behavior-preserving (D-10): `autoUpdate` is kept UNGATED — this controller
 * relocates the existing inline logic byte-for-byte. Gating `autoUpdate` on
 * open transitions is PERF-04 / Phase 4 and is intentionally NOT done here.
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
    const { x, y } = await computePosition(reference, floating, {
      placement: this.opts.placement ?? 'bottom-start',
      ...(this.opts.strategy ? { strategy: this.opts.strategy } : {}),
      middleware: [
        offset(this.opts.offset ?? 4),
        flip(),
        shift({ padding: 8 }),
        ...(this.opts.middleware ?? []),
      ],
    });
    Object.assign(floating.style, { left: `${x}px`, top: `${y}px` });
  }
}

import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import type { Placement } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';
import { FloatingPositionController } from '../../internal/controllers/floating-position.js';
import { prefetchFloating } from '../../internal/helpers/lazy-load.js';

/**
 * Tooltip — a floating label that appears on hover/focus.
 * Uses Floating UI for positioning.
 *
 * @slot - The trigger element (the thing being described)
 *
 * @csspart tooltip - The tooltip popup element
 * @csspart arrow - The tooltip arrow
 *
 * @cssprop --am-tooltip-bg - Override background color
 * @cssprop --am-tooltip-color - Override text color
 * @cssprop --am-tooltip-radius - Override border radius
 *
 * @example
 * ```html
 * <am-tooltip content="Save your changes">
 *   <am-button>Save</am-button>
 * </am-tooltip>
 * ```
 */
@customElement('am-tooltip')
export class AmTooltip extends LitElement {
  /** Tooltip text content. */
  @property() content = '';

  /** Preferred placement. */
  @property() placement: Placement = 'top';

  /** Delay before showing (ms). */
  @property({ type: Number }) delay = 200;

  /** Whether the tooltip is disabled. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  @query('.tooltip') private tooltipEl!: HTMLElement;
  @query('.arrow') private arrowEl!: HTMLElement;

  private _showTimer?: ReturnType<typeof setTimeout>;
  private _hideTimer?: ReturnType<typeof setTimeout>;

  /**
   * Floating positioning delegated to the shared controller (PERF-04). Options
   * mirror the previous inline setup exactly: anchored to the slotted trigger,
   * fixed strategy, live `placement` getter, 8px offset, and an `arrow`
   * middleware whose readback positions the arrow via `onPositioned`. autoUpdate
   * is gated to the show/hide transition — {@link start} on show, {@link stop}
   * on hide, and {@link hostDisconnected} on disconnect.
   */
  private _floatingController = new FloatingPositionController(this, {
    reference: () => this.firstElementChild as HTMLElement | null,
    floating: () => this.tooltipEl,
    placement: () => this.placement,
    strategy: 'fixed',
    offset: 8,
    middleware: (mod) => (this.arrowEl ? [mod.arrow({ element: this.arrowEl })] : []),
    onPositioned: ({ placement, middlewareData }) => {
      if (middlewareData.arrow && this.arrowEl) {
        const { x: ax, y: ay } = middlewareData.arrow;
        const side = placement.split('-')[0];
        const staticSide = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' }[side]!;
        Object.assign(this.arrowEl.style, {
          left: ax != null ? `${ax}px` : '',
          top: ay != null ? `${ay}px` : '',
          [staticSide]: '-0.25rem',
        });
      }
    },
  });

  static styles = [
    resetStyles,
    css`
      :host {
        display: inline-flex;
        position: relative;
      }

      .trigger {
        display: inline-flex;
      }

      .tooltip {
        position: fixed;
        z-index: var(--am-z-tooltip);
        max-width: 16rem;
        padding: var(--am-space-1-5) var(--am-space-2-5);
        background: var(--am-tooltip-bg, var(--am-color-neutral-800));
        color: var(--am-tooltip-color, var(--am-color-neutral-50));
        font-family: var(--am-font-sans);
        font-size: var(--am-text-xs);
        font-weight: var(--am-weight-medium);
        line-height: var(--am-leading-snug);
        border-radius: var(--am-tooltip-radius, var(--am-radius-lg));
        corner-shape: squircle;
        pointer-events: none;
        opacity: 0;
        transition: opacity var(--am-duration-fast) var(--am-ease-default);
        width: max-content;
      }

      :host([visible]) .tooltip {
        opacity: 1;
      }

      .arrow {
        position: absolute;
        width: 0.5rem;
        height: 0.5rem;
        background: var(--am-tooltip-bg, var(--am-color-neutral-800));
        transform: rotate(45deg);
      }

      @media (prefers-reduced-motion: reduce) {
        .tooltip { transition: none; }
      }
    `,
  ];

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._showTimer);
    clearTimeout(this._hideTimer);
    // The floating autoUpdate teardown is mirrored in the controller's
    // hostDisconnected (invoked during super.disconnectedCallback above).
  }

  private _handleEnter = () => {
    if (this.disabled || !this.content) return;
    // Warm the deferred floating-ui chunk on trigger intent (D-03) so the module
    // is usually resolved by the time the show-delay elapses and the controller
    // awaits it on start() — keeping positioning tight across the loader gap.
    prefetchFloating();
    clearTimeout(this._hideTimer);
    this._showTimer = setTimeout(() => {
      this.setAttribute('visible', '');
      this.requestUpdate();
      this._floatingController.start();
    }, this.delay);
  };

  private _handleLeave = () => {
    clearTimeout(this._showTimer);
    this._hideTimer = setTimeout(() => {
      this.removeAttribute('visible');
      this.requestUpdate();
      this._floatingController.stop();
    }, 100);
  };

  render() {
    return html`
      <div
        class="trigger"
        @mouseenter=${this._handleEnter}
        @mouseleave=${this._handleLeave}
        @focusin=${this._handleEnter}
        @focusout=${this._handleLeave}
      >
        <slot></slot>
      </div>
      ${this.content
        ? html`
            <div class="tooltip" part="tooltip" role="tooltip">
              ${this.content}
              <div class="arrow" part="arrow"></div>
            </div>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-tooltip': AmTooltip;
  }
}

import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { computePosition, autoUpdate, flip, shift, offset, arrow, type Placement } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';

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
 * <qz-tooltip content="Save your changes">
 *   <qz-button>Save</qz-button>
 * </qz-tooltip>
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

  private _visible = false;
  private _showTimer?: ReturnType<typeof setTimeout>;
  private _hideTimer?: ReturnType<typeof setTimeout>;
  private _cleanupAutoUpdate: (() => void) | null = null;

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
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
  }

  private _handleEnter = () => {
    if (this.disabled || !this.content) return;
    clearTimeout(this._hideTimer);
    this._showTimer = setTimeout(() => {
      this._visible = true;
      this.setAttribute('visible', '');
      this.requestUpdate();
      this._startAutoUpdate();
    }, this.delay);
  };

  private _handleLeave = () => {
    clearTimeout(this._showTimer);
    this._hideTimer = setTimeout(() => {
      this._visible = false;
      this.removeAttribute('visible');
      this.requestUpdate();
      this._cleanupAutoUpdate?.();
      this._cleanupAutoUpdate = null;
    }, 100);
  };

  private _startAutoUpdate() {
    this._cleanupAutoUpdate?.();
    const trigger = this.firstElementChild as HTMLElement;
    if (!trigger || !this.tooltipEl) return;
    this._cleanupAutoUpdate = autoUpdate(trigger, this.tooltipEl, () => this._updatePosition());
  }

  private async _updatePosition() {
    if (!this._visible) return;

    const trigger = this.firstElementChild as HTMLElement;
    if (!trigger || !this.tooltipEl) return;

    const { x, y, placement, middlewareData } = await computePosition(
      trigger,
      this.tooltipEl,
      {
        placement: this.placement,
        strategy: 'fixed',
        middleware: [
          offset(8),
          flip(),
          shift({ padding: 8 }),
          arrow({ element: this.arrowEl }),
        ],
      }
    );

    Object.assign(this.tooltipEl.style, { left: `${x}px`, top: `${y}px` });

    if (middlewareData.arrow) {
      const { x: ax, y: ay } = middlewareData.arrow;
      const side = placement.split('-')[0];
      const staticSide = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' }[side]!;
      Object.assign(this.arrowEl.style, {
        left: ax != null ? `${ax}px` : '',
        top: ay != null ? `${ay}px` : '',
        [staticSide]: '-0.25rem',
      });
    }
  }

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

import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { computePosition, flip, shift, offset, arrow, type Placement } from '@floating-ui/dom';
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
 * @cssprop --qz-tooltip-bg - Override background color
 * @cssprop --qz-tooltip-color - Override text color
 * @cssprop --qz-tooltip-radius - Override border radius
 *
 * @example
 * ```html
 * <qz-tooltip content="Save your changes">
 *   <qz-button>Save</qz-button>
 * </qz-tooltip>
 * ```
 */
@customElement('qz-tooltip')
export class QzTooltip extends LitElement {
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
        z-index: var(--qz-z-tooltip);
        max-width: 16rem;
        padding: var(--qz-space-1-5) var(--qz-space-2-5);
        background: var(--qz-tooltip-bg, var(--qz-color-neutral-800));
        color: var(--qz-tooltip-color, var(--qz-color-neutral-50));
        font-family: var(--qz-font-sans);
        font-size: var(--qz-text-xs);
        font-weight: var(--qz-weight-medium);
        line-height: var(--qz-leading-snug);
        border-radius: var(--qz-tooltip-radius, var(--qz-radius-lg));
        corner-shape: squircle;
        pointer-events: none;
        opacity: 0;
        transition: opacity var(--qz-duration-fast) var(--qz-ease-default);
        width: max-content;
      }

      :host([visible]) .tooltip {
        opacity: 1;
      }

      .arrow {
        position: absolute;
        width: 0.5rem;
        height: 0.5rem;
        background: var(--qz-tooltip-bg, var(--qz-color-neutral-800));
        transform: rotate(45deg);
      }

      @media (prefers-reduced-motion: reduce) {
        .tooltip { transition: none; }
      }
    `,
  ];

  private _handleEnter = () => {
    if (this.disabled || !this.content) return;
    clearTimeout(this._hideTimer);
    this._showTimer = setTimeout(() => {
      this._visible = true;
      this.setAttribute('visible', '');
      this.requestUpdate();
      this._updatePosition();
    }, this.delay);
  };

  private _handleLeave = () => {
    clearTimeout(this._showTimer);
    this._hideTimer = setTimeout(() => {
      this._visible = false;
      this.removeAttribute('visible');
      this.requestUpdate();
    }, 100);
  };

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
    'qz-tooltip': QzTooltip;
  }
}

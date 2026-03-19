import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { computePosition, autoUpdate, flip, shift, offset, arrow, type Placement } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Popover — a floating content panel anchored to a trigger element.
 * Uses Floating UI for positioning.
 *
 * @slot - The trigger element
 * @slot content - Popover body content
 *
 * @csspart popover - The floating panel
 * @csspart arrow - The arrow element
 *
 * @fires am-show - Fires when the popover opens
 * @fires am-hide - Fires when the popover closes
 *
 * @example
 * ```html
 * <am-popover>
 *   <am-button>Open</am-button>
 *   <div slot="content">Popover content here</div>
 * </am-popover>
 * ```
 */
@customElement('am-popover')
export class AmPopover extends LitElement {
  /** Whether the popover is shown. */
  @property({ type: Boolean, reflect: true }) open = false;

  /** Preferred placement. */
  @property() placement: Placement = 'bottom-start';

  /** Offset distance from trigger (px). */
  @property({ type: Number }) offset = 8;

  /** Whether to show an arrow. */
  @property({ type: Boolean }) arrow = true;

  /** How the popover is triggered. */
  @property() trigger: 'click' | 'hover' | 'manual' = 'click';

  @query('.popover') private popoverEl!: HTMLElement;
  @query('.arrow') private arrowEl!: HTMLElement;

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

      .popover {
        position: fixed;
        z-index: var(--am-z-popover);
        background: var(--am-surface-raised);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        box-shadow: var(--am-shadow-lg);
        padding: var(--am-space-3);
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--am-duration-fast) var(--am-ease-default);
        width: max-content;
      }

      :host([open]) .popover {
        opacity: 1;
        pointer-events: auto;
      }

      .arrow {
        position: absolute;
        width: 0.5rem;
        height: 0.5rem;
        background: var(--am-surface-raised);
        border: var(--am-border-1) solid var(--am-border);
        transform: rotate(45deg);
      }

      @media (prefers-reduced-motion: reduce) {
        .popover { transition: none; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    if (this.trigger === 'click') {
      document.addEventListener('click', this._handleDocumentClick);
    }
    document.addEventListener('keydown', this._handleKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleDocumentClick);
    document.removeEventListener('keydown', this._handleKeydown);
    clearTimeout(this._showTimer);
    clearTimeout(this._hideTimer);
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
  }

  private _handleTriggerClick = () => {
    if (this.trigger !== 'click') return;
    this.open = !this.open;
  };

  private _handleDocumentClick = (e: MouseEvent) => {
    if (!this.open) return;
    const path = e.composedPath();
    if (!path.includes(this)) {
      this.open = false;
    }
  };

  private _handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) {
      this.open = false;
    }
  };

  private _handleEnter = () => {
    if (this.trigger !== 'hover') return;
    clearTimeout(this._hideTimer);
    this._showTimer = setTimeout(() => {
      this.open = true;
    }, 200);
  };

  private _handleLeave = () => {
    if (this.trigger !== 'hover') return;
    clearTimeout(this._showTimer);
    this._hideTimer = setTimeout(() => {
      this.open = false;
    }, 100);
  };

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('open')) {
      if (this.open) {
        this._startAutoUpdate();
        this.dispatchEvent(new CustomEvent('am-show', { bubbles: true, composed: true }));
      } else {
        this._cleanupAutoUpdate?.();
        this._cleanupAutoUpdate = null;
        this.dispatchEvent(new CustomEvent('am-hide', { bubbles: true, composed: true }));
      }
    }
  }

  private _startAutoUpdate() {
    this._cleanupAutoUpdate?.();
    const trigger = this.firstElementChild as HTMLElement;
    if (!trigger || !this.popoverEl) return;
    this._cleanupAutoUpdate = autoUpdate(trigger, this.popoverEl, () => this._updatePosition());
  }

  private async _updatePosition() {
    const trigger = this.firstElementChild as HTMLElement;
    if (!trigger || !this.popoverEl) return;

    const middleware = [
      offset(this.offset),
      flip(),
      shift({ padding: 8 }),
    ];

    if (this.arrow && this.arrowEl) {
      middleware.push(arrow({ element: this.arrowEl }));
    }

    const { x, y, placement, middlewareData } = await computePosition(
      trigger,
      this.popoverEl,
      {
        placement: this.placement,
        strategy: 'fixed',
        middleware,
      }
    );

    Object.assign(this.popoverEl.style, { left: `${x}px`, top: `${y}px` });

    if (this.arrow && this.arrowEl && middlewareData.arrow) {
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
        @click=${this._handleTriggerClick}
        @mouseenter=${this._handleEnter}
        @mouseleave=${this._handleLeave}
      >
        <slot></slot>
      </div>
      <div
        class="popover"
        part="popover"
        @mouseenter=${this._handleEnter}
        @mouseleave=${this._handleLeave}
      >
        <slot name="content"></slot>
        ${this.arrow
          ? html`<div class="arrow" part="arrow"></div>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-popover': AmPopover;
  }
}

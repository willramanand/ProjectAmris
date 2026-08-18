import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { arrow, type Placement } from '@floating-ui/dom';
import { resetStyles } from '../../styles/reset.css.js';
import { FloatingPositionController } from '../../internal/controllers/floating-position.js';

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
 * @fires am-open - Fires when the popover opens
 * @fires am-close - Fires when the popover closes
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

  /**
   * Floating positioning delegated to the shared controller (PERF-04). Options
   * mirror the previous inline setup exactly: anchored to the slotted trigger,
   * fixed strategy, live `offset`/`placement` getters, and an `arrow` middleware
   * (when enabled) whose readback positions the arrow via `onPositioned`.
   * autoUpdate is gated to the open transition — {@link start} on open,
   * {@link stop} on close, and {@link hostDisconnected} on disconnect.
   */
  private _floatingController = new FloatingPositionController(this, {
    reference: () => this.firstElementChild as HTMLElement | null,
    floating: () => this.popoverEl,
    placement: () => this.placement,
    strategy: 'fixed',
    offset: () => this.offset,
    middleware: () =>
      this.arrow && this.arrowEl ? [arrow({ element: this.arrowEl })] : [],
    onPositioned: ({ placement, middlewareData }) => {
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

  disconnectedCallback() {
    super.disconnectedCallback();
    this._detachGlobalListeners();
    clearTimeout(this._showTimer);
    clearTimeout(this._hideTimer);
    // The floating autoUpdate teardown is mirrored in the controller's
    // hostDisconnected (invoked during super.disconnectedCallback above).
  }

  private _attachGlobalListeners() {
    if (this.trigger === 'click') {
      document.addEventListener('click', this._handleDocumentClick);
    }
    document.addEventListener('keydown', this._handleKeydown);
  }

  private _detachGlobalListeners() {
    document.removeEventListener('click', this._handleDocumentClick);
    document.removeEventListener('keydown', this._handleKeydown);
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
        this._attachGlobalListeners();
        this._floatingController.start();
        this.dispatchEvent(new CustomEvent('am-open', { bubbles: true, composed: true }));
      } else {
        this._detachGlobalListeners();
        this._floatingController.stop();
        this.dispatchEvent(new CustomEvent('am-close', { bubbles: true, composed: true }));
      }
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

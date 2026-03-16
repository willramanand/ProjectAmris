import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type SplitViewOrientation = 'horizontal' | 'vertical';

/**
 * Split View — a resizable two-pane layout.
 *
 * @slot start - First pane content
 * @slot end - Second pane content
 *
 * @csspart start - The start pane
 * @csspart end - The end pane
 * @csspart divider - The draggable divider
 *
 * @cssprop --am-split-view-divider-size - Divider width/height (default: 4px)
 * @cssprop --am-split-view-min - Minimum pane size (default: 8rem)
 *
 * @fires am-resize - Fires during resize with { position } detail (0–100)
 *
 * @example
 * ```html
 * <am-split-view position="30" style="height: 300px;">
 *   <div slot="start">Left pane</div>
 *   <div slot="end">Right pane</div>
 * </am-split-view>
 * ```
 */
@customElement('am-split-view')
export class AmSplitView extends LitElement {
  /** Orientation of the split. */
  @property({ reflect: true }) orientation: SplitViewOrientation = 'horizontal';

  /** Initial split position as a percentage (0–100). */
  @property({ type: Number }) position = 50;

  @query('.container') private _container!: HTMLElement;

  private _dragging = false;

  static styles = [
    resetStyles,
    css`
      :host { display: block; height: 100%; }

      .container {
        display: flex;
        height: 100%;
        width: 100%;
      }

      :host([orientation='vertical']) .container {
        flex-direction: column;
      }

      .pane {
        overflow: auto;
        min-width: var(--am-split-view-min, 8rem);
        min-height: var(--am-split-view-min, 8rem);
      }

      .pane-start {
        flex: var(--_start-flex, 50) 0 0%;
      }

      .pane-end {
        flex: var(--_end-flex, 50) 0 0%;
      }

      .divider {
        flex-shrink: 0;
        background: var(--am-border);
        position: relative;
        user-select: none;
        transition: background var(--am-duration-fast) var(--am-ease-default);
      }

      :host(:not([orientation='vertical'])) .divider {
        width: var(--am-split-view-divider-size, 4px);
        cursor: col-resize;
      }

      :host([orientation='vertical']) .divider {
        height: var(--am-split-view-divider-size, 4px);
        cursor: row-resize;
      }

      .divider:hover, .divider.active {
        background: var(--am-primary);
      }

      /* Increase hit area */
      .divider::before {
        content: '';
        position: absolute;
        inset: -4px;
      }

      @media (prefers-reduced-motion: reduce) {
        .divider { transition: none; }
      }
    `,
  ];

  firstUpdated() {
    this._updateFlexValues();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('position')) {
      this._updateFlexValues();
    }
  }

  private _updateFlexValues() {
    const p = Math.max(0, Math.min(100, this.position));
    this.style.setProperty('--_start-flex', String(p));
    this.style.setProperty('--_end-flex', String(100 - p));
  }

  private _handlePointerDown = (e: PointerEvent) => {
    this._dragging = true;
    const divider = e.currentTarget as HTMLElement;
    divider.classList.add('active');
    divider.setPointerCapture(e.pointerId);
  };

  private _handlePointerMove = (e: PointerEvent) => {
    if (!this._dragging || !this._container) return;

    const rect = this._container.getBoundingClientRect();
    let ratio: number;

    if (this.orientation === 'vertical') {
      ratio = ((e.clientY - rect.top) / rect.height) * 100;
    } else {
      ratio = ((e.clientX - rect.left) / rect.width) * 100;
    }

    this.position = Math.max(5, Math.min(95, ratio));
    this.dispatchEvent(new CustomEvent('am-resize', {
      detail: { position: this.position },
      bubbles: true,
      composed: true,
    }));
  };

  private _handlePointerUp = (e: PointerEvent) => {
    this._dragging = false;
    const divider = e.currentTarget as HTMLElement;
    divider.classList.remove('active');
    divider.releasePointerCapture(e.pointerId);
  };

  render() {
    return html`
      <div class="container">
        <div class="pane pane-start" part="start"><slot name="start"></slot></div>
        <div class="divider" part="divider"
          @pointerdown=${this._handlePointerDown}
          @pointermove=${this._handlePointerMove}
          @pointerup=${this._handlePointerUp}
          role="separator"
          aria-orientation=${this.orientation}
        ></div>
        <div class="pane pane-end" part="end"><slot name="end"></slot></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-split-view': AmSplitView;
  }
}

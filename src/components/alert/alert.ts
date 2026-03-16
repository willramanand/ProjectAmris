import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Alert — a contextual feedback message.
 *
 * @slot - Alert body content
 * @slot icon - Optional icon slot
 * @slot action - Optional action slot (e.g. close button)
 *
 * @csspart alert - The alert container
 * @csspart icon - The icon wrapper
 * @csspart content - The content wrapper
 * @csspart action - The action wrapper
 *
 * @cssprop --am-alert-radius - Override border radius
 *
 * @fires qz-close - Fires when the alert is dismissed
 *
 * @example
 * ```html
 * <qz-alert variant="success">Changes saved successfully.</qz-alert>
 * <qz-alert variant="danger" closable>Something went wrong.</qz-alert>
 * ```
 */
@customElement('am-alert')
export class AmAlert extends LitElement {
  @property({ reflect: true }) variant: AlertVariant = 'info';
  @property({ type: Boolean, reflect: true }) closable = false;
  @property({ type: Boolean, reflect: true }) open = true;

  static styles = [
    resetStyles,
    css`
      :host { display: block; }
      :host(:not([open])) { display: none; }

      .alert {
        display: flex;
        align-items: flex-start;
        gap: var(--am-space-3);
        padding: var(--am-space-3) var(--am-space-4);
        border-radius: var(--am-alert-radius, var(--am-radius-xl));
        corner-shape: squircle;
        border: var(--am-border-1) solid transparent;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        line-height: var(--am-leading-normal);
      }

      /* Variants */
      :host([variant='info']) .alert { background: var(--am-info-subtle); color: var(--am-info-text); border-color: color-mix(in srgb, var(--am-info) 20%, transparent); }
      :host([variant='success']) .alert { background: var(--am-success-subtle); color: var(--am-success-text); border-color: color-mix(in srgb, var(--am-success) 20%, transparent); }
      :host([variant='warning']) .alert { background: var(--am-warning-subtle); color: var(--am-warning-text); border-color: color-mix(in srgb, var(--am-warning) 20%, transparent); }
      :host([variant='danger']) .alert { background: var(--am-danger-subtle); color: var(--am-danger-text); border-color: color-mix(in srgb, var(--am-danger) 20%, transparent); }
      :host([variant='neutral']) .alert { background: var(--am-color-neutral-100); color: var(--am-text-secondary); border-color: var(--am-border); }

      .icon { flex-shrink: 0; display: flex; padding-top: 0.0625rem; }
      .content { flex: 1; min-width: 0; }
      .action { flex-shrink: 0; display: flex; margin-left: auto; }

      .close-btn {
        all: unset;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: var(--am-radius-sm);
        color: currentColor;
        opacity: 0.6;
        transition: opacity var(--am-duration-fast) var(--am-ease-default);
      }

      .close-btn:hover { opacity: 1; }
      .close-btn:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      @media (prefers-reduced-motion: reduce) {
        .close-btn { transition: none; }
      }
    `,
  ];

  private _close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('am-close', { bubbles: true, composed: true }));
  }

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'alert');
  }

  render() {
    return html`
      <div class="alert" part="alert">
        <div class="icon" part="icon"><slot name="icon"></slot></div>
        <div class="content" part="content"><slot></slot></div>
        <div class="action" part="action">
          <slot name="action"></slot>
          ${this.closable
            ? html`<button class="close-btn" aria-label="Close" @click=${this._close}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M11 3L3 11M3 3l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>`
            : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-alert': AmAlert;
  }
}

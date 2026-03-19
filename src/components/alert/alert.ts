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
 * @fires am-close - Fires when the alert is dismissed
 *
 * @example
 * ```html
 * <am-alert variant="success">Changes saved successfully.</am-alert>
 * <am-alert variant="danger" closable>Something went wrong.</am-alert>
 * ```
 */
@customElement('am-alert')
export class AmAlert extends LitElement {
  @property({ reflect: true }) variant: AlertVariant = 'info';
  @property({ type: Boolean, reflect: true }) closable = false;
  @property({ type: Boolean, reflect: true }) open = true;
  @property({ type: Boolean, reflect: true }) banner = false;

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
      :host([variant='neutral']) .alert { background: var(--am-color-neutral-100); color: var(--am-color-neutral-900); border-color: var(--am-border); }

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

      /* ---- Banner variant ---- */

      :host([banner]) .alert {
        align-items: center;
        border-radius: var(--am-radius-xl) var(--am-radius-xl) 0 0;
        corner-shape: squircle;
        border: none;
        border-bottom: var(--am-border-1) solid transparent;
        padding: var(--am-space-3) var(--am-space-5);
      }

      :host([banner][variant='info']) .alert { border-bottom-color: color-mix(in srgb, var(--am-info) 20%, transparent); }
      :host([banner][variant='success']) .alert { border-bottom-color: color-mix(in srgb, var(--am-success) 20%, transparent); }
      :host([banner][variant='warning']) .alert { border-bottom-color: color-mix(in srgb, var(--am-warning) 20%, transparent); }
      :host([banner][variant='danger']) .alert { border-bottom-color: color-mix(in srgb, var(--am-danger) 20%, transparent); }
      :host([banner][variant='neutral']) .alert { border-bottom-color: var(--am-border); }

      @media (prefers-reduced-motion: reduce) {
        .close-btn { transition: none; }
      }
    `,
  ];

  private get _defaultIcon() {
    switch (this.variant) {
      case 'info':
        return html`<svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"/></svg>`;
      case 'success':
        return html`<svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>`;
      case 'warning':
        return html`<svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/></svg>`;
      case 'danger':
        return html`<svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/></svg>`;
      default:
        return nothing;
    }
  }

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
        <div class="icon" part="icon"><slot name="icon">${this._defaultIcon}</slot></div>
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

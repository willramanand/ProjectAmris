import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Toast — an auto-dismissible notification.
 *
 * Toasts are typically created programmatically and placed inside an
 * `<am-toast-region>`. Use the static `AmToastRegion.toast()` helper
 * to create and show toasts imperatively.
 *
 * @slot - Toast body text
 * @slot icon - Optional leading icon
 * @csspart toast - The toast container
 *
 * @fires am-close - Fires when the toast dismisses (manual or auto)
 *
 * @example
 * ```html
 * <am-toast variant="success" open>Changes saved.</am-toast>
 * ```
 */
@customElement('am-toast')
export class AmToast extends LitElement {
  @property({ reflect: true }) variant: ToastVariant = 'neutral';
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Boolean, reflect: true }) closable = true;

  /** Auto-dismiss duration in milliseconds. Set to 0 to disable. */
  @property({ type: Number }) duration = 5000;

  private _timer: ReturnType<typeof setTimeout> | null = null;

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
        pointer-events: auto;
      }

      :host(:not([open])) {
        display: none;
      }

      .toast {
        display: flex;
        align-items: flex-start;
        gap: var(--am-space-3);
        padding: var(--am-space-3) var(--am-space-4);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        border: var(--am-border-1) solid transparent;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        line-height: var(--am-leading-normal);
        box-shadow: var(--am-shadow-lg);
        background: var(--am-surface-raised);
        color: var(--am-text);
        max-width: 24rem;
        animation: toast-in var(--am-duration-normal) var(--am-ease-spring);
      }

      /* Variants - left accent bar approach */
      :host([variant='info']) .toast { border-left: 3px solid var(--am-info); }
      :host([variant='success']) .toast { border-left: 3px solid var(--am-success); }
      :host([variant='warning']) .toast { border-left: 3px solid var(--am-warning); }
      :host([variant='danger']) .toast { border-left: 3px solid var(--am-danger); }
      :host([variant='neutral']) .toast, :host(:not([variant])) .toast { border-left: 3px solid var(--am-border-strong); }

      .icon {
        flex-shrink: 0;
        display: flex;
        padding-top: 0.0625rem;
      }

      .content {
        flex: 1;
        min-width: 0;
      }

      .close-btn {
        all: unset;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: var(--am-radius-sm);
        color: var(--am-text-tertiary);
        opacity: 0.7;
        flex-shrink: 0;
        transition: opacity var(--am-duration-fast) var(--am-ease-default);
      }

      .close-btn:hover { opacity: 1; }
      .close-btn:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      @keyframes toast-in {
        from { opacity: 0; transform: translateY(0.5rem); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (prefers-reduced-motion: reduce) {
        .toast { animation: none; }
        .close-btn { transition: none; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
    this._startTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._clearTimer();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') || changed.has('duration')) {
      this._clearTimer();
      if (this.open) this._startTimer();
    }
  }

  private _startTimer() {
    if (this.duration > 0 && this.open) {
      this._timer = setTimeout(() => this._dismiss(), this.duration);
    }
  }

  private _clearTimer() {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  private _dismiss() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('am-close', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="toast" part="toast">
        <div class="icon"><slot name="icon"></slot></div>
        <div class="content"><slot></slot></div>
        ${this.closable
          ? html`<button class="close-btn" aria-label="Dismiss" @click=${this._dismiss}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>`
          : nothing}
      </div>
    `;
  }
}

/* ================================================================
   AmToastRegion — container that stacks and positions toasts
   ================================================================ */

export type ToastPlacement = 'top-center' | 'top-right' | 'bottom-center' | 'bottom-right';

/**
 * Toast Region — a fixed-position container for stacking toasts.
 *
 * Place one `<am-toast-region>` in your app. Use its static `toast()`
 * helper or simply append `<am-toast>` elements to it.
 *
 * @slot - Toast elements
 *
 * @example
 * ```html
 * <am-toast-region placement="bottom-center"></am-toast-region>
 *
 * <script>
 *   const region = document.querySelector('am-toast-region');
 *   region.toast({ message: 'Saved!', variant: 'success' });
 * </script>
 * ```
 */
@customElement('am-toast-region')
export class AmToastRegion extends LitElement {
  @property({ reflect: true }) placement: ToastPlacement = 'bottom-center';

  static styles = css`
    :host {
      position: fixed;
      z-index: var(--am-z-toast, 1500);
      display: flex;
      flex-direction: column;
      gap: var(--am-space-2);
      padding: var(--am-space-4);
      pointer-events: none;
      max-width: 100vw;
      box-sizing: border-box;
    }

    :host([placement='top-center']), :host([placement='top-right']) {
      top: 0;
    }

    :host([placement='bottom-center']), :host(:not([placement])), :host([placement='bottom-right']) {
      bottom: 0;
    }

    :host([placement='top-center']), :host([placement='bottom-center']), :host(:not([placement])) {
      left: 50%;
      transform: translateX(-50%);
      align-items: center;
    }

    :host([placement='top-right']), :host([placement='bottom-right']) {
      right: 0;
      align-items: flex-end;
    }
  `;

  /**
   * Programmatically show a toast.
   * Returns the created `AmToast` element.
   */
  toast(options: {
    message: string;
    variant?: ToastVariant;
    duration?: number;
    closable?: boolean;
  }): AmToast {
    const t = document.createElement('am-toast') as AmToast;
    t.variant = options.variant ?? 'neutral';
    t.duration = options.duration ?? 5000;
    t.closable = options.closable ?? true;
    t.textContent = options.message;
    t.open = true;

    t.addEventListener('am-close', () => {
      t.remove();
    }, { once: true });

    this.appendChild(t);
    return t;
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-toast': AmToast;
    'am-toast-region': AmToastRegion;
  }
}

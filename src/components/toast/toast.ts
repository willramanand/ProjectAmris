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
  private _timerStart = 0;
  private _remaining = 0;

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
        padding: var(--am-space-4) var(--am-space-5);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        border: var(--am-border-1) solid transparent;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-base);
        line-height: var(--am-leading-normal);
        box-shadow: var(--am-shadow-lg);
        background: var(--am-surface-raised);
        color: var(--am-text);
        max-width: 28rem;
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
        padding-top: 0.125rem;
      }

      :host([variant='info']) .icon { color: var(--am-info); }
      :host([variant='success']) .icon { color: var(--am-success); }
      :host([variant='warning']) .icon { color: var(--am-warning); }
      :host([variant='danger']) .icon { color: var(--am-danger); }

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
        width: 1.5rem;
        height: 1.5rem;
        border-radius: var(--am-radius-full);
        color: var(--am-text-tertiary);
        flex-shrink: 0;
        position: relative;
        transition: color var(--am-duration-fast) var(--am-ease-default);
      }

      .close-btn:hover { color: var(--am-text-secondary); }
      .close-btn:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .countdown-ring {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .countdown-ring circle {
        fill: none;
        stroke: var(--am-border-strong);
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-dasharray: 62.83;
        stroke-dashoffset: 0;
      }

      :host([open]) .countdown-ring circle {
        animation: countdown var(--_toast-duration, 5000ms) linear forwards;
      }

      .toast:hover .countdown-ring circle {
        animation-play-state: paused;
      }

      :host([variant='info']) .countdown-ring circle { stroke: var(--am-info); }
      :host([variant='success']) .countdown-ring circle { stroke: var(--am-success); }
      :host([variant='warning']) .countdown-ring circle { stroke: var(--am-warning); }
      :host([variant='danger']) .countdown-ring circle { stroke: var(--am-danger); }

      /* Dismiss fade-out */
      :host(.dismissing) {
        animation: toast-out var(--am-duration-normal) var(--am-ease-default) forwards;
      }

      @keyframes toast-in {
        from { opacity: 0; transform: translateY(0.5rem); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes toast-out {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(0.5rem); }
      }

      @keyframes countdown {
        to { stroke-dashoffset: 62.83; }
      }

      @media (prefers-reduced-motion: reduce) {
        .toast { animation: none; }
        :host(.dismissing) { animation: none; }
        .close-btn { transition: none; }
        .countdown-ring circle { animation: none; }
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
      this._remaining = this.duration;
      this._timerStart = Date.now();
      this._timer = setTimeout(() => this._dismiss(), this._remaining);
    }
  }

  private _clearTimer() {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  private _handleMouseEnter() {
    if (this._timer !== null && this.duration > 0) {
      clearTimeout(this._timer);
      this._timer = null;
      this._remaining = Math.max(0, this._remaining - (Date.now() - this._timerStart));
    }
  }

  private _handleMouseLeave() {
    if (this._remaining > 0 && this.open && this.duration > 0) {
      this._timerStart = Date.now();
      this._timer = setTimeout(() => this._dismiss(), this._remaining);
    }
  }

  private get _defaultIcon() {
    switch (this.variant) {
      case 'info':
        return html`<svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"/></svg>`;
      case 'success':
        return html`<svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/></svg>`;
      case 'warning':
        return html`<svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/></svg>`;
      case 'danger':
        return html`<svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z"/></svg>`;
      default:
        return nothing;
    }
  }

  private _dismiss() {
    this._clearTimer();
    this.classList.add('dismissing');
    let done = false;
    const onEnd = () => {
      if (done) return;
      done = true;
      this.classList.remove('dismissing');
      this.open = false;
      this.dispatchEvent(new CustomEvent('am-close', { bubbles: true, composed: true }));
    };
    this.addEventListener('animationend', onEnd, { once: true });
    setTimeout(onEnd, 300);
  }

  render() {
    return html`
      <div class="toast" part="toast"
        style=${this.duration > 0 ? `--_toast-duration: ${this.duration}ms` : nothing}
        @mouseenter=${this._handleMouseEnter}
        @mouseleave=${this._handleMouseLeave}>
        <div class="icon"><slot name="icon">${this._defaultIcon}</slot></div>
        <div class="content"><slot></slot></div>
        ${this.closable
          ? html`<button class="close-btn" aria-label="Dismiss" @click=${this._dismiss}>
              ${this.duration > 0 ? html`
                <svg class="countdown-ring" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              ` : nothing}
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

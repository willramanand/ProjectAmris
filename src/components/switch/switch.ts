import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Switch — a toggle switch for on/off states.
 *
 * @slot - Label content
 * @csspart track - The switch track
 * @csspart thumb - The switch thumb
 * @csspart label - The label text
 *
 * @fires qz-change - Fires when toggled with { checked } detail
 *
 * @example
 * ```html
 * <qz-switch>Dark mode</qz-switch>
 * <qz-switch checked>Notifications</qz-switch>
 * ```
 */
@customElement('am-switch')
export class AmSwitch extends LitElement {
  static formAssociated = true;

  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) loading = false;
  @property() name = '';
  @property() value = 'on';

  private internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  static styles = [
    resetStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--am-space-2-5);
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      :host([disabled]) {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      .track {
        position: relative;
        width: 2.5rem;
        height: 1.5rem;
        border-radius: var(--am-radius-full);
        background: var(--am-border-strong);
        transition: background var(--am-duration-fast) var(--am-ease-default);
        flex-shrink: 0;
      }

      :host([checked]) .track {
        background: var(--am-primary);
      }

      :host(:hover:not([disabled])) .track {
        background: var(--am-text-tertiary);
      }

      :host(:hover[checked]:not([disabled])) .track {
        background: var(--am-primary-hover);
      }

      .track:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .thumb {
        position: absolute;
        top: 0.1875rem;
        left: 0.1875rem;
        width: 1.125rem;
        height: 1.125rem;
        border-radius: var(--am-radius-full);
        background: var(--am-color-neutral-0);
        box-shadow: var(--am-shadow-sm);
        transition:
          transform var(--am-duration-normal) var(--am-ease-spring);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      :host([checked]) .thumb {
        transform: translateX(1rem);
      }

      .loading-spinner {
        width: 0.625rem;
        height: 0.625rem;
        border-radius: var(--am-radius-full);
        border: 1.5px solid var(--am-text-tertiary);
        border-top-color: transparent;
        animation: spin 0.6s linear infinite;
      }

      :host([checked]) .loading-spinner {
        border-color: var(--am-primary);
        border-top-color: transparent;
      }

      @keyframes spin { to { transform: rotate(360deg); } }

      .label {
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        line-height: var(--am-leading-normal);
        color: var(--am-text);
      }

      @media (prefers-reduced-motion: reduce) {
        .track, .thumb { transition: none; }
        .loading-spinner { animation-duration: 1.5s; }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('checked')) {
      this.internals.setFormValue(this.checked ? this.value : null);
    }
  }

  private _toggle = () => {
    if (this.disabled || this.loading) return;
    this.checked = !this.checked;
    this.dispatchEvent(new CustomEvent('am-change', { detail: { checked: this.checked }, bubbles: true, composed: true }));
  };

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this._toggle();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._toggle);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._toggle);
  }

  render() {
    return html`
      <div
        class="track"
        part="track"
        role="switch"
        tabindex=${this.disabled ? nothing : '0'}
        aria-checked=${String(this.checked)}
        aria-disabled=${this.disabled ? 'true' : nothing}
        @keydown=${this._handleKeyDown}
      >
        <div class="thumb" part="thumb">
          ${this.loading ? html`<span class="loading-spinner" aria-hidden="true"></span>` : nothing}
        </div>
      </div>
      <span class="label" part="label">
        <slot></slot>
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-switch': AmSwitch;
  }
}

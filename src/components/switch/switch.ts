import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';
import { ValidationController } from '../../internal/controllers/validation.js';
import { attachInternalsSafe } from '../../internal/helpers/attach-internals-safe.js';
import {
  isFormFallbackEnabled,
  syncFormFallback,
  teardownFormFallback,
  warnBelowFloorOnce,
} from '../../internal/helpers/form-participation.js';
import { uniqueId } from '../../utilities/unique-id.js';

/** Native-style message shown when a required switch is left off (D-01). */
const REQUIRED_MESSAGE = 'Please turn this on to continue.';

/**
 * Switch — a toggle switch for on/off states.
 *
 * @slot - Label content
 * @csspart track - The switch track
 * @csspart thumb - The switch thumb
 * @csspart label - The label text
 * @csspart error - The validation error message region
 *
 * @fires input - Fires when toggled
 * @fires change - Fires when toggled
 *
 * @example
 * ```html
 * <am-switch>Dark mode</am-switch>
 * <am-switch checked>Notifications</am-switch>
 * ```
 */
@customElement('am-switch')
export class AmSwitch extends LitElement {
  static formAssociated = true;

  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) loading = false;
  /** Marks the switch as required — must be on to satisfy form validation. */
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property() name = '';
  @property() value = 'on';
  @property({ attribute: 'aria-label' }) override ariaLabel: string | null = null;

  @query('.track') private _track!: HTMLElement;
  /**
   * Attached form internals, or `null` below the ElementInternals floor where
   * {@link attachInternalsSafe} could not attach (COMPAT-02). All call sites
   * null-safe this so the component still constructs and renders.
   */
  private internals: ElementInternals | null;

  /** Stable id shared by the error message node and the track's aria-describedby. */
  private readonly _errorId = uniqueId('am-switch-error');

  /**
   * Resolves the displayed validation message + shown-state from the required
   * constraint and any consumer-supplied {@link setCustomError} error. Lives on
   * the src/internal boundary — never on the public surface (D-09).
   */
  private _validation = new ValidationController(this, {
    internals: () => this.internals,
    anchor: () => this._track,
    describedById: this._errorId,
  });

  /** Resolved error text mirrored from the controller for render. */
  @state() private _errorMessage = '';
  /** Whether the error message region is currently shown. */
  @state() private _showError = false;
  /** True once a failed form submit occurred — drives assertive role=alert (D-04). */
  @state() private _submitFailed = false;
  /** Tracks whether the reflected `invalid` attribute is owned by validation. */
  private _invalidFromValidation = false;

  constructor() {
    super();
    this.internals = attachInternalsSafe(this);
    // A failed constraint check on form submit fires `invalid` on this host;
    // suppress the browser's default bubble and surface our own message (D-04).
    this.addEventListener('invalid', this._onInvalid);
  }

  static styles = [
    resetStyles,
    css`
      :host {
        display: inline-flex;
        flex-wrap: wrap;
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

      /* ---- Validation message ---- */

      .error-text {
        flex-basis: 100%;
        width: 100%;
        margin-top: var(--am-space-1);
        color: var(--am-danger);
        font-size: var(--am-text-sm);
        line-height: 1.3;
      }

      @media (prefers-reduced-motion: reduce) {
        .track, .thumb { transition: none; }
        .loading-spinner { animation-duration: 1.5s; }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('checked')) {
      this.internals?.setFormValue(this.checked ? this.value : null);
    }
    // COMPAT-03: below the ElementInternals floor (internals is null), mirror the
    // boolean checked-state onto a hidden Light-DOM input when the consumer has
    // opted in — like a native checkbox, an OFF switch contributes nothing to
    // FormData, so tear the mirror down when unchecked. Otherwise warn once.
    // XOR-gated on `!this.internals`, so above the floor no fallback engages.
    if (!this.internals) {
      if (isFormFallbackEnabled()) {
        if (this.checked) {
          syncFormFallback(this, {
            name: this.name,
            value: this.value,
            disabled: this.disabled,
          });
        } else {
          teardownFormFallback(this);
        }
      } else {
        warnBelowFloorOnce('am-switch');
      }
    }
    // The required constraint is only knowable post-render (depends on
    // checked/required state), so this reflection runs here and may schedule
    // one further bounded, idempotent update.
    this._syncValidation();
  }

  /**
   * Mirror the required constraint onto the host ElementInternals (so
   * `validationMessage` is populated), then reflect the controller's resolved
   * message + shown-state into render state and the `invalid` attribute. Never
   * throws; bounded (idempotent) re-render.
   */
  private _syncValidation(): void {
    const valueMissing = this.required && !this.checked;
    if (valueMissing) {
      this.internals?.setValidity({ valueMissing: true }, REQUIRED_MESSAGE, this._track);
    } else {
      this.internals?.setValidity({});
    }

    const show = this._validation.invalid;
    const message = show ? this._validation.message : '';

    if (message !== this._errorMessage) {
      this._errorMessage = message;
    }
    if (show !== this._showError) {
      this._showError = show;
      // Reflect :host([invalid]) without clobbering a consumer-set `invalid`
      // attribute — only validation-owned reflections are cleared by validation.
      if (show) {
        this.invalid = true;
        this._invalidFromValidation = true;
      } else if (this._invalidFromValidation) {
        this.invalid = false;
        this._invalidFromValidation = false;
      }
    }
    if (!show) {
      this._submitFailed = false;
    }
  }

  private _onInvalid = (event: Event): void => {
    event.preventDefault();
    this._submitFailed = true;
    this._validation.markTouched();
  };

  /**
   * Set or clear a custom validation error (e.g. a server-side rejection).
   *
   * A non-empty message overrides the native constraint message and is shown
   * immediately; passing `''` clears the custom error and falls back to the
   * native constraint message (if any). Custom message wins over native.
   *
   * @param message - The error text to display, or `''` to clear to native.
   */
  setCustomError(message: string): void {
    this._validation.setCustomError(message);
  }

  private _handleBlur = (): void => {
    // D-01 timing gate: a native constraint error may surface only after the
    // control is touched (blur), never on first paint.
    this._validation.markTouched();
  };

  private _toggle = () => {
    if (this.disabled || this.loading) return;
    this.checked = !this.checked;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
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
    // Remove any Light-DOM fallback mirror so a disconnect leaves no stale node
    // (no-op above the floor, where the fallback never attached).
    teardownFormFallback(this);
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
        aria-required=${this.required ? 'true' : nothing}
        aria-invalid=${this.invalid ? 'true' : nothing}
        aria-describedby=${this._showError ? this._errorId : nothing}
        aria-label=${this.ariaLabel || nothing}
        aria-labelledby=${this.ariaLabel ? nothing : 'label'}
        @keydown=${this._handleKeyDown}
        @blur=${this._handleBlur}
      >
        <div class="thumb" part="thumb">
          ${this.loading ? html`<span class="loading-spinner" aria-hidden="true"></span>` : nothing}
        </div>
      </div>
      <span class="label" part="label" id="label">
        <slot></slot>
      </span>
      ${this._showError
        ? html`<div
            id=${this._errorId}
            part="error"
            class="error-text"
            role=${this._submitFailed ? 'alert' : nothing}
            aria-live=${this._submitFailed ? 'off' : 'polite'}
          >${this._errorMessage}</div>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-switch': AmSwitch;
  }
}

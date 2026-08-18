import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';
import { requestAssociatedFormSubmit } from '../../utilities/form-actions.js';
import { ValidationController } from '../../internal/controllers/validation.js';
import { uniqueId } from '../../utilities/unique-id.js';

export type NumberFieldSize = 'sm' | 'md' | 'lg';

/**
 * Number Field — a numeric input with increment/decrement buttons.
 *
 * @csspart input - The native input
 * @csspart decrement - The decrement button
 * @csspart increment - The increment button
 * @csspart error - The validation error message region
 *
 * @fires input - Fires when the value changes
 * @fires change - Fires when the value change is committed
 *
 * @example
 * ```html
 * <am-number-field label="Quantity" value="1" min="0" max="99" step="1"></am-number-field>
 * ```
 */
@customElement('am-number-field')
export class AmNumberField extends LitElement {
  static formAssociated = true;

  @property() label = '';
  @property({ type: Number }) value: number | null = null;
  @property({ type: Number }) min = -Infinity;
  @property({ type: Number }) max = Infinity;
  @property({ type: Number }) step = 1;
  @property() name = '';
  @property() placeholder = '';
  @property({ reflect: true }) size: NumberFieldSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) readonly = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property({ type: Boolean, reflect: true }) required = false;

  @query('input') private _inputEl!: HTMLInputElement;
  private _internals: ElementInternals;

  /** Stable id shared by the error message node and the input's aria-describedby. */
  private readonly _errorId = uniqueId('am-number-field-error');

  /**
   * Resolves the displayed validation message + shown-state from the native
   * constraint message and any consumer-supplied {@link setCustomError} error.
   * Lives on the src/internal boundary — never on the public surface (D-09).
   */
  private _validation = new ValidationController(this, {
    internals: () => this._internals,
    anchor: () => this._inputEl,
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
    this._internals = this.attachInternals();
    // A failed constraint check on form submit fires `invalid` on this host;
    // suppress the browser's default bubble and surface our own message (D-04).
    this.addEventListener('invalid', this._onInvalid);
  }

  static styles = [
    resetStyles,
    css`
      :host { display: block; }

      .wrapper {
        display: flex;
        align-items: center;
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-xl);
        corner-shape: squircle;
        background: var(--am-surface);
        transition: border-color var(--am-duration-fast) var(--am-ease-default),
                    box-shadow var(--am-duration-fast) var(--am-ease-default);
        overflow: hidden;
      }

      :host([size='sm']) .wrapper { height: var(--am-size-sm); font-size: var(--am-text-sm); }
      :host([size='md']) .wrapper, :host(:not([size])) .wrapper { height: var(--am-size-md); font-size: var(--am-text-sm); }
      :host([size='lg']) .wrapper { height: var(--am-size-lg); font-size: var(--am-text-base); }

      .wrapper:focus-within {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      .wrapper.invalid { border-color: var(--am-danger); }
      .wrapper.invalid:focus-within {
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-danger) 25%, transparent);
      }

      :host([disabled]) .wrapper { opacity: var(--am-disabled-opacity); cursor: not-allowed; }

      .stepper-btn {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 100%;
        cursor: pointer;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
        transition: background var(--am-duration-fast) var(--am-ease-default),
                    color var(--am-duration-fast) var(--am-ease-default);
      }

      .stepper-btn:hover { background: var(--am-hover-overlay); color: var(--am-text); }
      .stepper-btn:active { background: var(--am-active-overlay); }
      .stepper-btn[disabled] { opacity: var(--am-disabled-opacity); pointer-events: none; }

      input {
        all: unset;
        flex: 1;
        min-width: 0;
        text-align: center;
        font: inherit;
        color: var(--am-text);
        padding: 0 var(--am-space-1);
      }

      input::placeholder { color: var(--am-text-tertiary); }

      /* Hide browser spinner */
      input::-webkit-inner-spin-button,
      input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      input[type='number'] { -moz-appearance: textfield; }

      .label {
        display: block;
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        font-weight: var(--am-weight-medium);
        color: var(--am-text);
        margin-bottom: var(--am-space-1-5);
      }

      /* ---- Validation message ---- */

      .error-text {
        margin-top: var(--am-space-1);
        color: var(--am-danger);
        font-size: var(--am-text-sm);
        line-height: 1.3;
      }

      @media (prefers-reduced-motion: reduce) {
        .wrapper, .stepper-btn { transition: none; }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('value')) {
      this._internals.setFormValue(this.value != null ? String(this.value) : null);
    }
    // Native constraint validity is only knowable from the RENDERED inner
    // <input>, so this reflection runs post-render and may schedule one further
    // (bounded, idempotent) update — the standard cost of mirroring native
    // ElementInternals validity into reactive render state.
    this._syncValidation();
  }

  /**
   * Mirror the inner input's native constraint validity onto the host
   * ElementInternals (so `validationMessage` is populated), then reflect the
   * controller's resolved message + shown-state into render state and the
   * `invalid` attribute. Never throws; bounded (idempotent) re-render.
   */
  private _syncValidation(): void {
    const control = this._inputEl;
    if (control) {
      const v = control.validity;
      const flags: ValidityStateFlags = {
        valueMissing: v.valueMissing,
        typeMismatch: v.typeMismatch,
        patternMismatch: v.patternMismatch,
        tooShort: v.tooShort,
        tooLong: v.tooLong,
        rangeUnderflow: v.rangeUnderflow,
        rangeOverflow: v.rangeOverflow,
        stepMismatch: v.stepMismatch,
        badInput: v.badInput,
      };
      const anyInvalid = Object.values(flags).some(Boolean);
      if (anyInvalid) {
        this._internals.setValidity(flags, control.validationMessage, control);
      } else {
        this._internals.setValidity({});
      }
    }

    const show = this._validation.invalid;
    // Only hold message text while shown — avoids churning render state with a
    // resolved-but-hidden native message on a pristine (untouched) field.
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
    this._validation.markTouched(); // requests update -> willUpdate reflects
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
    this._validation.setCustomError(message); // requests update -> willUpdate reflects
  }

  private _handleBlur() {
    // D-01 timing gate: a native constraint error may surface only after the
    // field is touched (blur), never on first paint.
    this._validation.markTouched();
  }

  private _increment() {
    const next = (this.value ?? 0) + this.step;
    this._setValue(next, { emitInput: true, emitChange: true });
  }

  private _decrement() {
    const next = (this.value ?? 0) - this.step;
    this._setValue(next, { emitInput: true, emitChange: true });
  }

  private _setValue(v: number, options: { emitInput?: boolean; emitChange?: boolean } = {}) {
    const clamped = Math.max(this.min, Math.min(this.max, v));
    // Round to step precision
    const precision = String(this.step).split('.')[1]?.length ?? 0;
    this.value = Number(clamped.toFixed(precision));
    if (this._inputEl) {
      this._inputEl.value = String(this.value);
      if (options.emitInput) {
        this._inputEl.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      }
      if (options.emitChange) {
        this._inputEl.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      }
    }
  }

  private _handleInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    if (raw === '') {
      this.value = null;
    } else {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) this._setValue(parsed);
    }
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowUp') { e.preventDefault(); this._increment(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this._decrement(); return; }
    if (e.key === 'Enter') {
      // Enter attempts submit — treat as touched so a native error surfaces (D-01).
      this._validation.markTouched();
      requestAssociatedFormSubmit(this, {
        event: e,
        internals: this._internals,
        disabled: this.disabled,
        readonly: this.readonly,
      });
    }
  }

  render() {
    const atMin = this.value != null && this.value <= this.min;
    const atMax = this.value != null && this.value >= this.max;

    return html`
      ${this.label ? html`<span class="label">${this.label}</span>` : nothing}
      <div class="wrapper ${this.invalid ? 'invalid' : ''}">
        <button class="stepper-btn" part="decrement" aria-label="Decrease"
          ?disabled=${this.disabled || this.readonly || atMin}
          @click=${this._decrement}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <input
          part="input"
          type="number"
          .value=${this.value != null ? String(this.value) : ''}
          placeholder=${this.placeholder || nothing}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          min=${this.min !== -Infinity ? this.min : nothing}
          max=${this.max !== Infinity ? this.max : nothing}
          step=${this.step}
          aria-label=${this.label || nothing}
          aria-invalid=${this.invalid ? 'true' : nothing}
          aria-describedby=${this._showError ? this._errorId : nothing}
          @input=${this._handleInput}
          @keydown=${this._handleKeyDown}
          @blur=${this._handleBlur}
        />
        <button class="stepper-btn" part="increment" aria-label="Increase"
          ?disabled=${this.disabled || this.readonly || atMax}
          @click=${this._increment}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
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
    'am-number-field': AmNumberField;
  }
}



import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, queryAll, state } from 'lit/decorators.js';
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

/**
 * Input OTP — a one-time passcode input with individual character cells.
 *
 * @csspart cell - Individual input cells
 * @csspart error - The validation error message region
 *
 * @fires input - Fires when the value changes
 * @fires change - Fires when the value changes
 * @fires am-complete - Fires when all cells are filled
 *
 * @example
 * ```html
 * <am-input-otp length="6"></am-input-otp>
 * <am-input-otp length="4" type="numeric"></am-input-otp>
 * ```
 */
@customElement('am-input-otp')
export class AmInputOtp extends LitElement {
  static formAssociated = true;

  /** Number of OTP characters. */
  @property({ type: Number }) length = 6;

  /** Input mode. */
  @property() type: 'numeric' | 'alphanumeric' = 'numeric';

  @property() name = '';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  /** Marks the aggregate OTP value as required for constraint validation. */
  @property({ type: Boolean, reflect: true }) required = false;

  @state() private _values: string[] = [];

  @queryAll('input') private _inputs!: NodeListOf<HTMLInputElement>;

  /**
   * Attached form internals, or `null` below the ElementInternals floor where
   * {@link attachInternalsSafe} could not attach (COMPAT-02). All call sites
   * null-safe this so the component still constructs and renders; below the
   * floor the opt-in hidden-input fallback (COMPAT-03) mirrors the value instead.
   */
  private _internals: ElementInternals | null;

  /** Stable id shared by the error message node and the group's aria-describedby. */
  private readonly _errorId = uniqueId('am-input-otp-error');

  /**
   * Resolves the displayed validation message + shown-state from the
   * synthetic constraint message ({@link _syncValidation}) and any
   * consumer-supplied {@link setCustomError} error. Lives on the
   * src/internal boundary — never on the public surface (D-09). The anchor
   * is the first cell — the OTP's primary focusable — used by
   * ElementInternals for native focus-on-invalid behavior.
   */
  private _validation = new ValidationController(this, {
    internals: () => this._internals,
    anchor: () => this._inputs?.[0] ?? null,
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
    this._internals = attachInternalsSafe(this);
    this._values = Array(this.length).fill('');
    // A failed constraint check on form submit fires `invalid` on this host;
    // suppress the browser's default bubble and surface our own message (D-04).
    this.addEventListener('invalid', this._onInvalid);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Remove the below-floor hidden-input mirror (if one was created) so a
    // disconnect leaves no stale light-DOM node (COMPAT-03 teardown; no-op above
    // the floor where no mirror exists).
    teardownFormFallback(this);
  }

  static styles = [
    resetStyles,
    css`
      :host { display: inline-flex; }

      .cells {
        display: flex;
        gap: var(--am-space-2);
      }

      input {
        all: unset;
        width: 2.5rem;
        height: 3rem;
        text-align: center;
        font-family: var(--am-font-mono, monospace);
        font-size: var(--am-text-lg);
        font-weight: var(--am-weight-semibold);
        color: var(--am-text);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-radius-lg);
        corner-shape: squircle;
        background: var(--am-surface);
        caret-color: var(--am-primary);
        transition: border-color var(--am-duration-fast) var(--am-ease-default),
                    box-shadow var(--am-duration-fast) var(--am-ease-default);
      }

      input:focus {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      :host([invalid]) input { border-color: var(--am-danger); }
      :host([invalid]) input:focus {
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-danger) 25%, transparent);
      }

      :host([disabled]) input { opacity: var(--am-disabled-opacity); cursor: not-allowed; }

      /* ---- Validation message ---- */

      .error-text {
        margin-top: var(--am-space-1);
        color: var(--am-danger);
        font-size: var(--am-text-sm);
        line-height: 1.3;
      }

      @media (prefers-reduced-motion: reduce) {
        input { transition: none; }
      }
    `,
  ];

  protected willUpdate(changed: PropertyValues) {
    if (changed.has('length')) {
      this._values = Array(this.length).fill('');
    }
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('_values')) {
      const value = this._values.join('');
      this._internals?.setFormValue(value);
      // Below the ElementInternals floor (internals null): the XOR-gated opt-in
      // hidden-input fallback mirrors the aggregate OTP value (COMPAT-03), else a
      // one-time dev warning.
      if (!this._internals) {
        isFormFallbackEnabled()
          ? syncFormFallback(this, {
              name: this.name,
              value,
              required: this.required,
              disabled: this.disabled,
            })
          : warnBelowFloorOnce('am-input-otp');
      }
    }
    // Validity depends only on the aggregate value + `required`, both of
    // which are already reactive properties — safe to resolve every update.
    this._syncValidation();
  }

  /**
   * Resolve the synthetic constraint validity from the aggregate OTP value
   * (there is no native multi-cell constraint, so `required` + completeness
   * stands in for the native message), mirror it onto ElementInternals, then
   * reflect the controller's resolved message + shown-state into render
   * state and the `invalid` attribute. Never throws; bounded (idempotent)
   * re-render.
   */
  private _syncValidation(): void {
    const anchor = this._inputs?.[0] ?? null;
    const isMissing = this.required && this.value.length < this.length;
    if (isMissing) {
      this._internals?.setValidity(
        { valueMissing: true },
        `Please enter all ${this.length} characters.`,
        anchor ?? undefined,
      );
    } else {
      this._internals?.setValidity({});
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
   * A non-empty message overrides the synthetic constraint message and is
   * shown immediately; passing `''` clears the custom error and falls back
   * to the synthetic constraint message (if any). Custom message wins over
   * native.
   *
   * @param message - The error text to display, or `''` to clear to native.
   */
  setCustomError(message: string): void {
    this._validation.setCustomError(message); // requests update -> willUpdate reflects
  }

  /**
   * D-01 timing gate for the multi-cell group: a native constraint error may
   * surface only once focus leaves the group ENTIRELY (not merely moving
   * between cells), never on first paint.
   */
  private _handleGroupFocusOut = (e: FocusEvent): void => {
    const next = e.relatedTarget as Node | null;
    const stillInside = !!next && Array.from(this._inputs).some((input) => input === next);
    if (!stillInside) {
      this._validation.markTouched();
    }
  };

  get value(): string {
    return this._values.join('');
  }

  private _isValid(char: string): boolean {
    if (this.type === 'numeric') return /^\d$/.test(char);
    return /^[a-zA-Z0-9]$/.test(char);
  }

  private _handleInput(index: number, e: Event) {
    const input = e.target as HTMLInputElement;
    const char = input.value.slice(-1);

    if (char && this._isValid(char)) {
      this._values = [...this._values];
      this._values[index] = char;
      this._emitChange();

      // Advance to next cell
      if (index < this.length - 1) {
        this._inputs[index + 1]?.focus();
      }

      // Check completion
      if (this._values.every(v => v.length > 0)) {
        this.dispatchEvent(new CustomEvent('am-complete', {
          detail: { value: this.value },
          bubbles: true,
          composed: true,
        }));
      }
    } else {
      input.value = this._values[index];
    }
  }

  private _handleKeyDown(index: number, e: KeyboardEvent) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (this._values[index]) {
        this._values = [...this._values];
        this._values[index] = '';
        this._emitChange();
      } else if (index > 0) {
        this._values = [...this._values];
        this._values[index - 1] = '';
        this._emitChange();
        this._inputs[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      this._inputs[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < this.length - 1) {
      e.preventDefault();
      this._inputs[index + 1]?.focus();
    }
  }

  private _handlePaste(e: ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData?.getData('text') ?? '';
    const chars = text.split('').filter(c => this._isValid(c)).slice(0, this.length);

    this._values = Array(this.length).fill('');
    chars.forEach((c, i) => { this._values[i] = c; });
    this._emitChange();

    const focusIndex = Math.min(chars.length, this.length - 1);
    this.updateComplete.then(() => this._inputs[focusIndex]?.focus());

    if (chars.length === this.length) {
      this.dispatchEvent(new CustomEvent('am-complete', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }));
    }
  }

  private _emitChange() {
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div
        class="cells"
        role="group"
        aria-label="One-time passcode"
        aria-invalid=${this.invalid ? 'true' : nothing}
        aria-describedby=${this._showError ? this._errorId : nothing}
        @focusout=${this._handleGroupFocusOut}
      >
        ${Array.from({ length: this.length }, (_, i) => html`
          <input
            part="cell"
            type="text"
            inputmode=${this.type === 'numeric' ? 'numeric' : 'text'}
            maxlength="1"
            .value=${this._values[i] || ''}
            ?disabled=${this.disabled}
            aria-label="Digit ${i + 1} of ${this.length}"
            @input=${(e: Event) => this._handleInput(i, e)}
            @keydown=${(e: KeyboardEvent) => this._handleKeyDown(i, e)}
            @paste=${this._handlePaste}
            @focus=${(e: Event) => (e.target as HTMLInputElement).select()}
          />
        `)}
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
    'am-input-otp': AmInputOtp;
  }
}

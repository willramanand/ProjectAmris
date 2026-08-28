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

/**
 * Slider — a custom-styled range slider.
 *
 * @csspart input - The native range input element
 * @csspart error - The validation error message region
 *
 * @fires input - Fires during drag
 * @fires change - Fires on drag end
 *
 * @example
 * ```html
 * <am-slider></am-slider>
 * <am-slider value="30" min="0" max="100" step="5"></am-slider>
 * <am-slider label="Volume" value="75"></am-slider>
 * ```
 */
@customElement('am-slider')
export class AmSlider extends LitElement {
  static formAssociated = true;

  @property({ type: Number }) value = 50;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) step = 1;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property() name = '';
  @property() label = '';

  @query('input[type="range"]') private _input!: HTMLInputElement;
  /**
   * Attached form internals, or `null` below the ElementInternals floor where
   * {@link attachInternalsSafe} could not attach (COMPAT-02). All call sites
   * null-safe this so the component still constructs and renders.
   */
  private internals: ElementInternals | null;

  /** Stable id shared by the error message node and the input's aria-describedby. */
  private readonly _errorId = uniqueId('am-slider-error');

  /**
   * Resolves the displayed validation message + shown-state from the native
   * range constraint and any consumer-supplied {@link setCustomError} error.
   * Lives on the src/internal boundary — never on the public surface (D-09).
   */
  private _validation = new ValidationController(this, {
    internals: () => this.internals,
    anchor: () => this._input,
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
        display: block;
        -webkit-tap-highlight-color: transparent;
      }

      :host([disabled]) {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      input[type='range'] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 1.25rem;
        background: transparent;
        cursor: pointer;
        margin: 0;
        padding: 0;
      }

      input[type='range']:focus-visible {
        outline: none;
      }

      /* ---- WebKit Track ---- */

      input[type='range']::-webkit-slider-runnable-track {
        height: 0.25rem;
        border-radius: var(--am-radius-full);
        background: linear-gradient(
          to right,
          var(--am-primary) 0%,
          var(--am-primary) var(--fill-percent, 50%),
          var(--am-color-neutral-200) var(--fill-percent, 50%),
          var(--am-color-neutral-200) 100%
        );
      }

      /* ---- WebKit Thumb ---- */

      input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 1.25rem;
        height: 1.25rem;
        margin-top: -0.5rem;
        border-radius: var(--am-radius-full);
        corner-shape: squircle;
        background: var(--am-surface);
        border: var(--am-border-2) solid var(--am-primary);
        box-shadow: var(--am-shadow-sm);
        transition:
          transform var(--am-duration-normal) var(--am-ease-spring),
          border-color var(--am-duration-fast) var(--am-ease-default);
      }

      input[type='range']:hover::-webkit-slider-thumb {
        transform: scale(1.1);
        border-color: var(--am-primary-hover);
      }

      input[type='range']:active::-webkit-slider-thumb {
        transform: scale(0.95);
      }

      input[type='range']:focus-visible::-webkit-slider-thumb {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      /* ---- Firefox Track ---- */

      input[type='range']::-moz-range-track {
        height: 0.25rem;
        border-radius: var(--am-radius-full);
        background: var(--am-color-neutral-200);
        border: none;
      }

      input[type='range']::-moz-range-progress {
        height: 0.25rem;
        border-radius: var(--am-radius-full);
        background: var(--am-primary);
      }

      /* ---- Firefox Thumb ---- */

      input[type='range']::-moz-range-thumb {
        width: 1.25rem;
        height: 1.25rem;
        border-radius: var(--am-radius-full);
        corner-shape: squircle;
        background: var(--am-surface);
        border: var(--am-border-2) solid var(--am-primary);
        box-shadow: var(--am-shadow-sm);
        transition:
          transform var(--am-duration-normal) var(--am-ease-spring),
          border-color var(--am-duration-fast) var(--am-ease-default);
      }

      input[type='range']:hover::-moz-range-thumb {
        transform: scale(1.1);
        border-color: var(--am-primary-hover);
      }

      input[type='range']:active::-moz-range-thumb {
        transform: scale(0.95);
      }

      input[type='range']:focus-visible::-moz-range-thumb {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      /* ---- Validation message ---- */

      .error-text {
        margin-top: var(--am-space-1);
        color: var(--am-danger);
        font-size: var(--am-text-sm);
        line-height: 1.3;
      }

      @media (prefers-reduced-motion: reduce) {
        input[type='range']::-webkit-slider-thumb { transition: none; }
        input[type='range']::-moz-range-thumb { transition: none; }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('value') || changed.has('min') || changed.has('max')) {
      const percent = ((this.value - this.min) / (this.max - this.min)) * 100;
      this.style.setProperty('--fill-percent', `${percent}%`);
      this.internals?.setFormValue(String(this.value));
    }
    // COMPAT-03: below the ElementInternals floor (internals is null), the
    // control cannot report to the enclosing <form> via setFormValue. When the
    // consumer has opted into the fallback, mirror the numeric value (as a
    // string, matching the native setFormValue serialization) onto a hidden
    // Light-DOM input; otherwise warn once. XOR-gated on `!this.internals`, so
    // above the floor neither branch runs and no double-submit is possible.
    if (!this.internals) {
      if (isFormFallbackEnabled()) {
        syncFormFallback(this, {
          name: this.name,
          value: String(this.value),
          disabled: this.disabled,
        });
      } else {
        warnBelowFloorOnce('am-slider');
      }
    }
    // Native constraint validity is only knowable from the RENDERED range input,
    // so this reflection runs post-render (bounded, idempotent extra update).
    this._syncValidation();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Remove any Light-DOM fallback mirror so a disconnect leaves no stale node
    // (no-op above the floor, where the fallback never attached).
    teardownFormFallback(this);
  }

  /**
   * Mirror the inner range input's native constraint validity onto the host
   * ElementInternals, then reflect the controller's resolved message +
   * shown-state into render state and the `invalid` attribute. Never throws.
   */
  private _syncValidation(): void {
    const input = this._input;
    if (input) {
      const v = input.validity;
      const flags: ValidityStateFlags = {
        valueMissing: v.valueMissing,
        rangeUnderflow: v.rangeUnderflow,
        rangeOverflow: v.rangeOverflow,
        stepMismatch: v.stepMismatch,
        badInput: v.badInput,
      };
      const anyInvalid = Object.values(flags).some(Boolean);
      if (anyInvalid) {
        this.internals?.setValidity(flags, input.validationMessage, input);
      } else {
        this.internals?.setValidity({});
      }
    }

    const show = this._validation.invalid;
    const message = show ? this._validation.message : '';

    if (message !== this._errorMessage) {
      this._errorMessage = message;
    }
    if (show !== this._showError) {
      this._showError = show;
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

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = Number(input.value);
  }

  private _handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = Number(input.value);
  }

  private _handleBlur = (): void => {
    // D-01 timing gate: a native constraint error may surface only after the
    // control is touched (blur), never on first paint.
    this._validation.markTouched();
  };

  render() {
    return html`
      <input
        part="input"
        type="range"
        .value=${String(this.value)}
        min=${this.min}
        max=${this.max}
        step=${this.step}
        ?disabled=${this.disabled}
        aria-label=${this.label || nothing}
        aria-invalid=${this.invalid ? 'true' : nothing}
        aria-describedby=${this._showError ? this._errorId : nothing}
        @input=${this._handleInput}
        @change=${this._handleChange}
        @blur=${this._handleBlur}
      />
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
    'am-slider': AmSlider;
  }
}

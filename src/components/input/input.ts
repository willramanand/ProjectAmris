import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import { resetStyles } from '../../styles/reset.css.js';
import { requestAssociatedFormSubmit } from '../../utilities/form-actions.js';
import { ValidationController } from '../../internal/controllers/validation.js';
import { uniqueId } from '../../utilities/unique-id.js';

export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Input — a styled text input with a Pegasus-style floating label.
 * The label sits inside the input as placeholder text and animates
 * upward when the input is focused or has a value.
 *
 * @slot prefix - Content before the input (e.g. icon)
 * @slot suffix - Content after the input (e.g. icon, button)
 * @csspart input - The native input element
 * @csspart wrapper - The outer input wrapper
 * @csspart label - The floating label element
 * @csspart clear - The clear button
 * @csspart error - The validation error message region
 *
 * @cssprop --am-input-radius - Override border radius
 *
 * @fires input - Fires on input
 * @fires change - Fires on change
 * @fires am-clear - Fires when the clear button is clicked
 *
 * @example
 * ```html
 * <am-input label="Email address" type="email"></am-input>
 * <am-input label="Search" clearable></am-input>
 * ```
 */
@customElement('am-input')
export class AmInput extends LitElement {
  static formAssociated = true;

  /** Floating label text. When set, uses the floating label pattern. */
  @property() label = '';

  @property() type: string = 'text';
  @property() value = '';
  @property() placeholder = '';
  @property() name = '';
  @property({ reflect: true }) size: InputSize = 'md';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) readonly = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: Boolean, reflect: true }) clearable = false;
  @property() autocomplete = '';
  @property({ type: Number }) minlength?: number;
  @property({ type: Number }) maxlength?: number;
  @property() pattern = '';

  @query('input') private inputEl!: HTMLInputElement;
  private internals: ElementInternals;

  /** Stable id shared by the error message node and the input's aria-describedby. */
  private readonly _errorId = uniqueId('am-input-error');

  /**
   * Resolves the displayed validation message + shown-state from the native
   * constraint message and any consumer-supplied {@link setCustomError} error.
   * Lives on the src/internal boundary — never on the public surface (D-09).
   */
  private _validation = new ValidationController(this, {
    internals: () => this.internals,
    anchor: () => this.inputEl,
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
    this.internals = this.attachInternals();
    // A failed constraint check on form submit fires `invalid` on this host;
    // suppress the browser's default bubble and surface our own message (D-04).
    this.addEventListener('invalid', this._onInvalid);
  }

  static styles = [
    resetStyles,
    css`
      :host {
        display: block;
      }

      .wrapper {
        display: flex;
        align-items: center;
        gap: var(--am-space-2);
        border: var(--am-border-1) solid var(--am-border);
        border-radius: var(--am-input-radius, var(--am-radius-xl));
        corner-shape: squircle;
        background: var(--am-surface);
        transition:
          border-color var(--am-duration-fast) var(--am-ease-default),
          box-shadow var(--am-duration-fast) var(--am-ease-default);
        color: var(--am-text);
        position: relative;
        cursor: text;
      }

      .wrapper:hover:not(.disabled) {
        border-color: var(--am-border-strong);
      }

      .wrapper.focused {
        border-color: var(--am-primary);
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-focus-ring) 25%, transparent);
      }

      .wrapper.invalid {
        border-color: var(--am-danger);
      }

      .wrapper.invalid.focused {
        box-shadow: 0 0 0 var(--am-focus-ring-width) color-mix(in srgb, var(--am-danger) 25%, transparent);
      }

      .wrapper.disabled {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
      }

      /* ---- Sizes without floating label ---- */
      :host([size='sm']) .wrapper:not(.has-label) { height: var(--am-size-sm); padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .wrapper:not(.has-label), :host(:not([size])) .wrapper:not(.has-label) { height: var(--am-size-md); padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .wrapper:not(.has-label) { height: var(--am-size-lg); padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

      /* ---- Sizes with floating label (taller to fit label + value) ---- */
      :host([size='sm']) .wrapper.has-label { height: 3rem; padding-inline: var(--am-space-2-5); font-size: var(--am-text-sm); }
      :host([size='md']) .wrapper.has-label, :host(:not([size])) .wrapper.has-label { height: 3.5rem; padding-inline: var(--am-space-3); font-size: var(--am-text-sm); }
      :host([size='lg']) .wrapper.has-label { height: 3.75rem; padding-inline: var(--am-space-4); font-size: var(--am-text-base); }

      /* ---- Input field ---- */

      .input-group {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
        position: relative;
      }

      /* When label is floating, shift input down */
      .has-label .input-group {
        justify-content: flex-end;
        padding-bottom: 0.625rem;
      }

      input {
        all: unset;
        width: 100%;
        font: inherit;
        color: inherit;
        line-height: 1.25;
      }

      input::placeholder {
        color: var(--am-text-tertiary);
      }

      input:disabled {
        cursor: not-allowed;
      }

      /* Hide native placeholder when floating label is not floated */
      .has-label:not(.floated) input::placeholder {
        color: transparent;
      }

      /* ---- Floating label ---- */

      .floating-label {
        position: absolute;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        font-family: var(--am-font-sans);
        font-size: inherit;
        color: var(--am-text-secondary);
        pointer-events: none;
        transform-origin: left center;
        transition:
          top var(--am-duration-normal) var(--am-ease-spring),
          transform var(--am-duration-normal) var(--am-ease-spring),
          font-size var(--am-duration-normal) var(--am-ease-spring),
          color var(--am-duration-fast) var(--am-ease-default);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .floated .floating-label {
        top: 0.4rem;
        transform: none;
        font-size: 0.75rem;
        color: var(--am-text-secondary);
      }

      .focused .floating-label {
        color: var(--am-primary);
      }

      .invalid .floating-label {
        color: var(--am-danger);
      }

      /* ---- Validation message ---- */

      .error-text {
        margin-top: var(--am-space-1);
        color: var(--am-danger);
        font-size: var(--am-text-sm);
        line-height: 1.3;
      }

      /* ---- Slots ---- */

      ::slotted([slot='prefix']),
      ::slotted([slot='suffix']) {
        display: flex;
        align-items: center;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
      }

      /* ---- Clear button ---- */

      .clear-btn {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.25rem;
        height: 1.25rem;
        border-radius: var(--am-radius-full);
        cursor: pointer;
        color: var(--am-text-tertiary);
        flex-shrink: 0;
        transition:
          color var(--am-duration-fast) var(--am-ease-default),
          background var(--am-duration-fast) var(--am-ease-default);
      }

      .clear-btn:hover {
        color: var(--am-text);
        background: var(--am-hover-overlay);
      }

      .clear-btn:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      @media (prefers-reduced-motion: reduce) {
        .wrapper, .floating-label, .clear-btn { transition: none; }
      }
    `,
  ];

  @state() private _focused = false;

  private get _floated(): boolean {
    return this._focused || this.value.length > 0;
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('value')) {
      this.internals.setFormValue(this.value);
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
    const input = this.inputEl;
    if (input) {
      const v = input.validity;
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
        this.internals.setValidity(flags, input.validationMessage, input);
      } else {
        this.internals.setValidity({});
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

  private _handleInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.value = input.value;
  }

  private _handleChange(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
  }

  private _handleFocus() { this._focused = true; }
  private _handleBlur() {
    this._focused = false;
    // D-01 timing gate: a native constraint error may surface only after the
    // field is touched (blur), never on first paint.
    this._validation.markTouched();
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Enter') {
      return;
    }

    // Enter attempts submit — treat as touched so a native error surfaces (D-01).
    this._validation.markTouched();

    requestAssociatedFormSubmit(this, {
      event: e,
      internals: this.internals,
      disabled: this.disabled,
      readonly: this.readonly,
    });
  }

  private _handleClear() {
    this.value = '';
    if (this.inputEl) {
      this.inputEl.value = '';
      this.inputEl.focus();
    }
    this.dispatchEvent(new CustomEvent('am-clear', { bubbles: true, composed: true }));
    this.inputEl?.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.inputEl?.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private _handleWrapperClick() {
    this.inputEl?.focus();
  }

  /** Programmatically focus the input. */
  focus(options?: FocusOptions) { this.inputEl?.focus(options); }

  /** Programmatically select the input text. */
  select() { this.inputEl?.select(); }

  render() {
    const hasLabel = !!this.label;
    const floated = hasLabel && this._floated;
    const showClear = this.clearable && this.value.length > 0 && !this.disabled && !this.readonly;

    const wrapperClasses = [
      'wrapper',
      hasLabel ? 'has-label' : '',
      floated ? 'floated' : '',
      this._focused ? 'focused' : '',
      this.invalid ? 'invalid' : '',
      this.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');

    return html`
      <div class=${wrapperClasses} part="wrapper" @click=${this._handleWrapperClick}>
        <slot name="prefix"></slot>
        <div class="input-group">
          ${hasLabel
            ? html`<span class="floating-label" part="label">${this.label}</span>`
            : nothing}
          <input
            part="input"
            type=${this.type}
            .value=${live(this.value)}
            placeholder=${this.placeholder || (hasLabel ? ' ' : nothing)}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            ?required=${this.required}
            autocomplete=${this.autocomplete || nothing}
            minlength=${this.minlength ?? nothing}
            maxlength=${this.maxlength ?? nothing}
            pattern=${this.pattern || nothing}
            aria-label=${this.label || nothing}
            aria-invalid=${this.invalid ? 'true' : nothing}
            aria-describedby=${this._showError ? this._errorId : nothing}
            @input=${this._handleInput}
            @change=${this._handleChange}
            @focus=${this._handleFocus}
            @blur=${this._handleBlur}
            @keydown=${this._handleKeyDown}
          />
        </div>
        ${showClear
          ? html`
              <button
                class="clear-btn"
                part="clear"
                type="button"
                aria-label="Clear"
                @click=${this._handleClear}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            `
          : nothing}
        <slot name="suffix"></slot>
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
    'am-input': AmInput;
  }
}


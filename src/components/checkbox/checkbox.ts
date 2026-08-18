import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';
import { ValidationController } from '../../internal/controllers/validation.js';
import { uniqueId } from '../../utilities/unique-id.js';

/** Native-style message shown when a required checkbox is left unchecked (D-01). */
const REQUIRED_MESSAGE = 'Please check this box if you want to proceed.';

/**
 * Checkbox — a styled checkbox with label support.
 *
 * @slot - Label content
 * @csspart control - The visual checkbox box
 * @csspart label - The label wrapper
 * @csspart error - The validation error message region
 *
 * @fires input - Fires when checked state changes
 * @fires change - Fires when checked state changes
 *
 * @example
 * ```html
 * <am-checkbox>Accept terms and conditions</am-checkbox>
 * <am-checkbox checked>Remember me</am-checkbox>
 * <am-checkbox indeterminate>Select all</am-checkbox>
 * ```
 */
@customElement('am-checkbox')
export class AmCheckbox extends LitElement {
  static formAssociated = true;

  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) indeterminate = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Boolean, reflect: true }) required = false;
  @property({ type: Boolean, reflect: true }) invalid = false;
  @property() name = '';
  @property() value = 'on';
  @property({ attribute: 'aria-label' }) ariaLabel: string | null = null;

  @query('.control') private _control!: HTMLElement;
  private internals: ElementInternals;

  /** Stable id shared by the error message node and the control's aria-describedby. */
  private readonly _errorId = uniqueId('am-checkbox-error');

  /**
   * Resolves the displayed validation message + shown-state from the required
   * constraint and any consumer-supplied {@link setCustomError} error. Lives on
   * the src/internal boundary — never on the public surface (D-09).
   */
  private _validation = new ValidationController(this, {
    internals: () => this.internals,
    anchor: () => this._control,
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
        display: inline-flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: var(--am-space-2);
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      :host([disabled]) {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      .control {
        position: relative;
        flex-shrink: 0;
        width: 1.125rem;
        height: 1.125rem;
        margin-top: 0.125rem;
        border: var(--am-border-2) solid var(--am-border-strong);
        border-radius: var(--am-radius-sm);
        corner-shape: squircle;
        background: var(--am-surface);
        transition:
          background var(--am-duration-fast) var(--am-ease-default),
          border-color var(--am-duration-fast) var(--am-ease-default);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      :host(:hover:not([disabled])) .control {
        border-color: var(--am-primary);
      }

      :host([checked]) .control,
      :host([indeterminate]) .control {
        background: var(--am-primary);
        border-color: var(--am-primary);
      }

      :host(:hover[checked]:not([disabled])) .control,
      :host(:hover[indeterminate]:not([disabled])) .control {
        background: var(--am-primary-hover);
        border-color: var(--am-primary-hover);
      }

      .control:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
      }

      .check-icon {
        width: 0.75rem;
        height: 0.75rem;
        color: var(--am-primary-text);
        opacity: 0;
        transform: scale(0.5);
        transition:
          opacity var(--am-duration-fast) var(--am-ease-default),
          transform var(--am-duration-fast) var(--am-ease-spring);
      }

      :host([checked]) .check-icon,
      :host([indeterminate]) .check-icon {
        opacity: 1;
        transform: scale(1);
      }

      .label {
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        line-height: var(--am-leading-normal);
        color: var(--am-text);
      }

      input {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
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
        .control, .check-icon { transition: none; }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('checked')) {
      this.internals.setFormValue(this.checked ? this.value : null);
    }
    // The required constraint is only knowable post-render (it depends on
    // checked/indeterminate/required state), so this reflection runs here and
    // may schedule one further bounded, idempotent update.
    this._syncValidation();
  }

  /**
   * Mirror the required constraint onto the host ElementInternals (so
   * `validationMessage` is populated), then reflect the controller's resolved
   * message + shown-state into render state and the `invalid` attribute. Never
   * throws; bounded (idempotent) re-render.
   */
  private _syncValidation(): void {
    const valueMissing = this.required && !this.checked && !this.indeterminate;
    if (valueMissing) {
      this.internals.setValidity({ valueMissing: true }, REQUIRED_MESSAGE, this._control);
    } else {
      this.internals.setValidity({});
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
    if (this.disabled) return;
    this.checked = !this.checked;
    this.indeterminate = false;
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
  }

  render() {
    return html`
      <div
        class="control"
        part="control"
        role="checkbox"
        tabindex=${this.disabled ? nothing : '0'}
        aria-checked=${this.indeterminate ? 'mixed' : String(this.checked)}
        aria-disabled=${this.disabled ? 'true' : nothing}
        aria-required=${this.required ? 'true' : nothing}
        aria-invalid=${this.invalid ? 'true' : nothing}
        aria-describedby=${this._showError ? this._errorId : nothing}
        aria-label=${this.ariaLabel || nothing}
        aria-labelledby=${this.ariaLabel ? nothing : 'label'}
        @keydown=${this._handleKeyDown}
        @blur=${this._handleBlur}
      >
        ${this.indeterminate
          ? html`<svg class="check-icon" viewBox="0 0 12 12" fill="none"><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
          : html`<svg class="check-icon" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
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
    'am-checkbox': AmCheckbox;
  }
}

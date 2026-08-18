import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, queryAssignedElements, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';
import { ValidationController } from '../../internal/controllers/validation.js';
import { uniqueId } from '../../utilities/unique-id.js';

/** Native-style message shown when a required radio group has no selection (D-01). */
const GROUP_REQUIRED_MESSAGE = 'Please select one of these options.';

/* ================================================================
   AmRadio — individual radio button
   ================================================================ */

/**
 * Radio — a styled radio button with label support.
 *
 * @slot - Label content
 * @csspart control - The visual radio circle
 * @csspart label - The label wrapper
 *
 * @fires input - Fires when checked state changes
 * @fires change - Fires when checked state changes
 *
 * @example
 * ```html
 * <am-radio value="a">Option A</am-radio>
 * <am-radio value="b" checked>Option B</am-radio>
 * ```
 */
@customElement('am-radio')
export class AmRadio extends LitElement {
  static formAssociated = true;

  @property({ type: String }) value = '';
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property() name = '';
  @property({ attribute: 'aria-label' }) override ariaLabel: string | null = null;

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

      .control {
        flex-shrink: 0;
        width: 1.125rem;
        height: 1.125rem;
        display: block;
      }

      .control:focus-visible {
        outline: var(--am-focus-ring-width) solid var(--am-focus-ring);
        outline-offset: var(--am-focus-ring-offset);
        border-radius: 50%;
      }

      .radio-svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      .radio-ring {
        stroke: var(--am-border-strong);
        fill: var(--am-surface);
        stroke-width: 2;
        transition: stroke var(--am-duration-fast) var(--am-ease-default);
      }

      :host(:hover:not([disabled])) .radio-ring {
        stroke: var(--am-text-tertiary);
      }

      :host([checked]) .radio-ring {
        stroke: var(--am-primary);
      }

      :host(:hover[checked]:not([disabled])) .radio-ring {
        stroke: var(--am-primary-hover);
      }

      .radio-dot {
        fill: var(--am-primary);
        opacity: 0;
        transform-box: fill-box;
        transform-origin: center;
        transform: scale(0);
        transition:
          opacity var(--am-duration-fast) var(--am-ease-default),
          transform var(--am-duration-fast) var(--am-ease-spring);
      }

      :host([checked]) .radio-dot {
        opacity: 1;
        transform: scale(1);
      }

      .label {
        font-family: var(--am-font-sans);
        font-size: var(--am-text-sm);
        line-height: var(--am-leading-normal);
        color: var(--am-text);
      }

      @media (prefers-reduced-motion: reduce) {
        .radio-ring,
        .radio-dot {
          transition: none;
        }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('checked')) {
      this.internals.setFormValue(this.checked ? this.value : null);
    }
  }

  private _toggle = () => {
    if (this.disabled) return;
    if (this.checked) return;
    this.checked = true;
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
        role="radio"
        tabindex=${this.disabled ? nothing : '0'}
        aria-checked=${String(this.checked)}
        aria-disabled=${this.disabled ? 'true' : nothing}
        aria-label=${this.ariaLabel || nothing}
        aria-labelledby=${this.ariaLabel ? nothing : 'label'}
        @keydown=${this._handleKeyDown}
      >
        <svg class="radio-svg" viewBox="0 0 18 18">
          <circle class="radio-ring" cx="9" cy="9" r="8"/>
          <circle class="radio-dot" cx="9" cy="9" r="4"/>
        </svg>
      </div>
      <span class="label" part="label" id="label">
        <slot></slot>
      </span>
    `;
  }
}

/* ================================================================
   AmRadioGroup — radio group container
   ================================================================ */

/**
 * Radio Group — manages single-selection across am-radio children.
 * Provides roving tabindex keyboard navigation and form association.
 *
 * @slot - Radio buttons (am-radio elements)
 *
 * @fires input - Fires when the selected radio changes
 * @fires change - Fires when the selected radio changes
 *
 * @example
 * ```html
 * <am-radio-group label="Choose a plan" name="plan" value="pro">
 *   <am-radio value="free">Free</am-radio>
 *   <am-radio value="pro">Pro</am-radio>
 *   <am-radio value="enterprise">Enterprise</am-radio>
 * </am-radio-group>
 * ```
 */
@customElement('am-radio-group')
export class AmRadioGroup extends LitElement {
  static formAssociated = true;

  /** The value of the currently selected radio. */
  @property({ reflect: true }) value = '';

  /** Accessible label for the radio group. */
  @property() label = '';

  /** Disables all radios in the group. */
  @property({ type: Boolean, reflect: true }) disabled = false;

  /** Marks the group as required for form validation. */
  @property({ type: Boolean, reflect: true }) required = false;

  /** Reflects the group's validity for `:host([invalid])` styling hooks. */
  @property({ type: Boolean, reflect: true }) invalid = false;

  /** Name attribute for form association. */
  @property() name = '';

  @queryAssignedElements({ selector: 'am-radio' })
  private _radios!: AmRadio[];

  private internals: ElementInternals;

  /** Stable id shared by the error message node and the group's aria-describedby. */
  private readonly _errorId = uniqueId('am-radio-group-error');

  /**
   * Resolves the displayed validation message + shown-state from the required
   * constraint and any consumer-supplied {@link setCustomError} error. Anchored
   * on the GROUP (the form-associated element that holds the value + internals),
   * never an individual radio. Lives on the src/internal boundary (D-09).
   */
  private _validation = new ValidationController(this, {
    internals: () => this.internals,
    anchor: () => this,
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
        display: flex;
        flex-direction: column;
        gap: var(--am-space-2-5);
      }

      :host([disabled]) {
        opacity: var(--am-disabled-opacity);
        cursor: not-allowed;
        pointer-events: none;
      }

      /* ---- Validation message ---- */

      .error-text {
        margin-top: var(--am-space-1);
        color: var(--am-danger);
        font-size: var(--am-text-sm);
        line-height: 1.3;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'radiogroup');
    this.addEventListener('input', this._handleRadioInput as EventListener);
    this.addEventListener('change', this._handleRadioChange as EventListener);
    this.addEventListener('keydown', this._handleKeyDown);
    this.addEventListener('focusout', this._handleFocusOut);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('input', this._handleRadioInput as EventListener);
    this.removeEventListener('change', this._handleRadioChange as EventListener);
    this.removeEventListener('keydown', this._handleKeyDown);
    this.removeEventListener('focusout', this._handleFocusOut);
  }

  protected firstUpdated() {
    this._syncRadios();
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('label')) {
      if (this.label) {
        this.setAttribute('aria-label', this.label);
      } else {
        this.removeAttribute('aria-label');
      }
    }

    if (changed.has('disabled')) {
      this._syncRadios();
    }

    if (changed.has('value')) {
      this.internals.setFormValue(this.value || null);
      this._syncRadios();
    }

    // The required constraint depends on the group's value, only settled after
    // render; reflect here (bounded, idempotent extra update).
    this._syncValidation();
  }

  /**
   * Mirror the required constraint onto the group's ElementInternals (so
   * `validationMessage` is populated), then reflect the controller's resolved
   * message + shown-state into render state, the `invalid` attribute, and the
   * group's `aria-invalid` / `aria-describedby` (anchored on the GROUP, which
   * owns the value + internals — never an individual radio). Never throws.
   */
  private _syncValidation(): void {
    const valueMissing = this.required && !this.value;
    if (valueMissing) {
      // Anchor arg omitted: the group host is not a shadow descendant, so a real
      // ElementInternals rejects it as an anchor; validity + message suffice.
      this.internals.setValidity({ valueMissing: true }, GROUP_REQUIRED_MESSAGE);
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
      if (show) {
        this.invalid = true;
        this._invalidFromValidation = true;
      } else if (this._invalidFromValidation) {
        this.invalid = false;
        this._invalidFromValidation = false;
      }
    }
    // aria-invalid + aria-describedby attach to the GROUP host (holds role
    // radiogroup + value + internals), pointing at the same-shadow-root message.
    if (show) {
      this.setAttribute('aria-invalid', 'true');
      this.setAttribute('aria-describedby', this._errorId);
    } else {
      this.removeAttribute('aria-invalid');
      this.removeAttribute('aria-describedby');
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
   * Set or clear a custom validation error on the radio group (e.g. a
   * server-side rejection).
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

  private _handleFocusOut = (e: FocusEvent): void => {
    // D-01 timing gate: mark touched only when focus leaves the whole group,
    // not while roving between radios inside it. relatedTarget is retargeted to
    // the am-radio host when crossing the child shadow boundary.
    const next = e.relatedTarget as Node | null;
    if (next && this.contains(next)) return;
    this._validation.markTouched();
  };

  private _getRadios(): AmRadio[] {
    return this._radios ?? [];
  }

  private _getEnabledRadios(): AmRadio[] {
    return this._getRadios().filter(r => !r.disabled);
  }

  private _syncRadios() {
    const radios = this._getRadios();
    const enabledRadios = this._getEnabledRadios();
    const selectedRadio = radios.find(r => r.value === this.value);

    radios.forEach(radio => {
      radio.checked = radio.value === this.value;

      if (this.disabled) {
        radio.disabled = true;
      }

      // Roving tabindex: only the selected (or first enabled) radio is tabbable
      const control = radio.shadowRoot?.querySelector('.control');
      if (control) {
        if (selectedRadio) {
          control.setAttribute('tabindex', radio === selectedRadio ? '0' : '-1');
        } else if (enabledRadios.length > 0) {
          control.setAttribute('tabindex', radio === enabledRadios[0] ? '0' : '-1');
        }
      }
    });
  }

  private _handleRadioInput = (e: Event) => {
    if (e.target instanceof AmRadio) {
      e.stopPropagation();
    }
  };

  private _handleRadioChange = (e: Event) => {
    const target = e.target as AmRadio;
    if (!(target instanceof AmRadio)) return;

    // Stop the child radio's event from propagating beyond the group
    e.stopPropagation();

    const newValue = target.value;
    if (newValue === this.value) return;

    this.value = newValue;
    this._syncRadios();

    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  private _handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as Element;
    const radio = target.closest('am-radio') as AmRadio | null;
    if (!radio) return;

    const radios = this._getEnabledRadios();
    if (radios.length === 0) return;

    const idx = radios.indexOf(radio);
    if (idx === -1) return;

    let next: AmRadio | undefined;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      next = radios[(idx + 1) % radios.length];
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      next = radios[(idx - 1 + radios.length) % radios.length];
    }

    if (next) {
      e.preventDefault();
      next.checked = true;
      this.value = next.value;
      this._syncRadios();

      next.shadowRoot?.querySelector<HTMLElement>('.control')?.focus();

      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  };

  private _handleSlotChange() {
    this._syncRadios();
  }

  render() {
    return html`
      <slot @slotchange=${this._handleSlotChange}></slot>
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
    'am-radio': AmRadio;
    'am-radio-group': AmRadioGroup;
  }
}

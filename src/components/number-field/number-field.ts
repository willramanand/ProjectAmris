import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

export type NumberFieldSize = 'sm' | 'md' | 'lg';

/**
 * Number Field — a numeric input with increment/decrement buttons.
 *
 * @csspart input - The native input
 * @csspart decrement - The decrement button
 * @csspart increment - The increment button
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

  constructor() {
    super();
    this._internals = this.attachInternals();
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

      @media (prefers-reduced-motion: reduce) {
        .wrapper, .stepper-btn { transition: none; }
      }
    `,
  ];

  protected updated(changed: PropertyValues) {
    if (changed.has('value')) {
      this._internals.setFormValue(this.value != null ? String(this.value) : null);
    }
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
    if (e.key === 'ArrowUp') { e.preventDefault(); this._increment(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); this._decrement(); }
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
          @input=${this._handleInput}
          @keydown=${this._handleKeyDown}
        />
        <button class="stepper-btn" part="increment" aria-label="Increase"
          ?disabled=${this.disabled || this.readonly || atMax}
          @click=${this._increment}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-number-field': AmNumberField;
  }
}

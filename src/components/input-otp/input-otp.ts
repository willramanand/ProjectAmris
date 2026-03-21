import { LitElement, css, html, type PropertyValues } from 'lit';
import { customElement, property, queryAll, state } from 'lit/decorators.js';
import { resetStyles } from '../../styles/reset.css.js';

/**
 * Input OTP — a one-time passcode input with individual character cells.
 *
 * @csspart cell - Individual input cells
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

  @state() private _values: string[] = [];

  @queryAll('input') private _inputs!: NodeListOf<HTMLInputElement>;

  private _internals: ElementInternals;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._values = Array(this.length).fill('');
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
      this._internals.setFormValue(value);
    }
  }

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
      <div class="cells" role="group" aria-label="One-time passcode">
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'am-input-otp': AmInputOtp;
  }
}
